# Panel lane scoring, the harness item, head 3141206

The question: does the fable lane earn its seat in `how critics` and `interrogate reviewers`?

Scored from the lead's own ruling, `loop/items/AI4DEV-87/artifacts/interrogate/rulings.md`. The
ruling labels every acted-on item with the lanes that raised it: A is fable at high, B is sol at
max, C is grok at xhigh, D is opus at xhigh. A lane scores an item only when the ruling names it.

| acted-on item | fable | sol | grok | opus |
|---|---|---|---|---|
| 1. liveness decided before construction | yes | no | yes | yes |
| 2. the drive's CLI call goes through the one seam | yes | yes | yes | yes |
| 3. one name map for the five coordinates | no | no | no | yes |
| 4. the drive records the url it sent, two Doctor checks | yes | no | no | yes |
| 5. the recipe describes the protocol | yes | yes | yes | yes |
| 6. the drive is type-checked (the only critical) | no | no | no | yes |
| 7. prose sweep, nine stale sites | yes | yes | yes | yes |
| 8. small structural nits | yes | yes | no | yes |
| 9. the lock leaves local-stack.ts | yes | yes | yes | yes |
| 10. the mail poll has one deadline | no | yes | no | no |
| 11. the refusal is proven through the real path | no | yes | no | no |
| 12. the request shape is pinned | no | yes | no | no |

Raw findings reported: fable 0 critical, 5 warnings, 7 nits. Sol 6 warnings. Grok 5 warnings.
Opus 1 critical, 11 warnings, 2 nits. Nothing was dismissed as a non-issue.

## What each lane alone contributed

- **Opus** raised two items no other lane raised, and one of them is the only critical of the
  panel: the drive script was never type-checked, so the drive and the shared module could
  disagree with nothing to catch it.
- **Sol** raised three items no other lane raised, all of them tests: the mail poll deadline,
  the black-box proof of the above-loop refusal, and the pin on the request shape.
- **Fable** raised no item alone. Its two sub-findings that no other lane made are the url the
  drive records and two small placement nits.
- **Grok** raised no item alone. Everything it found, fable or opus also found.

## Reading

On this one item the fable lane is the most expensive seat and the smallest marginal
contribution. That is one item, not a law. The next step is to test whether a cheaper effort on
the same model recovers the same set.

## Status, 2026-09-04

The first experiment is set up and blocked. The plan: replay the same reviewer prompt on the
same diff at head 3141206 with the fable lane at low instead of high, then score it against the
table above. The lane died on launch with "out of usage credits" for fable. A one-turn probe on
an opus lane answered, so the documented fable outage fallback is available.

Ready to run when credits return:
- worktree `.claude/worktrees/panel-replay` at 3141206, dependencies installed, seeded with the
  design and the diff and nothing else from the item folder.
- prompt: the original reviewer prompt with the worktree path swapped and reading rules added,
  in the session scratchpad as `replay-prompt-fable-low.md`.
- output path: `loop/evals/panel-2026-09-04/review-fable-low.md`.

Blinding is by instruction, not by process. A native agent runs in the session folder, so the
transcript must be checked for reads outside the replay worktree before the result counts.