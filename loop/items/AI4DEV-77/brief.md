# Brief for AI4DEV-77 (proof scripts not typechecked)

Chain: AI4DEV-77 (proof scripts not typechecked), standalone. It has no parent.
Branch: claude/project-thread-gsrys5. This is a cloud session, which may push only to its assigned branch, so the branch does not carry the item id. The pull request closes the item with one `Closes AI4DEV-77` line.
PRD slice: none. This is a machinery item, not a product requirement.
Item text: `loop/items/` is covered by no typecheck configuration. The proof scripts committed there are real TypeScript, and they are exactly the files that carry an item's live evidence. A proof script with a type error is not caught by any check. It fails only when somebody runs it, which is usually the moment its evidence is needed. Either include `loop/items/` in a typecheck configuration, or state in writing that these scripts are deliberately unchecked and why. Both answers are acceptable. Silence is not.
Acceptance tests: none.

## The ask
Run this item in poteto-mode and open one pull request from this branch. Pick between the two answers from what the code shows. Merge only when CI is green on the exact head and the founder says "merge".
