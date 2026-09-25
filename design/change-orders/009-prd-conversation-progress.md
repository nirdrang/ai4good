# PRD conversation, topic progress, and materialization

Date: 2026-09-21.
Decision record: d93, the shared PRD workspace update.
Status: accepted behavior; production implementation remains open.

The founder requested updates to the development board, PRD, and requirements after reviewing the conversation mock.
The final clarification makes PRD sections a high-level progress view and a way to focus chat on a topic.

## Affected interface

Add the private PRD workspace and PRD materialize phase to the screen rules.
Use [the PRD contract](../prd-ui-contract.md) and [the preserved conversation reference](../references/prd-grill-me-chat.html).
Preserve the [separate Design contract](../design-ui-contract.md).
Do not overwrite Claude Design exports or label this conversation reference as a Claude Design export.

The topic navigator must show Open, Draft, Confirmed, and Needs review, with blockers shown separately.
Selecting a topic focuses the same shared chat and retains cross-topic dependencies and the active human.
Topic confirmation updates progress. It does not close the whole PRD or complete a development item.

Retain one active human, semantic handoff recommendations, actor colors, last-authored-turn bookmarks, and the current PRD panel.
Show a state-change button only for a current recommendation, inline in the AI reply.
Use NGO questions queued before an accepted handoff.
Expose effort only in the active composer and show PRD spending in USD with the Discovery color thresholds.
Close PRD requires current completion evidence and active Dev acceptance.
Materialization produces the planning package before Design becomes available.

The saved reference predates topic focus and uses scripted AI replies.
The implementation must recompute questions from actual answers and implement topic focus from the contract.
No new interactive prototype or production feature is claimed by this planning update.

## Canonical changes

The editable sources in loop/out/pure-s*.md assemble the PRD.
The project PRD requirement owns conversation, topic progress, closure, and materialization.
The ledger, provider gateway, attribution, project page, and task-management requirements carry explicit boundaries.
The ten existing PRD acceptance identifiers are amended without claiming executable coverage.
The decomposition manifest maps every case to one implementation leaf.
The existing Design extension and its separate board items remain in place.

Local documents remain uncommitted until the normal source-control workflow records them.
Board descriptions must state that condition rather than claim a published revision.
