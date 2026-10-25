# PRD workspace backend: the synthesized design

This is the contract every unit of AI4DEV-166 (PRD workspace backend and wiring) builds against. It came from a five-runner design arena with a cross-judge. The base is the normalized-tables design. Its storage is cut down, and parts of the other four designs are grafted in. The candidates, the judge's scores and the grounding are in the run's scratchpad. The decision trail is `decisions.tsv` beside this file.

## Problem

The PRD workspace screen is built and fixed behind `PrdPort` (`src/components/prd-workspace/port.ts`): `load`, `chat`, `act`, `saveDraft`, `subscribe`. Nothing serves it. Four kinds of writers change one PRD at once: the two humans through edge functions, the relay that streams a Managed Agents session, the PRD tools MCP server that Anthropic calls outside any of our requests, and an operator who credits funds. The developer is `projects.assigned_volunteer_id`, not an organisation member. No USD ledger exists. The founder ruled three things for this run: a ledger with no real money, the MCP server reached through a public tunnel at the integration tier, and Haiku (`claude-haiku-5-5`) for every session.

Decision d102 (2026-10-24) added a fifth writer and moved the text. The PRD's topics are markdown files under `prd/` in the project's GitHub repository from the moment the PRD opens. The platform creates that repository through its GitHub App, and the PRD tools write it through the GitHub API, one commit per AI reply. The database keeps everything that is not document text, plus a read copy of each topic tied to its commit. People with repository access can also push to `prd/` directly, so GitHub is now a writer we do not call. Live updates are a data-free Realtime ping, not polling. The investigation behind d102 is `prd-storage.md` beside this file.

## Usage

```tsx
// src/routes/prd/$organizationId.$projectId.tsx
const port = useMemo(() => prdPort({ organizationId, projectId }), [organizationId, projectId]);
return <PrdWorkspaceScreen port={port} start={{ kind: "main" }} onOpenUiDesign={openUiDesign} />;
```

```ts
// supabase/functions/prd-action/index.ts
Deno.serve(writeRoute(prdActionSpec()));          // reserve rpc = prd_action; SQL decides, the edge renders

// supabase/functions/prd-tools/index.ts (Anthropic's proxy; the bearer is a PRD grant, not a JWT)
Deno.serve(prdToolsHandler());                    // every tool call is one prd_tool rpc

// supabase/functions/prd-open/index.ts: SQL begins, GitHub writes, SQL finishes; a repeat call finishes a pending open
const op = await rpc("prd_open_begin", { actor, organization, project });   // registers the open operation
await publish(op);                                                          // create or reuse the bound repo, write, register the sha, advance
await syncRepo(project);                                                    // the one finalizer, shared with the webhook and recovery

// an integration body, no model in the loop
await live.credit(project, "20.000000");
const turn = await live.reserveTurn(dev, { scope: { kind: "main" }, requestId, baseRevision: 1, intent: text("hi") });
await live.ingest(turn, { kind: "model-end", eventId: "evt_1", usage });   // twice: the second is a no-op
```

## Shape

**SQL owns every rule that is enforced.** Authority, revisions, replay, one turn per chat, section transitions, the all-or-nothing commit, admission and settlement, checks and close are security-definer functions with `set search_path = ''`, executable only by `service_role`. Edge functions authenticate, parse at the boundary, call one function, and render. The MCP server and the relay call the same functions. No writer can bypass a rule, because no writer has table grants.

**The snapshot has two layers.** `prd_snapshot(actor, project, since_sequence)` returns the facts as one `jsonb` record: every enforced availability (send per chat, confirm, reopen, post, complete, use, close, each with an allowed flag and a reason code), the action tokens, and the funds numbers and band. TypeScript `snapshotFromRecord` in `supabase/functions/_shared/prd/snapshot.ts` turns that record into `PrdSnapshot`. It maps reason codes to copy and does pure presentation (progress counts, the still-open lines, ordering), and it decides nothing. The browser parses with `parsePrdSnapshot`. The sample-data fixture keeps its own rules in `src/lib/prd-rules.ts`. It is the loop-tier shell, not production, and the integration tier proves the backend.

