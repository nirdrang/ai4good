## 5. Way of work: the controller and poteto-mode (workflow v2; founder rulings 2026-08-29 and 2026-09-01)

**One lifecycle, two verbs.** `/controller <id>` picks up one board item: it creates the branch
and the worktree under `.claude/worktrees/`, writes the brief, moves this session into the
worktree, and stops. The founder then types
`/pstack:poteto-mode Read loop/items/<item>/brief.md and follow it.` in the same session. The
lead runs the pstack stations from the installed plugin, opens the pull request, and merges.
`/controller done <id>` steers the board afterwards. **Invoke `/controller` fresh at every item
start; never run it from memory of a prior reading** (founder ruling 2026-08-11, kept). The v1
relay (the `/work` skill and its phase files, the conductor and its agents, the drill harness,
the database slot pool, and the scripts that served them) is parked under `loop/parked/v1/`.
Its README says what moved and why. Nothing there is live.

Three rules bind every session in this folder, before any skill is invoked:

- **Attribution is derived from the branch, never declared (MUST-FOLLOW).** cwd → git worktree →
  branch → exactly one item id → walk `parent` upward for the chain. The held item is a
  cross-check that can never override the branch. Attribution degrades, never blocks — the one
  thing it blocks is closing a requirement.
- **A session works where it was launched**, on one branch, for the whole item. It never moves
  itself between folders. ONE exception (founder ruling 2026-08-29: "i want to run the
  controller it finshed with the brief and them i run the pstack poteto mode on that
  session"): `/controller` moves its session into the item's worktree with `EnterWorktree`
  for the hand-off to poteto-mode, and back out with `ExitWorktree` for the gate.
- **The merge closes an item; there is no second way to close work.** Machinery changed
  mid-item rides along in that item's branch; independent work is filed, not built; requirements
  close only through the evidence gate. Commits cite the item they belong to. **The lead
  (poteto-mode) does git and the pull request only. It never touches the board.** Board
  steering is `/controller done` (founder 2026-08-29: "Lead closes but linear steering is
  the controller work"). **The lead merges only when BOTH hold: CI is green on the exact
  head, and the founder said "merge". Never on one alone** (founder 2026-08-31).

**Acceptance tests.** The AT ids in `.taskmaster/docs/acceptance/`, the `at:check` bijection,
and the `--expect` manifests under `tests/at/expected/` stay. A new acceptance id registers
through `atTest`, even when its body is a thin vitest over a shipped module or the one stack. A
test with no id lives under `tests/at/harness/` beside the shipped-module selftests. The harness
takes no new machinery: no new sentinels, faults, vendor stand-ins, fixture worlds, or
capabilities.

**The database.** One stack per machine, the one `supabase/config.toml` describes, started with
`bun run db:start`. Every integration run (`bun run at:verify <req> --tier integration
--expect`) resets it and replays the migrations. There is no slot pool and no `AT_DB_SLOT`.