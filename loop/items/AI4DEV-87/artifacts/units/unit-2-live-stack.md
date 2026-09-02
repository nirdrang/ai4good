# Unit 2 brief: one shared stack module for the suite and the drive; the live adapter shrinks; the mail reader is parked (writer: the feature lane)

Worktree: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87, branch nirdrang/ai4dev-87-the-acceptance-harness-shrinks-to-the-per-id-gate-over-the. You write in this worktree and commit on this branch. Nobody else writes while you do. Use PowerShell for every command. Unit 1 has landed; read `git log -3 --stat` and `git show HEAD --stat` before you start so you see the tree as it is now.

## The design you implement
Read `loop/items/AI4DEV-87/artifacts/design.md` in full. Section 2 is your contract, with one correction: the shared module lives at `tests/at/harness/live-stack.ts`, not under a new `tests/at/live/` directory, because a test with no acceptance id lives under `tests/at/harness/` (project CLAUDE.md, section 5). Then read, in this order: `tests/at/harness/live-email.ts`, `tests/at/suites/req-001/_live.ts`, `tests/at/harness/index.ts`, `tests/at/harness/contracts.ts`, `.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts`, `.claude/skills/verify-ai4good/SKILL.md`.

## The behavior that must not change (the pin)
- The three manifests are not edited. `bun run at:verify req-001 --tier loop --expect`, `bun run at:verify req-016 --tier loop --expect`, and `bun run at:verify req-001 --tier integration --expect` (16 green, 21 red) match exactly.
- `bun run typecheck` clean. `bun run at:selftest` green, plus the new selftest below.
- The drive `bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts loop/items/AI4DEV-87/artifacts/units/unit-2-drive` prints the same eleven check ids and titles (a, b, c, d1, d2, e, f, g1, g2, g3, g4), passes 11 of 11, exits 0, and writes `transcript.json` with the same top-level keys (`ranAt`, `email`, `orgName`, `checks`, `transcript`) and the same per-step shape (`step`, `request { method, url }`, `response { status, body }`).

## Tests first
Create `tests/at/harness/live-stack.selftest.ts` before the module exists, with describe blocks for the pure functions the module will export, and watch `bun run at:selftest` fail on the missing module:
- `verifyLinksIn(raw, kind)`: given a raw message body in quoted-printable with a soft line break inside `=3D` and `&amp;` in an HTML part, returns the decoded `/auth/v1/verify` link whose `type=` matches `kind`, drops a link of the other kind, strips trailing `.,;`, and returns `[]` for a body with no verify link. Copy the decoding order from `_live.ts` `linksIn` (soft breaks first, then `=XX`, then `&amp;`).
- `parseStatusJson(stdout)`: takes the CLI's stdout, which may carry text before and after the JSON object, and returns the object; throws a message that names `bun run db:start` when there is no JSON object.
- `stackFromStatusJson(object)`: builds a `Stack` from `API_URL`, `DB_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`, and `MAILPIT_URL` or `INBUCKET_URL`; throws naming the missing field.
- `redactString`, `redactUrl`, `redactValue`: the three behaviors the drive script documents (JWT shape, `sb_` keys, credential-shaped keys, query values replaced, fragment cut, unparseable URL).

## What you create
`tests/at/harness/live-stack.ts`, with a header of at most ten lines saying what it is (the one client for the running stack, shared by the integration adapter and the verify-ai4good drive; five coordinates; HTTP, Mailpit, SQL, redaction; no provenance, no attestation) and these exports:
- `type Stack = { apiUrl; dbUrl; anonKey; serviceRoleKey; mailUrl }`.
- `stackFromEnv()`: the five `AT_SUPABASE_*` values the runner hands the child (move `liveCoordinatesFromEnv` from `index.ts`).
- `parseStatusJson`, `stackFromStatusJson`, and `stackFromStatus(repoRoot)`, which runs `bun x supabase status -o json` with `spawnSync` in `repoRoot` (as the drive does today) and returns a `Stack`.
- `authPost(stack, path, body, bearer?)` and `functionPost(stack, name, body, bearer, ip?)`, both returning `{ status: number; json: Record<string, unknown> }`, moved from `_live.ts` (`authPost`, `callFunction`), with the `x-forwarded-for` header only when `ip` is given.
- `mailMessagesFor(stack, address)`: the Mailpit search plus raw-source read, moved from `live-email.ts` `messagesFor`, returning `{ id, to, subject, body }[]`; `mailIdentification(stack)`: the `/api/v1/info` probe and its refusals, moved from `createLiveEmail`, returning the `Mailpit <version> at <url>` string.
- `verifyLinksIn(raw, kind)` (pure) and `verifyLinksFor(stack, address, kind)` (the bounded 20-second poll), moved from `_live.ts` `linksIn` and `linksFor`.
- `followLink(url)`: a GET with `redirect: 'manual'` returning `{ status, location }`.
- `sqlClient(stack)`: `new Bun.SQL(stack.dbUrl)` through the same `globalThis.Bun?.SQL` lookup `_live.ts` uses today, with the same refusal when the runtime has no SQL client.
- `redactString`, `redactUrl`, `redactValue`, moved from the drive script.

