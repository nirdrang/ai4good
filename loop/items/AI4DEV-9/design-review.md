# Discovery design review

AI4DEV-9 (Discovery screen design) remains in progress.
Discovery revision 4 is ready for founder review. Approval is pending.

- [Interactive Discovery fixture](http://127.0.0.1:4310/#discovery)
- [Review and verification](../../../design/astra/discovery-review.md)
- [Accepted interface contract](../../../design/discovery-ui-contract.md)
- [Design change order](../../../design/change-orders/008-discovery-free-first.md)
- [Astra source rules](../../../design/README.md)

The fixture contains the NGO and AI conversation, live brief, usage display, scope review, and NGO confirmation.
Revision 2 makes the chat explicit, with a message box, visible exchanges, suggested answers, and clarification.
The default asks one question at a time. Independent questions can still share one reply.
Revision 3 adds topic progress, remaining work, and Finish Discovery. The AI stops asking when the required topics are agreed.
The NGO reviews and confirms the current brief to finish. Progress and the finish action stay separate from fuel usage.
The process bar remains a shared workspace component.
Revision 4 places Volunteer match after Discovery and before PRD. Find a volunteer opens publication review after Discovery confirmation.
Human review, volunteer consent, and funding kickoff remain required before PRD work.
The founder's design approval must be explicit and recorded in the review document.
Sample NGO confirmation inside the fixture is not design approval.

The Astra files remain separate from `design/screens/`, which preserves the Claude Design exports.
Later Claude revisions belong under `design/claude-review/`.

AI4DEV-158 (Discovery interface wiring) remains backlog work.
The fixture does not implement real APIs, payments, file processing, or production acceptance checks.
