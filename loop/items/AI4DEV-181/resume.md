# Resume note for AI4DEV-181 (Discovery wired to backend)

Rewritten at the unit 1 gate, 2026-10-02.

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

## Next: unit 2 (turn contract)

Per `design.md` "Turn", "Opening", "Model adapter": `discovery-message` accepts the screen's body
plus ids and `userMessageId`; one forced `reply` tool call streams `text` and returns the update;
settle applies answers then the model update through `evolveBrief` and commits turn + revision +
one credit together; stream parts `data-filed`, `data-charge`, `data-question`, `data-ready`,
transient `data-brief`, `data-usage`; persisted assistant message id; the opening turn (billing
`opening`, free, unique per project, calls `openingDocument`); the OpenAI-compatible adapter chosen
by env (`DISCOVERY_PROVIDER`, `DISCOVERY_MODEL`, `DISCOVERY_BASE_URL`, `DISCOVERY_API_KEY`,
`DISCOVERY_REASONING_EFFORT`), space-bunny-free at low on `https://opencode.ai/zen/v1`; drop
`countTokens` before reserve. Units 3 to 6 follow plan.md.

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

`.claude/worktrees/AI4DEV-181-unit1` (lane/ai4dev-181/unit1). No deletion without a founder
decision.
