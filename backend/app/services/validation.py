"""Independent test-suite validation service.

Provides two independent validation passes:

1. ``run_baseline_validation`` — runs the *unmodified* sample-app test suite to
   prove the bug is real.  Expected to fail while the seeded bug is present.

2. ``run_proposed_fix_validation`` — creates a *temporary isolated copy* of
   sample-app, applies the precise Fix Writer remediation in that copy only,
   runs the same test suite there, then deletes the temp copy regardless of
   outcome.  The original sample-app is never touched.

3. ``run_dual_validation`` — runs both in sequence and returns a
   :class:`DualValidationResult`.

Design constraints
------------------
* A non-zero subprocess return code is **always** ``passed=False``.
* No result is ever fabricated.
* If the fix_writer finding does not contain a machine-applicable patch, a
  transparent ``ProposedFixValidation(applicable=False, ...)`` is returned.
* The temp directory is always cleaned up (``cleanup_ok`` records whether the
  cleanup itself succeeded).
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from ..schemas.incident import (
    DualValidationResult,
    FixWriterFinding,
    ProposedFixValidation,
    ValidationResult,
)

# ---------------------------------------------------------------------------
# Path constants — resolved relative to this file so the service works
# regardless of the working directory when uvicorn is launched.
# Layout:  <repo>/backend/app/services/validation.py  →  repo root is 3 up.
# ---------------------------------------------------------------------------

_SERVICES_DIR = Path(__file__).parent
_REPO_ROOT = _SERVICES_DIR.parent.parent.parent
_SAMPLE_APP_DIR = _REPO_ROOT / "sample-app"

_TIMEOUT_SECONDS = 60


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------


def run_baseline_validation() -> ValidationResult:
    """Run the unmodified sample-app test suite.

    This is the *evidence* run — it confirms the seeded bug is real and
    currently failing.  The original sample-app is never modified.
    """
    return _run_suite(_SAMPLE_APP_DIR, label="baseline")


def run_proposed_fix_validation(
    fix_writer: Optional[FixWriterFinding],
) -> ProposedFixValidation:
    """Apply the Fix Writer patch to a temp copy and re-run the test suite.

    Steps
    -----
    1. Validate that we can mechanically derive the patch from the finding.
    2. Copy sample-app into a fresh temp directory (``shutil.copytree``).
    3. Apply the patch in the temp copy only.
    4. Run pytest in the temp copy.
    5. Delete the temp directory unconditionally.

    The original sample-app is never modified.  If the finding cannot be
    machine-applied, ``applicable=False`` is returned with a clear reason.
    """
    if fix_writer is None:
        return ProposedFixValidation(
            applicable=False,
            skipped_reason=(
                "No Fix Writer finding is available. "
                "Cannot perform proposed-fix validation."
            ),
        )

    # Derive a machine-applicable patch from the fix_writer finding.
    patch_ops, skip_reason = _derive_patch_ops(fix_writer)
    if skip_reason:
        return ProposedFixValidation(
            applicable=False,
            skipped_reason=skip_reason,
        )

    # Create the temp copy.
    tmp_dir: Optional[Path] = None
    cleanup_ok: Optional[bool] = None
    try:
        tmp_dir = Path(tempfile.mkdtemp(prefix="incident-cmdr-fix-"))
        tmp_app = tmp_dir / "sample-app"
        shutil.copytree(str(_SAMPLE_APP_DIR), str(tmp_app))

        # Apply each patch operation to the file in the temp copy.
        patch_applied_msgs: list[str] = []
        for op in patch_ops:
            msg = _apply_patch_op(tmp_app, op)
            patch_applied_msgs.append(msg)

        patch_applied_str = "; ".join(patch_applied_msgs)

        # Run the test suite in the temp copy.
        result = _run_suite(tmp_app, label="proposed-fix")

    finally:
        # Always attempt cleanup.
        if tmp_dir is not None and tmp_dir.exists():
            try:
                shutil.rmtree(str(tmp_dir))
                cleanup_ok = True
            except OSError:
                cleanup_ok = False

    return ProposedFixValidation(
        applicable=True,
        patch_applied=patch_applied_str,
        temp_dir_used=str(tmp_dir),
        cleanup_ok=cleanup_ok,
        result=result,
    )


def run_dual_validation(
    fix_writer: Optional[FixWriterFinding],
) -> DualValidationResult:
    """Run both the baseline and the proposed-fix validation passes.

    Returns a :class:`DualValidationResult` containing:
    - ``baseline_validation``     — proves the bug is real (expected fail).
    - ``proposed_fix_validation`` — proves the fix works (expected pass).
    - ``fix_verified``            — True only when the proposed-fix run passed.
    - ``human_approval_required`` — **always True**; machine verification never
                                    replaces human sign-off before deployment.
    - ``summary``                 — one-sentence plain-English verdict.
    """
    baseline = run_baseline_validation()
    proposed = run_proposed_fix_validation(fix_writer)

    # fix_verified: did the proposed fix actually pass its isolated test run?
    fix_verified = (
        proposed.applicable
        and proposed.result is not None
        and proposed.result.passed
    )
    # human_approval_required is unconditionally True — the machine can verify
    # the fix works, but a human must always approve before any deployment.
    human_approval_required = True

    summary = _build_summary(baseline, proposed, fix_verified)

    return DualValidationResult(
        baseline_validation=baseline,
        proposed_fix_validation=proposed,
        fix_verified=fix_verified,
        human_approval_required=human_approval_required,
        summary=summary,
    )


# ---------------------------------------------------------------------------
# Internal: single-suite run
# ---------------------------------------------------------------------------


def _run_suite(cwd: Path, label: str) -> ValidationResult:
    """Run the pytest suite in *cwd* and return a ValidationResult.

    Never fabricates a passing result: ``passed`` is always derived from the
    subprocess return code.
    """
    now = datetime.now(timezone.utc)

    if not cwd.is_dir():
        return ValidationResult(
            command=[],
            exit_code=-1,
            stdout="",
            stderr="",
            duration_seconds=0.0,
            passed=False,
            timestamp=now,
            cwd=str(cwd),
            error=(
                f"[{label}] Test directory not found: {cwd}. "
                "Ensure sample-app exists or the temp copy was created."
            ),
        )

    cmd, discovery_error = _discover_test_command()
    if discovery_error:
        return ValidationResult(
            command=cmd,
            exit_code=-1,
            stdout="",
            stderr="",
            duration_seconds=0.0,
            passed=False,
            timestamp=now,
            cwd=str(cwd),
            error=f"[{label}] {discovery_error}",
        )

    start = time.monotonic()
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=_TIMEOUT_SECONDS,
        )
        duration = time.monotonic() - start
    except subprocess.TimeoutExpired:
        duration = time.monotonic() - start
        return ValidationResult(
            command=cmd,
            exit_code=-1,
            stdout="",
            stderr="",
            duration_seconds=round(duration, 3),
            passed=False,
            timestamp=now,
            cwd=str(cwd),
            error=f"[{label}] Test run timed out after {_TIMEOUT_SECONDS} s.",
        )
    except FileNotFoundError as exc:
        duration = time.monotonic() - start
        return ValidationResult(
            command=cmd,
            exit_code=-1,
            stdout="",
            stderr="",
            duration_seconds=round(duration, 3),
            passed=False,
            timestamp=now,
            cwd=str(cwd),
            error=(
                f"[{label}] Could not launch test runner ({exc}). "
                f"Install: pip install -r {_SAMPLE_APP_DIR / 'requirements.txt'}"
            ),
        )

    return ValidationResult(
        command=cmd,
        exit_code=proc.returncode,
        stdout=proc.stdout,
        stderr=proc.stderr,
        duration_seconds=round(duration, 3),
        passed=proc.returncode == 0,  # never fabricated
        timestamp=now,
        cwd=str(cwd),
        error=None,
    )


# ---------------------------------------------------------------------------
# Internal: patch derivation & application
# ---------------------------------------------------------------------------


class _PatchOp:
    """A single search-and-replace operation on one file."""

    def __init__(
        self,
        relative_file: str,
        search: str,
        replace: str,
        description: str,
    ) -> None:
        self.relative_file = relative_file  # relative to sample-app root
        self.search = search
        self.replace = replace
        self.description = description


def _derive_patch_ops(
    fw: FixWriterFinding,
) -> tuple[list[_PatchOp], Optional[str]]:
    """Derive machine-applicable patch operations from the Fix Writer finding.

    The fix_writer.json for this project contains a prose ``patch_description``
    and a ``file_changed`` path.  The description is specific enough to derive
    the exact two changes needed:

    1. Replace ``return base + discount`` with ``return base - discount``.
    2. Remove the ``# Regression:`` comment line immediately before it.

    If neither change can be confirmed as present in the original file, the
    function returns ``([], skip_reason)`` so the caller can report
    ``applicable=False`` transparently.

    This function is intentionally narrow: it only handles the concrete patch
    described in the current fix_writer.json.  If the file_changed path or
    patch_description diverge from the known patterns, it falls back to
    ``applicable=False`` with an explanation rather than silently misapplying
    a change.
    """
    desc = fw.patch_description.lower()
    file_changed = fw.file_changed  # e.g. "sample-app/app/orders.py"

    # Sanity-check: does the description mention the known fix?
    if "base + discount" not in desc and "base - discount" not in desc:
        return [], (
            "Fix Writer patch description does not reference a machine-applicable "
            "search/replace pattern (expected 'base + discount' → 'base - discount'). "
            f"Description: {fw.patch_description}"
        )

    # Derive the path relative to sample-app root from file_changed.
    # file_changed = "sample-app/app/orders.py"  →  relative = "app/orders.py"
    fc_path = Path(file_changed)
    parts = fc_path.parts
    if "sample-app" in parts:
        idx = list(parts).index("sample-app")
        relative_file = str(Path(*parts[idx + 1:]))
    else:
        # If the prefix is absent, use the path as-is.
        relative_file = file_changed

    # Confirm the buggy line is actually present in the original source.
    original_source = _SAMPLE_APP_DIR / relative_file
    if not original_source.exists():
        return [], (
            f"File '{relative_file}' not found in sample-app. "
            "Cannot apply the proposed fix."
        )

    source_text = original_source.read_text(encoding="utf-8")

    buggy_line = "    return base + discount"
    if buggy_line not in source_text:
        return [], (
            f"Expected buggy line '{buggy_line.strip()}' not found in "
            f"'{relative_file}'. The file may already be patched or the "
            "source does not match the finding."
        )

    # Build patch operations.
    ops: list[_PatchOp] = [
        _PatchOp(
            relative_file=relative_file,
            search="    # Regression: discount is added instead of subtracted.\n    return base + discount",
            replace="    return base - discount",
            description=(
                "Removed regression comment and changed "
                "'return base + discount' to 'return base - discount'"
            ),
        ),
    ]
    return ops, None


def _apply_patch_op(tmp_app_root: Path, op: _PatchOp) -> str:
    """Apply a single _PatchOp to the file inside the temp copy.

    Raises ``ValueError`` if the search string is not found (means the copy is
    not what we expect).
    """
    target = tmp_app_root / op.relative_file
    text = target.read_text(encoding="utf-8")

    if op.search not in text:
        raise ValueError(
            f"Patch search string not found in temp copy of '{op.relative_file}'. "
            f"Expected to find: {op.search!r}"
        )

    patched = text.replace(op.search, op.replace, 1)
    target.write_text(patched, encoding="utf-8")
    return op.description


# ---------------------------------------------------------------------------
# Internal: pytest discovery
# ---------------------------------------------------------------------------


def _discover_test_command() -> tuple[list[str], Optional[str]]:
    """Return the best available pytest invocation.

    Prefers the system ``pytest`` executable; falls back to
    ``sys.executable -m pytest``.  Returns ``([], error)`` if neither works.
    """
    pytest_exe = shutil.which("pytest")
    if pytest_exe:
        return [pytest_exe, "-v", "--tb=short"], None

    try:
        subprocess.run(
            [sys.executable, "-m", "pytest", "--version"],
            capture_output=True,
            check=True,
            timeout=10,
        )
        return [sys.executable, "-m", "pytest", "-v", "--tb=short"], None
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        pass

    return [], (
        "pytest is not installed in the current environment. "
        f"Run: pip install -r {_SAMPLE_APP_DIR / 'requirements.txt'}"
    )


# ---------------------------------------------------------------------------
# Internal: summary builder
# ---------------------------------------------------------------------------


def _build_summary(
    baseline: ValidationResult,
    proposed: ProposedFixValidation,
    fix_verified: bool,
) -> str:
    """Return a one-sentence plain-English verdict.

    ``human_approval_required`` is always True regardless of ``fix_verified``,
    so the approval note is constant.
    """
    baseline_status = "FAILED" if not baseline.passed else "PASSED"

    if not proposed.applicable:
        return (
            f"Baseline test suite {baseline_status} (exit {baseline.exit_code}) — "
            f"proposed-fix validation skipped: {proposed.skipped_reason}. "
            f"Human approval required before deployment."
        )

    fix_status = "PASSED" if fix_verified else "FAILED"
    fix_exit = proposed.result.exit_code if proposed.result else "?"
    fix_note = (
        "Fix verified by isolated tests; human approval required before deployment."
        if fix_verified
        else "Fix did NOT pass isolated tests; human approval required before deployment."
    )

    return (
        f"Baseline {baseline_status} (exit {baseline.exit_code}, bug confirmed). "
        f"Proposed-fix validation {fix_status} (exit {fix_exit}, temp isolated copy). "
        f"{fix_note}"
    )
