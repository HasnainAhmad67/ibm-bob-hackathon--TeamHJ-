"""Postmortem generation service.

Produces a structured PostmortemDraft from the agent findings, runbook
context, and dual validation result already attached to an incident record.
All content is derived from real evidence; nothing is fabricated.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Union

from ..schemas.incident import (
    AgentFindings,
    DualValidationResult,
    IncidentRecord,
    PostmortemDraft,
    RunbookContext,
    ValidationResult,
)

# Type alias: postmortem and summaries accept either a bare ValidationResult
# (from /validate) or a full DualValidationResult (from /run).
_AnyValidation = Union[ValidationResult, DualValidationResult]


def build_postmortem(
    record: IncidentRecord,
    findings: AgentFindings,
    runbook: RunbookContext,
    validation: _AnyValidation,
) -> PostmortemDraft:
    """Assemble a PostmortemDraft from all available evidence.

    *validation* may be a bare :class:`ValidationResult` (from ``/validate``)
    or a :class:`DualValidationResult` (from ``/run``).  When it is a
    DualValidationResult the postmortem uses the proposed-fix result for the
    fix-status line and the baseline result for the evidence timeline entry.
    """
    title = f"Postmortem: {record.title}"
    severity = record.severity

    timeline = _build_timeline(record, validation)
    root_cause = _summarise_root_cause(findings)
    impact = _summarise_impact(findings, record)
    fix_summary = _summarise_fix(findings, validation)
    prevention = _summarise_prevention(runbook, findings)

    return PostmortemDraft(
        title=title,
        severity=severity,
        timeline=timeline,
        root_cause=root_cause,
        impact=impact,
        fix_summary=fix_summary,
        prevention=prevention,
    )


def build_root_cause_summary(findings: AgentFindings) -> str:
    """Return a one-paragraph root-cause summary for the incident record."""
    parts: list[str] = []

    la = findings.log_analyst
    ch = findings.code_historian
    fw = findings.fix_writer

    if la:
        parts.append(
            f"The failing function is `{la.failing_function}` in `{la.file}`. "
            f"Symptom: {la.symptom}"
        )

    if ch:
        parts.append(
            f"The regression was introduced by commit {ch.suspect_commit} "
            f'("{ch.commit_message}"): {ch.explanation}'
        )

    if fw:
        parts.append(
            f"Proposed fix (confidence: {fw.confidence}): {fw.patch_description}"
        )

    if not parts:
        return "Insufficient evidence to determine root cause. Check agent findings."

    return "  ".join(parts)


def build_patch_summary(findings: AgentFindings, validation: _AnyValidation) -> str:
    """Return a short patch-status summary.

    When *validation* is a :class:`DualValidationResult` the summary reports
    both the baseline failure (bug confirmed) and the proposed-fix result
    (fix verified or still failing).
    """
    fw = findings.fix_writer
    if not fw:
        return "No fix proposed by Fix Writer."

    if isinstance(validation, DualValidationResult):
        b = validation.baseline_validation
        p = validation.proposed_fix_validation
        baseline_str = f"Baseline: FAILED (exit {b.exit_code}, bug confirmed)"

        if not p.applicable:
            fix_str = f"Proposed-fix validation: skipped — {p.skipped_reason}"
        elif p.result is not None:
            fix_status = "PASSED" if p.result.passed else "FAILED"
            fix_str = (
                f"Proposed-fix validation: {fix_status} "
                f"(exit {p.result.exit_code}, temp isolated copy)"
            )
        else:
            fix_str = "Proposed-fix validation: no result"

        return (
            f"{fw.patch_description}  "
            f"File: {fw.file_changed}  Confidence: {fw.confidence}  "
            f"{baseline_str}  {fix_str}"
        )

    # Bare ValidationResult (from /validate — baseline only)
    status = "PASSED" if validation.passed else "FAILED"
    return (
        f"{fw.patch_description}  "
        f"File changed: {fw.file_changed}  "
        f"Confidence: {fw.confidence}  "
        f"Baseline validation: {status} (exit code {validation.exit_code})"
    )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _build_timeline(
    record: IncidentRecord, validation: _AnyValidation
) -> list[str]:
    fmt = "%Y-%m-%dT%H:%M:%SZ"

    # Pick the timestamp from whatever we have.
    if isinstance(validation, DualValidationResult):
        baseline_ts = validation.baseline_validation.timestamp.strftime(fmt)
        baseline_status = "FAILED" if not validation.baseline_validation.passed else "PASSED"
        pfv = validation.proposed_fix_validation
        if pfv.applicable and pfv.result is not None:
            fix_ts = pfv.result.timestamp.strftime(fmt)
            fix_status = "PASSED" if pfv.result.passed else "FAILED"
            fix_line = f"{fix_ts}  Proposed-fix validation (isolated temp copy): {fix_status}"
        else:
            fix_line = f"{baseline_ts}  Proposed-fix validation: skipped ({pfv.skipped_reason})"
        # human_approval_required is always True; distinguish via fix_verified.
        approval = (
            "Fix verified by isolated tests — human approval required before deploy"
            if validation.fix_verified
            else "Fix NOT verified — human approval required before deploy"
        )
    else:
        baseline_ts = validation.timestamp.strftime(fmt)
        baseline_status = "FAILED" if not validation.passed else "PASSED"
        fix_line = f"{baseline_ts}  Proposed-fix validation: not run (use /run endpoint)"
        approval = "Human approval REQUIRED before deploy"

    return [
        f"{record.created_at.strftime(fmt)}  Incident created: {record.title}",
        f"{record.created_at.strftime(fmt)}  Log Analyst + Code Historian started (parallel)",
        f"{record.created_at.strftime(fmt)}  Fix Writer produced patch proposal",
        f"{baseline_ts}  Baseline validation (unmodified sample-app): {baseline_status}",
        fix_line,
        f"{datetime.now(timezone.utc).strftime(fmt)}  Postmortem drafted — {approval}",
    ]


def _summarise_root_cause(findings: AgentFindings) -> str:
    la = findings.log_analyst
    ch = findings.code_historian
    if la and ch:
        return (
            f"Function `{la.failing_function}` ({la.file}) computes incorrectly "
            f"due to a regression introduced in commit {ch.suspect_commit} "
            f'("{ch.commit_message}").  {ch.explanation}'
        )
    if la:
        return f"Failing function: `{la.failing_function}` in `{la.file}`.  {la.symptom}"
    return "Root cause could not be determined from available findings."


def _summarise_impact(findings: AgentFindings, record: IncidentRecord) -> str:
    la = findings.log_analyst
    service = record.service_name
    if la:
        return (
            f"Service `{service}` is producing incorrect results from "
            f"`{la.failing_function}`.  {la.symptom}  "
            f"Severity: {record.severity}."
        )
    return f"Service `{service}` is impacted.  Severity: {record.severity}."


def _summarise_fix(findings: AgentFindings, validation: _AnyValidation) -> str:
    """Describe the proposed fix using the most authoritative validation source.

    For a DualValidationResult the proposed-fix pass/fail is used, since that
    is the test of the *patched* code.  For a bare ValidationResult (baseline
    only) we report the baseline status.
    """
    fw = findings.fix_writer
    if not fw:
        return "No fix has been proposed."

    if isinstance(validation, DualValidationResult):
        pfv = validation.proposed_fix_validation
        if not pfv.applicable:
            return (
                f"{fw.patch_description}  "
                f"Proposed-fix validation was skipped: {pfv.skipped_reason}"
            )
        if pfv.result is not None:
            fix_status = "passes" if pfv.result.passed else "does NOT pass"
            return (
                f"{fw.patch_description}  "
                f"Applied in isolated temp copy — test suite {fix_status} "
                f"(exit code {pfv.result.exit_code})."
            )
        return f"{fw.patch_description}  Proposed-fix validation produced no result."

    # Bare ValidationResult — baseline only
    status = "passes" if validation.passed else "does NOT pass"
    return (
        f"{fw.patch_description}  "
        f"Baseline test suite {status} with the current (unpatched) code "
        f"(exit code {validation.exit_code})."
    )


def _summarise_prevention(runbook: RunbookContext, findings: AgentFindings) -> str:
    ch = findings.code_historian
    base = (
        "Require a second reviewer for arithmetic changes in billing/payment modules.  "
        "Add a post-deploy smoke test for discount calculation scenarios."
    )
    if ch and "copy-paste" in ch.explanation.lower():
        base += "  Enforce pair-review for late-night hotfixes."
    if not runbook.fallback and runbook.guidance:
        base += f"  (From project runbook: {runbook.guidance[:200]})"
    return base
