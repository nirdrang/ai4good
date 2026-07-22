# Change order 002 — requirement vocabulary + status authority (d82/d83 alignment)

Date: 2026-07-22 · From: the build session (design gate report 001) · Status: OPEN
Project: AI4GOOD platform screens · Scope: text-only edits in 8 of the 11 screens/ files —
no layout, color, or structural changes. GitHub-close direction is approved and untouched.

## Why

The screens describe the OLD status model ("tasks move on PR merge"). The adopted model
(decisions d82/d83): NGO and public surfaces show the PM REQUIREMENT tree; a requirement goes
In Progress only when the volunteer pulls it, and Done only through verified completion;
manual status changes auto-revert (PM tree only). "Task" survives only for the volunteer's own
dev-tree working items.

## Exact edits

1. screens/project-page.html — caption "Tasks move only when work is merged — no one can edit
   this by hand" → "Status here moves only through the volunteer's pull and verified
   completion — no one can edit it by hand."
2. screens/project-page.html — "Ask about this task" → "Ask about this"; "The build continues
   on other tasks meanwhile" → "The build continues on other must-haves meanwhile."
3. screens/coordination-components.html — panel title "Task tree panel — plain language,
   read-only, status moves only on PR merge" → "Requirement tree panel — plain language,
   read-only; status moves only through pull + verified completion"; "Ask about this task" →
   "Ask about this"; "The build continues on other tasks meanwhile" → "…other must-haves
   meanwhile"; counter "9 / 14 tasks" → "9 of 14 must-haves".
4. screens/ngo-dashboard.html — "9 of 14 must-have tasks" → "9 of 14 must-haves".
5. screens/public-listings.html — "9 / 14 tasks" → "9 of 14 must-haves".
6. screens/edge-states.html — "Task panel stale" → "Progress panel stale"; "Task statuses
   were last updated…" → "Progress was last updated…"; revert notice "task status moves on PR
   merge, so we've reverted the manual change on 'Sign-up & swaps'. Merging the work will
   complete it automatically." → "requirement status moves only through the volunteer's pull
   and verified completion, so we've reverted the manual change on 'Sign-up & swaps'. It will
   complete automatically when the work is verified."
7. screens/volunteer-dashboard.html — "Pull a task before you work — every request carries
   attribution. Status moves only on PR merge; manual changes are auto-reverted." → "Pull a
   requirement before you work — every request carries attribution. Requirements complete
   through verified completion; your dev tasks close on merge as usual."
8. screens/money-components.html — "Burn per deliverable — tokens only (REQ-034)" → "Burn per
   requirement — tokens only (REQ-034)"; column header "Work item" → "Requirement".
9. Wording hygiene (keeps automated never-show scans clean): screens/discovery-chat.html
   "You can pause anytime" → "You can step away anytime"; screens/money-components.html +
   screens/tokens-and-badges.html "AI requests are paused" → "AI requests are stopped".

## Done when

The nine edits are applied in the screens/ files (canvas untouched); no other text changed.
The build session re-runs the gate scans and expects: ≥1 "requirement/must-have" occurrence
per tree surface, zero "moves on PR merge" phrasing, zero pause-family wording.
