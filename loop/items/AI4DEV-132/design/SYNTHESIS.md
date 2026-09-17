# Synthesis: the design of record for the credits engine run

This file wins over anything that disagrees with it. Its base is
`candidate-4-reserve-settle.md` (opus at xhigh, blind label C). Where this file is silent,
the base holds. The corrections and grafts below change the base; each names its source.

## The pick, and the disagreement with the judge

The blinded judge (`judge-verdict.md`, astra at medium) scored the turn-ledger candidate
(`candidate-1-turn-ledger.md`, label B) first at 24 of 30 and disqualified the reserve-settle
candidate (label C) and the pure-kernel candidate (label A) on constraint 27: both left the
auth suite's live adapter refusing `sut.accounts.sendDiscoveryMessage` after promoting the
route. The judge is right that this is a break and right about what it costs to fix: the auth
adapter drives the real route and its expected file moves. That is one edit in unit 1, not a
structural flaw, so I score it as a correction and not a disqualification.

With that correction applied, the lead's scores are:

| criterion | turn ledger (B) | reserve-settle (C) | conversation aggregate (D) | pure kernel (A) |
|---|---:|---:|---:|---:|
| 1 constraints | 3 | 4 | 4 | 2 |
| 2 honest green | 4 | 3 | 4 | 1 |
| 3 interface depth | 3 | 4 | 5 | 3 |
| 4 invariants | 4 | 4 | 2 | 1 |
| 5 fit for later | 3 | 4 | 2 | 3 |
| 6 diff size | 1 | 3 | 4 | 3 |
| total | 18 | 22 | 21 | 13 |

Why the turn-ledger candidate is not the base, in three facts the judge under-weighted.
First, it pins one credit to one dollar and reserves the full one-million-token input window
on every turn, six credits, against a ten-credit daily grant: an unverified NGO gets one turn a
day. The judge named this under "do not take from B" and still scored the design first.
Second, it drops the four-argument `discovery_allowance` and makes every raw debit refuse
`turn-required`, which rewrites the NGO profile suite's debit fixtures and touches the ids that
constraints 33 to 36 protect. The brief says unit 1 extends the ledger; it does not say unit 1
re-proves another requirement. Third, it extends the `discovery-allowance` write route's read
with the whole conversation, so a write route becomes the screen's read.

Why reserve-settle over the conversation aggregate, which is smaller. The aggregate takes no
reservation: two projects of one NGO can each pass a preflight against the same remaining
credits and both incur provider cost before one settle refuses. The judge named this too. The
reservation is the one structure that makes AT-004.49 hold under concurrency, and three of the
four candidates converge on a turn table as the money record; the aggregate itself names the
lift to a turn table as the point where its direction breaks.

## Corrections to the base

1. **Constraint 27 (from the judge).** Unit 1 promotes `discovery-message` and, in the same
   commit, updates the auth suite: the req-001 loop fixture's `discovery-message` stand-in
   drives the promoted route's `decide` and inventory row, the req-001 live adapter posts to
   the deployed route instead of throwing `CapabilityPending(['sut.accounts.sendDiscoveryMessage'])`,
   and `tests/at/expected/req-001.json` moves any id that turns green. The writer reads
   `tests/at/suites/req-001/_fixture.ts` lines 770 to 778 and `_live.ts` lines 1020 to 1030
   before touching them.
2. **The input term of the reservation is counted, not estimated (graft from the conversation
   aggregate, D).** Before the reserve RPC, the edge calls the token-count endpoint on the
   identical request it will send (`client.messages.countTokens` with the same model, system,
   tools and messages). `estimated_input_tokens` is that count plus a fixed margin,
   `DISCOVERY_INPUT_MARGIN_TOKENS = 64`. The chars-divided-by-two heuristic and
   `prompt_overhead_tokens` are deleted. The output term stays `max_output_tokens` times the
   output price; the API bounds output at `max_tokens`, and on Claude Opus 5 thinking tokens
   count inside `max_tokens`, so the bound holds with adaptive thinking on. `overrun_micros`
   stays as a column and the reconciliation reports any row where it is positive as a problem,
   so an overrun is a visible defect and never a silent absorption. This resolves the judge's
   "do not take from C" line: the platform does not absorb an overrun quietly.
   The count call is one extra provider call per turn; at loop the stand-in answers it from the
   scripted turn's `inputTokens` when given, else a deterministic count.
