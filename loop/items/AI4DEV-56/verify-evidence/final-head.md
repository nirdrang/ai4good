# Final head verify suite (step 3)

Head at start of step 3: `7e70eb211406b87ae0c48f1b2d33da9c54bdda27`

Docker inspect mount check (`supabase_edge_runtime_poancmeitlmxejofwzuu`, run after `db:start`):
the third mount is `Source: /run/desktop/mnt/host/c/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/functions`,
`Destination: /Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/functions` — names the primary worktree.

| command | start | end | exit |
|---|---|---|---|
| bun run db:stop | 2026-09-06T14:09:41.3424373+03:00 | 2026-09-06T14:09:55.7858012+03:00 | 0 |
| bun run db:start | 2026-09-06T14:10:01.2272167+03:00 | 2026-09-06T14:10:37.0510596+03:00 | 0 |
| bun run db:reset | 2026-09-06T14:10:49.1915913+03:00 | 2026-09-06T14:11:23.7463385+03:00 | 0 |
| bun run typecheck | 2026-09-06T14:11:30.0755155+03:00 | 2026-09-06T14:11:38.1052055+03:00 | 0 |
| bun run at:check req-001 | 2026-09-06T14:11:45.7038146+03:00 | 2026-09-06T14:11:45.8355993+03:00 | 0 |
| bun run at:selftest | 2026-09-06T14:11:52.2217163+03:00 | 2026-09-06T14:12:01.5524569+03:00 | 0 |
| bun run at:verify req-001 --tier loop --expect | 2026-09-06T14:12:08.3269906+03:00 | 2026-09-06T14:12:09.8518341+03:00 | 0 |
| bun run at:verify req-001 --tier integration --expect | 2026-09-06T14:12:16.3268666+03:00 | 2026-09-06T14:15:43.9176783+03:00 | 0 |

Full output of the two `at:verify` runs is in `final-head-loop.txt` and `final-head-integration.txt`.
Loop tier: 38 P0, 33 green, 5 red, 0 missing — matches `tests/at/expected/req-001.json`.
Integration tier: 38 P0, 27 green, 11 red, 0 missing — matches `tests/at/expected/req-001.json`.

## After the evidence commit

Head after the evidence commit (before amend): `98d9b49f0a7b7c0d137e28328e3a3ba73232f641`. Stack
stopped (`bun run db:stop`) before this rerun, per instructions — these four checks run with no
stack up.

| command | start | end | exit |
|---|---|---|---|
| bun run typecheck | 2026-09-06T14:26:29+03:00 | 2026-09-06T14:26:37+03:00 | 0 |
| bun run at:check req-001 | 2026-09-06T14:26:44+03:00 | 2026-09-06T14:26:44+03:00 | 0 |
| bun run at:selftest | 2026-09-06T14:26:50+03:00 | 2026-09-06T14:27:00+03:00 | 0 |
| bun run at:verify req-001 --tier loop --expect | 2026-09-06T14:27:06+03:00 | 2026-09-06T14:27:07+03:00 | 0 |

Loop tier: 38 P0, 33 green, 5 red, 0 missing — matches `tests/at/expected/req-001.json`. The
evidence commit touches only `loop/items/AI4DEV-56/` (and the one-line normalize fix in
`drive-ngo-signup.ts`, which does not affect these checks), so this result was expected to be
unchanged from the pre-commit run above.
