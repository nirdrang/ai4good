# Design workspace contract

Status: accepted for implementation on 2026-09-21.
Source: the founder's Design screen review in this conversation.
The reviewed fixture is [Astra's Design mock](astra/design-review-preview.html).
Its [review record](astra/design-review.md) separates accepted behavior from open work.

This contract supplements the PRD's project page, task management, and project PRD requirements.
It takes precedence over older interface instructions for the Design workspace only.

## Entry and screen selection

Design follows successful PRD materialization.
The platform derives the screen inventory from that PRD and links each screen to its requirement.
The developer reviews one screen at a time.

Only the small screen badges form a horizontal carousel.
Scrolling the badges does not move or change the selected preview.
Selecting a badge replaces the preview in the same position.
Previous and Next select a screen. An expanded preview remains available.

Every screen has an icon and a written status:

| Status | Color | Meaning |
| --- | --- | --- |
| Not started | White | The developer has not started this screen's review. |
| In progress | Yellow | The developer and AI are reviewing the screen. |
| Waiting for NGO | Orange | An escalated question still needs NGO guidance. |
| Signed off | Green | The developer accepted the current revision. |

Screen review status is separate from project lifecycle and development task status.

## Conversation and turn ownership

The developer, AI, and NGO participate in one screen conversation.
The developer and AI lead the review. One human owns the turn at a time.
Messages retain the actor, screen, revision, and time.
Long conversations scroll independently within the conversation panel.

The composer and primary turn controls use the active human actor's color.
The send control is a round up-arrow button with an accessible Send message label.
The platform preserves drafts when control passes between the developer and NGO.
Role controls in the mock simulate separate people. They are not production authorization.

## Ask NGO

Ask NGO and Sign off screen sit below the composer, at the bottom of the conversation.
Ask NGO opens an editable question draft with the selected screen and revision attached.
Opening or canceling the draft leaves the developer in control.

Send question & hand over records the question and gives the NGO the turn.
The screen becomes Waiting for NGO. The developer cannot sign off that screen during the handoff.
The NGO can ask the AI follow-up questions before returning control.
An answer alone does not return control. Hand back to the developer does.

An unresolved answer keeps the screen waiting and lets the developer send the question back.
After a resolved answer, the developer applies the guidance and reviews the resulting revision.
An old revision remains viewable but cannot receive a new sign-off.

## Sign-off and Build

Only the assigned developer can sign off the current screen revision.
Sign-off records the screen, revision, requirement, developer, and time.
The backend creates or updates one UI development item for that screen.
If PRD materialization already planned that item, sign-off updates its existing identity and satisfies the Design dependency.
The item includes the accepted mockup revision, the requirement link, and review decisions.
Retries and repeated sign-off update the same item without duplicates.

The item becomes available in Build immediately, subject to that item's own dependencies.
There is no overall Ready to build gate and no requirement to finish every screen first.
An unresolved screen does not block unrelated signed-off work.

Reopening a screen clears its current review approval.
Its development item retains the last accepted revision until the developer signs off the new revision.
Re-signing updates the existing item and preserves its work state and history.
Screen sign-off does not complete a development item or a PM requirement.
Those items still require their normal implementation and completion evidence.

## Access and implementation boundary

The assigned developer and NGO use ai4good's Design interface.
The NGO sees screen discussions and review status, with no access to the development board.
The public project page keeps its existing PM projection.
Backend functions enforce membership, turn ownership, revision checks, and sign-off authority.
UI code calls edge functions and never writes directly to the database or Linear.

The backend calls a project agent through an API to edit files and produce preview revisions.
The backend retains the project's workspace and session references across later turns.
The provider choice and preview connection still require an implementation decision.
The reviewed fixture has scripted AI replies and local sample items only.

## Open design work

General element selection and region annotation remain a separate follow-up.
That work must carry the selected element or region, screenshot, screen, and revision through messages and NGO handoff.
The fixed example anchor in the reviewed mock does not implement general visual selection.
The founder's acceptance of this screen does not settle that interaction or choose an agent provider.

## Production verification

Acceptance coverage must include badge-only scrolling, actor permissions, draft preservation, and explicit handoff.
It must also cover stale revisions, unresolved NGO questions, duplicate sign-off retries, and Build after one screen.
Verify that the NGO cannot read the development board or sign off through the API.
Register new acceptance IDs through the existing acceptance workflow before closing the implementation work.
The current PRD and task-management acceptance suites predate this Design extension.
