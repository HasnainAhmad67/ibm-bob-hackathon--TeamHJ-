"""Pydantic models for the Incident Commander API.

All models use Pydantic v2 syntax.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class IncidentCreate(BaseModel):
    """Payload accepted by POST /api/incidents."""

    raw_log: str = Field(
        ...,
        description="Raw stack trace, error log, or failing-test output.",
        min_length=1,
    )
    failing_test: Optional[str] = Field(
        None,
        description="Fully-qualified test name, e.g. tests/test_orders.py::test_foo.",
    )
    service_name: Optional[str] = Field(
        None,
        description="Name of the affected service.",
    )
    severity: Optional[str] = Field(
        None,
        description="Incident severity label: P1 / P2 / P3 / P4.",
        pattern=r"^P[1-4]$",
    )
    title: Optional[str] = Field(
        None,
        description="Optional human-supplied incident title.",
    )


# ---------------------------------------------------------------------------
# Sub-objects used inside IncidentRecord
# ---------------------------------------------------------------------------


class LogAnalystFinding(BaseModel):
    """Findings produced by the Log Analyst agent."""

    failing_function: str
    file: str
    symptom: str
    failing_test: str


class CodeHistorianFinding(BaseModel):
    """Findings produced by the Code Historian agent."""

    suspect_commit: str
    commit_message: str
    explanation: str
    file: str


class FixWriterFinding(BaseModel):
    """Findings produced by the Fix Writer agent."""

    patch_description: str
    file_changed: str
    confidence: str


class AgentFindings(BaseModel):
    """Unified container for all three agent findings."""

    log_analyst: Optional[LogAnalystFinding] = None
    code_historian: Optional[CodeHistorianFinding] = None
    fix_writer: Optional[FixWriterFinding] = None
    pipeline_status: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)


class ValidationResult(BaseModel):
    """Result of a single subprocess test-suite run."""

    command: list[str]
    exit_code: int
    stdout: str
    stderr: str
    duration_seconds: float
    passed: bool
    timestamp: datetime
    cwd: Optional[str] = None
    error: Optional[str] = None


class ProposedFixValidation(BaseModel):
    """Result of applying the Fix Writer patch to a temp copy and re-running tests.

    ``applicable`` is False when the finding JSON does not contain a
    machine-applicable patch (e.g. prose-only description).  In that case
    ``skipped_reason`` explains why and all run fields are absent.
    """

    applicable: bool
    skipped_reason: Optional[str] = None
    patch_applied: Optional[str] = None   # human-readable description of what was changed
    temp_dir_used: Optional[str] = None
    cleanup_ok: Optional[bool] = None
    result: Optional[ValidationResult] = None


class DualValidationResult(BaseModel):
    """Container for both validation passes.

    ``baseline_validation``     — the unmodified sample-app (proves the bug is real).
    ``proposed_fix_validation`` — the patched temp copy (proves the fix works).
    ``fix_verified``            — True only when the proposed-fix run passed.
    ``human_approval_required`` — Always True; machine verification never replaces
                                   human sign-off before deployment.
    """

    baseline_validation: ValidationResult
    proposed_fix_validation: ProposedFixValidation
    fix_verified: bool
    human_approval_required: bool  # always True — see class docstring
    summary: str


class RunbookContext(BaseModel):
    """Context extracted from project documents."""

    source_files: list[str]
    guidance: str
    postmortem_outline: str
    fallback: bool = False


class PostmortemDraft(BaseModel):
    """Auto-generated postmortem draft."""

    title: str
    severity: str
    timeline: list[str]
    root_cause: str
    impact: str
    fix_summary: str
    prevention: str


# ---------------------------------------------------------------------------
# Top-level incident record
# ---------------------------------------------------------------------------


class IncidentRecord(BaseModel):
    """Complete incident record returned by the API."""

    incident_id: str
    title: str
    service_name: str
    severity: str
    raw_log: str
    failing_test: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Populated after /analyze or /run
    findings: Optional[AgentFindings] = None
    # Single-run result — populated by /validate (baseline only)
    validation: Optional[ValidationResult] = None
    # Dual-run result — populated by /run (baseline + proposed-fix)
    dual_validation: Optional[DualValidationResult] = None
    runbook_context: Optional[RunbookContext] = None
    postmortem: Optional[PostmortemDraft] = None
    root_cause_summary: Optional[str] = None
    patch_summary: Optional[str] = None
    # fix_verified: True when the proposed-fix isolated run passed
    fix_verified: Optional[bool] = None
    # human_approval_required: always True — machine verification never replaces human sign-off
    human_approval_required: Optional[bool] = None
    status: str = "created"  # created | analyzing | validated | complete