**Storage grain.** The tables are normalized, but section content is one typed document per section version, not a table per statement.

- Record and history: `prd_records` (project, discovery revision, current revision, snapshot sequence, closed revision, plus from d102 the repository name, URL and GitHub repository id, the database's head commit, the time of the last sync, and the state `pending`, `open`, `closed` or `diverged`), `prd_revisions` (an immutable manifest: revision to section version per section, plus the commit that holds it), `prd_sections` (stable key, title, ordinal, required, dependencies, the file path under `prd/`, state, confirmed version, `changed_since_confirmed`), `prd_section_versions` (the read copy: one row per occurrence of a section's file in a commit, holding the blob sha, the commit, the author kind (`ai`, `open` or `repository`) and login, the variant `readable`, `unreadable` or `missing`, and for a readable one the parsed `document jsonb` with statements and their plain-name sources, decisions, and for the technical scope the stories with nested criteria, stack, tier, rationale, start-small advice and risks). A row never changes. "Changed since you confirmed" means the current blob differs from the confirmed blob. `prd_git_ops` registers every repository write before it is published (see below).
- Questions: `prd_questions` (section, text, why now, options, prerequisites, anchors, blocking as the AI set it, status, follow-up state, row revision), `prd_answers` (immutable versions), `prd_answer_uses`.
- Conversation: `prd_chats` (kind main, section or side, conversation revision), `prd_messages` (actor, name, `parts jsonb` in the UI-message shape, for-role), `prd_drafts` (per actor and key, never moves the sequence).
- Turns and tools: `prd_sessions` (one Managed Agents session and one vault per chat, credential generation, runtime baseline, event cursor), `prd_turns` (request id and body hash for replay, base revisions, service kind, state, dispatch state, a partial unique index on one active or uncertain turn per chat), `prd_grants` (registered grant ids with expiry), `prd_tool_reads` (read receipts), `prd_staged_sections`, `prd_staged_effects`, `prd_tool_commits`.
- Checks and close: `prd_check_config`, `prd_checks` (unique on project and revision, which is the reuse rule as a constraint), `prd_check_gaps`, `prd_closes` with `prd_close_points`.
- Money (no real money): `prd_fund_credits` (operator function only), `prd_rate_versions` (immutable, effective-dated; per model, prompt-length band and token category, plus runtime per second and fee basis points), `prd_reservations` (one per turn), `prd_provider_events` (unique on session and event id), `prd_ledger_entries` (component provider, fee, runtime, release or adjustment; unique on component and source key; `numeric(20,6)` micro-dollars).

**Revisions.** The PRD revision changes only when content the check scores changes. Each chat has a conversation revision. The project snapshot sequence moves on every visible change, and only up. Action tokens keep the shape the screen already uses (`kind|target|revision|version`). SQL checks them against the live state and the caller's role, so a forged or replayed token gains nothing.

**AI changes go through the tools only.** `read_section` records a read receipt. `stage_section` takes the receipt, so the AI cannot claim a base it never read. State tools (`propose_ready`, `suggest_ngo_question`, `recommend`, and the outcome tools for side chats and checks) stage effects. `commit_turn` checks every staged section against its receipt and publishes all of them as one new revision, or refuses with the current text and applies nothing. A turn has at most one successful commit; it may restage and commit again after a refusal. A tool error returns only a fixed message, but a stale refusal returns the current sections. The grant fixes the project, chat, turn and mode. SQL decides which tools a mode may call. The TypeScript `TOOLS` table holds the schemas, and `tools/list` filters it by the names SQL allows.

