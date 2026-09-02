
## Why
Two ways of work sat in one tree. pstack supplies the discipline through its stations; the v1 relay supplied it through machinery in the agents, the scripts, the harness, and CI. The founder ruled on 2026-09-01: "no more slots machinery this should be moved out" and "i want to clean the codebase with the v1 ceremony and align with what is does on CI as well".

## Scope
- Three review rounds shaped this branch: a four-model panel on the first code head, a four-model panel on its fixes, and one cross-family re-read of the last fixes. The findings and every ruling are in the item folder under artifacts/interrogate/.
- The integration tier of the acceptance runner targets the one local stack (project poancmeitlmxejofwzuu, api 44321) with no slot code on the path: a positive identity read from the CLI's own container names, a dead-pid-only lock, the proof-typed reset as the only reset, the attestation round trip unchanged, six coordinates for the child, an evidence line naming project, port, reset, migrations, lock, commit and tree state.
- The database slot pool (db-pool.ts, its selftest, db-slots.ps1) is parked under loop/parked/v1/.
- The session lifetime is pinned once: supabase/config.toml jwt_expiry = 120, read from one atconfig entry by the loop fixture and both integration bodies.
- The six v1 relay agents, the /work skill prose and its phase files, shared-invariants.md, the v1 scripts with no live caller, and the drill harness are parked. mechanical stays. work-lib.ps1 and materialize.ps1 stay (the status line and /controller call them).
- CI drops the twin-guard step; at:selftest shrinks by the parked selftests; everything else stays.
- CLAUDE.md section 5 names the v2 way of work and keeps the three standing rules.
- The semantic judge is parked (see Harness ruling).
- AT_DB_SLOT is gone from settings, the controller template, the verify skill, and the cloud docs.

