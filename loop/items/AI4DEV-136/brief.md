# Brief for AI4DEV-136 (data-sensitivity tiers and fit decline)

Chain: AI4PM-26 (AI Discovery agent) > AI4DEV-131 (Discovery dev root) > AI4DEV-136 (data-sensitivity tiers and fit decline)
Branch: claude/project-thread-66lpvh (the cloud session's assigned branch; it carries no item id, so the pull request body holds the one sanctioned line `Closes AI4DEV-136`)
PRD slice: `loop/out/pure-s3-req-001-006.md`, REQ-004 bullets "Data-sensitivity tiers", "Maintainability fit check" and "Decline-then-review", verbatim:

- **Data-sensitivity tiers** (Discovery asks what data the tool will handle before assigning one): Tier 0 (no restriction); Tier 1 (ordinary PII — a minimization reminder and NGO data-responsibility acknowledgment); Tier 2 (special-category or high-volume PII — synthetic/anonymized fixtures only during build, the NGO connecting real data itself after completion; real Tier-2 data never reaches Anthropic, Lovable, or the volunteer). The NGO owns the exposure risk and the founder's background review confirms the tier; when unsure, Tier 2; health, immigration, abuse-victim, and financial data are never below Tier 2.
- **Maintainability fit check:** the criterion is who evolves the tool after the volunteer leaves — the maintainer, not the technology. A fit means a non-technical staffer can maintain the live app by chat, with Lovable as the durable home; internal tools (intake forms, CRUD trackers, directories, dashboards) fit by default. A need requiring ongoing developer maintenance — developer-grade, one-off, pure-backend, or Tier-2 data that cannot live in Lovable — is declined plainly, with Discovery explaining the limitation and never producing a publishable scope. No waitlist, no second track. Confidential-codebase needs are likewise declined (public-only → RM-2). Sensitive *data* is never a decline reason.
- **Decline-then-review — every fit decline is read by a person.** (full bullet in the PRD file; NGO message with the oversight sentence, durable decline record on the project, one platform-admin ops item with the full Discovery conversation, admin notification.)

Decision d96 supersedes "the founder's background review confirms the tier": the background review runs at intake and Discovery's tier is final.

Item text: Deliverable D5 of the AI Discovery agent requirement: the agent asks about data before assigning a tier and never assigns sensitive data below Tier 2, the tier and edited scope reach the human reviewer, needs that require a developer or a confidential codebase are declined plainly and recorded, one decline emits one ops item, and the founder's disposition is recorded as calibration data. A container — it folds when its leaves close.
Acceptance tests: `tests/at/suites/req-004/` (spec `.taskmaster/docs/acceptance/at-req-004.md` sections E and F); today the ids are capability-pending stubs in `z-later-runs.test.ts`.

## Units

### Unit 1: AI4DEV-149 (tier assignment)
Item text: The agent asks about the data involved before assigning a tier. Ordinary PII gives Tier 1 with a reminder and an acknowledgment. Special-category or high-volume data gives Tier 2, fixtures only. Health, immigration, abuse-victim and financial data are never below Tier 2. When unsure, Tier 2. No restriction gives Tier 0.
Acceptance tests: AT-004.26, .27, .28, .29, .30, .31

### Unit 2: AI4DEV-150 (tier responsibility attributed)
Item text: When a tier assignment lands, the data-exposure responsibility is attributed to the NGO per the tier rules. The tier Discovery assigns is final. It is not handed to the founder's background review, which runs at intake, before any tier exists [d96].
Acceptance tests: AT-004.50

### Unit 3: AI4DEV-151 (maintainability fit)
Item text: A need a staffer can maintain passes. A need that requires ongoing developer maintenance, or a confidential codebase, is declined plainly with no publishable scope. Every decline is recorded for founder review; there is no waitlist. Sensitive data is never a decline reason.
Acceptance tests: AT-004.32, .33, .34, .35, .36

### Unit 4: AI4DEV-153 (decline then review)
Item text: One fit decline, of either cause, emits four things: the NGO message, a durable project decline record with cause, date and a reshaping suggestion that stays visible in the NGO's project list, exactly one platform-admin ops item carrying the full Discovery conversation, and the admin notification. The decline copy carries the oversight sentence. The decline taxonomy rows in the notifications requirement are built; emit through the shared emitter.
Acceptance tests: AT-004.53, .54

Out of this run: AI4DEV-154 (decline disposition and calibration). It needs the `cancelled` project state and its one admin reversal, owned by the lifecycle state-table requirement, which is not built or on the board. AT-004.55 to .57 stay capability-pending. The decline in unit 4 writes a durable decline record and refuses further Discovery turns while the record stands; it adds no new need stage.

## The ask
Run this item in poteto-mode and open one pull request from this branch. One pull request is a project rule.
Design once for the whole subtree, then build the units in order, one commit group per unit.
This is a cloud session driven from a project thread: the `AskUserQuestion` tool does not reach the founder here. At every unit boundary, post the gate as a decision card in the thread (Continue recommended) and keep working on Continue while it is open.
In the pull request title and body, name no item id except the one line `Closes AI4DEV-136`, and name each unit by its short label in words.

## Closing
1. Wait for CI green on the exact head and for the founder to say "merge". Both, never one.
2. Squash-merge. Delete no branch.
3. Board steering after the merge: set each built child Done with a comment naming the merge commit; leave the disposition child open.

## The evidence bar
- Loop tier: `bun run at:verify req-004 --expect` passes on the final head; named with exit code, counts and timestamp.
- Integration tier for req-004 run on the local stack where the cloud environment allows it; model-backed integration cases may stay on the opencode route (`DISCOVERY_API_KEY`) or remain capability-pending, and the pull request says which.
- CI green on the final head. Discovered work goes in a "Not done here" list in the pull request body.
