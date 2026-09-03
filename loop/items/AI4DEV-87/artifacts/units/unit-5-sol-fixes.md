# Unit 5 brief: the three sol items (writer: the feature lane)

Worktree: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87, branch nirdrang/ai4dev-87-the-acceptance-harness-shrinks-to-the-per-id-gate-over-the. Unit 4 has landed; read `git log -1 --stat` first. You write in this worktree and commit on this branch. Nobody else writes while you do. Use PowerShell. Read `loop/items/AI4DEV-87/artifacts/interrogate/rulings.md`, section "Sol", items 10 to 12: they are your contract. Read `review-sol.md` findings 1 to 3 for the reasoning.

## The pin
The three manifests are not edited; the three `at:verify --expect` runs match (req-001 integration 16 green, 21 red). `bun run typecheck` clean over three projects. `bun run at:selftest` green. The drive passes 13 of 13.

## Tests first, then the change
1. Item 10, the poll bound. In `tests/at/harness/live-stack.selftest.ts` add a test that stubs `globalThis.fetch` so the Mailpit search answers 50 summaries and every raw read takes 200 ms and carries no verify link; call `verifyLinksFor` with a 1-second deadline (add an optional `deadlineMs` parameter, default 20_000) and assert it returns `[]` within about 1.5 seconds. Add a second test where the third raw message carries the link and assert only three raw reads happened. Watch both fail. Then implement: one deadline for the whole call; `mailMessagesFor` gains an optional `stopWhen(message) => boolean` or `verifyLinksFor` reads messages one by one itself; each fetch gets `AbortSignal.timeout(remaining)` with the remaining time; the function returns at the deadline even mid-iteration. `_live.ts` and the drive keep calling `verifyLinksFor(stack, address, kind)` with the default.
2. Item 11, the refusal through the real path. New `tests/at/harness/live-refusal.selftest.ts` (or a describe in `runner-blackbox.selftest.ts` if its helpers fit; say which in the report): spawn `bun --no-env-file <INSTALL_ROOT>/node_modules/vitest/vitest.mjs run --root tests/at --config tests/at/vitest.config.ts --reporter=json --outputFile=<tmp> suites/req-016/` with an allowlisted environment (`childEnv` from `local-stack.ts`) plus `AT_TIER=integration` and `AT_REGISTRATION_DIR=<tmp>`, and no `AT_SUPABASE_*` variable. Assert: twelve assertion results, every one failed, every failure message starting with `CapabilityPending: CAPABILITY PENDING — fixtures.worlds, sut.notifications`. Write the test before you change anything; it must pass on the current head because unit 4 already refuses before construction. If it does not pass, stop and report what the message was.
3. Item 12, the request shape. In `live-stack.selftest.ts`, stub `globalThis.fetch`, call `authPost(stack, '/auth/v1/signup', { a: 1 })` and assert method POST, the URL, and the headers `apikey`, `Authorization: Bearer <anon>`, `Content-Type`; call `authPost` with a bearer and assert the bearer replaces the anon key; call `functionPost(stack, 'complete-signup', {}, 'tok')` and assert no `x-forwarded-for`, then with `'203.0.113.7'` and assert it is present. Restore `globalThis.fetch` in `finally` in every test.

## Files you may touch
`tests/at/harness/live-stack.ts`, `live-stack.selftest.ts`, the new refusal selftest file (or `runner-blackbox.selftest.ts`), `tests/at/README.md` (one sentence naming the refusal selftest as the guard for the tier CI never runs). Nothing else.

## Order of work
Item 11 first (it must pass as is). Then items 10 and 12 tests, watch them fail, implement item 10. `bun run typecheck`; `bun run at:selftest`; both loop `--expect`; `bun run at:verify req-001 --tier integration --expect`; the drive `bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts loop/items/AI4DEV-87/artifacts/units/unit-5-drive` 13 of 13.

Commit ONCE with `git commit -F <file>`. First line exactly: `AI4DEV-87: the mail poll has one deadline, the above-loop refusal is proven through the real path, the request shape is pinned`. Body: the three items, one line each. Trailers `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01SikdZcn3PmB9SrZ4dL1ziT`. Do not push. Stage nothing under `loop/items/`.

## STOP rule
If item 11's test fails on the current head, stop and report the exact message. Do not edit a manifest. Do not widen the touch list.

## Report
Write `loop/items/AI4DEV-87/artifacts/units/unit-5-report.md`: the commit SHA; the three items with one line each; the pasted last 15 lines of typecheck, at:selftest, the three at:verify runs, and the drive (redact JWT-shaped strings and `sb_` keys); deviations. Reply with exactly five lines: the commit SHA; the selftest count; the three at:verify results and the drive result; deviations (a number, or "none"); the report path.
