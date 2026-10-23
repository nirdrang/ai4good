# How the product runs its AI, starting with the PRD workspace

Date: 2026-10-23. Status: proposal for the founder. Nothing in the requirements, the board, or the PRD workspace branch changes until the founder rules.

## The question

Should the product's AI run through Claude Managed Agents, through OpenRouter with our own tool loop in edge functions, or through a third path?

The PRD workspace run, AI4DEV-166 (PRD workspace backend and wiring), stops before AI4DEV-171 (OpenRouter costs) for this decision.

## The recommendation

Use the third path. Call the Claude API directly from Supabase edge functions with our own tool loop. This is the path the shipped Discovery chat already uses. Use it for every PRD model call: the main chat, the section chats, the NGO side chats, and the completion check. Use it for the planning package's model calls when that job is built.

Do not adopt Managed Agents for the PRD workspace. Do not adopt OpenRouter.

Revisit Managed Agents for the planning package only if a package step cannot finish inside one edge function call (400 seconds on a paid plan) or the package must run code against the repository. AI4DEV-164 (sign-off into Build) builds that job.

The rest of this memo names the paths A, B and C:

- Path A is Claude Managed Agents. Anthropic runs the agent loop and a sandbox container for each session.
- Path B is OpenRouter, with our own tool loop in edge functions. REQ-036 says this today.
- Path C is the Claude API (the Messages endpoint), with our own tool loop in edge functions. Discovery ships this today.

## Why, in five points

1. **The PRD workspace's actions are product writes, not sandbox work.** In the chats, the AI records an answer in a section, proposes Ready to confirm, and suggests an NGO question. Each of these writes our database and needs the backend's role checks (REQ-036, "The backend enforces membership and role authority"). Under path A they would come back to our edge function as custom tool calls, so the sandbox does nothing for the chats. The repository and Linear writes happen only in the planning package. REQ-026 requires that package to write through the task-management writer, with stable identifiers and resume without duplicates. An agent that pushes with git and calls Linear on its own does not give step-level idempotency. Our writer must own those writes on every path.
2. **Path C's money path already exists and is tested.** Paid Discovery reserves before dispatch, prices reported token usage with versioned rates in micro-dollars, and settles once per turn (`supabase/migrations/20260921120000_discovery_funded_routing.sql`, `public.discovery_turn_reserve` and `public.discovery_turn_settle`). REQ-004 states the rule ("Paid Discovery metering"). The PRD needs the same rule, keyed by message instead of by turn.
3. **Path A cannot settle each reply exactly from what it reports.** A session reports `list_cost` at public list rates, rounded to the cent, and only as a running total for the whole session. Each model request reports tokens (`span.model_request_end.model_usage`), so we would price tokens ourselves anyway, as in path C. Path A also adds runtime cost at $0.08 per active session-hour, reported only as a session total (`usage.active_seconds`). REQ-036 makes every queued message its own paid request. Managed Agents queues messages inside the session, so the session can go from one queued message to the next without stopping in between. When that happens, the runtime cost has no per-reply boundary. This is inferred from the documentation, not observed.
4. **Path A breaks the project rule on keys unless every outside write is a custom tool.** CLAUDE.md, founder 2026-10-03, says an outside service that needs a key is called only from an edge function, with the key in that function's environment. A mounted repository gives the GitHub token to Anthropic, whose git proxy injects it. A Linear MCP server takes its credential from an Anthropic vault. Both keys live outside our edge function.
5. **Path B adds a second vendor, and its one strength is small next to that cost.** OpenRouter reports the charged USD for each generation in the last stream chunk (`usage.cost`), so we would keep no rate table. That is its one real strength. It costs us a second vendor between us and the model, a second account to fund and reconcile, and a model list that we do not control. It also splits the platform's AI money across two providers, because REQ-009 already runs the build on Anthropic workspaces. Discovery already runs path C. A switch in its code (`DISCOVERY_PROVIDER`, `supabase/functions/_shared/discovery-model.ts`) already reaches any OpenAI-compatible endpoint, OpenRouter included, for development and tests.

## The seven checks

Each cell says how we know: **measured** in this run, **read** in code or vendor documentation, **inferred** from what we read, or **not measured**.

