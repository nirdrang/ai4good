# Design sources

A screen goes through three stages: screen design on a canvas, screen build on sample data, and screen wiring.
The `ui-design` skill, in `.claude/skills/ui-design/`, holds screen design. The controller skill materializes the three stages and holds the steps of screen build and screen wiring.

| Location | Purpose |
| --- | --- |
| `canvas/<screen>/` | The snapshot of the approved Claude Design canvas revision. Screen build uses it as its target. |
| `astra/` | The sample-data shell for screen build, and the review records of the earlier screens. |
| `screens/` | Earlier Claude Design exports. Keep them as a baseline. |
| `references/` | Earlier conversation prototypes and other source material. |
| `change-orders/` | The founder's rulings on a screen, and the contract edits they caused. |

Before 2026-09-30, Astra and Claude revised screens in the interactive prototype in `astra/`.
On 2026-09-26 the founder ruled that Claude and Astra share one mock and one review.
Those screens keep their review records in `astra/`. New screens are designed on a canvas.

Shared product requirements apply to every author.
The Discovery interface contract takes precedence over older Discovery exports.
The [PRD workspace contract](prd-ui-contract.md) defines topic progress, focused chat, handoff, completion, and materialization.
Its preserved reference predates the final topic-focus addition and is not a production implementation.
The [Design workspace contract](design-ui-contract.md) records the accepted post-PRD review screen.
Record each screen's source and review status in `astra/screens.json`.
Design approval requires the founder's review. A working prototype does not establish production completion.

Run `bun run design:astra` from the repository root to open the Astra prototype.
See [the prototype instructions](astra/README.md) for fixture behavior.
