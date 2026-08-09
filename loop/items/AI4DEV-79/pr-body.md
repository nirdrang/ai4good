# AI4DEV-79 — a pool of local database slots so items verify in parallel

Foundation work under the acceptance-test harness bring-up root. The machine has one local
Supabase stack; two items that both reach it can poison each other's verify evidence, and the
founder's personal dev data lives on that same stack. This item builds the founder-ruled
mechanism (ruled 2026-08-09, in the board item's description): a pool of two standing local
Supabase stacks ("slots"), each with its own project id and port block; the coordinator
reserves a slot when an item starts, the harness runner occupies it per verify window with an
atomic pid-stamped claim, and every occupancy copies the item tree's own migrations in and
resets the slot before use. The personal stack on the 54321 ports stays outside the pool,
untouchable — enforced by a guard in code, and proven once by an isolation spike whose
transcript is committed in the item record.

**Status: planned; nothing is built yet.** The plan is at `loop/items/AI4DEV-79/plan.md`. Ahead
of merge, in order: the external plan review, the draft, a draft-code review panel of two blind
readers, the fix-and-goal pass, the read-only audit panel, and continuous integration green on
the exact head. The merge ruling — what was built, every review finding and its disposition,
and exactly what the green does and does not claim — will be posted on this pull request before
merge.

What the diff will contain when built: `tests/at/harness/db-pool.ts` and its named selftests,
one integration-tier hook in `tests/at/harness/runner.ts` (loop-tier behavior byte-identical),
PowerShell reservation helpers in the work library, reservation lines in the work skill, and
the committed setup and spike transcripts.
