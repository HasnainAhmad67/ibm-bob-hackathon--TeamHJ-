# Incident Commander — PRD

**Product Requirements Document · IBM Bob 2.0 Hackathon · Sept 25–27, 2026 · v1.0 (3-day MVP)**

---

## 1. Overview

Incident Commander is an AI teammate that watches a production incident unfold, finds root cause across logs, code, and history in parallel using Bob 2.0, and produces a draft postmortem before the on-call engineer finishes investigating manually.

Targets hackathon workflows:

* Debugging
* Application maintenance

---

## 2. Problem Statement

Production failures cause chaotic 30–60 min investigation across logs, recent deploys, war-room chat.

Fix often small; expensive part is finding what broke/why.

Postmortems often skipped due to fatigue, lessons lost, recurrence.

---

## 3. Goals

* **Speed:** simulated incident workflow under 5 minutes.
* **Correctness:** identify actual root-cause commit for at least 2 of 3 seeded bugs.
* **Reliability:** complete workflow end-to-end 3 consecutive times.
* **Explainability:** every root-cause finding references relevant logs/files/Git commits.
* **Demo impact:** core value understandable within 20 seconds.

### Target User

On-call engineer or small dev team at production break, needs fast, trustworthy first read on “what changed and why did it break,” plus reviewable fix rather than blind trust.

---

# 4. Scope

## In Scope

* One sample/seeded repo with real Git history and 2–3 intentionally injected bugs at known past commits.
* Error ingestion: stack trace / failing test / error log trigger.
* Three subagents: Log Analyst, Code Historian, Fix Writer. Log Analyst + Code Historian parallel via Bob 2.0 agent mode; combined findings to Fix Writer.
* Document understanding over sample runbooks/READMEs to match team tone.
* Automatic validation: proposed fix run against existing test suite before shown to human.
* Auto-generated postmortem: timeline, cause, impact, prevention suggestion.
* Live dashboard showing incident timeline and agents working in parallel.

## Out of Scope

* Real production monitoring integrations (PagerDuty, Datadog); simulated/injected incident.
* Multi-repo/microservice RCA.
* Auto-deploy; human final call.
* Other languages/stacks beyond one sample repo.

---

# 5. Functional Requirements

## Modules

| Module                      | Requirement                                                                                                               | Bob 2.0 Feature                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Error Ingestion**         | accepts stack trace/failing test/error log, normalizes to single incident record.                                         |                                    |
| **Log Analyst subagent**    | parse stack trace/metrics, identify failing function/module and symptom pattern.                                          | Subagents, Agent mode              |
| **Code Historian subagent** | git blame/log on implicated files; identify likely suspect commits and explain causal change.                             | Subagents, full repo context       |
| **Fix Writer subagent**     | concrete patch for cause, tested against existing suite before surfacing to human.                                        | Subagents, Agent mode              |
| **Orchestration**           | Log Analyst + Code Historian concurrently, combined output to Fix Writer.                                                 | Parallel tasks                     |
| **Document Understanding**  | sample runbooks/past postmortems so generated report matches team tone/format.                                            | Document understanding             |
| **Fix Validation**          | automatically run proposed patch against existing test suite; report pass/fail before dashboard.                          |                                    |
| **Postmortem Generator**    | draft postmortem timeline, root cause, impact, one prevention suggestion, team format.                                    | Document understanding, Agent mode |
| **Dashboard**               | live war room view: incident feed, real-time agent status visibly in parallel, root-cause report, fix status, postmortem. |                                    |

## Non-functional

* **Explainability:** every claim in root-cause report points to specific commit, file, or log line.
* **Human-in-loop:** fix shown as suggestion, never auto-applied/deployed.
* **Demo reliability:** pipeline rerun at least 3 times successfully before demo.
* **Latency:** end-to-end within a few minutes.

---

# 6. System Flow

```text
Bug report/failing test/error log
        ↓
incident record
        ↓
Log Analyst + Code Historian in parallel
        ↓
combined findings
        ↓
Fix Writer
        ↓
proposed patch tested
        ↓
root-cause report + fix status + postmortem on dashboard
        ↓
human reviews/decides
```

---

# 7. Demo Scenario & Acceptance Criteria

* Sample repo with real Git history and 2–3 bugs planted at specific past commits.
* Trigger one bug live must produce within demo window:

  * correct suspect commit
  * plain-language explanation
  * tested patch
  * draft postmortem
* Dashboard must visibly show 3 subagents running at same time, not one after another; core parallel-task proof.
* Closing metric on screen/narration e.g. target under 5 minutes.

---

# 8. Risks & Mitigations

| Risk                         | Mitigation                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Subagents inconsistent/wrong | test 2–3 seeded bugs repeatedly; pick reliable live run, backups.                                                         |
| Parallel orchestration hard  | build Log Analyst sequentially first, prove, then add Code Historian parallel; never block whole pipeline on parallelism. |
| Live demo failure            | pre-record exact scenario.                                                                                                |
| Scope creep                  | lock single sample repo/stack and don't revisit.                                                                          |

---

# 9. Judging Criteria Alignment

* **Application of Technology:** agent mode, subagents, parallel tasks, document understanding for distinct necessary reasons.
* **Business Value:** downtime cost and engineer time; postmortem-time metric.
* **Presentation:** live simulated incident, little narration.
* **Originality:** closes detection → cause → fix → documentation loop rather than stopping at code suggestions.

```

**Is version mein maine tumhari original PRD ki information ko intentionally preserve kiya hai; sirf GitHub par clean render hone ke liye Markdown styling ki hai.**
```
