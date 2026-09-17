# Unit 4 fix lane: the skills travel inside the function bundle

You are the writer for a fix pass on unit 4 of the credits engine run. You work in this
worktree on branch `lane/ai4dev-132`, whose head is the unit 4 commit `c2353b3`. You may edit,
create and run anything under it. Use PowerShell syntax if you shell out; you are on Windows.
Never use Bash syntax. The local stack is up and serves this worktree's functions; do not stop
or start it.

## The defect, measured

The deployed `discovery-message` route answers 502 on every send:
`readdir '/var/tmp/sb-compile-edge-runtime/functions/_shared/discovery-skills/'`. The edge
runtime compiles each function into a bundle and the markdown skill files are not in it. The
`static_files` line added to `supabase/config.toml` does not carry them in the local runtime.
Because `readDiscoverySkills()` runs before the email floor, AT-001.10 at integration (an
unverified email is refused `email-unverified`) reports 502 `refused` instead. The lead's
check summary is `loop/items/AI4DEV-132/reports/checks-unit4/summary.txt` and the failing log
is `at-verify-req-001-tier-integration-expect.log` beside it.

## Read first

1. `loop/items/AI4DEV-132/reports/unit4.md`, the unit 4 writer's report.
2. `supabase/functions/_shared/discovery-skills.ts`, `discovery-skills/*.md`, `edge.ts`
   (`readDiscoverySkills`), `discovery-message/index.ts`, `discovery-turn.ts`
   (`discoveryPrepare`), `supabase/config.toml` (the `static_files` line).
3. `tests/at/harness/discovery-skills.ts`, `discovery-skills.selftest.ts`,
   `tests/at/suites/req-004/_fixture.ts` (where the skills are read), `package.json` scripts.

## The change

1. **A generated module.** Add `supabase/functions/_shared/discovery-skills/index.ts` that
   exports `DISCOVERY_SKILLS: readonly DiscoverySkill[]`, one entry per markdown file in file
   order, each body the file's text verbatim inside a template literal (escape backticks and
   `${` if any appear; better, keep the markdown free of them). Add the generator
   `tests/at/harness/generate-discovery-skills.ts` (bun, reads the folder with the existing
   node reader, writes the module deterministically) and a `package.json` script
   `discovery:skills` that runs it. Run it once so the module is committed.
2. **The sync selftest.** `discovery-skills.selftest.ts` also asserts that
   `DISCOVERY_SKILLS` equals what the node reader produces from the markdown files, with a
   failure message that says to run `bun run discovery:skills`. Keep its other assertions.
3. **The runtime reads nothing.** Delete `readDiscoverySkills` from `edge.ts`. The route's
   index file imports `DISCOVERY_SKILLS` and passes `prepare: discoveryPrepare(port,
   DISCOVERY_SKILLS)`. The fixture imports the same module instead of the node reader
   (the reader stays for the generator and the selftest). Remove the `static_files` line
   from `config.toml`.
4. **Prove it on the deployed route.** After the change, the local runtime serves the new
   bundle without a restart. Send as an unverified NGO and confirm the answer is 409
   `email-unverified`; the scratch probe the lead used is the req-004 live adapter's
   `provisionNgo({ emailVerified: false })`, `startDiscoveryNeed`, `sendMessage`. Put the
   probe's redacted answer in your report.

## Must-nots

- No change to the markdown bodies, the prompt, the tool, the streaming path, the migrations
  or any test body. No key in any file. No narrating comments.
- Exactly fifty-eight `atTest(` call sites stay.
- Do not touch `loop/items/` except to write your report.

## Checks you run

From this worktree: `bun run typecheck`, `bun run at:check req-004`, `bun run at:selftest`,
`bun run at:verify req-004 --tier loop --expect`, `bun run at:verify req-004 --tier integration --expect`,
`bun run at:verify req-001 --tier integration --expect`. Run them until green. An integration
run resets the stack; if a run reports every id red with a 502, run it again.

## Commit

One commit on `lane/ai4dev-132`. Message:

```
AI4DEV-132: unit 4 fix, the skills travel inside the function bundle

<three to six lines in plain sentences.>
```

No other item id anywhere in the message.

## Report

Write `loop/items/AI4DEV-132/reports/unit4-fix.md`: what changed by file, the probe answer,
the output of the six checks (exit code and last lines), the commit hash, and any deviation
with its reason. Reply with five lines: the commit hash, the check results, deviations,
blockers, the report path.
