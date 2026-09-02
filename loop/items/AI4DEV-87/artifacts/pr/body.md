## Why

pstack's verify skill proves the running app. The one thing it lacks is an honest red per acceptance id under CI. The acceptance harness under `tests/at` supplied that gate, and around it a provenance ledger, an attestation round trip, a brand, type probes, and a second copy of every stack helper the drive already had. This branch keeps the gate and drops the rest, so a body reaches the stack through `atTest`, `open()`, `createHarness`, and the live adapter, and nothing else.

## Scope

Unit 1 parks the provenance ledger. `capabilities.ts` (the witness table and the brand), `attestation.ts` (the nonce round trip), `live-ledger.selftest.ts`, `type-invention.selftest.ts`, and the six files under `tests/at/typeprobes/` move byte for byte under `loop/parked/v1/`. `registry.ts` decides liveness by file presence before anything is built: `openWorld` asks `liveAdapterExists(requirement)` and throws `aboveLoopStandInRefusal(tier, live, sutKey)` above loop when no `_live.ts` exists; `createHarness` above loop with no live adapter throws rather than loading the loop fixture. `AtPending` and `CapabilityPending` live in `pending.ts` with the same messages, because `expected.ts` rebuilds them. The six unbacked req-001 methods are explicit throws in `_live.ts`. The three manifests under `tests/at/expected/` are byte-identical.

Unit 2 gives the integration adapter and the verify-ai4good drive one client, `tests/at/harness/live-stack.ts`: five coordinates named once in `STACK_ENV`, `authPost` and `functionPost` returning the url they called, the Mailpit identification probe and read, quoted-printable link decoding, one bounded poll, `sqlClient`, and the three redaction helpers. `live-email.ts` is parked. `vendors` is absent from the integration-tier harness type. The drive imports the module, records the urls it sent, and checks the catcher's identification and the edge runtime's `supabase/functions` mount in its Doctor step (13 checks, up from 11). The drive is type-checked as a third project in `tests/at/typecheck.ts`.

Unit 3 moves the one-stack lifecycle out of `runner.ts` verbatim: `local-stack.ts` (config read, CLI seam, identity read, reset, migration proof, lifetime pin, coordinates, evidence line, and `stackFromLocalStatus` for the drive) and `stack-lock.ts` (the machine-wide lock), each with its selftests. `runner.ts` keeps arguments, grading, and `main`. Nothing imports back into the runner.

Not in scope, stated in the item: the req-016 stand-in fixture and the modules only it uses (sentinels, faults, the vendor sim, guards, fixture worlds) stay frozen until req-016's product code lands.

## Tradeoffs

At the loop tier nothing can tell a real member from a stand-in any more. Above loop, a suite with no `_live.ts` is refused by file presence, decided before construction, instead of by a computed verdict; a `_live.ts` that returned the loop fixture would run above loop, and writing one is an author's decision, not the honest mistake the harness guards against.

The attestation round trip is gone. What proves the child talks to the prepared stack is what the runner proves before it spawns the child: the identity read from the CLI's own container names, twice, the reset on that read, and the migration proof.

The drive now sends the adapter's requests, not its own: every Auth post carries `Authorization: Bearer <anon key>` beside `apikey`; mail is read through Mailpit `search` and `raw` with quoted-printable decoding instead of `messages` and the rendered text; the poll waits up to twenty seconds in 250 ms steps. The verify skill's recipe describes the one protocol.

`local-stack.ts` is 951 lines, one module for one thing, the stack; the lock is its own 240-line module. A four-way split (child environment and redaction, CLI and status, identity and reset) is filed, not built.

The item text estimated that about 5,000 lines would leave. The net is smaller: the harness goes from 9,748 lines to 8,247 and the type probes from 472 to 0, because the lifecycle moved rather than shrank, and four new files arrived (the shared stack module, the leaf error module, the lock module, and three selftest files that pin the new gate, the poll bound, and the request shape).

## Blast Radius

Everything under `tests/at`, the verify skill and its drive script, the parked README, and one comment in `supabase/functions/_shared/accounts.ts` that cited a parked test file. CI's steps are unchanged (typecheck now covers three projects). The integration tier still resets the one local stack on every run. No product behavior changes.

## Verification

On the verified head `d71c968`, run by the mechanical agent and judged by the lead (`loop/items/AI4DEV-87/artifacts/verify/station-6.md`):

- `bun run typecheck`: three projects clean (2026-09-02T23:23:50Z).
- `bun run at:check req-001` and `req-016`: bijection holds (2026-09-02T23:24:06Z and 23:24:13Z).
- `bun run at:selftest`: 13 files, 175 tests, all green (2026-09-02T23:24:19Z). Before the branch: 11 files, 253 tests. The 97 tests that left graded the ledger, the brand, the attestation, and the type probes; the 19 that arrived pin the refusal before construction, the refusal through the real vitest path with no stack, the poll bound, the request shape, the coordinate names, and the stack constructor.
- `bun run at:verify req-001 --tier loop --expect` and `req-016 --tier loop --expect`: exact matches, manifests unchanged (2026-09-02T23:24:34Z and 23:24:41Z).
- `bun run at:verify req-001 --tier integration --expect` on the one stack: 16 green, 21 red, exact match; evidence line `at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 5 expected, 5 applied — ... — head d71c968` (2026-09-02T23:24:49Z to 23:28:24Z).
- The drive `bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts`: 13 of 13 checks, exit 0 (2026-09-02T23:28:24Z); the edge runtime mounts this checkout's `supabase/functions` (23:28:34Z).
- A four-model review (fable, sol, grok, opus) on the head before the fixes: 0 dismissed, 12 items acted on in two fix units; rulings at `loop/items/AI4DEV-87/artifacts/interrogate/rulings.md`.

Lines: `tests/at/harness` from 9,748 to 8,247 (29 files to 32; selftest files 11 to 13); `tests/at/typeprobes` from 472 to 0; the req-001 suite from 6,285 to 6,126; the drive script from 229 to 219; `runner.ts` from 1,625 to 474. The whole diff: 47 files, 3,116 insertions, 2,854 deletions, with the parked files as renames.

The pull request head adds the item record under `loop/items/` on top of the verified head; `git diff <verified head> <pull request head> --stat` shows `loop/items/` only.

## Not done here

- The four-way split of `local-stack.ts`.
- Joining the two Bun SQL lookups (`local-stack.ts`, `live-stack.ts`) and the two redaction helpers (`redact` in `local-stack.ts`, `redactString` in `live-stack.ts`).
- A stack started from a worktree outlives the worktree: the edge runtime container keeps mounting the removed directory and every deployed function refuses. Measured on this item before any change (34 reds with the stack otherwise healthy). The drive's Doctor now catches it; the runner does not, by the standing decision to keep Docker off the destructive path.
- The req-016 stand-in fixture and its modules, when req-016's product code lands.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01SikdZcn3PmB9SrZ4dL1ziT
