# CLAUDE.md augmentation — per-project repo template (decision-9 rewrite)

**Audience:** the volunteer-developer using Claude Code on one NGO's tool inside `ai4good-projects/<slug>`.

**Placement:** ships into every per-project repo CLAUDE.md at kickoff, as the top H2 immediately after the project-specific overview. Does **not** belong in the ai4good platform-team CLAUDE.md (that audience builds the platform and the Skill — for them the PRD is the source).

**Seeding mechanism:** the Skill / REQ-008 repo-creation hook copies this block into the new repo's CLAUDE.md at the `# ai4good project workflow` H1 anchor. Devs may edit; the Skill must NOT stomp existing content on subsequent syncs (seed-only-if-missing semantics).

**Source of every fact:** PRD at `.taskmaster/docs/prd.md`. Every command, threshold, and slash command below is grep-verified against the PRD. **Updated 2026-06-06 for decision-9 (git-as-truth):** task mutations happen via *local* TaskMaster; the Skill auto-commits + pushes `tasks.json` after each mutation; git → GitHub webhook → ai4good projection is how the NGO sees state. The platform does NOT host a task MCP server — that's been dropped.

---

## The augmentation block (paste-ready)

```markdown
## ai4good: git is the line to the NGO

Your local TaskMaster writes to `.taskmaster/tasks/tasks.json`. The Skill auto-commits + pushes after every mutation. GitHub fires a webhook to ai4good. ai4good projects into Postgres. The NGO project page renders from that projection. End-to-end: ~5–30 seconds from your local action to the NGO seeing it.

**One writer. One repo. One direction.** No platform task MCP. No sync conflicts. If git has it, the NGO sees it.

### The only three deliberate moves
1. **[Dev] Stuck on something the NGO can answer?** Run `/ai4good:raise-blocker --task=<id>` — fires a `clarifying_question` blocker (REQ-024). Don't code around ambiguity for two hours. The NGO would rather answer once than review a wrong implementation.
2. **[Dev] Before clicking "Ready for Handoff" on the project page:** run `/ai4good:handoff-check`. It verifies P0 tasks `done`, README/RUNBOOK present, `github_repo_url` set, AND `git rev-list origin/main..HEAD --count == 0` (everything pushed). The actual `handoff_pending → handed_off` gate is `deployment_url IS NOT NULL` (REQ-012 deploy step).
3. **[Dev] Mark `done` only when the AC is genuinely met.** USER-TEST tasks (61–72) are hard gates — a human types "passed" before an agent flips them. `task-master set-status --id=<X> --status=done` is what you run locally. The Skill auto-commits + pushes the change.

### Everything else is [Skill auto] — don't duplicate it
- **Session bootstrap:** REST `GET /api/projects/:id/context` primes scope summary, blockers, fuel runway, recent NGO comments. Banner shows on start.
- **Auto-commit + push** on every `task-master-ai` mutation to `.taskmaster/tasks/tasks.json`. Commit message: `task-<X>: <op summary>`. Push is queued + retried if offline.
- **Code commit prefix** `task-X.Y:` on code commits (separate from the tasks.json auto-commit). `task-multi:` fallback when work spans tasks; raw `git commit -m "..."` always wins.
- **Fuel awareness** (REQ-009: NGO nudged at 20%, you get in-app warning at 5%, key revoked at 0%).
- **Slash commands** (REQ-028 v1): `/ai4good:next-task`, `/ai4good:blockers`, `/ai4good:raise-blocker`, `/ai4good:fuel`, `/ai4good:handoff-check`, `/ai4good:disable`, `/ai4good:enable`.

### LOUD vs QUIET — what the NGO actually sees
| Action | NGO surface |
|---|---|
| Local `task-master set-status --id=X --status=done` → Skill auto-commit + push → webhook → projection | email + in-app + activity feed + progress bar moves |
| Local `task-master set-status --id=X --status=in_progress` → push → webhook | in-app + "Now working on" strip updates |
| `/ai4good:raise-blocker --task=X` (REST → `project_blockers`) | banner + email + 48h / 7d aging |
| Code commit with `task-X.Y:` prefix → webhook ingests into `external_commit_refs[]` | activity feed entry |
| NGO appends a comment on a task via the project page | shows on next session bootstrap; counted in banner |
| You mutate `tasks.json` locally and DON'T push | invisible to NGO until you push |
| You silently edit `tasks.json` by hand (no TaskMaster) | the diff still gets ingested on push — but you've bypassed your own audit/UX |

### Hard "do nots"
- **Don't edit `tasks.json` by hand.** Use `task-master` CLI or MCP. Hand edits skip your Skill's commit-message generation and skip TaskMaster's invariant checks; the webhook will ingest the diff regardless but you've made your own history unreadable.
- **Don't disable git push.** The Skill's auto-push is what makes the NGO see your work. If the push fails repeatedly (auth issue, network), fix it — the Skill will surface the warning. Without a push, your local work doesn't exist to anyone but you.
- **Don't open GitHub Issues for NGO-visible work.** Issues are dev-internal (REQ-008). The PM tree (`.taskmaster/tasks/tasks.json` → projection → NGO UI) is the NGO surface.
- **Don't use chat for blockers the NGO can resolve.** Chat doesn't age, doesn't show on the "Action needed" rail, doesn't fire REQ-016 notifications. `/ai4good:raise-blocker` does all three.
- **Don't quietly absorb scope additions.** Route through Change Requests (REQ-025) — the CR row on the project page is the surface (decision-15; there is no chat channel in v1). CRs arrive in your low-tone CR inbox at session bootstrap (decision-16); only your explicit Accept creates work, and Decline is penalty-free.
- **Don't paste your bearer token into the repo.** Token lives in `~/.ai4good/config.json` (gitignored) or `AI4GOOD_PROJECT_TOKEN` env var. The Skill manages it via `claude skill exec ai4good login`.
- **Don't expect ghost time to be free.** 14d of no commits + no PM-task transitions fires `inactivity_reminder`; 21d auto-releases you as `ghosted` (damages outreach signal, REQ-027). `released_for_cause` (NGO/volunteer-initiated manual release) does not.

### The unifying anti-pattern: "I'll catch up in TaskMaster tomorrow"
You won't. The NGO is reading the project page tonight. A two-hour silent coding sprint that ends with five `done` flips at midnight followed by a single push looks like a suspicious burst, not progress — and if you ghost the next morning, the NGO has no recent breadcrumb of where you got to. **Rule of thumb: if your last 30 minutes produced no `tasks.json` mutation (status flip via `task-master`, a `raise-blocker`, or a prefixed code commit), the NGO is looking at a stale page.** Mutate as you go; the Skill auto-pushes.
```

