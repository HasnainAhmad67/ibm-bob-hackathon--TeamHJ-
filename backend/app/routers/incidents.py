"""Incident router.

Provides all /api/incidents endpoints:
- POST   /api/incidents                  — create incident
- GET    /api/incidents                  — list all incidents
- GET    /api/incidents/{id}             — get single incident
- POST   /api/incidents/{id}/analyze     — load agent findings
- POST   /api/incidents/{id}/validate    — run independent test validation
- POST   /api/incidents/{id}/run         — full pipeline (analyze + validate + postmortem)
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ..schemas.incident import IncidentCreate, IncidentRecord
from ..services.document_context import build_runbook_context
from ..services.findings_reader import load_agent_findings
from ..services.ingestion import (
    create_incident,
    get_incident,
    list_incidents,
    update_incident,
)
from ..services.postmortem import (
    build_patch_summary,
    build_postmortem,
    build_root_cause_summary,
)
from ..services.validation import run_baseline_validation, run_dual_validation

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _get_or_404(incident_id: str) -> IncidentRecord:
    """Return the incident or raise HTTP 404."""
    record = get_incident(incident_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return record


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=IncidentRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a new incident",
)
def create(payload: IncidentCreate) -> IncidentRecord:
    """Accept raw incident input, normalise it, and return the created record.

    - Generates a unique incident ID.
    - Derives a title when one is not supplied.
    - Stores the record in memory for the duration of the demo.
    """
    return create_incident(payload)


@router.get(
    "",
    response_model=list[IncidentRecord],
    summary="List all incidents",
)
def list_all() -> list[IncidentRecord]:
    """Return all incidents, most-recent first."""
    return list_incidents()


@router.get(
    "/{incident_id}",
    response_model=IncidentRecord,
    summary="Get a single incident",
)
def get_one(incident_id: str) -> IncidentRecord:
    """Return the incident record for *incident_id*."""
    return _get_or_404(incident_id)


@router.post(
    "/{incident_id}/analyze",
    response_model=IncidentRecord,
    summary="Load agent findings into the incident",
)
def analyze(incident_id: str) -> IncidentRecord:
    """Read the pre-produced agent finding files and attach them to the incident.

    - Reads ``agents/findings/log_analyst.json``, ``code_historian.json``, and
      ``fix_writer.json``.
    - Maps their real fields into a unified investigation object.
    - Includes a pipeline status block showing the parallel/sequential topology.
    - Returns structured errors if a finding file is missing or malformed.
    - Never overwrites the finding files.
    """
    record = _get_or_404(incident_id)
    findings = load_agent_findings()
    record.findings = findings
    record.root_cause_summary = build_root_cause_summary(findings)
    record.status = "analyzing"
    update_incident(record)
    return record


@router.post(
    "/{incident_id}/validate",
    response_model=IncidentRecord,
    summary="Run baseline (unmodified) test-suite validation",
)
def validate(incident_id: str) -> IncidentRecord:
    """Run the unmodified sample-app test suite independently of Fix Writer.

    This baseline run confirms the bug is real.  It does NOT apply any patch.
    For the full dual validation (baseline + proposed-fix), use ``/run``.

    - Uses ``subprocess`` with ``cwd=sample-app/`` (the original, unmodified copy).
    - Captures command, cwd, exit code, stdout, stderr, duration, and timestamp.
    - A non-zero exit code always yields ``passed=False``.
    - Returns structured failure information on timeout or missing dependencies.
    """
    record = _get_or_404(incident_id)
    result = run_baseline_validation()
    record.validation = result
    record.status = "validated"
    update_incident(record)
    return record


@router.post(
    "/{incident_id}/run",
    response_model=IncidentRecord,
    summary="Run the full investigation pipeline with dual validation",
)
def run_pipeline(incident_id: str) -> IncidentRecord:
    """Execute the complete pipeline and return the enriched incident record.

    Stages (in order):
    1. Load agent findings (Log Analyst + Code Historian + Fix Writer).
    2. Build runbook/document context from sample-app documentation.
    3. Run **dual validation**:
       a. Baseline — unmodified sample-app (confirms bug is real).
       b. Proposed-fix — temp isolated copy with patch applied (tests the fix).
    4. Compose postmortem draft.
    5. Derive root-cause summary and patch summary.

    The response contains:
    - Normalised incident input.
    - Real agent findings with pipeline status.
    - Runbook context (or fallback when no docs found).
    - ``dual_validation`` with baseline + proposed-fix results.
    - ``validation`` populated with the baseline result (backward compatibility).
    - ``human_approval_required`` (True until proposed-fix passes).
    - Root-cause summary.
    - Patch summary.
    - Draft postmortem.
    """
    record = _get_or_404(incident_id)

    # --- Stage 1: Agent findings ---
    findings = load_agent_findings()
    record.findings = findings

    # --- Stage 2: Document / runbook context ---
    runbook = build_runbook_context()
    record.runbook_context = runbook

    # --- Stage 3: Dual validation ---
    dual = run_dual_validation(findings.fix_writer)
    record.dual_validation = dual
    # Keep record.validation populated with the baseline for backward compat.
    record.validation = dual.baseline_validation
    # fix_verified: True when the isolated proposed-fix run passed.
    record.fix_verified = dual.fix_verified
    # human_approval_required: always True — mirrors dual.human_approval_required.
    record.human_approval_required = dual.human_approval_required

    # --- Stage 4: Postmortem ---
    record.postmortem = build_postmortem(record, findings, runbook, dual)

    # --- Stage 5: Summaries ---
    record.root_cause_summary = build_root_cause_summary(findings)
    record.patch_summary = build_patch_summary(findings, dual)

    record.status = "complete"
    update_incident(record)
    return record