**Managed Agents.** `supabase/functions/_shared/prd/managed.ts` is the only Anthropic caller. Per chat it keeps one lasting session and one vault, and rotates the grant credential before each turn. It opens the event stream before it sends the user message. One function, `toProviderEvent`, maps both the live stream and an `events.list` re-read, and event ids remove duplicates. A send that times out is uncertain: the chat stays blocked until the event history shows whether it landed, and the message is never sent again. Catch-up runs on the chat's next send and when a load finds a turn past its deadline. It reads events and never calls the model. The agent and environment are created once by `scripts/prd-setup-managed.ts` and named in `supabase/functions/.env`.

**Money.** TypeScript only normalizes usage into categories (input, output, cache read, cache write). SQL prices it with the rate version pinned at reservation, picks the prompt-length band, writes the fee separately, and keeps six decimal places. `prd_turn_reserve` holds the configured turn reservation for the whole turn. Each model-request event settles once. A missing usage writes a pending entry that keeps the hold until a re-read fills it. Runtime is charged once per turn, from the difference in cumulative active seconds against the session's baseline. A turn proven rejected before any model request releases its hold, and an uncertain one keeps it. Funds read: available is credited minus settled minus held. The band uses settled spend only, unrounded: green below 80 percent, yellow from 80 through 95, red above 95.

**Budget interpretation (decided here, reversible).** Managed Agents budgets are cumulative per session, in whole cents, and checked between requests. So "a session budget equal to the reservation" is applied as: before each turn, the cap becomes the session's settled spend so far plus this turn's reservation, rounded up to a whole cent. A request already in flight can pass the cap. That overrun is recorded as an adjustment and stops further admission until it is settled.

**The file format.** `supabase/functions/_shared/prd/file.ts` owns one pair: `renderSection(document) -> markdown` and `parseSection(markdown) -> Result<document>`. A file is front matter (key, title, sources, and for the technical scope the structured scope) plus a markdown body of statements and decisions. `parseSection(renderSection(d))` equals `d` for every document, and a property test proves it. This is the only place the file shape is known. A file that does not parse, after someone edits it by hand, is imported as an unreadable version. The section goes to Needs review with the parse reason, and the AI is asked to repair it on its next turn. The text is never silently dropped.

**The GitHub writer.** `supabase/functions/_shared/github/` is the only GitHub caller. It has two modules:
- `app.ts` mints an installation token from `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` and the installation id, and caches it until shortly before its one-hour expiry.
- `repo.ts` exposes these calls:
  - `createRepo(name)`: private, `auto_init`, with branch protection on `main` that forbids force-pushes and deletion.
  - `head(repo)`
  - `writeCommit(repo, parent, files, message)`: creates the blobs, the tree and the commit object, and returns its sha without moving any branch.
  - `advance(repo, sha)`: moves `main` with `force: false`, and returns `advanced`, `rejected`, or `uncertain` when the response is lost or times out.
  - `commitsSince(repo, from, to)`
  - `prdTree(repo, commit)`: the whole `prd/` tree at one commit, as paths and blob shas.
  - `readBlobs`
  - `tag`

Authentication, rate-limit and validation errors are their own results. A 422 never reads as "moved". Every GitHub response is parsed at this boundary. The key never leaves the edge environment, and no session or browser holds a GitHub credential.

**Why a fast-forward-only move is enough.** Branch protection makes `main` move only forward. A commit written with parent `base` can then advance `main` only while `main` is still exactly `base`. So `force: false` acts as a compare-and-swap on the expected head. If protection is found off, or the database's head is not an ancestor of `main`, the record goes to `diverged`. Publication stops and the operator is told. Nothing repairs it automatically. A missing `main` is the same state.

**Operations are registered before they are published.** Every write to the repository is a row in `prd_git_ops`: project, kind (`open`, `turn`, `close-tag`), turn and attempt, the expected base, the rendered files, the staged state effects, the commit sha once written, and a status (`prepared`, `written`, `published`, `finalized`, `failed`).

