# Design workspace, revision 1

Author: Astra. Review date: 2026-09-21. Status: accepted for implementation.

The founder reviewed the conversation mock and asked to save it in Astra's directory and update the PRD and boards.
This acceptance covers the demonstrated Design screen. It does not establish production completion.

## Reviewed files

- `design-review.html` is the original interactive fragment.
- `design-review-preview.html` is the standalone preview.
- Both files are unchanged copies of the latest mock shown in the review conversation.
- The Astra sidebar and review inventory open the standalone preview in a new tab.
- The export includes both files, this record, and the Design contract.

The fragment SHA-256 is `dde948f8c576a66a9df997f560c64f30c04f3084cbefb60f5f41220a5a60fefa`.
The preview SHA-256 is `ecc0f65afd7645bfe18d64280cf1659ca0755d5d1fcb316e0a90b270e0c71612`.

## Accepted behavior

The screen starts after PRD materialization.
The developer and AI lead the review and can ask the NGO a specific screen question.
Only the screen badges scroll horizontally. The selected preview stays in place.
Status icons distinguish not started, in progress, waiting for NGO, and signed off.
The active human's color applies to the composer controls and up-arrow send button.

Ask NGO opens an editable draft. Send question & hand over transfers the turn.
The NGO retains the turn until an explicit hand-back.
Ask NGO and Sign off screen stay at the bottom of the conversation.
Examples cover a developer review, a long NGO conversation, and the return to the developer.

Sign-off creates a UI development item for the reviewed revision.
Build can start after one screen. Re-signing updates the existing item.
The [Design contract](../design-ui-contract.md) records the complete behavior and access rules.

## Fixture boundary and remaining work

AI replies, costs, screen revisions, and development items are sample data.
Actions do not send questions to real people or write to Linear.
The Design preview has its own sample Build receipt, separate from the larger Astra Build snapshot.
The preview resets when it reloads. It does not share state with Discovery or the Build snapshot.

General visual element selection, region annotation, and the agent connection remain open work.
The sample anchor is fixed. It does not let a user select any element in a live preview.
The NGO preview selector demonstrates turns, not a secure production role boundary.
Production must restrict the development board to the developer.

## Verification

The preserved mock passes its existing browser checks for long conversations, handoff, actor ownership, screen selection, revisions, and sign-off.
The checks cover Build after one screen, repeated sign-off, desktop and narrow layouts, and dark appearance.
The Astra TypeScript check and compiled build pass.
The sidebar and review inventory open the compiled standalone preview, and its conversation controls work.
The export retains identical Design files and excludes them from the Claude baseline.
The project page, task management, and project PRD extracts match their canonical PRD sections.
Linear readback confirms the implementation parent, three Backlog children, and their blocking relations.

## Board record

The PM board records the extension in AI4PM-35 (project PRD and Design), AI4PM-33 (task management), and AI4PM-36 (project page).
AI4DEV-11 (volunteer screens) and AI4DEV-49 (product screen designs) record this screen's design acceptance.
Their broader batch statuses remain unchanged.

Production work is filed in AI4DEV-161 (Design workspace), under the project PRD requirement:

| Development item | Scope | Dependency |
| --- | --- | --- |
| AI4DEV-162 (screen review) | PRD-derived screens, revisions, badges, and preview | PRD materialization |
| AI4DEV-163 (NGO handoff) | Actor turns, question drafts, handoff, and return | Screen review |
| AI4DEV-164 (sign-off into Build) | One UI item per screen and accepted revision | Screen review, NGO handoff, and task writer |

All production items remain in Backlog. The visual annotation and agent provider decisions remain open.
The board descriptions identify these source changes as local and uncommitted.
