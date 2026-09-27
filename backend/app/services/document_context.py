"""Document understanding and runbook context service.

Scans ``sample-app/`` for useful project documents (runbooks, READMEs,
postmortems) and produces a concise :class:`RunbookContext` object without
fabricating content.
"""

from __future__ import annotations

from pathlib import Path

from ..schemas.incident import RunbookContext

# ---------------------------------------------------------------------------
# Path constants
# ---------------------------------------------------------------------------

_SERVICES_DIR = Path(__file__).parent
_REPO_ROOT = _SERVICES_DIR.parent.parent.parent
_SAMPLE_APP_DIR = _REPO_ROOT / "sample-app"

# Files searched in priority order.
_CANDIDATE_GLOBS = [
    "docs/runbook.md",
    "docs/runbook.txt",
    "RUNBOOK.md",
    "runbook.md",
    "README.md",
    "README.txt",
    "docs/postmortem*.md",
    "postmortem*.md",
    "docs/*.md",
    "*.md",
]

# Maximum characters read per document to avoid flooding the context.
_MAX_CHARS_PER_DOC = 4_000


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------


def build_runbook_context() -> RunbookContext:
    """Search ``sample-app/`` for documentation and return a RunbookContext.

    If no documents are found the function returns a clearly-labelled fallback
    rather than raising an error.
    """
    docs = _collect_docs()

    if not docs:
        return RunbookContext(
            source_files=[],
            guidance="No runbook found; using a neutral incident-response tone.",
            postmortem_outline=_neutral_postmortem_outline(),
            fallback=True,
        )

    source_files = [str(Path(p).relative_to(_REPO_ROOT)) for p, _ in docs]
    combined_text = "\n\n---\n\n".join(content for _, content in docs)

    guidance = _extract_guidance(combined_text)
    outline = _extract_postmortem_outline(combined_text)

    return RunbookContext(
        source_files=source_files,
        guidance=guidance,
        postmortem_outline=outline,
        fallback=False,
    )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _collect_docs() -> list[tuple[str, str]]:
    """Return a list of (absolute_path, truncated_content) pairs.

    Only files that actually exist and are readable are returned.
    """
    seen: set[Path] = set()
    results: list[tuple[str, str]] = []

    for glob_pattern in _CANDIDATE_GLOBS:
        for path in sorted(_SAMPLE_APP_DIR.glob(glob_pattern)):
            resolved = path.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            try:
                content = path.read_text(encoding="utf-8", errors="replace")
                if content.strip():
                    results.append((str(resolved), content[:_MAX_CHARS_PER_DOC]))
            except OSError:
                pass

    return results


def _extract_guidance(text: str) -> str:
    """Extract key guidance sentences from the combined document text.

    Looks for lines that contain actionable keywords and returns them as a
    short paragraph.  Falls back to a generic description of the document.
    """
    keywords = [
        "severity", "p1", "p2", "p3", "response", "investigation",
        "prevention", "runbook", "postmortem", "owner", "tone", "format",
        "step", "action", "checklist", "review", "deploy",
    ]
    guidance_lines: list[str] = []
    for line in text.splitlines():
        lower = line.lower()
        if any(kw in lower for kw in keywords) and len(line.strip()) > 10:
            guidance_lines.append(line.strip())
            if len(guidance_lines) >= 8:
                break

    if guidance_lines:
        return " | ".join(guidance_lines)

    # Generic fallback using first 300 characters.
    return text.strip()[:300].replace("\n", " ")


def _extract_postmortem_outline(text: str) -> str:
    """Return a postmortem-style outline based only on available evidence."""
    sections = [
        "## Postmortem Outline (auto-generated from project documentation)\n",
        "**Timeline:** (populate from incident timestamps)\n",
        "**Root Cause:** (see Log Analyst and Code Historian findings)\n",
        "**Impact:** (describe scope of customer or system impact)\n",
        "**Detection:** (how was the incident detected?)\n",
        "**Resolution:** (describe the applied fix and deployment)\n",
        "**Prevention:** (action items with owners and due dates)\n",
    ]

    # If the docs mention a 5-Why format, note it.
    if "5-why" in text.lower() or "five why" in text.lower():
        sections.insert(2, "**5-Why Analysis:** (apply 5-Why root-cause analysis)\n")

    # If the docs mention UTC, add a note.
    if "utc" in text.lower():
        sections.insert(1, "*(All timestamps in UTC)*\n")

    return "".join(sections)


def _neutral_postmortem_outline() -> str:
    """Return a generic postmortem outline when no documents exist."""
    return (
        "## Postmortem Outline\n"
        "**Timeline:** (populate from incident timestamps)\n"
        "**Root Cause:** (see Log Analyst and Code Historian findings)\n"
        "**Impact:** (describe scope of customer or system impact)\n"
        "**Detection:** (how was the incident detected?)\n"
        "**Resolution:** (describe the applied fix and deployment)\n"
        "**Prevention:** (action items with owners and due dates)\n"
    )
