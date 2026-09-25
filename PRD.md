Incident Commander — PRD
Product Requirements Document  ·  IBM Bob 2.0 Hackathon  ·  Sept 25–27, 2026  ·  v1.0 

1.Overview
Incident Commander is an AI teammate that watches a production incident unfold, finds the root cause across logs, code, and history in parallel using Bob 2.0, and produces a draft postmortem before the on-call engineer finishes investigating manually. It targets two workflows named directly in the hackathon brief: debugging and application maintenance.
2.Problem Statement
When a production system breaks, the first 30–60 minutes are chaotic: engineers dig through scattered logs, guess which recent deploy is responsible, and interrupt each other in a war-room chat. The fix itself is often small — the expensive part is finding what broke and why. Afterward, someone still has to write a postmortem that nobody has energy left for, so lessons get lost and the same class of bug can recur.
3. Goals
Speed: Target to complete the simulated incident investigation workflow in under 5 minutes.
Correctness: Identify the actual root-cause commit for at least 2 out of 3 seeded bugs.
Reliability: Successfully run the complete workflow end-to-end 3 consecutive times.
Explainability: Every root-cause finding should reference relevant logs, files, or Git commits.
Demo Impact: The core value of Incident Commander should be understandable within 20 seconds.
Target User
The on-call engineer or small dev team at the moment production breaks — someone who needs a fast, trustworthy first read on "what changed and why did it break," plus a fix they can review rather than blindly trust.
4.Scope
In scope for the 3-day MVP:
●One sample/seeded repo with a real git history and 2–3 intentionally injected bugs at known past commits.Error ingestion: accept a stack trace / failing test / error log as the trigger.
●Three subagents: Log Analyst, Code Historian, and Fix Writer. Log Analyst and Code Historian run in parallel via Bob 2.0 agent mode; their combined findings are then passed to Fix Writer.
●Document understanding over a small set of sample runbooks/READMEs so report tone matches a real team.
●Automatic validation: proposed fix is run against the existing test suite before being shown to a human.
●Auto-generated postmortem (timeline, cause, impact, prevention suggestion).
●A live dashboard showing the incident timeline and agents working in parallel.
Out of scope for the 3-day MVP:
●Real production monitoring integration (PagerDuty, Datadog, etc.) — the demo uses a simulated/injected incident instead.
●Multi-repo or microservice-spanning root-cause analysis.
●Auto-deploying the fix — a human always makes the final call, by design.
●Support for languages/stacks beyond the one sample repo chosen for the demo.
4.Functional Requirements
Module	Requirement	Bob 2.0 feature used
Error Ingestion	Accept a stack trace, failing test output, or error log as input and normalize it into a single incident record.	—
Log Analyst
(subagent)	Parse the stack trace and any available metrics; identify the failing function/module and the symptom pattern.	Subagents, Agent mode
Code Historian
(subagent)	Walk git blame/log on the implicated files; identify the most likely suspect commit(s) and explain the causal change in plain language.	Subagents, full repo context
Fix Writer (subagent)	Propose a concrete patch for the identified cause; must be tested against the existing suite before surfacing to a human.	Subagents, Agent mode
Orchestration:	Run Log Analyst and Code Historian concurrently (not sequentially); pass their combined output to Fix Writer.	Parallel tasks
Document
Understanding	Ingest sample runbooks/past postmortems so the generated report matches the team's real tone and format, not a generic template.	Document understanding
Fix Validation	Automatically run the proposed patch against the existing test suite; report pass/fail before it reaches the dashboard.	—
Postmortem
Generator	Produce a draft postmortem: timeline, root cause, impact, and one prevention suggestion, in the team's own format.	Document understanding, Agent mode
Dashboard	Live "war room" view: incident feed, real-time agent status (visibly running in parallel), root-cause report, fix status, postmortem.	Visualizes all of the above

Non-Functional Requirements
●Explainability: every claim in the root-cause report must point to a specific commit, file, or log line — no unexplained assertions.
●Human-in-the-loop: the fix is always shown as a suggestion for review, never auto-applied or auto-deployed.
●Demo reliability: the pipeline must be re-run at least 3 times successfully before the live/recorded demo to rule out a one-time fluke.
●Latency: end-to-end run should complete within a few minutes to keep a live demo watchable.
5.System Flow
Bug report / failing test / error log  →  Incident record created  →  Log Analyst + Code Historian run in parallel  →  combined findings passed to Fix Writer  →  proposed patch tested against existing suite  →  root-cause report + fix status + postmortem rendered on the dashboard  →  human reviews and decides.
6.Demo Scenario & Acceptance Criteria
●A sample repo with real git history has 2–3 bugs deliberately planted at specific past commits.
●Triggering one bug live must produce, within the demo window: a correct suspect commit, a plain-language explanation, a tested patch, and a draft postmortem. ● The dashboard must visibly show the three subagents running at the same time, not one after another — this is the core "parallel tasks" proof point for judges.
●A single closing metric (e.g. " Target: complete the simulated incident investigation workflow in under 5 minutes.") must be stated on screen or in narration.
7.Risks & Mitigations
Risk	Mitigation
Subagents give inconsistent or wrong root-cause answers on demo day.	Test against 2–3 seeded bugs repeatedly before the demo; pick the most reliable one for the live run and keep others as backup.
Parallel orchestration is technically hard to get working in Bob 2.0 within the time limit.	Build Log Analyst first end-to-end (sequential), prove it works, then add Code Historian in parallel — never block the whole pipeline on parallelism working on day 1.
Live demo fails on stage (network, flaky run).	Always have a pre-recorded backup run of the exact same scenario ready to play.
Scope creep (trying to support many languages/repos).	Lock a single sample repo and stack on Day 1 evening and do not revisit that decision.
8.Judging Criteria Alignment
Criterion	How Incident Commander scores
Application of Technology	Uses agent mode, subagents, parallel tasks, and document understanding for distinct, necessary reasons — not as checkbox features.
Business Value	Downtime cost and engineer time are easy to quantify; the postmortem-time metric is concrete and judge-friendly.
Presentation	A live, simulated incident is a naturally dramatic demo that needs little narration to land.
Originality	Closes the loop from detection → cause → fix → documentation, instead of stopping at code suggestions like most AI dev tools.

