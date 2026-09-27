"""Agent findings reader service.

Reads the pre-produced JSON files from ``agents/findings/`` and maps them
into typed Pydantic models.  The repository root is resolved relative to
this file so the service works regardless of the current working directory.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..schemas.incident import (
    AgentFindings,
    CodeHistorianFinding,
    FixWriterFinding,
    LogAnalystFinding,
)

# ---------------------------------------------------------------------------
# Path constants — resolved once at import time
# ---------------------------------------------------------------------------

# This file lives at:  <repo>/backend/app/services/findings_reader.py
# Repo root is 3 levels up.
_SERVICES_DIR = Path(__file__).parent
_REPO_ROOT = _SERVICES_DIR.parent.parent.parent
_FINDINGS_DIR = _REPO_ROOT / "agents" / "findings"

_LOG_ANALYST_PATH = _FINDINGS_DIR / "log_analyst.json"
_CODE_HISTORIAN_PATH = _FINDINGS_DIR / "code_historian.json"
_FIX_WRITER_PATH = _FINDINGS_DIR / "fix_writer.json"


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------


def load_agent_findings() -> AgentFindings:
    """Read all three finding files and return a unified AgentFindings object.

    Individual files that are missing or malformed are reported in
    ``AgentFindings.errors`` rather than raising an exception, so the API
    always returns a structured response.
    """
    errors: list[str] = []
    log_analyst: LogAnalystFinding | None = None
    code_historian: CodeHistorianFinding | None = None
    fix_writer: FixWriterFinding | None = None

    log_analyst, err = _load_finding(_LOG_ANALYST_PATH, LogAnalystFinding, "log_analyst")
    if err:
        errors.append(err)

    code_historian, err = _load_finding(
        _CODE_HISTORIAN_PATH, CodeHistorianFinding, "code_historian"
    )
    if err:
        errors.append(err)

    fix_writer, err = _load_finding(_FIX_WRITER_PATH, FixWriterFinding, "fix_writer")
    if err:
        errors.append(err)

    pipeline_status = _build_pipeline_status(log_analyst, code_historian, fix_writer)

    return AgentFindings(
        log_analyst=log_analyst,
        code_historian=code_historian,
        fix_writer=fix_writer,
        pipeline_status=pipeline_status,
        errors=errors,
    )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _load_finding(
    path: Path,
    model_class: type,
    label: str,
) -> tuple[Any, str | None]:
    """Load and validate a single finding file.

    Returns ``(instance, None)`` on success or ``(None, error_message)`` on
    failure.  The original file is never modified.
    """
    if not path.exists():
        return None, f"Finding file not found: {path.relative_to(_REPO_ROOT)}"

    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:
        return None, f"Cannot read {label} finding: {exc}"

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        return None, f"Invalid JSON in {label} finding ({path.name}): {exc}"

    try:
        instance = model_class(**data)
    except Exception as exc:  # Pydantic ValidationError or similar
        return None, f"Schema mismatch in {label} finding: {exc}"

    return instance, None


def _build_pipeline_status(
    log_analyst: LogAnalystFinding | None,
    code_historian: CodeHistorianFinding | None,
    fix_writer: FixWriterFinding | None,
) -> dict[str, Any]:
    """Describe the pipeline topology and status of each stage."""
    return {
        "description": (
            "Log Analyst and Code Historian are parallel evidence-gathering stages. "
            "Fix Writer is the remediation stage that consumes both."
        ),
        "stages": [
            {
                "name": "Log Analyst",
                "role": "evidence",
                "parallel_with": ["Code Historian"],
                "status": "complete" if log_analyst else "missing",
            },
            {
                "name": "Code Historian",
                "role": "evidence",
                "parallel_with": ["Log Analyst"],
                "status": "complete" if code_historian else "missing",
            },
            {
                "name": "Fix Writer",
                "role": "remediation",
                "depends_on": ["Log Analyst", "Code Historian"],
                "status": "complete" if fix_writer else "missing",
            },
        ],
    }
