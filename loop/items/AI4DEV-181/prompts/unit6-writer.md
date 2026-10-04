# Writer brief: unit 6, the scope move and close-out

You are the writer for unit 6 of AI4DEV-181 (Discovery wired to backend). Work only in your working
directory, a git worktree on branch `lane/ai4dev-181/unit6`. Commit with messages that end with
`(AI4DEV-181)`. Do not push. Do not launch other agents. Do not touch any other folder. Do not stop,
start or restart any process you did not start yourself. That includes the local Supabase stack:
it is already running from your worktree, so its edge runtime serves your files as they were at
launch, and `bun run at:verify ... --tier integration` resets the database from your migrations.
If you add or change an edge function and need the runtime to serve it, commit, say so in your
report, and continue with what does not need it; do not restart the stack. Use PowerShell syntax.

**Commit early.** Commit each step as soon as its checks pass. Only committed work survives a time
limit. **Stop rule:** if an environment problem blocks you for 15 minutes, commit what works and
report the command, its output and what you tried.

**Comments.** New code carries almost no comments: only a constraint forced by something we cannot
change, or a doc comment on an exported API.

## The rules

- UI code reads and writes only through our edge functions and holds no secret.
- Every model call goes through `discoveryModelPort()` in
  `supabase/functions/_shared/discovery-model.ts`, so the env-chosen model serves it. The
  integration stack runs `DISCOVERY_PROVIDER=openai-responses` with muse on opencode Go. Its
  adapter, `openai-responses-messages.ts`, sends `tool_choice: auto` and asks for the forced tool
  in the instructions, so a parser must reject a missing or malformed tool answer and the caller
  must treat that as a system error, never as a result.
- The acceptance test harness takes no new machinery: no new sentinels, faults, vendor stand-ins,
  fixture worlds or capabilities. A new acceptance id registers through `atTest`. A test with no
  acceptance id lives under `tests/at/harness/`.
- Acceptance text changes follow `.claude/skills/doc-sync/SKILL.md`, "The change bundle". Decision
  d94 in `loop/state/decisions.jsonl` is the decision for every move and retirement below; its
  notes are already in `.taskmaster/docs/acceptance/at-req-004.md` and `at-req-036.md`.

## Read first

- `loop/items/AI4DEV-181/brief.md` (step 4 and the Verify list) and `plan.md` (definition of done).
- `.taskmaster/docs/acceptance/at-req-004.md`: AT-004.10, .11, .20, .21, .22, .25, .37, .38, .46,
  .58, .59, .60 and their `[d94]` notes. `.taskmaster/docs/acceptance/at-req-036.md`: AT-036.11,
  .12.
- `tests/at/suites/req-004/g-scope-output.test.ts`, `h-cause-labels.test.ts`,
  `i-regeneration.test.ts`, and the suites holding AT-004.10, .11 and .46.
- `tests/at/expected/req-004.json`: at the integration tier AT-004.10, .20, .22, .58, .59 are red
  `capability-pending vendors.anthropic` and AT-004.46 is red `capability-pending
  ui.discovery-surface`.
- The scope generator: `supabase/functions/_shared/scope.ts`, `scope-copy.ts`,
  `supabase/functions/discovery-scope/index.ts` (it builds `anthropicMessagesPort()` directly).
- The brief store and reply: `discovery-brief.ts` (`evolveBrief`, the label commands),
  `discovery-brief-write.ts`, `discovery-reply.ts`, `discovery-turn.ts`, and
  `supabase/functions/discovery-brief/index.ts` (`finish`, `remove-label`).
- `.claude/skills/verify-ai4good/SKILL.md`, `features/README.md`, `features/discovery-chat-page.md`,
  `features/discovery-scope.md`, `scripts/prepare-chat-page.ts`, `scripts/drive-discovery.ts`.
- `design/discovery-model-calls.md` and `design/discovery-ui-contract.md`.

## Build

