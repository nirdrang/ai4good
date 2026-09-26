# Design sources

The founder requested an interactive Astra mock with fixtures on 2026-09-21.
The founder may ask Claude Design to revise these screens later.

| Location | Author and purpose |
| --- | --- |
| `screens/` | Existing Claude Design exports. Preserve these files as the Claude baseline. |
| `astra/` | The one interactive prototype, fixture data, and review records. Astra and Claude both revise it. |
| `references/` | Earlier conversation prototypes and other source material. |

Astra and Claude edit the prototype in `astra/` directly. This is the fixture design work requested by the founder.
On 2026-09-26 the founder ruled that Claude and Astra share one mock and one review, with no separate folders.
Each screen's review record names the author of every revision.
Production implementation still follows its own workflow.

Shared product requirements apply to both authors.
The Discovery interface contract takes precedence over older Discovery exports.
The [PRD workspace contract](prd-ui-contract.md) defines topic progress, focused chat, handoff, completion, and materialization.
Its preserved reference predates the final topic-focus addition and is not a production implementation.
The [Design workspace contract](design-ui-contract.md) records the accepted post-PRD review screen.
Record each screen's source and review status in `astra/screens.json`.
Design approval requires the founder's review. A working prototype does not establish production completion.

Run `bun run design:astra` from the repository root to open the Astra prototype.
See [the prototype instructions](astra/README.md) for fixture behavior and the Claude Design handoff.
