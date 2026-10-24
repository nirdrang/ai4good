# Where the PRD sections live, and how the screen hears changes

An investigation for AI4DEV-166 (PRD workspace backend), 2026-10-24. Read-only. The founder rules. Evidence comes from two read-only explorer reports and the Managed Agents reference in the claude-api skill. Every claim below names its source, or says it is inferred or unverified.

## Recommendation

1. **Store the PRD sections as markdown files in the NGO project's GitHub repo, from the day the PRD opens.** Our edge function writes them through the GitHub API, keeping the PRD tools server from decision d100 and changing only where it stores text. The database keeps what is not document text: section states and confirmations, questions, chats, money, drafts, and a read copy of each section keyed by its git commit, so the screen never waits on GitHub. Coding agents read the same `prd/` folder in the repo, so it is always current.
2. **Do not let the AI session push to the repo itself.** Managed Agents can mount a repo and run `git push`. But then the AI could edit any file and skip every PRD rule. REQ-009 also says files in the repo are never trusted to enforce a rule.
3. **Replace polling with a push ping.** Each change sends the open tabs a data-free "something changed" signal on a private Supabase Realtime channel for that project. A tab then fetches the new state once, through the edge function. Nothing runs while nothing changes.

This matches how ai4good keeps its own PRD: one markdown file per section, versioned by git commits. It costs a repo-creation change and one rework of unit 1's storage. Both are listed under "What changes".

## Facts the recommendation rests on

- **The screen does not poll today.** The 1.5-second poll exists only in `design.md`, section Live updates. The built screen updates only when its own action or chat stream returns, or when the sample world commits (`use-prd-workspace.ts:228-230`, `prd-fixture-world.ts:922-926`). A snapshot updates the section list in place, with no spinner, flash or scroll reset (`PrdPanel.tsx:162-165`, `TopicPage.tsx:195-197`). Source: explorer report on the screen.
- **Supabase Realtime is switched on and unused.** `supabase/config.toml:96-97` has `[realtime] enabled = true`. Nothing in `src/` or `supabase/` opens a channel. Source: the same report.
- **The NGO project repo does not exist when the PRD opens, under today's requirements.** REQ-008 says no repo is created at funding. REQ-021 has the volunteer create it during kickoff through Lovable's GitHub sync, in the platform's GitHub organization, running alongside PRD authoring (`prd-mvp.md:108`, `:337`; `pure-s5-req-021-026.md:15-19`). The founder ruled on 2026-09-30 that Lovable no longer builds screens, so that creation path is already stale. Source: explorer report on the repo.
- **No GitHub writer exists in the code.** There is no GitHub App, installation token, or repo URL column. `supabase/functions/_shared/github.ts` only fabricates profile stats from a handle. REQ-008 asks for one organization-wide platform GitHub App with short-lived credentials and no user tokens (`prd-mvp.md:335`). Source: explorer report on the repo.
- **The planning package names no file layout for the NGO repo.** It says only "the ai4good planning structure" (`design/prd-ui-contract.md:172-178`). Source: explorer report on the repo.
- **Managed Agents can mount a GitHub repo.** The agent can read, edit, commit and push with `git`. The token stays outside the container, held by Anthropic's git proxy, and can be rotated on a running session. Source: claude-api skill, `managed-agents-environments.md`, section GitHub Repositories. The AI-path memo rejected mounting for the PRD chats because the token would sit with Anthropic (`memo.md:100-102`).

## The options

| | A. Database, git at the package (today) | B1. Git, written by our edge function (recommended) | B2. Git, pushed by the AI session | C. Database plus a one-way copy to git |
|---|---|---|---|---|
| Where section text lives while writing | Database | Repo `prd/` files | Repo `prd/` files | Database, copied to repo |
| Who writes it | The PRD tools server, into SQL | The PRD tools server, through the GitHub API | The AI, with `git` in its container | The PRD tools server, then a copier |
| Refusing a stale commit, all or nothing | A SQL function | A compare-and-swap on the branch ref (described below) | `git push` refusal, but the AI decides how to recover | A SQL function |
| PRD rules (confirm, needs review, roles) | Enforced in SQL | Enforced in SQL and the tools, unchanged | Not enforceable: the AI can edit any file | Enforced in SQL |
| What the screen reads | Database | Database read copy, keyed by commit | Database copy, rebuilt from pushes | Database |
| What coding agents read | Repo, from the package on | Repo, always current | Repo, always current | Repo, always current, but a copy |
| Owners of the text | One | One (git) | One (git), with no guard | Two, which can drift |
| GitHub credential | None until the package | GitHub App key in the edge environment | A token held by Anthropic's proxy (needs a ruling like the PRD tools token) | GitHub App key in the edge environment |
| Repo must exist at PRD open | No | Yes | Yes | Yes |
| Rework | None | Unit 1 storage, REQ-008, REQ-021, REQ-036, d100 text | As B1, plus the rule layer moves | Small |