| Check | A: Managed Agents | B: OpenRouter | C: Claude API |
| --- | --- | --- | --- |
| 1. Streaming into useChat | Text arrives in one piece per model request. Live previews need the `event_deltas[]` option, and they cover the main thread only (read). The spike relays them into the same stream format. It is type-checked, not run live. | The shipped OpenAI-compatible port already streams Discovery (read). The spike streams it. It is type-checked, not run live. | The shipped Discovery screen streams this way through `discovery-stream.ts` (read). The spike reuses that file. It is type-checked, not run live. |
| 2. Edit a repository file and create a Linear item | The sandbox edits the repository and pushes with git. Linear is a custom tool that our function runs (spike code). Not run live, because there are no keys. | Our loop runs both tools: the GitHub contents API and a Linear GraphQL `issueCreate` call (spike code). Not run live. | The same two tools as B, in our loop (spike code). Not run live. |
| 3. Cost for each reply, settled exactly once | Tokens for each model request are keyed by event id. Runtime is a session total. `list_cost` is a session total, rounded to the cent (read). We price the tokens ourselves. | USD is reported for each generation id. A missing cost can be looked up later at `/generation` (read). | Tokens are reported for each message id. We price them with versioned rates, as Discovery does (read, shipped). The dollar total arrives daily for each workspace (read). |
| 4. Hold the money before the call | Our ledger hold. A session budget can add a hard cap at list price. It can overshoot by one model request, and it can only be set when the session is created (read). | Our ledger hold. A per-key credit limit exists. The documentation does not say whether OpenRouter blocks a key at its limit (read). | Our ledger hold. A workspace spend limit is a backstop (read in REQ-009). |
| 5. Keys stay inside the edge function | The Anthropic key: yes, measured. The GitHub token is held by Anthropic's git proxy (read). | Yes, measured. | Yes, measured. |
| 6. Isolation and caps for each project | The sandbox is per session. Caps are per session, not per project (read). | Keys can be created by API for each project, with a limit (read). | Caps come from our ledger, as in Discovery. The provider separates PRD spend only by workspace (read). |
| 7. Latency | Not measured. The guess is slower to the first word, because each session provisions a container and clones the repository. | Not measured. The guess is one extra network hop. | Not measured. |

What was measured in this run, on the local Supabase stack and the real Supabase edge runtime (`public.ecr.aws/supabase/edge-runtime:v1.74.2`):

- The ledger in `spike/ledger.sql` holds before the call and refuses a hold above the available funds. It settles a receipt once and refuses the replay. It keeps a missing cost pending and still counts it against funds. It reconciles once and refuses the replay. Two parallel holds that together exceed the funds end with exactly one hold. The output is in `spike/ledger-check.out`. Re-run it with `loop/items/ai-path/spike/ledger-check.sh`. This ledger does not depend on the path. Only the receipt id and the amount differ between paths.
- The edge function boots in the edge runtime. All three providers answered it through this container's network and rejected a placeholder key. The browser stream carried a well-formed error part and `[DONE]`, and contained the placeholder key zero times on all three paths. The output is in `spike/placeholder-run.out`.
- A gap this run found, for any path: a call that the provider rejects before it generates anything leaves its hold at "held". AI4DEV-171 (OpenRouter costs) needs a release outcome for failures that provably cost nothing, in addition to "pending" for failures that may have cost something.

What was not measured: real streaming, real tool calls, real cost figures, and latency. This container has no Anthropic, OpenRouter or Linear key. The founder's Linear workspace also has no test team, only AI4DEV and AI4PM, so the spike created nothing in Linear. `spike/README.md` lists what to add and the one command that runs the live comparison.

## Tradeoffs

| | A: Managed Agents | B: OpenRouter | C: Claude API |
| --- | --- | --- | --- |
| Code we own | Session setup, event relay, custom tool answers, a way to resume work that outlives a 400-second call | Tool loop and stream parser | Tool loop. Discovery's port already exists. |
| Money truth for each reply | Our pricing of tokens plus runtime with no per-reply boundary | The provider's USD for each generation | Our pricing of tokens, reconciled daily against the provider |
| Vendors | Anthropic, in beta | OpenRouter, then Anthropic | Anthropic |
| Long jobs | Runs past edge limits | Steps of 400 seconds or less | Steps of 400 seconds or less |
| Fit with REQ-009 build money | Same provider | Second provider | Same provider |
| Fit with the keys rule | Breaks it for GitHub, and for Linear if it uses MCP | Fits | Fits |

## Changes each path needs

The founder edits the requirements through `/doc-sync`. This run edits nothing. The texts below quote the PRD workspace branch at `9fa487d`.

### If path C is chosen (recommended)

**REQ-036, Effort and spending** (`loop/out/pure-s6-req-027-036.md`, line 82). Before:

> All PRD model calls use OpenRouter through the backend. Use its reported generation cost for the provider debit, once per generation identifier. Retain the ledger's platform fee separately and preserve fractional cents. Missing cost remains Pending with its reservation until reconciliation; it is not zero.

After:

> All PRD model calls go to the Claude API from edge functions with server-held credentials, in a platform PRD workspace. Before each call, reserve the most the request can cost. Price each reply's reported token usage with versioned rates, the same way as paid Discovery (REQ-004), and settle it once per provider message identifier. Retain the ledger's platform fee separately and preserve fractional cents. Missing usage remains Pending with its reservation until reconciliation; it is not zero. A call the provider rejects before generating releases its reservation.

**REQ-036, acceptance criteria** (line 100). Before: "OpenRouter cost settles once per generation with fee and pending amounts explicit in the ledger." After: "Each reply's priced usage settles once per provider message with fee and pending amounts explicit in the ledger; a reply the provider rejects before generating releases its reservation."