1. **The technical scope moves to the PRD step.** Register AT-036.11 and AT-036.12 through `atTest`
   in a new suite under `tests/at/suites/req-036/`, with `tests/at/expected/req-036.json` in the
   format of the other declarations. Their bodies are the bodies of AT-004.20, .22 (to AT-036.11)
   and .21, .25 (to AT-036.12), changed only where the AT-036 text differs: the input is a
   confirmed Discovery document (the brief at its confirmed revision), each story traces to an
   agreed answer or kept open question, and the data tier and maintainability verdict parts follow
   the AT-036 text. The scope generator takes a confirmed brief document as its input and calls
   the model through `discoveryModelPort()`. It is not reachable from the Discovery screen and
   charges no Discovery credit. If no PRD-step entry point exists, the generator stays a shared
   module the tests drive at both tiers, and `discovery-scope` either becomes that entry point
   keyed to a confirmed brief or is deleted with every caller, whichever leaves less code. Retire
   AT-004.20, .21, .22, .25 from the REQ-004 suites and from `tests/at/expected/req-004.json` in
   the same commit, and mark them retired in `at-req-004.md` as d94 says. Run `bun run at:check`
   for req-004 and req-036 until both pass.
2. **Regeneration is removed.** Retire AT-004.37 and .38: delete their bodies and any code only they
   used, and mark them retired in the acceptance text as d94 says.
3. **Cause labels come from the live brief.** AT-004.58 and .59 keep their ids. The trigger moves
   from scope generation to Discovery: the reply's brief update may propose cause labels (reuse an
   existing vocabulary label for a matching domain, add a new one only for a genuinely new domain,
   none when the conversation is too thin), they live in the brief, and `finish` publishes them to
   the project. AT-004.60 (remove a label; no control to type or curate one) keeps working through
   `remove-label`. Amend the AT-004.58 and .59 text in the doc-sync bundle ("when Discovery
   proposes" in place of "when the scope generates"), and move their bodies onto the reply path at
   both tiers. Bound the labels with the existing `SCOPE_CAUSE_LABELS_MAX` and
   `SCOPE_CAUSE_LABEL_MAX_CHARS` rules, moved to where the brief uses them.
4. **The absorbed tests.** Make AT-004.10, .11 and .46 green at the integration tier on the real
   route and the configured model, with their declarations changed from red to green.
5. **The verify skill.** Replace `features/discovery-chat-page.md` with a feature file for the wired
   Discovery screen: how to reach it, how to prepare a signed-in NGO and a submitted project on the
   local stack, how to drive it on desktop and on a phone-width viewport, and the observable end
   states (the first reply, an answered question saving, the brief revision rising, one credit
   used, a file reaching read with its facts in the brief, the review page, finish recorded, the
   refusals by kind). Update `prepare-chat-page.ts` and add or update a drive script under
   `scripts/` that runs those steps against the stack and exits 0 only when every end state holds.
   Update `features/discovery-scope.md` to the scope's new home, and `features/README.md` where it
   lists features or counts write routes.
6. **The design note.** Update `design/discovery-model-calls.md` to what shipped: the reply's one
   tool call, the free opening reply, the file read in parts, no closing call, no regeneration,
   the scope in the PRD step, and the three model adapters chosen by `DISCOVERY_PROVIDER`.

## Checks (all must pass)

1. `bun run typecheck` and `bun run build` exit 0.
2. `bun run at:selftest` exits 0 (it was 515 before this unit).
3. `bun run at:check` for req-001, req-002, req-004, req-032, req-036 exits 0.
4. `bun run at:verify req-004 --tier loop --expect` and `bun run at:verify req-036 --tier loop
   --expect` exit 0 and match.
5. `bun run at:verify <req> --tier integration --expect` exits 0 and matches for req-001, req-002,
   req-003, req-004, req-016, req-032 and req-036, each on its own. Before this unit the first six
   were 29, 19, 10, 30, 12 and 1 green. Nothing green turns red except a retired id; every
   declaration change is listed.
6. `powershell -File loop/assemble-pure.ps1 -Check` and `powershell -File loop/decomp/check-tree.ps1`
   pass.
7. The new drive script exits 0 against the stack.

## Your final response

The commits (hash and subject), each check with its exit code and counts, the files added, changed
and deleted, every acceptance text and declaration change with its id, every id retired, and
anything you could not do and why.
