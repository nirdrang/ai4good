# How the product runs its AI, starting with the PRD workspace

Written 2026-10-23 as a proposal for the founder. Nothing in the requirements, the board, or the PRD workspace branch changes until the founder rules.

## The question

Should the product's AI run through Claude Managed Agents, through OpenRouter with our own tool loop in edge functions, or through a third path?

The PRD workspace run, AI4DEV-166 (PRD workspace backend and wiring), stops before AI4DEV-171 (OpenRouter costs) for this decision.

The three paths, as this memo names them:

- Path A is Claude Managed Agents. Anthropic runs the agent loop, plus a sandbox container for each session.
- Path B is OpenRouter, with our own tool loop in Supabase edge functions. REQ-036 says this today.
- Path C is the third path the evidence turned up. It calls the Claude API (the Messages endpoint) directly from edge functions, with our own tool loop. The shipped Discovery chat calls the Claude API this way.

## The recommendation

Keep path B. The PRD workspace's AI calls OpenRouter from edge functions, and our own tool loop runs every tool. Fix three gaps in the money rules before AI4DEV-171 (OpenRouter costs) is built. The section "Changes each path needs" gives the exact text.

1. Hold the reservation for the whole request, across every tool step. Today's text and the first spike settled the hold on the first generation, so later steps ran on no reservation.
2. Release the reservation when the provider rejects a call before it starts a generation. Keep it pending only when a generation started and its cost is missing.
3. State where the product's actions run. The chat tools write PRD state through the backend's role checks. The planning package writes the repository and Linear only through the task-management writer (REQ-026).

Do not adopt Managed Agents for the PRD workspace. Revisit it for the planning package only if one package step cannot finish inside one edge function call, or if the package must run code against the repository. Supabase allows 400 seconds per call on a paid plan. AI4DEV-164 (sign-off into Build) builds that job.

Keep path C as the fallback. Switch to it if the live run shows that OpenRouter's reported cost differs from its own generation lookup, or that cache reads do not show up in the reported usage. OpenRouter's documentation says both work: it passes Claude's `cache_control` through and reports cached tokens and a `cache_discount` for each request (read).

This memo first recommended path C. Review overturned that. The section "What review changed" says why.

## Why path B