The order is fixed:
1. SQL prepares the operation. The rules live here: the all-or-nothing staleness check of staged sections against their read receipts and the database's head, and the turn's one-success rule.
2. The edge writes the commit object.
3. SQL records the sha, so the operation is `written`.
4. The edge calls `advance`.

Only a sha registered this way ever counts as the AI's commit. A `PRD-Turn` trailer in a commit message is a lookup hint, never proof, so a person who copies a trailer gains nothing.

**One finalizer: `reconcile`.** The normal response, the webhook, a retry, and recovery after a crash all end in the same TypeScript `syncRepo(project)`. It calls `head`, then `commitsSince` from the database's head, then `prdTree` for each new commit. It hands that ordered list to one SQL function, `prd_reconcile(project, expected_db_head, commits)`. That function runs under the record's row lock and returns at once if the database's head is no longer `expected_db_head`; the caller then syncs again. For each commit, in order:
- A commit whose sha is a registered operation finalizes that operation. It writes the read-copy rows with author kind `ai` or `open`, applies the staged state effects, and creates the new revision and its manifest.
- Any other commit is a repository edit. Its changed, added, renamed and removed `prd/` paths come from comparing the two `prd/` trees, never from a diff endpoint with a file limit. The edit creates a new revision and manifest, writes read-copy rows with author kind `repository` and the committer's login, and runs the normal invalidation, so confirmed sections whose blob changed go to Needs review.
- A commit already applied does nothing.

The function then moves the head and bumps the sequence once. Webhook deliveries are only requests to sync. Their order, replays and payload never matter, because sync reads GitHub's current state.

**The commit, end to end.** `commit_turn` prepares, writes and advances.
- On `advanced`, it syncs, which finalizes the operation.
- On `rejected`, someone else committed first, another chat or a person. It syncs, then prepares again. The new prepare refuses the turn as a whole if any staged section changed in between. Otherwise it writes a new commit on the new head.
- On `uncertain`, it syncs. If the registered sha is now on `main`, the operation was finalized by that sync. If `main` is still the base, it advances the same sha again. Otherwise the operation is `failed` and the turn prepares again.

There is no lease. Two chats that commit at once simply race on `advance`, and the loser rebuilds or is refused, exactly like an outside push.

