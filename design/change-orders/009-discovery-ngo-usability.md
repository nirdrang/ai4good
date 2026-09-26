# Change order 009 — Discovery usability rules from the NGO critique

Date: 2026-09-26. Decision: none; no requirement text changes. Status: in the mock as revision 5; founder approval is pending.

AI4DEV-175 (Discovery screen design) owns the design revision.
AI4DEV-158 (Discovery interface wiring) owns the implementation.

The founder asked for an agent to critique the Discovery layout as an NGO, then asked Claude to make the fixes.
The founder then asked for a second critic that operates the mock, and for the learnings to reach the Discovery design documents.
On 2026-09-26 the founder also ruled that Claude and Astra share one mock in `design/astra/`.

## What changed

- [The Discovery interface contract](../discovery-ui-contract.md) gains the section "Usability rules from the NGO critique".
  Its workspace layout places the usage card after the live brief.
- Screen 6 (Discovery chat) and screen 8 (scope document) in `design/ui-ux-instructions.md` name the new rules.
- The mock in `design/astra/` shows every rule as Discovery revision 5.
  Its review record is `design/astra/discovery-review.md`, with the critique record in `design/astra/discovery-critique/`.

## Why no requirement changes

The rules present existing requirements more clearly. They add no product behavior.
The Lovable subscription disclosure of about $25 a month is already required by the scope document criteria.
The statement that ai4good gives no support after handoff states the existing version 1 rule.
The rules keep every fixed element of the contract: the always-visible Finish Discovery action, the four usage values together, both confirmation checkboxes, and the process bar labels.

## Affected build items

- AI4DEV-158 (Discovery interface wiring): builds the whole usability section.
- AI4DEV-157 (Discovery usage display): the plain cost sentence, "Not available now", the fuel-left line beside Send, the Buy fuel terms, the pending wording, and the gauge captions.
- AI4DEV-141 (Discovery question flow): the topics-added line in each AI reply, the labeled Edit buttons, and the finish invitation.

## Open

Four minor findings are recorded in the contract as open. They are not requirements.
If the founder wants any rule to become an acceptance criterion, that is a separate change with a decision number.