1. **The PRD workspace's actions are product writes, not sandbox work.** In the chats, the AI records an answer in a section, proposes Ready to confirm, and suggests an NGO question. Each one writes our database and needs the backend's role checks (REQ-036, "The backend enforces membership and role authority"). The repository and Linear writes happen only in the planning package. REQ-026 requires that job to write through the task-management writer, with stable identifiers and resume without duplicates. So every path runs its tools in our backend, and path A's sandbox has no work to do in the PRD workspace.
2. **Path B is the only path whose provider states the charged amount for each reply.** OpenRouter puts `usage.cost`, "the total amount charged to your account", in the last stream chunk. A missing cost can be looked up later by generation id at `/generation` (read in OpenRouter's documentation). The FAQ says "there is no markup on inference pricing" (read). Path C reports tokens, which we must price with our own rate table. Anthropic's only dollar figure is the daily cost report, grouped by workspace, with no lookup for one message (read). That leaves no way to settle one missing reply exactly. REQ-036's money rules ("settle the reported generation cost once", "reconcile by generation identifier") fit path B as written.
3. **No project-money code exists yet on any path.** The paid branch of Discovery is a stub. `public.project_fuel_available_micros` returns `0`, and every reserve function has the line "the Stripe run adds perform public.project_fuel_reserve(...) here" (read in `supabase/migrations/20260921120000_discovery_funded_routing.sql` and three later migrations). The reserve, settle and release work in AI4DEV-171 (OpenRouter costs) costs the same on every path. It gives path C no head start.
4. **Path B keeps the model choice the founder asked for.** The wiring plan the founder approved on 2026-10-14 ("yes record it in the wiring brief") puts production on OpenRouter with the luna model if offered, otherwise Haiku. It puts development and tests on the Codex CLI provider at no cost (`design/canvas/prd-workspace/review.md`, lines 17 to 24, on the PRD workspace branch). Path C offers Claude models only. Its cheapest, Claude Haiku 5.5, costs $0.10 per million input tokens and $0.50 per million output tokens (read in the claude-api reference), so model price alone does not rule C out.
5. **Path B changes the least.** OpenRouter is named in about thirty places on the PRD workspace branch: REQ-006, REQ-009, REQ-034 and REQ-036, three acceptance-file banners, AT-036.05, four manifests, the UI contract, and the wiring plan. Path B adds a few sentences. Path C or path A rewrites all of them.

## Why not path A

- A mounted repository gives the GitHub token to Anthropic's git proxy, and a Linear MCP server takes its credential from an Anthropic vault (read in the Managed Agents reference). CLAUDE.md (founder, 2026-10-03) says an outside service that needs a key is called only from an edge function, with the key in that function's environment. Path A meets that rule only if every outside write is a custom tool that our function answers. Then the sandbox does nothing that path B's loop does not already do.
- The money gap is small and can be bounded. Path A reports tokens for each model request (`span.model_request_end.model_usage`), and we price them as under path C. Session runtime costs $0.08 per active hour, about $0.0013 for a 60-second reply (read). The backend can bound it per reply by sending the next message only after the session goes idle, then differencing `usage.active_seconds`. That is a backend choice, not a vendor limit. The case against A rests on the first point, not on money.
- Path A is in beta, and its reported `list_cost` is rounded to the cent at public list rates (read).

## Why not path C now

- It has no exact settlement for a reply whose usage never arrives (point 2 above). REQ-036 would need a new rule, for example "settle at the reservation after a set time, with a visible adjustment".
- The Discovery port cannot serve the PRD unchanged (read in `supabase/functions/_shared/anthropic-messages.ts`). It keeps only the first tool call, returns no provider message id, folds cache reads and writes into input tokens, and streams only the `reply` tool's text. Discovery's rate columns are whole micro-dollars per token, so they cannot express Haiku 5.5's input rate of 0.1 micro-dollars per token, or Opus 5.5's cache-read rate of 0.2.
- It is a valid fallback, because it keeps one vendor and no rate markup. The change list below is complete, so the founder can switch with the facts in hand.

## Continuous section updates

The PRD chats rewrite PRD sections as the conversation goes. The contract says so: "The AI updates topic text and state from recorded answers and decisions, with their sources" (`design/prd-ui-contract.md`, line 60). Writing sections is the chats' main tool, not an occasional action. Five consequences follow, and none of them favours path A.

1. **The sections live in our database, not in files.** REQ-036 persists "topic states" and "PRD revisions", and both humans see them on screen. The repository receives the PRD only when the planning package runs after UI Design. A file that path A's agent edits in its sandbox is invisible to the screen and to the NGO. Path A would therefore write sections through a custom tool that our edge function runs, which is the same tool paths B and C run in their own loop.
2. **Each write is a guarded state change, not a text replace.** It must carry the revision the AI read, so a stale write is refused (contract, lines 56 and 110). It sets the section to Draft, or to Needs review if it was confirmed. It sends confirmed sections that depend on it to Needs review with the "Changed since you confirmed" line. It records the sources. That needs one database transaction with row locks, which only our backend can run.
3. **The chats write at the same time.** Under d99 there are no turns, so the main chat and a section chat can rewrite the same section at once. A stale write must come back to the model with the current text, so the model merges and writes again.
4. **One reply is several paid generations.** Each tool round trip is a new generation. That is why the reservation has to cover the whole request, the first of the three rules above.
5. **Every generation resends the current PRD and the Discovery document.** Prompt caching therefore decides most of the cost of a long PRD chat. OpenRouter supports it for Claude and for OpenAI models and reports it for each request (read). Path C has it natively.

Measured in this run, on the local database. `spike/sections.sql` is a throwaway section store with a revision-checked `write_section` function, and `spike/sections-check.sh` exercises it. The output is in `spike/sections-check.out`.

- One reply wrote two sections in a row. Both became Draft at revision 1.
- After the developer confirmed both, a later answer changed the users section. That section went to Needs review with "drivers added as users". The stories section, which depends on it, went to Needs review with "Depends on users: drivers added as users".
- A section chat then wrote from revision 1, which was stale. The write was refused and returned the current text and revision 2.
- Five chats wrote the same section at once from the same revision. Exactly one write landed in each of 20 rounds.
- Every landed write is kept with its revision, its writer and its sources.

All three spike paths now offer this as their main tool, `write_prd_section`. Paths B and C run it in our loop. Path A runs it as a custom tool that the edge function answers. The live run exercises it, with keys.

One design point for AI4DEV-170 (section states and chats), not for this decision. The contract binds requests to the whole PRD revision. With no turns, one PRD-wide revision makes a section chat's write fail whenever the main chat changed any other section. The spike checks revisions for each section instead, so only writes to the same section collide. AI4DEV-170 should choose between the two.

## How one PRD turn works

This design reuses the shape of the shipped Discovery turn (`supabase/functions/_shared/discovery-turn.ts`). Discovery makes one model call per turn. The model answers through one structured reply that holds the visible text and the brief updates for every topic the answer touched. The backend applies them against the brief revision the turn was based on. The PRD needs the same shape, with sections in place of topics.

**The turn is a fixed pipeline, not a tool loop.** One edge function runs these steps for every message in the main chat, a section chat, or an NGO side chat.

1. Authorize the sender, the chat and the role (REQ-036).
2. Reserve money for one reply.
3. Read the current PRD, recording each section's revision, and assemble the context (below).
4. Make one model call, streaming the visible text to useChat as it arrives.
5. Parse the structured reply against its schema. A reply that fails the schema is a failed turn, and nothing is written.
6. Apply every section update from the reply in one database transaction (`spike.apply_turn`). Then settle the money and store the message.
7. Send the changed sections to the screen as data parts. The other person sees them through the shared record.

**The structured reply.** It carries the text the person reads, then a list of section updates. Each update holds the section id, the revision it was based on, the new text, the sources, and a one-line change note. It also carries Ready to confirm proposals, suggested NGO questions, and an inline recommendation. One answer that affects several sections is one list with several entries. On OpenRouter this is `response_format` with a `json_schema`, which streams (read in OpenRouter's documentation). Setting `require_parameters: true` routes only to endpoints that support it. Claude Opus 5.5 and Sonnet 5.5 reject a forced tool choice, so the schema goes in structured output, not in a forced tool (read in the claude-api reference).

**Context assembly, in cache order.** Stable parts go first, so each turn reuses the cached prefix.

1. The system prompt: the PRD rules, the section list with ids and dependencies, and the reply schema. This never changes during a PRD.
2. The approved Discovery document. It froze when the developer opened the PRD (d99), so it never changes either.
3. The chat's settled history. It only grows, so the cache covers everything except the newest messages. A section chat sends its own history. The main chat sends the main history.
4. The current PRD: every section with its revision, state and text. A section chat gets its own section in full and the others as text with revision numbers. This part changes every turn, so it goes after the cached history, not inside the system prompt. Discovery puts its brief inside the system prompt, which resets the cache every turn.
5. The new message.

**How the database changes.** `spike.apply_turn` locks every section the reply names and checks each base revision. Only if all of them match does it write all of them. Each write bumps that section's revision. A confirmed section moves to Needs review with the change note, confirmed sections that depend on it get the "Changed since you confirmed" line, and the sources are recorded. If any section changed since the turn read it, for example because a section chat wrote it in the meantime, nothing from the reply is written. The function returns the stale sections with their current text. The backend then makes one more call with the fresh text, inside the same reservation. If that also comes back stale, the reply shows text only and says which sections it could not update.

**Why all or nothing.** One answer often changes sections that depend on each other, such as users and stories. Writing half of them leaves a PRD that contradicts itself.

**When a loop would be needed.** Only when the model must fetch something it does not have, such as a Discovery file excerpt. Putting that material in the context avoids the loop. The repository and Linear writes belong to the planning package, not to the chats.

**What this changes in the money rules.** A chat reply becomes one generation, plus at most one retry, so it gets one receipt in the normal case. The whole-request reservation rule stays, because the retry and the planning package make more than one call.

Measured in this run, on the local database (`spike/sections-check.out`). One reply updated three sections in one transaction, and all three went to revision 1. Next, a section chat changed one of them, and then a reply came back based on the older revisions. Nothing from that reply landed. The function returned the stale section with its current text and revision 2.

## The seven checks

Each cell says how we know: **measured** in this run, **read** in code or vendor documentation, **inferred**, or **not measured**.

| Check | A: Managed Agents | B: OpenRouter | C: Claude API |
| --- | --- | --- | --- |
| 1. Streaming into useChat | Text arrives in one piece per model request, unless the stream opts in to `event_deltas[]` previews (read). The spike relays previews, and falls back to the full message when no preview arrived. It is type-checked, not run live. | The spike parses the stream into the Discovery stream format. It is type-checked, not run live. | The spike streams through the Anthropic SDK into the same format. It is type-checked, not run live. |
| 2. Edit a repository file and create a Linear item | The sandbox edits the repository and pushes with git. Linear is a custom tool that our function runs (spike code). Not run live. | Our loop runs both tools, the GitHub contents API and a Linear `issueCreate` call (spike code). Not run live. | The same two tools as B (spike code). Not run live. |
| 3. Cost for each reply, settled exactly once | Tokens for each model request, keyed by event id. Runtime and `list_cost` are session totals (read). | USD for each generation id, with a later lookup by id (read). | Tokens for each message id, priced by us. The provider's dollars arrive daily for each workspace, with no lookup for one message (read). |
| 4. Hold the money before the call | Our ledger hold. A session budget adds a cap at list price (read). | Our ledger hold. A per-key credit limit exists. The documentation does not say whether OpenRouter blocks a key at its limit (read). | Our ledger hold. A workspace spend limit is a backstop (read in REQ-009). |
| 5. Keys stay inside the edge function | A placeholder model key did not reach the browser (measured). The GitHub token goes to Anthropic's git proxy (read). | A placeholder model key did not reach the browser (measured). The GitHub and Linear keys were not exercised. | Same as B. |
| 6. Isolation and caps for each project | The sandbox is per session. Caps are per session (read). | Keys can be created by API for each project, with a limit (read). | Caps come from our ledger only. The provider separates spend by workspace (read). |
| 7. Latency | Not measured. The guess is a slower first word, because each session provisions a container and clones the repository. | Not measured. The guess is one extra network hop. | Not measured. |

Measured in this run, on the local Supabase stack and the real Supabase edge runtime (`public.ecr.aws/supabase/edge-runtime:v1.74.2`). The ledger does not depend on the path, so these results hold for A, B and C alike.

- `spike/ledger-check.sh` covers one request with three generations. It settles each generation once and refuses the replay. The hold keeps covering the remaining steps after the first settle. It keeps the remainder reserved while one cost is missing. It releases the remainder after reconciliation and refuses a second reconciliation. A request that ends with no generation releases its whole hold. An empty receipt id is refused. An overrun shows as its own figure. A hold above the available funds is refused. In 20 rounds of five concurrent holds against funds for three, exactly three won every round. The output is in `spike/ledger-check.out`.
- `spike/placeholder-run.sh` calls each path once in the edge runtime with well-formed placeholder keys. Anthropic answered "invalid x-api-key" and OpenRouter answered "User not found". These answers stayed in the server log. The browser received "The AI request failed." and `[DONE]`, with the placeholder key zero times. Each hold ended `closed`, so its money was released. The output is in `spike/placeholder-run.out`.

Real streaming, tool calls, cost and latency were not measured. This container has no Anthropic, OpenRouter or Linear key, and the Linear workspace has no test team. `spike/README.md` lists what to add and the command that runs the live comparison. That run reads back the commit and the issue, and compares each settled OpenRouter amount with the generation lookup.

## Tradeoffs

| | A: Managed Agents | B: OpenRouter | C: Claude API |
| --- | --- | --- | --- |
| Dollar truth for each reply | Our pricing of tokens, plus runtime | The provider's charged amount, with a lookup by id | Our pricing of tokens, reconciled daily for the workspace |
| Models | Claude | Claude, luna, Haiku and others | Claude |
| Development and tests at no cost | No | Codex CLI provider, per the wiring plan | No |
| Vendors between us and the model | Anthropic, in beta | OpenRouter | None |
| Code we own | Session setup, event relay, custom tool answers, resume past 400 seconds | Tool loop and stream parser | Tool loop, an extended port, a rate table |
| Fit with the keys rule | Breaks it unless every outside write is a custom tool | Fits | Fits |
| Requirement changes | About thirty places | A few added sentences | About thirty places |

## What review changed

The first version of this memo (commit `9eb4d63`) recommended path C. It rested on two claims. Path C could reuse a tested paid-Discovery money path, and the Discovery port already did the work. Review with one model found both false, and I confirmed each in the code. The paid branch is a stub, and the port lacks multi-tool loops, message ids and cache pricing. Once both claims fell, path B's per-generation cost and lookup, and its model choice, decided it.

The review also found three spike defects, now fixed. The hold was settled on the first generation of a tool loop. An OpenRouter stream with no generation id settled under an empty id. Provider error bodies reached the browser. The ledger check now covers each of these.

The review ran with one model. The Codex and Grok reviewers dropped out at their login check, and no other model was put in their place. No finding has a second model's agreement.

## Changes each path needs

The founder edits the requirements through `/doc-sync`. This run edits nothing. Quotes are from the PRD workspace branch at `9fa487d`.

### Path B (recommended)

**REQ-036, Effort and spending** (`loop/out/pure-s6-req-027-036.md`, line 82). Keep every sentence. After "Missing cost remains Pending with its reservation until reconciliation; it is not zero." add:

> The reservation covers the whole request, including every tool step, and each generation in it settles once. When the request ends, release the unspent remainder, except while a generation's cost is missing. A request the provider rejects before any generation starts releases its whole reservation. Reconcile a missing cost by looking up its generation identifier.

**REQ-036, acceptance criteria** (line 100). Before: "OpenRouter cost settles once per generation with fee and pending amounts explicit in the ledger." After: "OpenRouter cost settles once per generation, across every tool step of a request, with fee and pending amounts explicit in the ledger; a request rejected before any generation releases its reservation."

**AT-036.05** (`.taskmaster/docs/acceptance/at-req-036.md`, line 28). After "Test normal and streaming replies," add "requests with several tool steps, requests the provider rejects before any generation,".

**REQ-009, PRD boundary** (`loop/out/pure-s4-req-007-012.md`, line 47). Keep every sentence. After "Enforce project binding, membership, role authority, funding, and revocation before dispatch." add:

> The model's tools run in the edge function. Chat tools write PRD state through these same checks. Only the planning package writes the repository and Linear, and only through the task-management writer (REQ-026).

**AI4DEV-171 (OpenRouter costs).** Keep the title. Replace the sentence "Reserve before the call, settle the reported generation cost once per generation identifier, keep missing cost pending, and keep the platform fee and fractional cents." with:

> Reserve before the call and hold the reservation across every tool step of the request. Settle each generation's reported cost once per generation identifier, and never settle a stream that carries no generation identifier or carries an error as a success. When the request ends, release the unspent remainder unless a cost is pending, and release the whole reservation when the provider rejects the call before any generation. Reconcile a pending cost through the generation lookup. Keep the platform fee and fractional cents.

The rest of the text stays.

The model is the founder's call, as the wiring plan already says ("screen wiring checks availability and the price per reply first and asks the founder").

### Path C (the fallback)

**REQ-036, Effort and spending** (line 82). Before:

> All PRD model calls use OpenRouter through the backend. Use its reported generation cost for the provider debit, once per generation identifier. Retain the ledger's platform fee separately and preserve fractional cents. Missing cost remains Pending with its reservation until reconciliation; it is not zero.

After:

> All PRD model calls go to the Claude API from edge functions with server-held credentials, in a platform PRD workspace. Reserve the most the request can cost and hold it across every tool step. Price each reply's reported token usage, including cache reads and cache writes, with versioned rates, and settle it once per provider message identifier. Retain the ledger's platform fee separately and preserve fractional cents. Missing usage remains Pending with its reservation; after a set time it settles at the reserved amount, and reconciliation against the workspace's daily provider cost posts any difference as a visible adjustment. A request the provider rejects before any reply starts releases its reservation.

**REQ-036, acceptance criteria** (line 100). After: "Each reply's priced usage settles once per provider message, across every tool step, with fee and pending amounts explicit in the ledger; a request rejected before any reply releases its reservation."

**REQ-009, PRD boundary** (line 47). Before: "the platform-owned PRD workspace calls OpenRouter through server-held credentials (REQ-036). Its billing handler reserves project funds and settles reported generation cost under REQ-006." After: "the platform-owned PRD workspace calls the Claude API through server-held credentials in a platform PRD workspace, separate from Discovery's and from every project workspace (REQ-036). Its billing handler reserves project funds and settles each reply's priced usage under REQ-006. Nightly reconciliation compares settled PRD usage with that workspace's provider report and posts drift as a visible adjustment, never as a second charge." Add the tools sentence from path B.

**AI4DEV-171 (OpenRouter costs).** New title: "PRD costs: reserve, price and settle once (D4.L1)". New text:

> Every PRD model call (main, section, and side chats, the completion check, and the planning package) goes to the Claude API from an edge function, in the platform PRD workspace. First extend the Discovery model port so it returns the provider message id, runs every tool call in a reply, and reports cache reads and cache writes apart from input. Change the rate store to fractional micro-dollars per token for each token category. Reserve the request's maximum cost and hold it across every tool step. Price each reply's usage and settle it once per provider message identifier. Keep missing usage pending, settle it at the reservation after the set time, release the reservation when the provider rejects the call before any reply, and keep the platform fee and fractional cents. Reconcile nightly against the PRD workspace's provider report. No effort selector; fixed service settings. The gauge band comes from settled spend, with pending spend as text and a hatched part of the bar.

Every other place that names OpenRouter or generation cost also changes. Each entry below gives the file, its line, and the change.

- `loop/out/pure-s3-req-001-006.md:151`, REQ-006. "PRD through OpenRouter" becomes "PRD through the Claude API". "settles the provider-reported generation cost once" becomes "settles each reply's priced usage once". "until generation-cost reconciliation" becomes "until usage reconciliation".
- `loop/out/pure-s6-req-027-036.md:45`, REQ-034. "OpenRouter requests record actor, project, request and generation identifiers" becomes "Claude API requests record actor, project, request and provider message identifiers". "The PRD billing handler records reported cost only in the money ledger" becomes "The PRD billing handler records priced usage only in the money ledger".
- `.taskmaster/docs/acceptance/at-req-006.md:3`, `at-req-009.md:3` and `at-req-034.md:3`, the d93 banners. "platform-owned PRD calls use OpenRouter and settle provider-reported generation cost once" becomes "platform-owned PRD calls use the Claude API and settle each reply's priced usage once".
- `.taskmaster/docs/acceptance/at-req-036.md:28`, AT-036.05. "when their OpenRouter responses finish, the backend settles each reported generation cost once" becomes "when their Claude API responses finish, the backend prices each reply's usage and settles it once per provider message". "generation-cost reconciliation" becomes "usage reconciliation". "A repeated receipt or cost lookup creates no second charge or generation" becomes "A repeated receipt or reconciliation creates no second charge or reply". Add the tool-step and rejected-request cases from path B.
- `.taskmaster/docs/acceptance/at-req-036.md:58`, the index row. "OpenRouter cost" becomes "Claude API cost".
- `loop/decomp/req-006.md:57-58`, `req-009.md:55-56` and `req-034.md:49-50`. "through OpenRouter" becomes "through the Claude API". "generation-cost deduplication" becomes "per-message settlement deduplication".
- `loop/decomp/req-036.md:16`. "supported OpenRouter model settings" becomes "supported Claude model settings".
- `loop/decomp/req-036.md:41` and `:43`. "OpenRouter costs" becomes "PRD costs". The leaf text follows the AI4DEV-171 text above.
- `loop/decomp/req-036.md:59`. "model calls go through OpenRouter in production, using the AI SDK as planned" becomes "model calls go to the Claude API in production through the extended Discovery port".
- `loop/decomp/req-036.md:82`. "OpenRouter costs and settlement" becomes "PRD costs and settlement".
- `design/prd-ui-contract.md:126-131`. "through OpenRouter" becomes "to the Claude API". "Read OpenRouter's reported cost" becomes "Price the reported usage". "provider generation identifier" becomes "provider message identifier". "reconcile by generation identifier" becomes "settle at the reservation after the set time, then reconcile daily". Lines 208 to 210 lose the OpenRouter references.
- `design/canvas/prd-workspace/review.md:22`, the wiring plan. This is a record of a founder answer, so it stays as written. A new line under it records the change of plan.
- `design/references/prd-grill-me-chat.html` is an old reference mock. It stays as it is.

### Path A

**REQ-036, Effort and spending** (line 82). Replace the four OpenRouter sentences with:

> PRD chats run as Claude Managed Agents sessions started from edge functions. The backend sends the next message to a session only after the session goes idle. Price each model request's reported tokens with versioned rates and settle it once per model-request event. Price the session runtime between two idle events from the change in active seconds, and settle it once per reply. A session budget equal to the reservation caps each session at the provider. Missing usage remains Pending with its reservation.

**REQ-036, acceptance criteria** (line 100). After: "Each model request and each reply's runtime settle once, with fee and pending amounts explicit in the ledger."

**REQ-009, PRD boundary** (line 47). "calls OpenRouter through server-held credentials" becomes "runs Claude Managed Agents sessions with server-held credentials". "settles reported generation cost" becomes "settles priced model requests and runtime". Add: "Repository and Linear writes are custom tools that the edge function runs, so no outside credential leaves the edge function."

**AI4DEV-171 (OpenRouter costs).** New title: "PRD costs on Managed Agents sessions (D4.L1)". In the new text, the reserve, pending, fee and gauge rules stay. Settlement uses the two keys above. The planning package becomes a background session that webhooks wake.

Path A also needs every other change in the path C list, with "Managed Agents sessions" in place of "the Claude API". If the founder accepts a mounted repository, the keys rule in CLAUDE.md needs an explicit founder exception for the GitHub token held by Anthropic's git proxy.

## Draft decision entry

`decision-draft.jsonl` in this folder holds one line for `loop/state/decisions.jsonl`. Its id is d100, because d99 is the last decision on the PRD workspace branch. Main ends at d98, so the entry is appended on that branch, or on main after that branch merges. Append it only after the founder rules.

## What the founder decides

- The path. The recommendation is B.
- The PRD model, which the wiring plan already leaves to the founder after a price check.
- Whether to add keys and a Linear test team so the live half of the spike runs. Without it, latency and the match between OpenRouter's reported cost and its lookup stay unmeasured. The fallback to path C depends on that match.