**Opening creates the repository.** `prd_open_begin` checks authority, freezes Discovery, builds the opening sections, persists the repository name (the project's slug and the first twelve hex digits of the project id), and registers the `open` operation with its files. The edge then:
1. Creates the repository, or, on a name conflict, reuses it only if its GitHub repository id is the one already bound to this project.
2. Binds the repository id.
3. Writes the opening commit on the `auto_init` commit.
4. Advances `main`.
5. Syncs.

A crash at any step resumes from the persisted operation, even when later commits exist, because sync finalizes the registered sha wherever it sits in history. The opening commit is the first commit that holds the PRD; GitHub's empty initial commit precedes it, since GitHub cannot create a branch in an empty repository. AT-036.01 says "the opening commit", not "the first commit".

**Reads never wait on GitHub.** `prd-snapshot` answers from the database at once. When the last sync is older than a minute, it also starts one with `EdgeRuntime.waitUntil`. That repairs a missed webhook for anyone who opens the workspace. A project nobody opens needs no repair until someone does.

**Unreadable and missing files.** A section version is `readable` (with a document), `unreadable` (with the raw text and the parse error), or `missing` (the file was removed or renamed away). A check constraint keeps each variant's columns consistent. `read_section` returns the raw text of an unreadable version, so the AI can repair it. A rename is recognized when a removed file and an added file carry the same `key` in their front matter. A duplicate or unknown key is recorded as unknown, and it never takes over a section. Section version rows exist per occurrence, so a blob sha may repeat, and authorship belongs to the occurrence.

**Close.** Close freezes the revision, its manifest and its commit in SQL, and registers a `close-tag` operation. After close, the snapshot and downstream readers use the frozen manifest. A later push is still imported into history, but it never changes the closed view. The tag operation retries until GitHub holds a tag pointing at exactly the frozen commit.

**Live updates.** `prd_reconcile` and every other function that bumps the sequence call `realtime.send({ sequence }, 'sequence', 'prd:' || project, true)`, a private broadcast carrying only the number.

The Realtime authorization policy is a receive-only `SELECT` on `realtime.messages`, for broadcast on topics starting with `prd:`. It calls a narrow helper, `prd_can_listen(topic)`. The helper is security definer and granted to `authenticated`. It derives the caller from `auth.uid()`, parses the project from `realtime.topic()`, and checks the current role.

The client joins with `config.private: true`. It refetches through `prd-snapshot` when a larger number arrives, on join, on reconnect, on focus, and after its own action. Delivery is best effort, and those events are the catch-up. There is no timer.

A member removed while subscribed can keep receiving numbers, not data, until their access token expires, at most an hour. We accept that leak instead of rotating channel names.

**Unit 1's tables change in place.** Unit 1's migration has not reached `main`, and no populated database exists outside test resets. So unit 1R edits that migration rather than writing a conversion.
**GitHub at the integration tier.** The suite runs against a real GitHub test organization, named by `PRD_GITHUB_ORG`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` and `GITHUB_WEBHOOK_SECRET` in `supabase/functions/.env` and in CI secrets. Each run names its repositories with a run prefix. A case that needs GitHub declares itself pending, with the reason, when those values are missing. It never passes against a stand-in. Webhooks cannot reach the local stack without the tunnel, so the outside-edit cases drive the import through prepare, and one case proves the webhook through the same tunnel the MCP server uses.

**The tunnel.** `PRD_MCP_PUBLIC_URL` in `supabase/functions/.env` names the public address of `prd-tools`. A test helper starts a tunnel only when none answers at that address, and stops only a tunnel it started. Cases that need a real Haiku session declare themselves pending, with the reason, when the address or the key is missing. They never pass against a stand-in.

## Tradeoffs accepted

- We accept substantial plpgsql in exchange for one owner per enforced rule.
- We accept that the fixture keeps its own copy of the rules in exchange for leaving the eighteen loop-tier cases untouched. The integration tier is where the production rules are proven.
- We accept GitHub as a dependency of every AI commit in exchange for one home for the PRD text that coding agents read directly. Reads never wait on GitHub, because the screen and the tools read the commit-tied copy.
- We accept that a commit racing another loses and rebuilds, in exchange for no lease and one finalizer that every path shares.
- We accept branch protection on `main` as a precondition, and a `diverged` state that needs the operator, in exchange for a fast-forward move that works as a compare-and-swap.
- We accept that a removed member can receive sequence numbers, never data, until their token expires.
- We accept a Realtime channel in the browser, carrying a number only, in exchange for no requests while nothing changes.
- We accept that every write locks the project's record row briefly in exchange for a sequence that only goes up. Model calls never hold a database lock.
- We accept the budget interpretation above in exchange for a provider cap that Managed Agents can actually set.

## Alternatives considered

- A pure TypeScript reducer over one state document. It lost because a service caller could save any state and bypass the reducer, and because the fixture rewrite put the loop tier at risk.
- An event log with a fold that the caller computes. It lost because SQL would accept a fold that the edge computed, which splits the rules between two languages.
- The whole PRD as one versioned document. It lost because rules would be ported into both TypeScript and SQL, and because it offers two ways to publish staged content.
- Fully normalized content, with tables for statements, decisions, sources and stories. It lost on laziness: no query needs those rows, and the document per section version is immutable and typed.
- The database as the store of the text until the planning package. This was the design until d102. The founder chose git files, so coding agents and people read one home for the PRD. See `prd-storage.md`.
- The AI session mounting the repository and pushing with `git` itself. It lost because the AI could edit any file and skip every PRD rule, and because Anthropic's proxy would hold a GitHub token.
- Polling `prd-snapshot` every 1.5 seconds. It lost because the founder found it disturbing, and because it sends requests while nothing changes.

## Open questions

- The scorer threshold, the platform fee in basis points, and the turn reservation size are pilot decisions. They are seeded as configuration rows, which name the value and record that it is a placeholder. A test never invents its own value.
- The REQ-026 bootstrap pull does not exist in this tree. AT-036.01 proves the PRD half, and its bootstrap half stays pending, with the reason.
- The package half of AT-036.06 and the `backlog.live` producer belong to AI4DEV-164 (sign-off into Build).
- Ruled 2026-10-24: each integration run deletes the repositories it created in the GitHub test organization, chosen by its run prefix, never any other.
- Ruled 2026-10-24: an edit pushed to `prd/` by a person is applied as a new revision credited to their GitHub login, and confirmed sections it changed go to Needs review.
- Lovable leaves the MVP in a separate fold. Until it lands, REQ-021 still describes a Lovable setup that connects to the existing repository. Nothing in this design depends on it.

## Unit plan

Reordered after d102. The units that need no GitHub run first, so none waits on the founder creating the GitHub App and the test organization. Unit 1's first build (`a5fe8dff`, `0a0f3a84`) stays; unit 1R reworks its storage.

1. Shared PRD record. DONE: the record, chats, messages and drafts, `prd_open`, `prd_snapshot`, `prd_save_draft`, and the three functions. AT-036.02 is green; AT-036.01 proves its PRD half.
2. Technical scope section. Finish the WIP on `lane/ai4dev-166/u2` (`94799931`): the generator and its skill without the build split or Lovable, and the structured scope in the section document. Keeps AT-036.11 and .12 green. No GitHub.
3. Question order. Questions, answers and follow-up tables and rules. Turns green AT-036.03, driven through the SQL functions. No GitHub.
4. Roles and permissions. `prd_turn_reserve` without money, `prd_action`, the route rows, and the `prd-message` and `prd-action` functions. Turns green AT-036.09. No GitHub.
1R. Git storage. Needs the founder's GitHub App and test organization. The GitHub writer (`_shared/github/`), the file format (`_shared/prd/file.ts` with its round-trip property test), `prd_git_ops`, the open path, `syncRepo` and `prd_reconcile`, the section-version variants, the `prd-github-hook` function, and the Realtime ping with `prd_can_listen`. Unit 1's migration is edited in place. AT-036.01 also proves the repository, its protection, and the opening commit, including a crash after each step of opening. AT-036.02 also proves that an outside push becomes visible to an idle second viewer, through the webhook over the tunnel and through the stale-sync on load, and that a removed, renamed or malformed file lands as its variant.
5. Section states and the PRD tools server. Read receipts, staging, the commit (prepare, write, register, advance, and sync), the cascade, grants, and the `prd-tools` function. Turns green AT-036.08 over real HTTP MCP and real GitHub, with no model, including two chats changing the same section and different sections, an outside push between prepare and advance, a lost advance response, a forged `PRD-Turn` trailer, and a replayed webhook.
6. PRD costs on Managed Agents. The ledger, rates, `managed.ts`, the relay inside `prd-message`, catch-up, the tunnel helper, and the setup script. Turns green AT-036.05 and .07. Re-runs AT-036.03 and .08 with Haiku.
7. Completion check. Turns green AT-036.04 with a Haiku check run, and the reuse half driven through SQL.
8. Close PRD. Close tags the frozen commit. Turns green the close half of AT-036.06. The package half stays pending.
9. Screen wiring. Before the model part, stop at the gate and confirm the tunnel with the founder. Then `prd-port.ts` with the Realtime subscribe, the route, the screen changes change order 016 allows, the notifications, and verify-ai4good. Turns green AT-036.10 and .13 to .18, and re-runs the screen-bearing cases wired.