**AT-036.05** (`.taskmaster/docs/acceptance/at-req-036.md`). Change "when their OpenRouter responses finish, the backend settles each reported generation cost once" to "when their Claude API responses finish, the backend prices each reply's reported usage with versioned rates and settles it once per provider message". Add "a call rejected before generation releases its reservation" to the tested cases. Change "generation-cost reconciliation" to "usage reconciliation".

**REQ-009, PRD boundary** (`loop/out/pure-s4-req-007-012.md`, line 47). Before: "the platform-owned PRD workspace calls OpenRouter through server-held credentials (REQ-036). Its billing handler reserves project funds and settles reported generation cost under REQ-006." After: "the platform-owned PRD workspace calls the Claude API through server-held credentials in a platform PRD workspace, separate from Discovery's and from every project workspace (REQ-036). Its billing handler reserves project funds and settles each reply's priced usage under REQ-006. Nightly reconciliation compares settled PRD usage with that workspace's provider report and posts drift as a visible adjustment, never as a second charge." The rest of the paragraph stays.

**REQ-006, PRD line** (`loop/out/pure-s3-req-001-006.md`, line 151) and **REQ-034, PRD attribution** (`loop/out/pure-s6-req-027-036.md`, line 45) name OpenRouter too. In REQ-006, change "PRD through OpenRouter" to "PRD through the Claude API". Change "settles the provider-reported generation cost once" to "settles each reply's usage, priced with versioned rates, once". In REQ-034, change "OpenRouter requests record ... generation identifiers" to "Claude API requests record ... provider message identifiers".

**The manifest** (`loop/decomp/req-036.md`). Line 16 becomes "supported Claude model settings". Rename D4 from "OpenRouter costs" to "PRD costs". Its leaf text follows the AI4DEV-171 text below. In line 59, "model calls go through OpenRouter in production, using the AI SDK as planned" becomes "model calls go to the Claude API in production through the Discovery model port".

**AI4DEV-171 (OpenRouter costs)**. New title: "PRD costs: reserve, price and settle once (D4.L1)". New text:

> Every PRD model call (main, section, and side chats, the completion check, and the planning package) goes to the Claude API from an edge function, in the platform PRD workspace, through the Discovery model port. Reserve the request's maximum cost before the call. Price the reported token usage with versioned rates and settle it once per provider message identifier. Keep missing usage pending, release a reservation when the provider rejects the call before generating, and keep the platform fee and fractional cents. Reconcile nightly against the PRD workspace's provider report. No effort selector; fixed service settings. The gauge band comes from settled spend, with pending spend as text and a hatched part of the bar.

### If path B is kept

The provider text in REQ-036, REQ-009, REQ-006 and REQ-034 stays. Two additions:

- REQ-036, Effort and spending, after "it is not zero": "A call the provider rejects before generating releases its reservation. Reconcile a missing cost through the provider's generation lookup."
- REQ-009, PRD boundary, after its first sentence: "Each project's PRD calls use that project's own OpenRouter key with a credit limit, created at kickoff." Leave this sentence out if the founder does not want per-project keys.

AI4DEV-171 keeps its title. Its text adds: "Release the reservation when the provider rejects the call before generating. Reconcile missing cost through the generation lookup."

### If path A is chosen

**REQ-036, Effort and spending.** Replace the OpenRouter sentences with: "PRD chats run as Claude Managed Agents sessions started from edge functions. Price each model request's reported tokens with versioned rates and settle it once per model-request event. Price session runtime from active seconds and settle it once per session. A session budget equal to the reservation caps each session at the provider." Then add a sentence that resolves the queue: either "each queued message opens its own session", which drops the shared session context, or "runtime is charged per session, not per reply", which changes AT-036.05.

**REQ-009, PRD boundary.** "calls OpenRouter" becomes "runs Claude Managed Agents sessions". Add: "Repository and Linear writes are custom tools that the edge function runs, so no outside credential leaves the edge function."

**CLAUDE.md, the keys rule.** If the founder accepts a mounted repository, the rule needs an explicit founder exception for the GitHub token held by Anthropic's git proxy. That is a loosening of the rule, so it needs a founder ruling.

**AI4DEV-171 (OpenRouter costs).** New title: "PRD costs on Managed Agents sessions (D4.L1)". New text: the same reserve, pending, fee and gauge rules, with the two settlement keys above, and the planning package moved to a background session that webhooks wake.

## Draft decision entry

`decision-draft.jsonl` in this folder holds one line for `loop/state/decisions.jsonl`, with id d100. It records path C. Append it only after the founder rules.

## What the founder decides

- The path. The recommendation is C.
- Whether to add keys and a test team so the live half of the spike runs. Without it, latency and real cost stay unmeasured. Paths B and C send the same model the same request, so latency can only count against path A, which this memo already does not recommend.
