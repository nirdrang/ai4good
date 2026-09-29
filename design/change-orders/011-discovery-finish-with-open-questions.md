# Change order 011: finish Discovery with open questions

Date: 2026-09-26. Author: Astra. Status: in mock revision 10; design approval is pending.

AI4DEV-175 (Discovery screen design) owns this revision.
AI4DEV-158 (Discovery interface wiring) owns the later production interface.

The founder explicitly requested that Finish Discovery remain active. Missing critical information needs a warning, with an option to confirm completion anyway.

## Result

- Finish Discovery is always enabled and primary, including in the compact progress strip.
- Review lists missing information and explains why each gap matters.
- The NGO can return to the conversation or acknowledge the gaps and finish.
- Confirmation records the accepted gaps with the actor, revision, and time. The gaps remain in the brief for project review and volunteer matching.
- Coverage stays at the actual percentage. Confirmation stops the interview without inventing answers.
- Empty fuel and incomplete answers do not block acknowledged completion. Existing human review holds and data acknowledgments retain their meaning.
- Saving or canceling an active manual edit, or stopping an active reply, precedes review. The active button explains that next action.

## Updated sources

- The Discovery completion and NGO confirmation paragraphs in `.taskmaster/docs/prd-mvp.md`.
- The same paragraphs in `.taskmaster/docs/requirements/req-004.md`.
- `design/discovery-ui-contract.md` and the Discovery row in `design/ui-ux-instructions.md`.
- The shared fixture and `design/astra/discovery-review.md`.

This revision changes a product rule. The earlier requirement that all topics resolve before completion no longer applies.
The production implementation and its acceptance checks must support the recorded acknowledgment before that work can close.
