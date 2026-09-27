"""Incident ingestion service.

Generates unique incident IDs, normalises raw input into an IncidentRecord,
and manages the in-memory incident store for the demo.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from ..schemas.incident import IncidentCreate, IncidentRecord

# ---------------------------------------------------------------------------
# In-memory store  (dict keyed by incident_id)
# ---------------------------------------------------------------------------

_store: dict[str, IncidentRecord] = {}


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def create_incident(payload: IncidentCreate) -> IncidentRecord:
    """Normalise *payload* and persist a new IncidentRecord.

    A title is derived from the raw log when the caller does not supply one.
    """
    now = datetime.now(timezone.utc)
    incident_id = _generate_id()

    title = payload.title or _derive_title(payload.raw_log, payload.failing_test)
    service = payload.service_name or "unknown-service"
    severity = payload.severity or "P3"

    record = IncidentRecord(
        incident_id=incident_id,
        title=title,
        service_name=service,
        severity=severity,
        raw_log=payload.raw_log,
        failing_test=payload.failing_test,
        created_at=now,
        updated_at=now,
        status="created",
    )
    _store[incident_id] = record
    return record


def get_incident(incident_id: str) -> Optional[IncidentRecord]:
    """Return the IncidentRecord for *incident_id* or ``None``."""
    return _store.get(incident_id)


def list_incidents() -> list[IncidentRecord]:
    """Return all incidents, most-recent first."""
    return sorted(_store.values(), key=lambda r: r.created_at, reverse=True)


def update_incident(record: IncidentRecord) -> IncidentRecord:
    """Persist an already-modified IncidentRecord back into the store."""
    record.updated_at = datetime.now(timezone.utc)
    _store[record.incident_id] = record
    return record


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _generate_id() -> str:
    """Return a short, human-readable incident ID."""
    return f"INC-{uuid.uuid4().hex[:8].upper()}"


def _derive_title(raw_log: str, failing_test: Optional[str]) -> str:
    """Produce a concise title from the available evidence.

    Priority:
    1. Extract the last ``AssertionError`` / ``Error: …`` line.
    2. Use the failing test name.
    3. Use the first non-empty line of the raw log.
    """
    # 1. Look for a recognisable error line
    error_pattern = re.compile(
        r"(?:AssertionError|Error|Exception|FAILED)[^\n]{0,120}", re.IGNORECASE
    )
    match = error_pattern.search(raw_log)
    if match:
        return match.group(0).strip()[:120]

    # 2. Fall back to the test name
    if failing_test:
        return f"Failing test: {failing_test}"

    # 3. Fall back to the first non-blank line of the log
    for line in raw_log.splitlines():
        line = line.strip()
        if line:
            return line[:120]

    return "Untitled incident"