## How B1 works

- **Layout.** One file per section under `prd/` in the project repo, such as `prd/03-users-today.md`, with the plain-name sources in front matter. Closing the PRD tags the commit, for example `prd-r7`. The planning package later adds the requirements, acceptance cases and plan beside it.
- **Read.** `read_section` returns the text at the head commit and records that commit as the read receipt.
- **Commit.** `commit_turn` builds one new git tree containing every staged section, creates one commit, and moves the branch ref with `force: false`. GitHub refuses that move unless it is a fast-forward (stated from memory of the GitHub API, not checked this session). If the branch moved since the read, the tools server checks whether any staged file changed between the read commit and the new head:
  - If one did, the whole turn is refused with the current text, as REQ-036 asks.
  - If none did, it rebuilds the tree on the new head and tries once more.
  
  This is the same per-section staleness rule as the SQL design, with git holding the text.
- **The database.** It records the new head commit, bumps the sequence number, and caches each changed section's text under its commit. A cached entry never goes stale, because a commit never changes. Section states and confirmations point at the file's git blob, so "changed since you confirmed" means "the blob differs".
- **When GitHub is down or slow.** Reads keep working from the cache. An AI turn that needs to commit fails cleanly, and its reservation is released, which the ledger already handles. A commit adds GitHub latency to the end of a turn: several API calls, likely one to two seconds (a guess, not measured).

## What changes if B1 is chosen

1. **REQ-021 and REQ-008: the repo is created by the platform when the PRD opens.** The platform GitHub App creates it in the platform organization, private, with the developer's access set as REQ-008 describes. The Lovable creation path goes away; it is already stale.
2. **REQ-036 and decision d100: the PRD text lives in the repo from the PRD's first revision.** The tools server writes through the GitHub API. The planning package then adds only what it adds today beyond the PRD.
3. **Unit 1:** `prd_section_versions` stops being the store and becomes the commit-keyed read copy. `prd_open` also creates the repo and the first commit. Unit 1's acceptance cases keep their meaning.
4. **New machinery:**
   - a GitHub App with its key in the edge environment
   - a small GitHub writer module in `supabase/functions/_shared/`
   - a real GitHub test organization and app for the integration tier, because CLAUDE.md forbids a stand-in (a ruling is needed to spend on this)
5. **The screen and its `PrdPort` do not change.** The coding agents' read becomes a written contract: they read `prd/`.

## The push ping

- Each database function that bumps the sequence also sends a Realtime broadcast on `prd:<project>`, carrying only `{ sequence }`.
- Only the project's developer and NGO may join. A Realtime authorization policy enforces that.
- The tab's `subscribe` refetches through `prd-snapshot` when the number moves. It also refetches once on reconnect and on focus, to catch a missed ping.
- The CLAUDE.md rule says the UI never touches the database directly. The browser would read no table and receive no PRD data, only a number from the Realtime service, so I read this as within the rule. The rule is the founder's, so the founder confirms.

## What the founder decides

1. B1, git written by our edge function, or another option.
2. If B1: the platform creates the project repo when the PRD opens, through a new platform GitHub App. This changes REQ-021 and REQ-008.
3. If B1: a real GitHub test organization and app for the integration tier.
4. The push ping, and whether it fits the "UI never touches the database" rule.

## Risks

- GitHub becomes a dependency of every AI turn that commits.
- The integration tier needs real GitHub credentials in CI and on this PC.
- The cache and git can disagree if the head update is written to the database after the GitHub commit and the edge function dies in between. The fix is to treat GitHub's head as truth, and have the next read or commit repair the cache by comparing heads. This is inferred, not designed in detail.
- Whether the repo is public or private during authoring follows REQ-008 (private until validated). The PRD must not leak an NGO's sensitive answers in a public repo. This needs a look against the data-sensitivity rules before the repo turns public.