3. **Uncertain outcomes are not released (from the turn ledger, B, and the judge).** The act
   step classifies a failed model call. A response with an HTTP status (4xx or 5xx, an SDK
   `APIError` with `status`) is definite: settle as `failed`, release the reservation. A
   timeout or a connection error with no status is uncertain: leave the turn `open` and answer
   502; the abandon path of the base (the next reserve on that project after
   `DISCOVERY_TURN_DEADLINE_SECONDS` settles it as `abandoned`, charged in full) is the
   resolution. The base's "a model failure settles the turn as failed" applies to definite
   failures only.
4. **Settled rows are immutable (from the turn ledger, B).** A trigger on `discovery_turns`
   refuses UPDATE of any row whose status is not `open`, and refuses DELETE always. The only
   permitted update moves `open` to `settled`, `failed` or `abandoned`.
5. **One read projection for the screen (from the conversation aggregate, D, and the judge's
   "take from D").** `discovery-conversation` returns `{ conversation: { projectId, turns,
   elicitation }, allowance }` where `allowance` comes from a new
   `public.viewer_discovery_allowance(p_organization_id uuid) returns jsonb`, SECURITY
   DEFINER, `search_path = ''`, revoked from `public`, granted to `authenticated`, refusing
   unless `viewer_is_org_member`, computing exactly what the allowance `read` computes and
   writing nothing, added to `VIEWER_FUNCTIONS` (constraint 18). `callerReads` gains
   `discoveryAllowance(organizationId)` as an RPC with the caller's JWT. The `discovery-allowance`
   write route is unchanged.
6. **The settings object shrinks.** `p_settings` carries `model`, `effort`, `max_output_tokens`,
   `min_output_tokens`, `message_max_chars`, `micros_per_credit`, `input_micros_per_token`,
   `output_micros_per_token`, `turn_deadline_seconds`. `prompt_overhead_tokens` is gone
   (correction 2). The definer validates each as before.
