# Design sources

The founder requested an interactive Astra mock with fixtures on 2026-09-21.
The founder may ask Claude Design to revise these screens later.

| Location | Author and purpose |
| --- | --- |
| `screens/` | Existing Claude Design exports. Preserve these files as the Claude baseline. |
| `astra/` | Astra's interactive prototype, fixture data, and review record. |
| `claude-review/<review-name>/` | Future Claude Design revisions of an Astra handoff. Create this folder when a revision arrives. |
| `references/` | Earlier conversation prototypes and other source material. |

Astra can edit its prototype directly. This is the fixture design work requested by the founder.
Production implementation still follows its own workflow.
Do not label an Astra screen as Claude-generated, or overwrite either author's work with the other's output.

Shared product requirements apply to both authors.
The Discovery interface contract takes precedence over older Discovery exports.
The [PRD workspace contract](prd-ui-contract.md) defines topic progress, focused chat, handoff, completion, and materialization.
Its preserved reference predates the final topic-focus addition and is not a production implementation.
The [Design workspace contract](design-ui-contract.md) records the accepted post-PRD review screen.
Record each screen's source and review status in `astra/screens.json`.
Design approval requires the founder's review. A working prototype does not establish production completion.

Run `bun run design:astra` from the repository root to open the Astra prototype.
See [the prototype instructions](astra/README.md) for fixture behavior and the Claude Design handoff.
