# Batch-6 PRD tensions (surfaced by AT round-1 critique, REQ-013/014/036/015/016)

Numbering continues from batch 5 (T4-T6).

## T7 — restricted project-page thread vs REQ-010's identical-page rule

**The collision (codex round-1, AT-015.01):** REQ-015 puts the comment thread on the PROJECT PAGE with restricted membership (NGO admins, the assigned volunteer, the platform admin only when escalated). REQ-010 says the project page's read-only content is "the same for NGO admins, the assigned volunteer, platform admins, and logged-out visitors" and calls the NGO assistant "the one viewer-specific element." A role-restricted thread on that page cannot satisfy the identical-content rule as written.

**Proposed resolution (editorial candidate):** REQ-010's identical-content rule governs the READ-ONLY STATUS CONTENT (scope, status, tasks, activity, cadence, files metadata, Q&A log); authenticated INTERACTIVE elements are outside it. The assistant is already carved out; the thread is the second such element and REQ-010's wording should name it: "the same for … logged-out visitors, with two viewer-specific elements: the NGO assistant (REQ-033) and the comment thread (REQ-015, participants only)." REQ-015 unchanged. AT-REQ-010's identical-page test gains the thread exclusion alongside the assistant's.

**Why editorial:** both requirements already coexist deliberately (the thread's restricted membership is explicit in REQ-015; the assistant carve-out shows REQ-010's rule was never absolute); only the "one viewer-specific element" counting sentence is stale.

---

**T7 RESOLVED (d80, founder-ruled):** the breaker (batch6-t7-verdict.json) reclassified T7 as founder-ruling-needed — REQ-015's words never chose between participant-only reading and public-read/participant-post, a privacy-boundary product choice. Founder ruled 2026-07-18: **PARTICIPANTS ONLY** (read + post; history retained for authorized readers post-terminal, posting frozen). The breaker also killed exception-counting: REQ-010 now states the two-layer contract (identical public status PROJECTION; role-gated communications/controls per owning requirements).

## T8 — REQ-036 gate + REQ-030 drift notifications unregistered in REQ-016's closed taxonomy (from 036/016 round-2)

Both r2 critiques flagged the same shape d78/T4 already settled: events mandated elsewhere (gap report → volunteer; gate-pass + backlog-live → NGO; large/undecidable drift → platform admin) were absent from the closed static taxonomy. **RESOLVED d81 (editorial, per the T4 precedent and both r2 verdicts' identical prescription):** two taxonomy rows added (PRD gate; money corrections).

## T9 — payment events vs the task-tied activity feed (from 015 round-2)

AT-015.05 had asserted every system event surfaces in "notifications and the activity feed," but REQ-010's feed is task-tied and a payment event has no task title. **RESOLVED (AT-side, per codex's own fix):** REQ-015's "notifications and activity feeds" reads DISTRIBUTIVELY — every event notifies; only task-tied events additionally hit the feed. No PRD edit; AT-015.05 scoped accordingly.
