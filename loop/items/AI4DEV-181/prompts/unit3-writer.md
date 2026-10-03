# Writer brief: unit 3, usage and the old path removed

You are the writer for unit 3 of AI4DEV-181 (Discovery wired to backend). Work only in your working
directory, a git worktree on branch `lane/ai4dev-181/unit3`. Commit with messages that end with
`(AI4DEV-181)`. Do not push. Do not launch other agents. Do not touch any other folder. Do not stop,
start or restart any process you did not start yourself. That includes the local Supabase stack:
it is already running from your worktree, so its edge runtime serves your files and
`bun run at:verify ... --tier integration` resets the database from your migrations. Use
PowerShell syntax for shell commands.

**Commit early.** Commit each step as soon as its checks pass. A time limit stopped an earlier
writer; only committed work survives. **Stop rule:** if an environment problem blocks you for 15
minutes, commit what works and report the command, its output and what you tried.

**Comments.** New and changed code carries almost no comments: only a constraint forced by
something we cannot change, or a doc comment on an exported API. No step narration.

## The founder's rulings this unit applies (2026-10-02 and 2026-10-03)

1. A Discovery reply costs exactly one free credit. There is no token pricing for free turns.
2. There is no beta counter anywhere: "Remove the beta thing 1 credit for each turn", and then
   "Remove everywhere". The cohort stays at most 20 NGOs with one sponsored project each, but there
   is no 50-turn lifetime cap and no 1,000-turn cohort total. Free Discovery is limited by the daily
   grant alone.
3. The daily grant is 10 free turns per UTC day, 30 once the NGO is vetted ("Vetted gets 30").
4. Free comes first even when the project is funded. Fuel stays the existing stub.
5. Unit 2 kept a temporary old path so the old tests stayed as declared. Remove it: "Remove old
   path".

## Read first

- `loop/items/AI4DEV-181/design.md` ("Usage", "Turn") and `loop/items/AI4DEV-181/decisions.tsv`.
- `loop/items/AI4DEV-181/evidence/unit2/writer-output.md`: what unit 2 built, what it left on the
  old contract, and why.
- `.claude/skills/doc-sync/SKILL.md`, "The change bundle", steps 1 to 6: the ritual for changing
  requirement text. This is a classified (c) change, requirement text, with the founder's rulings
  above as its decision.
- The code of unit 2 on your branch: `supabase/functions/_shared/discovery-turn.ts`,
  `discovery-reply.ts`, `discovery-prompt.ts`, `discovery-metering.ts`, `discovery-allowance.ts`,
  `anthropic-messages.ts`, `openai-compatible-messages.ts`, `discovery-message/index.ts`,
  `discovery-conversation/index.ts`, and the migrations `20261003120000` and `20261003120100`.
- The screen: `src/lib/discovery-stream.ts` (`DiscoveryUsage`), `src/components/discovery/model.ts`,
  the usage card component under `src/components/discovery/`, and the fixture shell
  `design/astra/src/fixture-world.ts` and `fixture-data.ts`.

## Build

1. **The requirement text (one commit, the doc-sync bundle).** Decision `d95` in
   `loop/state/decisions.jsonl`, in the format of `d94`, with the founder's words above. Edit the
   owning pure sections in `loop/out/pure-s*.md` (never `prd-mvp.md`, never an isolate), then run
   `powershell -File loop/assemble-pure.ps1`, `powershell -File loop/extract-isolates.ps1 -Reqs
   002,004`, and `powershell -File loop/decomp/check-tree.ps1`. Every sentence that names the beta
   counter, the 50 turns or the 1,000-turn cohort total goes. Where the text says vetted and
   unvetted share the same limits, or that vetting never adds turns, it now says vetting raises the
   daily grant from 10 to 30. Amend `.taskmaster/docs/acceptance/at-req-002.md` and
   `at-req-004.md` with `[d95]` notes: AT-002.04, .05, .07, .28, AT-004.46, .47 and every other id
   whose text names the beta counter or token-priced free turns. Keep every id. Update
   `loop/decomp/req-002.md` and `req-004.md` only if a deliverable's text changes. Do the design
   branch's parts a and b: the usage rows in `design/ui-ux-instructions.md`, the usage section of
   `design/discovery-ui-contract.md`, and a change order `design/change-orders/013-discovery-one-credit-no-beta.md`
   (the rulings in the founder's words, the changed requirement text verbatim, the contract edits).
   Part c, the canvas revision, is not this unit: list it in your report.
2. **The screen type and the fixture shell.** `DiscoveryUsage` loses `betaLeft` and `betaGrant`.
   `model.ts`, the usage card, the fixture shell and its data follow. The card shows today's free
   turns left of the daily grant, paid USD available, and the next reply's mode. No beta row.
3. **The backend.** Delete the old request path: a request without reply mode, the
   `record_elicitation` tool and its parser, the token-priced reserve and settle for free turns,
   `countTokens` before reserve, and every constant, type, SQL function or column use that only
   the old path needed. One request shape remains, the screen's. The usage function computes the
   daily grant (10, or 30 when vetted) and no beta counter; if the enrollment backend stores a beta
   grant or beta usage, stop reading and writing it, and drop it in a new migration when nothing
   uses it. A new migration file goes after `20261003120100`; never edit a merged migration. Remove
   what the server copied into the old beta fields.
4. **The tests.** Move every test that used the old path onto the reply path and the new
   contract, keeping its id: AT-004.01, .02, .03a, .03b, .04, .06, .08, .10, .12, .14, .15, .46,
   .47, .48, .72, and any req-002 test that asserts the beta counter. The scripted model stand-in
   the suites use must answer the forced `reply` tool, not `record_elicitation`; update it once in
   the shared helper, not per test. A test whose whole point was the removed rule (for example a
   lifetime cap) changes to assert the new rule its amended acceptance text states. Update the
   `--expect` declarations under `tests/at/expected/` only for the tests whose result changes, and
   list each.

## Checks (all must pass)

1. `bun run typecheck` exits 0.
2. `bun run at:selftest` exits 0 (it was 494 before this unit).
3. `bun run at:check req-001`, `req-002`, `req-004` exit 0.
4. `bun run at:verify req-002 --tier loop --expect` and `bun run at:verify req-004 --tier loop
   --expect` exit 0 and match.
5. `bun run at:verify <req> --tier integration --expect` exits 0 and matches for req-001, req-002,
   req-003, req-004 and req-016, each run on its own. Before this unit they were 29, 19, 10, 17
   and 12 green. A test may move from red to green or change only where your declaration change
   lists it; nothing green turns red.
6. `powershell -File loop/assemble-pure.ps1 -Check` and `powershell -File loop/decomp/check-tree.ps1`
   pass after your commits.
7. `rg -n "betaLeft|betaGrant|record_elicitation|RECORD_ELICITATION" src supabase design/astra/src tests`
   finds nothing.

## Your final response

The commits (hash and subject), each check with its exit code and counts, the files you added,
changed and deleted, every acceptance text and declaration change with its id, the canvas revision
left for the design stage, and anything you could not do and why.