---

## Enforcement split (decision-9)

**Skill auto (the Skill enforces these — do NOT duplicate as developer rules):**
- Session bootstrap + project context fetch (REST `GET /api/projects/:id/context`) on Claude Code launch
- **Auto-commit + push hook on every local `task-master-ai` mutation to `.taskmaster/tasks/tasks.json`** (decision-9, REQ-028 Task 28.3)
- Code-commit-prefix `task-X.Y:` injection (`task-multi:` fallback; manual override always wins) — separate from the tasks.json auto-commit
- Fuel context surfacing (`/ai4good:fuel` and ambient awareness)
- Slash-command surface (`/ai4good:next-task`, `/ai4good:blockers`, `/ai4good:raise-blocker`, `/ai4good:fuel`, `/ai4good:handoff-check`, `/ai4good:disable`, `/ai4good:enable`)
- Offline-push queue + retry on next mutation / session end if `git push` fails
- Warning surfaced to volunteer if push hasn't succeeded within N attempts (so they fix the auth/network problem)

**Dev manual (deliberate human action — the short list):**
- Raise a `clarifying_question` blocker the moment you're stuck on something the NGO can answer.
- Run `/ai4good:handoff-check` before clicking "Ready for Handoff" on the project page.
- Only mark `done` when the AC is genuinely met. Never self-mark a USER-TEST task — wait for a human "passed".
- Route scope additions through Change Requests (REQ-025), not silent code.
- Don't hand-edit `tasks.json` (use TaskMaster). Don't use GitHub Issues for NGO-visible work. Don't commit your bearer token.
- Keep mutating as you go — 30-minute silent stretches make the NGO's page stale; the Skill pushes for you, but only after you call TaskMaster.

---

## Changelog

**2026-06-09 (decisions 15/16 touch-up):**
- "Don't quietly absorb scope" do-not updated: CR surface is the project-page CR row (no chat channel in v1, decision-15); noted the low-tone CR inbox + Accept-creates-work + penalty-free Decline (decision-16).

**2026-06-06 (decision-9 rewrite):**
- Dropped all references to `mcp.ai4good.dev/projects/<id>` and platform-MCP verbs (`update_task`, `comment_task`, `add_task`, `list_blockers`, `get_project_context` as MCP tools).
- Replaced with: local `task-master-ai` for task mutations + Skill auto-commit/push hook + ai4good REST API for NGO-side context.
- LOUD-vs-QUIET table rewritten to reflect the local-TaskMaster → git → webhook → projection path.
- Added `/ai4good:raise-blocker` to the v1 slash-command surface (REQ-028 Task 28.4).
- Removed the optimistic-lock 409-retry concern (no longer applicable — single writer per project, no optimistic locking in the system).
- Removed the jargon-rewriter [Skill auto] item (was aspirational, hard to deliver against a local-mutation model — NGO comments come from the NGO directly, not from the volunteer's notes).
- Updated the "hard do nots" to focus on the new failure surfaces (don't disable push, don't bypass TaskMaster).

**2026-06-04 (pre-decision-9 — superseded for the MCP/sync sections):**
- Original 5-perspective synthesis. The structural ideas (3 deliberate moves, LOUD/QUIET, "I'll catch up tomorrow" anti-pattern) carried forward verbatim. The technical mechanics changed.

---

## Open follow-ups

- **`/ai4good:handoff-check` precondition list:** REQ-028 line ~1669 should explicitly enumerate the check set (P0 done, `github_repo_url` set, README/RUNBOOK present, `git rev-list origin/main..HEAD --count == 0`) so the augmentation's claim matches the shipped command.
- **CLAUDE.md seed hook:** REQ-008 repo-creation flow should append the augmentation block at the documented anchor, and refuse to stomp on subsequent syncs (idempotent seed-only-if-missing semantics).
- **Auto-commit hook implementation:** the Skill needs to listen for TaskMaster mutations. Two options: (a) TaskMaster MCP `notification` channel if it emits one (preferred), or (b) `fs.watch('.taskmaster/tasks/tasks.json')` as a fallback. Verify which TaskMaster supports natively and document.
- **Push-discipline alert thresholds:** if the auto-push has been failing for N attempts (default 3) or T minutes (default 10), the Skill should surface a clear warning to the volunteer — the NGO is being deprived of visibility and the volunteer needs to fix it. Specify N + T in REQ-028.
