# Resume note for AI4DEV-181 (Discovery wired to backend)

Rewritten at the unit 3 gate, 2026-10-03.

## Where the run is

- Session in the item worktree `.claude/worktrees/AI4DEV-181`, branch
  `nirdrang/ai4dev-181-phase-3-discovery-screen-wired-real-transport-and-backend-on`. Lead is
  poteto-mode (pstack 1.5.0) on the figure-it-out playbook. Read `brief.md`, `plan.md`, `design.md`,
  `decisions.tsv` (every founder call and lead decision, in order).
- **Unit 1 (brief store) is merged on the item branch.** Rules module
  `supabase/functions/_shared/discovery-brief.ts` (pure, selftested), write shaper
  `discovery-brief-write.ts`, migration `20261002120000_discovery_brief_store.sql`
  (`brief_revisions`, `discovery_confirmations`, `discovery_brief_messages`, `discovery_brief_commit`,
  `viewer_discovery_brief`), edge function `discovery-brief` (edit, accept, ask, remove-label,
  finish), `discovery-conversation` returns `brief`, `confirmation`, `lines`. Live proof
  `evidence/unit1/prove.ts` (revisions 2, 3, 3, 4; stale-revision) passes.
- Checks at the gate: typecheck 0; at:selftest 487 passed; at:check req-001 and req-004 0; loop
  --expect req-001 33 green, req-004 44 green; integration --expect req-001 29, req-002 19,
  req-003 10, req-004 17, req-016 12 green, all matching.

- **Unit 2 (turn contract) is merged on the item branch** (writer grok-4.7 xhigh, 87 min, 6.20 USD;
  commits `078d4f7`, `959dc19`, `b7f20b8`, `094e72e`). `discovery-reply.ts` (the forced `reply`
  tool), `json-text-decoder.ts`, `openai-compatible-messages.ts` beside `anthropic-messages.ts`
  (env `DISCOVERY_PROVIDER` picks; unset keeps Anthropic), migrations `20261003120000` (billing
  `opening`) and `20261003120100` (reply turn, one SQL usage function, one credit, refusals
  `finished`, `discovery-ready`, `mode-changed`, `daily-limit`, replay by `userMessageId`). The
  persisted screen message is `assistant_ui`; `assistant_message` stays text.
- **Unit 3 (usage) is merged on the item branch** (writer codex gpt-6.1-sol high, 52 min; grok
  answered 402, balance exhausted, and the founder chose the substitute for this unit). Decision
  d95: one credit per reply, no beta counter anywhere (PRD, REQ-002, REQ-004, acceptance text with
  `[d95]` notes), daily grant 10, or 30 vetted. Change order `design/change-orders/013-discovery-one-credit-no-beta.md`.
  `DiscoveryUsage` lost `betaLeft`/`betaGrant`; the old request path, `record_elicitation` and the
  token-priced free turn are deleted; migration `20261003120200_discovery_daily_reply_only.sql`
  drops the four token-pricing columns of `discovery_turns`. Report:
  `evidence/unit3/writer2-output.md` and the committed `evidence/unit3/writer-output.md`.
- **Open from unit 3:** the Discovery canvas still shows a beta row; its revision belongs to the
  design stage (doc-sync step 5c), not this item. The review artifact was not republished.
- Grok no longer loads Linear or Claude Design: `.grok/config.toml` (commit `e96d8d6`).
- Checks at the unit 2 gate (lead, stack started from this worktree): live proof
  `evidence/unit2/prove.ts` 6 of 6 on space-bunny-free; typecheck 0; at:selftest 494; at:check
  req-001 and req-004 0; loop req-004 44 green; integration req-001 29, req-002 19, req-003 10,
  req-004 17, req-016 12 green, all matching.
- `supabase/functions/.env` in this worktree now holds the opencode settings
  (`DISCOVERY_PROVIDER=openai-compatible`, `DISCOVERY_MODEL=space-bunny-free`, base URL, key,
  `DISCOVERY_REASONING_EFFORT=low`) beside the Anthropic key.

- Checks at the unit 3 gate (lead, stack started from this worktree): typecheck 0; at:selftest 495;
  at:check req-001, req-002, req-004 0; loop req-001 33, req-002 20, req-004 44; integration req-001
  29, req-002 19, req-003 10, req-004 17, req-016 12, all matching; assemble-pure -Check 0;
  check-tree 0; unit 2 live proof 6 of 6.

## Next: unit 4 (files)

Per plan.md and design.md "Files": the `discovery-files` bucket, the `discovery-file` upload edge
function (multipart; refusals `finished`, `file-limit` three while not funded with intake excluded,
`duplicate-file`), `discovery_files` and `discovery_file_parts`, the read in
`EdgeRuntime.waitUntil` (no question, never pauses, free, not a turn), stored digests in parts,
facts into the brief through `evolveBrief` with source `file`, digests in later turns, `load`
re-dispatching a read whose heartbeat is older than five minutes, AT-032.13 registered. Units 5 and
6 follow plan.md.

## Unit 3 scope, as decided at the unit 2 gate

Founder at the unit 2 gate, 2026-10-03: "Remove old path (Recommended)". Unit 3 rewrites the REQ-004
acceptance text to one credit per reply with no beta counter, moves the 15 old-contract tests
(list above) onto the reply path, drops the beta fields from the screen's `DiscoveryUsage` and the
fixture shell, and deletes `record_elicitation`, the token-priced reserve and the old request path.
The `--expect` declarations change only for the tests it moves. Units 4 to 6 follow plan.md.

## Facts that cost time

- **Background commands die at about 30 minutes in this session.** Start a writer as a detached
  process (`Start-Process` with the runner args, hidden window, stdout and stderr to files) and wait
  with a PowerShell loop on the receipt file in a background command; re-arm the wait when it is
  stopped. Unit 1 lost one writer run to the limit (only its first commit survived).
- **Run every requirement's integration tier at each unit**, not only req-004: unit 1's new viewer
  function broke the req-001 catalog allowlist (`VIEWER_FUNCTIONS` in
  `tests/at/suites/req-001/_integration.ts`); the writer had run req-004 only.
- The stack's edge runtime serves the checkout it was started from. A writer restarts it from its
  own worktree; restart it from the item worktree before the lead's integration runs.
- `supabase/functions/.env` (git-ignored) holds `ANTHROPIC_API_KEY` and `DISCOVERY_MODEL` (Haiku);
  the opencode key is `OPENCODE_API_KEY` in the main folder's `.env.local`. Copy into a new
  worktree; never print or commit.
- `src/routeTree.gen.ts` shows a line-ending-only change in fresh worktrees; leave it out of commits.

## Worktrees kept

`.claude/worktrees/AI4DEV-181-unit1` (lane/ai4dev-181/unit1) and `.claude/worktrees/AI4DEV-181-unit2`
(lane/ai4dev-181/unit2). No deletion without a founder decision.