## What you park (git mv, byte-identical, into loop/parked/v1/ at the same relative path)
- `tests/at/harness/live-email.ts`

## What you edit
1. `tests/at/suites/req-001/_live.ts`: `createLiveAdapter({ stack }: { stack: Stack })`; delete the `Slot` interface, the `BunSqlClient` plumbing, `authPost`, `callFunction`, `linksIn`, `linksFor`, and the `vendors`, `config`, `worlds` options; call the shared module instead. Keep every `accounts` method, the six explicit refusals unit 1 added, `lifetimeProblem`, the world with its email namespace, and the teardown that closes SQL. Rewrite the header: drop the paragraphs about the enumeration, the proxy, and the vendors; keep the "what is backed and why the four families are not" explanation and the "registration issues no session" doctrine.
2. `tests/at/harness/index.ts`: above loop, `createLiveAdapter({ stack: stackFromEnv() })`; no `createLiveEmail`; `vendors` above loop is `refusing<AtHarness['vendors']>('vendors.email')`; `LiveSlotCoordinates` and `liveCoordinatesFromEnv` go (the type is `Stack` from the shared module); `LiveAdapterModule.createLiveAdapter(opts: { stack: Stack })`.
3. `tests/at/harness/contracts.ts`: delete the re-export of the `live-email.ts` types and the import; `TierHarness` above loop is `Omit<AtHarness<Sut, W, Channel>, 'clock' | 'vendors'> & { clock: RealClock }` (no vendors member above loop; a body that reaches for it fails to compile). Fix the doc block above it so it says that.
4. `tests/at/harness/runner.selftest.ts` line about 171: the comment that says the live email capability reads the catcher URL now says the shared stack module reads it.
5. `.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts`: import the shared module by relative path (`../../../../tests/at/harness/live-stack.ts`) and delete the local copies of the status read, the HTTP step, the Mailpit read, the link extraction, the redaction helpers. Keep `record`, `fatal`, `flush`, the transcript array, the eleven checks in the same order with the same ids and titles, and the same transcript shape. Where `step()` recorded a request and response, keep recording them from the values the shared helpers return.
6. `.claude/skills/verify-ai4good/SKILL.md`: in Drive, say the helpers are `tests/at/harness/live-stack.ts` and that the acceptance suite's integration adapter uses the same module. In Doctor, add one check with its command: the edge runtime container must mount THIS checkout's `supabase/functions`; `docker inspect supabase_edge_runtime_poancmeitlmxejofwzuu --format "{{json .Mounts}}"` lists the source path; if it names a directory that no longer exists (a removed worktree) or another checkout, the deployed functions are stale or gone and every completion refuses; the fix is `bun run db:stop` then `bun run db:start` from your checkout. Measured 2026-09-02 on this item: the container mounted the previous item's removed worktree and the integration tier reported 34 reds with the stack otherwise healthy.
7. `loop/parked/v1/README.md`: append `## The live mail reader (parked 2026-09-02)`: one paragraph, what moved, what replaced it (the Mailpit read and its identification probe in the shared stack module, no brand), dead text under version control.

Nothing else. Not `tests/at/expected/`, not `runner.ts` (unit 3), not `_integration.ts`, not any `*.test.ts`, not any `_fixture.ts`, not the feature files under the verify skill.

## Order of work (each step ends green before the next)
1. The failing selftest. `bun run at:selftest` shows the missing module.
2. Create the module; make the selftest green.
3. Items 1 to 4. `bun run typecheck` clean; `bun run at:selftest` green; both loop `--expect` match.
4. `bun run at:verify req-001 --tier integration --expect`: EXPECTED match, 16 green, 21 red. If the lock is held, wait two minutes and try once more. On an infrastructure refusal, stop and report; do not restart the stack.
5. Items 5 and 6. Then the drive command in the pin, from the worktree root: 11 of 11, exit 0.
6. Item 7. Commit everything as ONE commit with `git commit -F <file>`. First line exactly: `AI4DEV-87: one stack module serves the integration adapter and the drive; the mail reader is parked`. Body: the module and its exports, what the adapter lost, what the drive lost, the Doctor check and the incident behind it. Trailers `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01SikdZcn3PmB9SrZ4dL1ziT`. Do not push. Do not stage anything under `loop/items/AI4DEV-87/artifacts/` except nothing: the drive evidence directory named above is written by the drive and stays unstaged.

## STOP rule
If a step cannot end green, or the design cannot be followed without a change outside the touch list, stop, write the report, and say exactly what blocked you. Do not widen the touch list. Do not edit a manifest.

## Report
Write `loop/items/AI4DEV-87/artifacts/units/unit-2-report.md`: the commit SHA; every file created, moved, edited with one line each; the pasted last 15 lines of typecheck, at:selftest, the three at:verify runs, and the drive (redact JWT-shaped strings); every deviation from this brief and why; line counts of `_live.ts` and `live-stack.ts` after. Then reply with exactly five lines: the commit SHA; the selftest count; the three at:verify results and the drive result; deviations (a number, and "none" when zero); the report path.
