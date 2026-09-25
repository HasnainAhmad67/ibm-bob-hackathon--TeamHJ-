# Incident-Commander
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
