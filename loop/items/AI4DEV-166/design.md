# PRD workspace backend: the synthesized design

This is the contract every unit of AI4DEV-166 (PRD workspace backend and wiring) builds against. It came from a five-runner design arena with a cross-judge. The base is the normalized-tables design. Its storage is cut down, and parts of the other four designs are grafted in. The candidates, the judge's scores and the grounding are in the run's scratchpad. The decision trail is `decisions.tsv` beside this file.

## Problem

The PRD workspace screen is built and fixed behind `PrdPort` (`src/components/prd-workspace/port.ts`): `load`, `chat`, `act`, `saveDraft`, `subscribe`. Nothing serves it. Four kinds of writers change one PRD at once: the two humans through edge functions, the relay that streams a Managed Agents session, the PRD tools MCP server that Anthropic calls outside any of our requests, and an operator who credits funds. The developer is `projects.assigned_volunteer_id`, not an organisation member. No USD ledger exists. The founder ruled three things for this run: a ledger with no real money, the MCP server reached through a public tunnel at the integration tier, and Haiku (`claude-haiku-5-5`) for every session.

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

// an integration body, no model in the loop
await live.credit(project, "20.000000");
const turn = await live.reserveTurn(dev, { scope: { kind: "main" }, requestId, baseRevision: 1, intent: text("hi") });
await live.ingest(turn, { kind: "model-end", eventId: "evt_1", usage });   // twice: the second is a no-op
```

## Shape

**SQL owns every rule that is enforced.** Authority, revisions, replay, one turn per chat, section transitions, the all-or-nothing commit, admission and settlement, checks and close are security-definer functions with `set search_path = ''`, executable only by `service_role`. Edge functions authenticate, parse at the boundary, call one function, and render. The MCP server and the relay call the same functions. No writer can bypass a rule, because no writer has table grants.

**The snapshot has two layers.** `prd_snapshot(actor, project, since_sequence)` returns the facts as one `jsonb` record: every enforced availability (send per chat, confirm, reopen, post, complete, use, close, each with an allowed flag and a reason code), the action tokens, and the funds numbers and band. TypeScript `snapshotFromRecord` in `supabase/functions/_shared/prd/snapshot.ts` turns that record into `PrdSnapshot`. It maps reason codes to copy and does pure presentation (progress counts, the still-open lines, ordering), and it decides nothing. The browser parses with `parsePrdSnapshot`. The sample-data fixture keeps its own rules in `src/lib/prd-rules.ts`. It is the loop-tier shell, not production, and the integration tier proves the backend.

**Storage grain.** The tables are normalized, but section content is one typed document per section version, not a table per statement.

- Record and history: `prd_records` (project, discovery revision, current revision, snapshot sequence, closed revision), `prd_revisions` (an immutable manifest: revision to section version per section), `prd_sections` (stable key, title, ordinal, required, dependencies, state, confirmed version, `changed_since_confirmed`), `prd_section_versions` (an immutable `document jsonb` with statements and their plain-name sources, decisions, and for the technical scope the stories with nested criteria, stack, tier, rationale, start-small advice and risks).
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

**Live updates.** `subscribe` polls `prd-snapshot` with `sinceSequence` every 1.5 seconds while the page is visible, more slowly while it is hidden, and at once on focus. The function answers `204` when the sequence has not moved. Every read goes through an edge function, and no Realtime surface is added.

**The tunnel.** `PRD_MCP_PUBLIC_URL` in `supabase/functions/.env` names the public address of `prd-tools`. A test helper starts a tunnel only when none answers at that address, and stops only a tunnel it started. Cases that need a real Haiku session declare themselves pending, with the reason, when the address or the key is missing. They never pass against a stand-in.

## Tradeoffs accepted

- We accept substantial plpgsql in exchange for one owner per enforced rule.
- We accept that the fixture keeps its own copy of the rules in exchange for leaving the eighteen loop-tier cases untouched. The integration tier is where the production rules are proven.
- We accept a 1.5-second update delay in exchange for one read path through an edge function.
- We accept that every write locks the project's record row briefly in exchange for a sequence that only goes up. Model calls never hold a database lock.
- We accept the budget interpretation above in exchange for a provider cap that Managed Agents can actually set.

## Alternatives considered

- A pure TypeScript reducer over one state document. It lost because a service caller could save any state and bypass the reducer, and because the fixture rewrite put the loop tier at risk.
- An event log with a fold that the caller computes. It lost because SQL would accept a fold that the edge computed, which splits the rules between two languages.
- The whole PRD as one versioned document. It lost because rules would be ported into both TypeScript and SQL, and because it offers two ways to publish staged content.
- Fully normalized content, with tables for statements, decisions, sources and stories. It lost on laziness: no query needs those rows, and the document per section version is immutable and typed.

## Open questions

- The scorer threshold, the platform fee in basis points, and the turn reservation size are pilot decisions. They are seeded as configuration rows, which name the value and record that it is a placeholder. A test never invents its own value.
- The REQ-026 bootstrap pull does not exist in this tree. AT-036.01 proves the PRD half, and its bootstrap half stays pending, with the reason.
- The package half of AT-036.06 and the `backlog.live` producer belong to AI4DEV-164 (sign-off into Build).

## Unit plan

1. Shared PRD record. Record, revision, section, chat, message and draft migrations; a new guard that refuses a Discovery revision once the PRD is open; `prd_open`, `prd_snapshot`, `prd_save_draft`; the `prd-open`, `prd-snapshot` and `prd-draft` functions; `snapshot.ts`. Turns green AT-036.01 and .02 at the integration tier.
2. Technical scope section. The generator and its skill without the build split or Lovable; the structured scope in the section document; the wire changes in `prd-stream.ts`. Keeps AT-036.11 and .12 green.
3. Question order. Questions, answers and follow-up tables and rules. Turns green AT-036.03, driven through the SQL functions; unit 6 re-runs it with Haiku.
4. Roles and permissions. `prd_turn_reserve` without money, `prd_action`, the route rows, and the `prd-message` and `prd-action` functions. Turns green AT-036.09 with real tokens for the developer, the NGO, and an unrelated account.
5. Section states and the PRD tools server. Read receipts, staging, commit, the cascade, grants, and the `prd-tools` function. Turns green AT-036.08 over real HTTP MCP, with no model.
6. PRD costs on Managed Agents. The ledger, rates, `managed.ts`, the relay inside `prd-message`, catch-up, the tunnel helper, and the setup script. Turns green AT-036.05 and .07. Re-runs AT-036.03 and .08 with Haiku.
7. Completion check. Turns green AT-036.04 with a Haiku check run and the reuse half driven through SQL.
8. Close PRD. Turns green the close half of AT-036.06. The package half stays pending.
9. Screen wiring. Before the model part, stop at the gate and confirm the tunnel with the founder. Then `prd-port.ts`, the route, the screen changes change order 016 allows, the notifications, and verify-ai4good. Turns green AT-036.10 and .13 to .18, and re-runs the screen-bearing cases wired.