## Tradeoffs
- Every integration run resets the founder's local database. The pool was the isolation; the founder ruled it out, so isolation is the reset. The lock covers at:verify runs only; db:reset and the verify-ai4good drive take no lock.
- Local development access tokens live two minutes. supabase-js refreshes them; a raw copied token dies after two minutes.
- One identity instrument (the CLI's container names) instead of two (plus docker). The own-name proof depends on the tracked config disabling imgproxy and the pooler; a config enabling both makes the read refuse, loudly.
- Parked TypeScript is dead text whose relative imports no longer resolve.

## Blast radius
- tests/at/harness/runner.ts and the req-001 suite's lifetime reads; nothing in tests/at/expected/.
- .claude/agents/ (six files gone from the agent list), .claude/skills/work/ (only pstack-model-selection.md stays), loop/work/, loop/drills/.
- .github/workflows/ci.yml (one step removed), CLAUDE.md section 5, .claude/settings.json (one env entry).
- supabase/config.toml (one value): the running stack must be restarted once after merge.

## Harness ruling
The founder asked the lead to rule on the acceptance harness part by part (2026-09-02: "i want the poteto-mode to decide this whole test harness"). Four critics read it (fable, sol, grok, opus). Their findings and the rulings are in the item folder under artifacts/how/. The rulings:

| Part | Ruling | What it costs |
|---|---|---|
| The grading core: at:check bijection, atTest registration, per-id verdicts, the --expect declaration (check.ts, expected.ts, registry.ts, index.ts, the grading half of runner.ts) | keep frozen | It is the only thing that turns "3 failed" into an honest red per acceptance id, and the only floor CI has. Plain vitest cannot express a not-yet-landed criterion except as a skip, which --expect forbids. About 3,500 lines plus their selftests. |
| The stack plumbing in runner.ts: lock, CLI seam, identity checks, readiness, migration proof, proof-typed reset | keep, and it grew by the one-stack section | This is the wall that stopped a reset reaching a hosted project and the proof that a reset landed where it was aimed. |
| The live tier: attestation.ts, live-email.ts, the attested clock, the live half of capabilities.ts | keep frozen | Every integration green rests on the nonce round trip; the "slot" in the names is a name, not slot machinery. |
| The loop machinery: sentinels, faults, the email stand-in, guards, fixture worlds, the controlled clock, the config registry | keep frozen | About 890 lines plus 1,130 lines of selftests. Their only consumer is the req-016 suite, whose fixture is a stand-in of the spec, not the product. The founder keeps the AT ids and the manifests, so the substrate that makes those eleven ids green stays. Said plainly: those greens prove the harness discriminates, not that the product works. |
| The semantic judge: oracles.ts, its selftest, the recorder, the rubrics, the recording store, its witness and types | parked | No suite ever called it, the store was empty, the recorder never ran, and above loop the ledger stamped it real over a transport that could not answer. About 2,900 lines leave the compiled tree; the ledger loses one member every suite carried. When AT-009.07, AT-004.10 or AT-033.07 lands, a judge is a function that test imports, with its own record-and-replay store. |
| The slot pool: db-pool.ts, its selftest, db-slots.ps1 | parked (the item's own ruling) | Isolation between verify and the founder's stack is gone; the reset is the isolation now. |
| The shipped-module selftests under tests/at/harness/ | keep; they are the plain-vitest lane the brief names, already in CI | 278 lines that reach inputs the acceptance fixture cannot produce. |

The rule for new tests, now in CLAUDE.md section 5: a new acceptance id still registers through atTest, even when its body is a thin vitest over a shipped module or the one stack; a test with no id lives under tests/at/harness/ beside the shipped-module selftests; the harness takes no new machinery.

## Verification
Three rounds, all run by the mechanical agent from the item worktree on 2026-09-02, transcripts in the item folder under `artifacts/verify/` (head `ea73436`, before the two review panels), `artifacts/verify2/` (head `db2153b`, after the first panel's fixes) and `artifacts/verify3/` (head `77f3768`, the final code head).

On the final code head `77f3768` (transcript `artifacts/verify3/transcript.md`, about 21:00 to 21:10 local, UTC+3), and identically on `db2153b` before it:
- `bun run at:verify req-001 --tier integration --expect`: identity proven twice from the CLI's own container names (before the readiness wait, and immediately before the reset); 5 migrations expected, 5 applied; evidence line `stack poancmeitlmxejofwzuu (api 44321) â€” reset OK â€” migrations: 5 expected, 5 applied â€” lock ...at-verify-poancmeitlmxejofwzuu-44321.lock â€” head 77f3768, dirty` (dirty = the untracked item record folder, committed after); EXPECTED match, 16 green, 21 declared red, exit 0.
- `bun run typecheck`: both configs clean. `bun run at:selftest`: 11 files, 253 tests (was 13 files, 349 tests on main). `bun run at:verify req-001 --tier loop --expect`: 21 green, 16 declared red, match. `req-016`: 11 green, 1 declared red, match.
- `bun run lint` (not a CI step, informational): red with about 32,000 prettier line-ending findings across the tree, the same state as main on a Windows checkout; the parked folder is ignored.

On head `ea73436` (transcript `artifacts/verify/transcript.md`, 16:21 to 16:32 UTC): the stack was restarted once so Auth read the pinned lifetime; the same integration match; and the live drive `bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts` passed 11 of 11 checks on the real path (signup, refused unconfirmed sign-in, Mailpit link, sign-in, complete-signup NGO, four rows read over DB_URL) with no token-shaped value in the transcript. The fix commit touches no file on the drive's path (the edge functions, the drive script, and the migrations are unchanged), so the drive was not rerun.

CI on the code head `77f3768` plus the item record: run https://github.com/nirdrang/ai4good/actions/runs/33665172661, success on `1e6e2c3`.
## Not done here
- Extend the one-stack lock to `bun run db:start`, `db:stop`, `db:reset` and the verify-ai4good drive: today only at:verify takes it, so a concurrent operator command can reset under a run (three reviewers).
- The lock's takeover gate can be cleared from under a suspended live holder, and an empty gate file blocks acquisition until deleted by hand; a reset child can outlive the lock on a signal, and SIGKILL does not reach its process tree. Pre-existing, unchanged here; they matter more now that the stack is the founder's own.
- The container-name suffix match would count a container of a project whose id ends with this project's id as its own; no such project exists on this machine. Recorded in the docstring.
- Split the stack lifecycle out of `tests/at/harness/runner.ts` (1,600 lines, two programs) into its own module.
- `statusline.ps1` still writes a context snapshot on every refresh for the parked context gauge.
- AT-001.17's direct environment read should go through the ledger like the other absence probes.
- req-016's integration manifest declares a tier nobody runs; a broken block would pass CI.
- Root AGENTS.md and `loop/out/way-of-work.md` still describe earlier ways of work (frozen history, not edited).
- Two scripts under an old item folder still import the parked pool; frozen history, not typechecked.
- Local sessions have no session-start banner: banner.ps1 is parked and the tracked hook is remote-only.
- The eval of the how explainer at fable high against max, proposed 2026-09-02.

Ã°Å¸Â¤â€“ Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01SikdZcn3PmB9SrZ4dL1ziT
