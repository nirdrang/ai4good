# Design gate report 001 — Batch 0 system sheets + flagship screens

Date: 2026-07-22 · Gate: UI WoW §3 step 2 (pre-Lovable validation) · Input: the 11
GitHub-close per-screen files pulled from the design project (change order 001 delivery).

## Verdict: CONDITIONAL FAIL — one systematic finding family; otherwise high quality

The screens are substantively excellent: money rules exact (gross display, no fee line, no
prefill, $50 min + first-fund cap in plain words, general balance auto-apply, honest cost
line), never-show list clean (no stars/forks/watchers, no apply/candidate counts, no $ on
credits, no withdraw/donate, no ratings, no "verified" claim), all 9 lifecycle badges with no
paused/handoff, burn shown in tokens with the honest attribution buckets
(Exploration/Onboarding/Unattributed), plain-language activity feed (no commit jargon),
role-gated assistant NGO-only, GitHub-close direction applied (flat bar, underline tabs,
bordered rows). Lovable does NOT get these screens until the findings below are re-emitted
(change order 002).

## Findings

**F1 — WRONG STATUS AUTHORITY (must fix; d82).** The screens say requirement/task status
moves on PR merge. The adopted model: In Progress only from the volunteer's pull; Done only
from verified completion; auto-revert applies to the PM tree only. Occurrences:
- project-page.html:44 — "Tasks move only when work is merged — no one can edit this by hand"
- coordination-components.html:14 — "status moves only on PR merge"
- edge-states.html:36 — "task status moves on PR merge … Merging the work will complete it
  automatically"
- volunteer-dashboard.html:62 — "Status moves only on PR merge; manual changes are
  auto-reverted"

**F2 — TASK VOCABULARY ON NGO/PUBLIC SURFACES (must fix; d82).** Zero occurrences of
"requirement"/"must-have" as the tree unit; "task(s)" appears 14×. The PM requirement tree is
the only tree NGO/public surfaces show; its units are requirements (plain word: must-haves).
- project-page.html:50 ("Ask about this task"), :58 ("other tasks")
- coordination-components.html:14 (panel title), :24/:45 (anchor copy), :101 ("9 / 14 tasks")
- ngo-dashboard.html:42 ("9 of 14 must-have tasks")
- public-listings.html:37 ("9 / 14 tasks")
- edge-states.html:31–32 ("Task panel", "Task statuses")
Volunteer-facing dev-work language may keep "task" ONLY where it denotes the volunteer's own
dev-tree working items.

**F3 — WRONG PULL UNIT (must fix; d83).** volunteer-dashboard.html:62 "Pull a task before you
work" — the pull (and attribution) binds a requirement, not a task.

**F4 — BURN TABLE NAMING (should fix).** money-components.html:66–68 "Burn per deliverable" +
"Work item" column → burn per requirement / "Requirement" column.

**F5 — PAUSE-FAMILY WORDING (hygiene).** Not lifecycle violations, but the words keep the
never-show scans noisy: discovery-chat.html:38 "You can pause anytime" → "You can step away
anytime"; money-components.html:36 + tokens-and-badges.html:73 "AI requests are paused" →
"AI requests are stopped".

## Upstream note (spec layer, not the designer's fault)

`ui-ux-instructions.md` itself still uses "task panel"/"task-anchored" in the Batch 5 rows and
§13 while Batch 3 rows carry the d82 requirement language — a spec-internal inconsistency for
the founder to rule on (are dev-tree tasks intentionally the anchor for volunteer clarifying
questions?). Tracked; does not block change order 002.

## Per-screen verdicts

| Screen | Verdict |
|---|---|
| tokens-and-badges | PASS with F5 (one wording line) |
| money-components | PASS with F4 + F5 |
| coordination-components | FAIL — F1, F2 |
| ngo-dashboard | PASS with F2 (one counter line) |
| project-page | PASS with F1 (one caption) + F2 (two lines) |
| discovery-chat | PASS with F5 (one wording line) |
| funding | PASS |
| public-listings | PASS with F2 (one counter line) |
| volunteer-dashboard | FAIL — F1, F3 |
| project-page-mobile | PASS (inherits project-page fixes where shared) |
| edge-states | FAIL — F1, F2 |

## Re-check after change order 002 (2026-07-22)

Re-pulled all 11 screens (byte-verified against source) and re-ran the scans:
- **F1 (status authority):** FIXED — zero "moves on PR merge" phrasing in any screen file
  (only the exploration canvas retains it, correctly out of scope).
- **F2 (task vocabulary):** FIXED on the tree/counter surfaces — all now "requirement" /
  "must-haves". Two legitimate "task" usages remain and are correct: volunteer-dashboard.html
  lines 60/62 refer to the volunteer's OWN dev-tree (Linear tasks / "your dev tasks close on
  merge") — allowed by the spec.
- **F3 (pull unit):** FIXED — "Pull a requirement before you work".
- **F4 (burn table):** FIXED — "Burn per requirement" + "Requirement" column.
- **F5 (pause hygiene):** FIXED — no pause/paused wording in any screen file.

**One residual, tied to the open upstream spec question (NOT blocking):**
coordination-components.html:45 still reads "Jordan asked on the task 'Swaps need coordinator
approval'", whereas project-page.html:58 was cleaned to "waiting on this for …". This depends
on the unresolved ruling — is a clarifying question anchored to a dev-task or a requirement?
(Same ruling governs the Batch 5 comment-thread screen.) Suggested neutral fix when ruled:
"Jordan asked about 'Swaps need coordinator approval'." Tracked here; folds into the spec
decision, not a silent drop.

**Gate verdict: PASS for build.** Batch 0 screens are clear to enter the Lovable build once
bring-up is complete and Batch 0 is founder-signed-off.