7. **The model client.** `supabase/functions/_shared/anthropic-messages.ts` stays Deno-only and
   constructs the SDK client lazily inside `create` and `countTokens`, never at module load or
   port construction, so the function boots without a key and every keyless integration
   refusal test runs (the judge's finding on C). The library is the founder's call at the gate
   below; the base's position, `npm:@anthropic-ai/sdk` with `maxRetries: 0`, is the
   recommendation, because the claude-api skill's rule for a TypeScript project is the official
   SDK unless raw HTTP is asked for, and `maxRetries: 0` is what keeps one reservation to one
   attempt. Model id `claude-opus-5`, no date suffix. Request: `max_tokens` from the
   reservation, `system`, `messages`, `tools: [RECORD_ELICITATION_TOOL]` with `strict: true`,
   `output_config: { effort }`, and `thinking` omitted (adaptive is the default on Opus 5).
   Prices are the list prices 5 and 25 dollars per million tokens, as the base pins.
8. **The ratio.** `DISCOVERY_MICROS_PER_CREDIT = 100_000` (ten cents a credit) stands as the
   provisional constant. Ten credits is one dollar of Opus a day unverified, thirty is three
   dollars vetted, which matches the architecture note's one to two dollars per scoped run.
   It is an `AT_CONFIG` pin under `req-004.discovery.micros_per_credit`, and the founder can
   move it without touching a test.
9. **The kill switch columns.** Keep the base's three columns on `organizations`
   (`discovery_disabled_at`, `discovery_disabled_by`, `discovery_disabled_reason`) with the
   whole-or-nothing check. The audit event `org_discovery_switched` keeps the history; the
   columns give the organisation dashboard the current state with no join.
10. **The raw `debit` action of `discovery-allowance` stays** (the conversation aggregate's
    position, D). It is the NGO profile suite's contract and no product code calls it. The
    reconciliation of AT-004.46 runs on organisations the suite provisions, where only turns and
    the reset move `spent`. Retiring the action means rewriting four NGO profile ids and is a
    "Not done here" line in the pull request, not work in this run.
11. **The thirty-eight later ids get an individual capability each** (the judge's finding on D
    applies to the base too). The mapping in the base's `z-later-runs.test.ts` paragraph is
    the declaration, with two refinements so a stranger lands on the right work: ids 41 to 45
    are this run's; ids 12 to 15 (free-phase guardrails) declare `discovery.guardrails`; 16 to
    19 `storage.reference-upload`; 20 to 22, 24, 25, 52, 58 to 60 `discovery.scope-output`;
    26 to 31, 50 `discovery.sensitivity-tiers`; 51 `triage.queue`; 32 to 36, 53 to 57
    `discovery.fit-decline`; 37 to 39 `discovery.regeneration`. The four new names are added
    only because no existing name fits (constraint 7).
12. **The grant scanner** (`noSupplementalGrantPathProblems`) checks that
    `apply_discovery_grant_mark` is called only with a `vetted` boolean argument derived from
    `org_vetting` or the `set_organization_vetting` inputs, never a caller-supplied number.
    The judge found the base's phrasing wrong against the real signature; the intent stands.

## Settled decisions, one line each

- Turn record: one row per turn in `discovery_turns`, user and assistant message on the row,
  reservation and settlement columns, check constraints recompute every ratio from the row's
  own prices. Spend equals the sum of `charged_credits` over settled free turns plus
  `reserved_credits` over open and abandoned free turns, per organisation and day, and
  `spendLedgerInvariantProblems` is that query.
- Rounding: `charged_credits = least(reserved_credits, ceil(actual_micros / micros_per_credit))`
  for free turns; a fuel turn charges zero credits. An underfunded turn is refused before it
  runs when the affordable output floor cannot be met (`min_output_tokens = 512`); otherwise
  `max_tokens` is lowered to what remains, which is a request setting that changes with the
  balance and never with funding.
- Funding seam: `projects.funded_at timestamptz`; `project_fuel_available_micros(project)`
  returns zero until the Stripe run; the pure twin is `billingTargetFor` and `fuelRouteAllowed`.
  Ids .04, .05, .06 green at loop, red at integration on `checkout.project-fuel, billing.funded-turn`;
  .48 green at both tiers (the stub proves the refusal and the untouched pool); .09 green at
  loop, red at integration on `checkout.project-fuel`.
- Send route: `discovery-message` promoted, `admits: ['ngo']`, request
  `{ organizationId, projectId, message }`; email refusal is one shape, 409 `email-unverified`
  from SQL with the `discoveryMessageAllowed` sentence.
- Conversation store: the turn rows are the conversation; resume is a tenant read through RLS;
  audit events carry no message body.
- Stand-in: `AnthropicMessagesSim` with `script` and `requests`, port answers `create` and
  `countTokens`; contract in `contracts.ts`, factory in `vendors.ts`; integration omits
  `vendors` and AT-004.10 is red there on `vendors.anthropic`.
- Kill switch: `set-organization-discovery`, `{ organizationId, enabled, reason }`, read under
  the organisation lock in reserve; audit kind `org_discovery_switched` in its own migration.
- Absence arms: the base's two, with correction 12.
- Red set, this run: loop all twenty green; integration green
  `01, 08, 11, 41, 42, 43, 44, 47, 48, 49`, red `02, 03a, 03b, 46` on `ui.discovery-surface`,
  `04, 05, 06` on `checkout.project-fuel, billing.funded-turn`, `09` on `checkout.project-fuel`,
  `10` on `vendors.anthropic`, `45` on `checkout.project-fuel`.

## Per-unit plan and lanes

| unit | lands | lane | why |
|---|---|---|---|
| 1 metering | `discovery_turns`, `discovery_turn_reserve`, `discovery_turn_settle`, `discovery_spend_release`, the immutability trigger, the promoted route with the frame's `settle` step, `discovery-metering.ts`, `discovery-turn.ts`, the SDK client (text replies only), the stand-in, the suite scaffold with all fifty-eight registrations and the expected file, the req-001 adapter update | hardest tasks, astra at medium | the writer designs the two-phase SQL body and the frame extension |
| 2 funded routing | `projects.funded_at`, the fuel stub, routing in reserve, `fuel-exhausted`, the fixture fuel map | feature, grok at xhigh | applies the fixed contract |
| 3 remedies | test bodies and `drainAllowance`; no product change unless the sentence needs one | feature, grok at xhigh | the sentence exists |
| 4 conversation | the system prompt, `RECORD_ELICITATION_TOOL`, `elicitation` handling in settle, `discovery-conversation` with `viewer_discovery_allowance`, the grant-tracker fixture and oracle with its selftest, resume | hardest tasks, astra at medium | the prompt and the oracle are design |
| 5 guardrails | the switch columns, `set-organization-discovery`, the audit kind pair of migrations, the two absence arms, the email test | feature, grok at xhigh | applies the fixed contract |
| 6 transparency | `spendLedgerInvariantProblems`, the zero-cost attach proof, the `f-transparency` body | feature, grok at xhigh | applies the fixed contract |

## Open decisions for the founder at the design gate

1. The model client library: the official SDK through `npm:@anthropic-ai/sdk` (recommended)
   or `fetch` against the Messages API.
2. Refusal fallbacks: the claude-api skill's default for Opus 5 code is the server-side
   `fallbacks: "default"` parameter, which re-runs a refused request on a fallback model
   inside the same call. For Discovery this means a turn can be served by a model other than
   the pinned one, and the turn row records `served_model`. Recommendation: off in this run,
   because AT-004.09 compares request settings and the run has no refusal case to design for;
   a "Not done here" line names it.

## Founder rulings at the design gate (2026-09-16, AskUserQuestion)

1. **The model client is the official SDK**, `npm:@anthropic-ai/sdk`, in the Deno-only file,
   built lazily inside the call, `maxRetries: 0`.
2. **Refusal fallbacks are on**: the request carries `betas: ['server-side-fallback-2026-07-01']`
   and `fallbacks: 'default'` on `client.beta.messages.create`, and the turn row's
   `served_model` records the model that answered. AT-004.09 compares the request settings the
   platform sends, which the fallback parameter does not change with funding.
3. **Skills aid Discovery as prompt files.** Unit 4 lands `supabase/functions/_shared/discovery-skills/`
   with one markdown file per skill and a loader that concatenates them into the system prompt
   behind a `cache_control` breakpoint. No code-execution container, no Skills API. The turn
   stays token-bounded, so the reservation holds.

## Correction 13, from the unit 1 writer's blocker (2026-09-16)

Correction 2 needs the conversation context before the reserve RPC, and the base's frame has
no step before its first RPC. The resolution:

- `WriteRouteSpec` gains an optional `prepare` member beside `settle`:
  `prepare: (caller: Caller, args: Args, reads: CallerReads) => Promise<WriteRouteDecision<Args>>`.
  `writeRoute` runs it after `decide` admits and before the first RPC. It reads with the
  caller's JWT through `callerReads` (RLS), never as the service role. For Discovery it loads
  the need (`need_intakes` through the existing read) and the settled turns of the project
  (`discovery_turns` through the new `discoveryTurnsOf`), builds the exact model request,
  calls `port.countTokens` on it, and returns the reserve args with `counted_input_tokens`,
  `counted_through_seq` (the highest settled `seq` the count included, or 0) and the built
  request carried to `settle.act`. A refusal from `prepare` answers like a `decide` refusal.
  A thrown provider error in `prepare` answers 502 with no RPC run and no turn row.
- `discovery_turn_reserve` takes `p_counted_through_seq` and refuses `P0001 stale-context`
  when the highest settled `seq` of the project differs from it, so the count and the
  generation always cover the same context. `stale-context` joins `WRITE_REFUSAL_KINDS`.
- The email floor stays in SQL at reserve. `prepare` runs before it, so a keyless or
  unverified caller's token count is one provider call that costs nothing at Anthropic; the
  unverified caller is then refused by reserve. This is accepted: the count endpoint is free,
  and the alternative, an email read in `prepare`, duplicates a SQL rule in TypeScript
  (constraint 29 asks for one shape).
- The keyless integration shape: a send with no key answers 502 from `prepare`, creates no
  turn row and moves no spend. Abandonment is proved through the operator seam:
  `reserveTurnAsOperator`, `backdateOpenTurnAsOperator`, then a second
  `reserveTurnAsOperator` on the project settles the first as `abandoned`. AT-004.49's
  integration body asserts both. The unit 1 brief's earlier sentence about an open
  reservation after a keyless send is withdrawn.
