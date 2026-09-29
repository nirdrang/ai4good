# Change order 010 — Discovery guided interview and brief reading

Date: 2026-09-26. Decision: none; no requirement text changes. Status: in the mock as revision 9; founder approval is pending.

AI4DEV-175 (Discovery screen design) owns the design revision.
AI4DEV-158 (Discovery interface wiring) owns the implementation.

The founder worked directly with Astra in the shared mock. Astra's review record, `design/astra/discovery-review.md`, describes each revision:

- Revision 7: more usage scenarios and a guided interview based on the grilling method already cited in the contract.
- Revision 8: the founder questioned the opening View brief button. Astra removed it and kept Edit on each section.
- Revision 9: each brief section opens, and the whole brief can expand across the workspace.

## What changed

- [The Discovery interface contract](../discovery-ui-contract.md) gains "Astra revisions 7 to 9" inside its usability section.
  It narrows one earlier rule: gauge captions say that replies still work only when the fuel covers the hold.
- Screen 6 (Discovery chat) in `design/ui-ux-instructions.md` names the new behavior.
- `src/lib/discovery-stream.ts`: each `data-question` part also carries `recommendation` and `uncertaintyHelp`.
  The mock's sample transport sends both.

## Why no requirement changes

The additions present the existing question flow and usage rules. The grouping of independent questions and the
wait for dependent answers already appear in the contract's question section.

## Open

- The contract's workspace layout says the brief opens in a labeled panel on narrow screens.
  Revision 8 removed that shortcut. The founder decides whether the whole-brief expansion meets the rule, or the rule changes.
- The critics did not review revisions 7 to 9.

## Affected build items

- AI4DEV-141 (Discovery question flow): grouped questions by default, the suggested approach, uncertainty guidance, and the two new question fields.
- AI4DEV-157 (Discovery usage display): "Send paid reply", and "More fuel needed to reply" when fuel cannot cover the hold.
- AI4DEV-158 (Discovery interface wiring): brief section and whole-brief viewing, Back to chat, and the removed shortcut.
