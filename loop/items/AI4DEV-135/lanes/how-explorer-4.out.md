I have the harness, expected-state file, AT text, and chat page. The rest of this is a structured map of how those pieces meet a turn.

### Components Found

- **`atTest` / `bindSuite`** — `tests/at/harness/registry.ts` (`bindSuite` at 1005–1037; `atTest` at 861–920). Registers one AT id once, binds this suite to `requirement: 'req-004'` and `sut: 'discovery'`, and runs one body per process-wide `AT_TIER`. Surface defaults to `'backend'` unless `{ surface: 'ui' }` is passed.
- **`DiscoverySut`** — `tests/at/suites/req-004/_contract.ts` (lines 18–38). The only seam tests may call: provision, send, reserve/settle, read conversation, funding, switch, seed turns. Extends `NeedsSut`.
- **`DiscoveryMessageOutcome` / `DiscoveryMessageRequest`** — `_contract.ts` lines 6–10. Send answer is `{ ok: true, turn, reply, elicitation, allowance }` or a `WriteRefusal`.
- **`createFixtureAdapter`** — `_fixture.ts` `createFixtureAdapter` (from line 23). Loop-tier in-memory world: in-process `reserve`/`settle`, Anthropic stand-in, then `discoveryPrepare` → `reserve` → `discoveryAct` → `settle`.
- **`createLiveAdapter`** — `_live.ts` `createLiveAdapter` (from line 13). Integration-tier adapter: `functionPost('discovery-message', …)` (JSON, no SSE), `functionPostRaw('discovery-conversation', …)`, SQL for operator RPCs.
- **`AWAITED` / `awaiting` / `notYet`** — `_pending.ts`. Named capability strings later units must land. `awaiting(name)` throws `CapabilityPending([name])`. `notYet(id)` is unused in this suite.
- **`AT_CONFIG` / `AtConfigEntry`** — `tests/at/harness/atconfig.ts`. Single pin table: `{ name, value, unit, source, provisional? }`. `value: null` must fail, not guess.
- **`CONFIG_KEYS` / `createConfigRegistry`** — `tests/at/harness/config.ts`. Maps dotted keys such as `req-004.discovery.micros_per_credit` onto `AT_CONFIG` identifiers. Tests read `h.config.get(key)`, never a literal pin.
- **`ExpectedManifest` / `TierExpectation` / `RedDeclaration`** — `tests/at/harness/expected.ts` lines 46–59. `tests/at/expected/req-004.json` is the machine-checked green/red contract for `--expect`.
- **`CapabilityPending`** — `tests/at/harness/pending.ts` lines 14–19. Message `CAPABILITY PENDING — <names joined by ", ">`. Expected reds rebuild `CapabilityPending: CAPABILITY PENDING — …` exactly (`declaredDetail`, `expected.ts` 286–290).
- **`GRANT_TRACKER` / `grantTrackerOracleProblems`** — `tests/at/suites/req-004/fixtures/grant-tracker.ts` and `grant-tracker.oracle.ts`. Handwritten 6-turn intake fixture plus a semantic oracle over the last `elicitation`.
- **`DiscoveryChatPage` / `DiscoveryChat`** — `src/routes/discovery/$organizationId.$projectId.tsx`. TanStack file route `/discovery/$organizationId/$projectId` (`ssr: false`). Loads history, then drives `useChat`.
- **`DefaultChatTransport` + `useChat`** — same file, `DiscoveryChat` (transport 212–235, hook 237–266). POSTs `discovery-message` as SSE; seeds messages from `discovery-conversation`.
- **Helpers in `src/lib/discovery-chat.ts`** — `parseConversationBody`, `messagesFromTurns`, `refusalFromResponseText`, `pollUntilTurnSettled`, `isAllowance`, `isDiscoveryTurn`. Frontend `DiscoveryTurn` is a four-field subset of server `DiscoveryTurnView`.
- **`DiscoveryConversationView`** — `supabase/functions/_shared/discovery-turn.ts` line 162: `{ projectId, turns, elicitation }`. The page never reads `elicitation`.
- **Cause labels on the need (not Discovery chat)** — `tests/at/suites/req-003/c-labels.test.ts` AT-003.17: a draft need has `causeLabels: []` and stays empty across save. Vocabulary generation is AT-004.58–60, still pending.

### Flow

**Harness: one AT id from authoring to `--expect`**

1. Suite `_bind.ts` calls `bindSuite({ requirement: 'req-004', sut: 'discovery' })` and re-exports `atTest`.
2. Each `atTest('AT-004.NN', title, opts?, bodies)` in `*.test.ts` registers the id (`registry.ts` 906–910). Default surface is `'backend'`. UI-relevant ids pass `{ surface: 'ui' }`.
3. `bun run at:verify req-004 --tier <loop|integration> --expect` sets `AT_TIER`, loads the suite, and chooses `bodies[tier] ?? bodies.default` (`chooseTierBody`, 768–771).
4. `open()` builds a harness (`tests/at/harness/index.ts` `createHarness`):
   - **loop:** `ControlledClock` + Anthropic/email stand-ins + `createFixtureAdapter`.
   - **integration:** live stack + `createLiveAdapter`; vendor sims are `refusing('vendors.anthropic')`.
5. The body talks only to `DiscoverySut`. A loop send is `_fixture.ts` `sendMessage` (201–233): `writePipeline(SEND_SPEC)` → `discoveryPrepare` → in-memory `reserve` → `discoveryAct` → `settle`. An integration send is `_live.ts` 67–72: JSON `POST /functions/v1/discovery-message` via `functionPost` (no `Accept: text/event-stream`).
6. Pending ids throw `CapabilityPending`. `--expect` compares the vitest report to `tests/at/expected/req-004.json`. A declared red that turns green fails. A capability-pending red must match the rebuilt first line exactly.

**`d-conversation.test.ts` as the loop vs integration model**

- **AT-004.10 (loop):** provision NGO + platform admin, vet, `startDiscoveryNeed` (start + submit), `h.vendors.anthropic.script(GRANT_TRACKER.replies)`, send all six NGO messages, assert 5–10 settled turns, last elicitation passes `grantTrackerOracleProblems`, Anthropic requests grow by two messages each turn, system prompt includes intake and caches block 0 only, model is `DISCOVERY_REQUEST_SETTINGS.model`, conversation read’s elicitation equals last turn. **integration:** `{ default: …, integration: awaiting(AWAITED.anthropicLive) }` → red `vendors.anthropic`.
- **AT-004.11 (loop):** three scripted sends, `returnNextDay` (rewrite spend rows, `signInAgain`, `readConversation`), then a fourth send; last Anthropic request’s prior messages equal the six user/assistant pairs. **integration:** `seedTurnsAsOperator` instead of the model, then `reserveTurnAsOperator` and assert `reservation.context` (settle `failed` in `finally`). Same criterion, different procedure.

**Metering / UI-marked ids (pattern for later screen re-run)**

- Loop bodies drive `sut.sendMessage` through the Anthropic sim (`loopDrive`).
- Integration bodies prove the same oracles through `reserveTurnAsOperator`/`settleTurnAsOperator` (`operatorDrive`), then **throw** `CapabilityPending(['ui.discovery-surface'])` for AT-004.02, .03a, .03b, .46. Backend proof runs; the UI half is still declared red.

**Front end: load, send, stream, refuse, stop**

1. Route `createFileRoute("/discovery/$organizationId/$projectId")` (`$organizationId.$projectId.tsx` 24–27). Generated path `/discovery/$organizationId/$projectId` (`src/routeTree.gen.ts` 20–25).
2. `onAuthStateChange` → `signed-in` / `signed-out`. Signed-out renders `SignInForm` (`signInWithPassword`).
3. Signed-in: `readConversation(projectId)` POSTs `{ projectId }` to `…/functions/v1/discovery-conversation` with `Authorization: Bearer <access_token>`, `apikey`, `Content-Type: application/json` (57–77). `parseConversationBody` requires `ok === true` and an array of `isDiscoveryTurn` rows; a bad allowance becomes `null`, not a failed read.
4. `DiscoveryChat` seeds `useChat({ messages: messagesFromTurns(turns) })`. Each settled turn becomes `{id: `${turn.id}:user`}` plus an assistant message only if `assistantMessage` is a non-empty string. Open/null assistant → user only.
5. Send: `DefaultChatTransport` POSTs `discovery-message`. Headers add Bearer, apikey, `Accept: text/event-stream`. `prepareSendMessagesRequest` walks messages from the end, takes the last user `text` part, body `{ organizationId, projectId, message }` (225–232).
6. Stream: `textOf` concatenates `part.type === "text"` only. User text renders as `<p>`; assistant text as `<Markdown>{text}</Markdown>` (react-markdown, no plugins, no `urlTransform`, no `allowedElements`). Empty user messages are skipped; empty assistant still emits an empty `<li>`.
7. `onData` (240–249): if `part.type !== "data-turn"` **return**. Otherwise, if `data.allowance` passes `isAllowance`, `setAllowance`. If `data.turn` passes `isDiscoveryTurn` and `seq` is newer, update `knownMaxSeqRef`. **Any other `data-*` part is a no-op.** Non-text parts are never rendered.
8. JSON 4xx before stream bytes: `onError` → if `error.message` parses as JSON with `reason`, `refusalFromResponseText`, restore the last user message into the draft, drop it from `messages`. Else show the raw error and `pollUntilTurnSettled`.
9. Stop: `stop()` then poll `discovery-conversation` every 500 ms up to 20 s until a turn with `seq > knownMaxSeq` is not `open`. Outcomes: replace messages from the read; or notices “still settling” / “did not reach Discovery”.

**Where scope and cause labels would attach (they do not exist yet)**

- Placeholder ids AT-004.20, .21, .22, .24, .25, .52, .58, .59, .60 all `awaiting(AWAITED.scopeOutput)` i.e. capability `discovery.scope-output` (`z-later-runs.test.ts` 12–16, 33, 39–41).
- Server conversation already has a second structured field: `elicitation` (`discovery-turn.ts` 162, 177–178). The page ignores it. A scope object would likely sit beside `elicitation` on the conversation body and/or as a new `data-*` stream part. Today an unknown data part is dropped by `onData` and by `textOf`.
- Cause labels today: need draft `causeLabels: []` (AT-003.17). AT-004.58–60 (reuse / invent / delete-only) are the same `discovery.scope-output` pending bucket. Architecture notes REQ-004 do **not** mention cause labels; AT-004.20 and .58–60 (d90) do.
- Turn ceiling / regeneration: AT-004.12–15 await `discovery.guardrails`; AT-004.37–39 await `discovery.regeneration`. **No at-config pin** for conversation turn ceiling or the 3× regeneration bound. `discoveryTurnDeadlineSeconds` (150) is the **open-turn** timeout, not the conversation ceiling. `MAX_CONVERSATION_TURNS = 10` in `d-conversation.test.ts` is a local AT-004.10 bound, not the platform ceiling.

### Files Read

- `tests/at/suites/req-004/_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, `_source-absences.ts`, `_source-pins.ts`, `_bind.ts`
- `tests/at/suites/req-004/z-later-runs.test.ts`, `d-conversation.test.ts`, `a-metering.test.ts`, `b-funded-routing.test.ts`, `c-remedies.test.ts`, `e-guardrails.test.ts`, `f-transparency.test.ts`
- `tests/at/suites/req-004/fixtures/grant-tracker.ts`, `grant-tracker.oracle.ts`, `record-grant-tracker.ts`
- `tests/at/expected/req-004.json`
- `tests/at/harness/atconfig.ts`, `config.ts`, `registry.ts`, `expected.ts`, `pending.ts`, `check.ts`, `index.ts`, `suite-adapters.ts`, `discovery-chat.selftest.ts`, `live-stack.ts` (functionPost)
- `tests/at/suites/req-003/c-labels.test.ts`
- `loop/bringup/AI4DEV-3-at-harness.md`
- `.taskmaster/docs/acceptance/at-req-004.md`
- `.taskmaster/docs/architecture-notes.md` (REQ-004 block)
- `src/routes/discovery/$organizationId.$projectId.tsx`, `src/lib/discovery-chat.ts`, `src/lib/supabase.ts`, `src/router.tsx`, `src/routeTree.gen.ts`, `src/routes/__root.tsx`, `src/routes/index.tsx`
- `supabase/functions/_shared/discovery-turn.ts` (types + `conversationAnswer` / `renderDiscoveryMessage`)
- `package.json` (dependency versions, via search)

### Boundaries

**In (harness)**

- Acceptance P0 ids from `.taskmaster/docs/acceptance/at-req-004.md` (parser: `AT-004.<n> (P0)` in `check.ts` 48–59). Retired ids .07, .23, .40 are not P0 and are not registered.
- Pins from `AT_CONFIG` via dotted keys in `CONFIG_KEYS`.
- Loop: Anthropic stand-in scripts. Integration: live edge + SQL; Anthropic live is still pending for AT-004.10.
- Fixture worlds from req-003 (`createNeedsAdapter`).

**Out (harness)**

- Per-id green/red vs `tests/at/expected/req-004.json`.
- Bijection: every P0 id ↔ exactly one `atTest(` call site.

**In (front end)**

- Session token from `getSupabase().auth`.
- `POST discovery-conversation { projectId }` → `{ ok, conversation.turns, allowance }`.
- `POST discovery-message { organizationId, projectId, message }` with SSE, or JSON `{ ok: false, kind, reason }`.

**Out (front end)**

- Credit line from allowance state (`remaining of dailyGrant`, vetted flag). **No per-turn cost.**
- Message list: user `<p>`, assistant `react-markdown`.
- Refusal `reason` (+ `kind` in small type).
- Stop/error poll notices.

**Does not connect yet**

- Scope document, cause-label vocabulary UI, guardrail notices, regeneration, sensitivity tiers, fit-decline, reference upload, fuel checkout UI.
- AT suite never sets `Accept: text/event-stream`; streaming is untested by req-004.
- `surface: 'ui'` ids still throw `ui.discovery-surface` at integration; there is no screen driver.

### Placeholder ids (`z-later-runs.test.ts`)

`awaiting(...)` uses `{ default: … }`, so **every tier** is the same pending throw.

| AT id | AWAITED key | capability string |
|---|---|---|
| AT-004.12, .13, .14, .15 | `guardrails` | `discovery.guardrails` |
| AT-004.16, .17, .18, .19 | `referenceUpload` | `storage.reference-upload` |
| AT-004.20, .21, .22, .24, .25, .52, .58, .59, .60 | `scopeOutput` | `discovery.scope-output` |
| AT-004.26–.31, .50 | `sensitivityTiers` | `discovery.sensitivity-tiers` |
| AT-004.32–.36, .53–.57 | `fitDecline` | `discovery.fit-decline` |
| AT-004.37, .38, .39 | `regeneration` | `discovery.regeneration` |
| AT-004.51 | `triageQueue` | `triage.queue` |

**Not in this file:** AT-004.23 (retired to REQ-005.5). `AWAITED.publishFlow` (`publish.flow`) is defined and unused. `notYet()` is unused.

**Other honest reds (real bodies, then pending):**

- Loop green / integration red: AT-004.02, .03a, .03b, .46 → `ui.discovery-surface` (after backend proof); AT-004.04–.06 → `checkout.project-fuel` + `billing.funded-turn`; AT-004.09, .45 → `checkout.project-fuel`; AT-004.10 → `vendors.anthropic`.
- Live adapter: `setProjectFundingAsOperator` with `fuelMicros > 0` throws `checkout.project-fuel` (`_live.ts` 123–124).

### `tests/at/expected/req-004.json` shape

```json
{ "requirement": "004", "tiers": { "loop": { "green": [...], "red": { "AT-004.NN": { "kind": "capability-pending", "capabilities": ["…"] } } }, "integration": { "green": [...], "red": { … } } } }
```

- No `drill` tier. `--tier drill --expect` would fail “no declaration for the drill tier”.
- **Loop green (19):** .01, .02, .03a, .03b, .04, .05, .06, .08, .09, .10, .11, .41–.49.
- **Integration green (10):** .01, .08, .11, .41, .42, .43, .44, .47, .48, .49.
- Red `kind` is only `capability-pending`. A green that is still red, or a red that went green, fails `--expect`.
- `requirement` must equal `"004"` (copy/paste guard in `parseExpectedManifest`).

### How a pin is registered

1. Add an `AtConfigEntry` on `AT_CONFIG` in `atconfig.ts` with `name`, `value`, `unit`, `source` (and `provisional: true` if unsettled). Source is mandatory.
2. Map a dotted key in `CONFIG_KEYS` (`config.ts` 31–37 for Discovery). Suites must not import `AT_CONFIG` identifiers except `_source-pins.ts`, which asserts product constants equal the registry.
3. Tests call `h.config.get<number>('req-004.discovery.…')`. Unknown key or `value: null` throws.

Discovery pins (all sourced to AI4DEV-132 design notes, none provisional):

| dotted key | AT_CONFIG | value |
|---|---|---|
| `req-004.discovery.micros_per_credit` | `discoveryMicrosPerCredit` | 100000 micros/credit |
| `req-004.discovery.input_micros_per_token` | `discoveryInputMicrosPerToken` | 5 |
| `req-004.discovery.output_micros_per_token` | `discoveryOutputMicrosPerToken` | 25 |
| `req-004.discovery.max_output_tokens` | `discoveryMaxOutputTokens` | 4096 |
| `req-004.discovery.min_output_tokens` | `discoveryMinOutputTokens` | 512 |
| `req-004.discovery.turn_deadline_seconds` | `discoveryTurnDeadlineSeconds` | 150 |

Daily grants 10/30 are `req-002.discovery.daily_credits.*`. **No pin** for conversation turn ceiling or regeneration count.

### Suite-authoring rules (summary of `loop/bringup/AI4DEV-3-at-harness.md` 121–158)

Founder-ratified 2026-07-29 after the REQ-016 audit; bind every suite from then on:

1. **Capture once, assert many.** Freeze a snapshot; later ids project it; do not re-fire.
2. **Generic self-checks live in the harness once**, with conformance tests. Domain checks stay in the suite.
3. **Fresh world only when state demands it.** Register each P0 id once; loop the oracle matrix inside the test.
4. **Must-keeps:** sole-writer proof keeps domain firings; oracle logic gets its own unit tests.
5. **Shared contract, thin adapters.** `_contract.ts` is requirement-specific SUT only.

Earlier in the same file (98–119): tests interact **only** through a driver the harness supplies (fixture now, screen later); `surface` lives on `atTest`, not in the acceptance markdown; `--wired` selects `surface: 'ui'`.

### AT-004 entries (verbatim from `.taskmaster/docs/acceptance/at-req-004.md`)

- **AT-004.12 (P0)** — Given free-credit Discovery, When the NGO asks an unrelated task (general Q&A, document drafting, translation, coding help), Then the agent declines/redirects to scoping.
- **AT-004.13 (P0)** — Given repeated off-topic requests on free credits, When the pattern continues, Then a plain notice is shown and the conversation is flagged for founder visibility — and the NGO is never locked out.
- **AT-004.14 (P0)** — Given a free conversation reaching the bounded per-conversation turn ceiling, When the ceiling is passed, Then Discovery wraps up: it generates the scope or directs the NGO to start a fresh Discovery.
- **AT-004.15 (P0)** — Given a funded project's Discovery, When the NGO goes off-topic AND continues past the free turn ceiling AND repeats off-topic requests, Then no free-scope redirect, turn-ceiling wrap-up, notice, or founder flag occurs — only the per-turn cost display and fuel gauge apply. [cx r2: exercises the full "funded = no guardrail" clause, not one off-topic turn]
- **AT-004.20 (P0)** — Given a completed Discovery, When the scope is generated, Then it contains ALL of: a summary; user stories with nested acceptance criteria; a suggested stack; a complexity tier (small/medium/large); risk flags; a data-sensitivity tier; a maintainability-fit verdict; zero to three cause labels; a Lovable recommendation with rationale; and the Lovable-vs-Claude-Code build split. [d90: cause labels added to the enumerated contract — see AT-004.58-60 for generation behavior]
- **AT-004.21 (P0)** — Given any Discovery output or rendered scope doc, When inspected, Then no project/build-cost estimate appears and the complexity tier is never expressed in money — the mandated ~$25/mo Lovable maintenance figure and per-turn costs are permitted. [cx: narrowed — was "no dollar anywhere", which contradicted the required maintenance figure]
- **AT-004.22 (P0)** — Given every generated scope, When inspected, Then both parts of the build split are present (which parts are built in Lovable and which are coded through Claude Code) — v1 always emits both.
- **AT-004.24 (P0)** — Given a scoped project, When the INITIAL automated build backlog is decomposed [cross: REQ-026/036], Then it derives from the passing dev-authored PRD and no task decomposes Discovery output directly (later volunteer-added sub-issues / accepted scope-additions are exempt). [cx r2: scoped to initial decomposition — later sub-issues are allowed by REQ-026]
- **AT-004.25 (P0)** — Given rendered scope docs across Tier 0, Tier 1, and Tier 2 fixtures, When read by the NGO, Then each plainly explains its assigned data tier (Tier-2 additionally renders fixtures-only handling), the complexity tier with rationale + start-small advice, maintenance expectations (chat-evolve, ~$25/mo paid directly, NGO owns the code), and links Lovable pricing where recommended. [cx r2: parameterized across all tiers, not Tier-2 only]
- **AT-004.37 (P0)** — Given a generated scope the NGO rejects, When they regenerate, Then regeneration works a bounded number of times, each with a logged reason, and costs zero credits.
- **AT-004.38 (P0)** — Given the regeneration bound is exhausted, When the NGO tries again, Then the case escalates to an admin instead of regenerating.
- **AT-004.39 (P0)** — Given a system-error mid-turn, When the turn is retried, Then the retry costs zero credits.
- **AT-004.52 (P0)** — Given a completed Discovery, When PRD authoring and the completion scorer run [cross: REQ-036], Then the Discovery scope is the source supplied to PRD authoring AND the reference the scorer compares the PRD against. [cx r2: covers "scope contract = PRD source + scorer gate reference", not just downstream lineage]
- **AT-004.58 (P0)** — Given a shared vocabulary already containing a cause label (fixture: "food security") and a new Discovery conversation whose problem description clearly matches that same domain, When the scope generates, Then the emitted cause label REUSES the existing "food security" label rather than inventing a synonymous new one (e.g. "hunger relief" or "food banks") — generation normalizes against the existing vocabulary, it does not invent freely per project. [d90]
- **AT-004.59 (P0)** — Given a Discovery conversation describing a domain with no matching existing label, When the scope generates, Then a new cause label is added to the shared vocabulary — the vocabulary grows only for genuinely new domains; and Given a conversation too thin to support a confident label, When the scope generates, Then zero cause labels are emitted — generation may legitimately produce none, causes are never a required output. [d90]
- **AT-004.60 (P0)** — Given a scoped project carrying Discovery-generated cause labels, When the NGO removes one, Then it is removed; When the NGO or any other account attempts to type, create, or curate a cause label through any supported UI/API, Then no such control or endpoint exists anywhere in the product — there is no admin taxonomy-management surface either. Correction is deletion-only; invention stays machine-owned. [d90]

### Architecture notes REQ-004 (verbatim relevant bullets)

From `.taskmaster/docs/architecture-notes.md` 135–141:

- **Charging formula:** per-turn cost is conversation-weighted; cached content heavily discounted; regenerations + system-error retries cost zero credits. `[intent]`
- System-prompt tuning to extract technical scope from non-technical NGOs.
- Model: **Claude Opus**; ~$1–2 per scoped run; 5–10 structured turns.
- Free-phase guardrail mechanics: a system-prompt scope line; a **deterministic per-conversation turn ceiling** (platform-configurable, pilot-tuned) → wrap-up; repeated-off-topic decline counter → founder-visibility flag.
- Scope regenerable up to **3×** (reason logged) then admin escalation.
- Transparency UI: credit gauge ("Discovery credits: 7 of 10 today") + per-turn cost.

**Cause labels:** not mentioned in this section. **Scope field list:** not mentioned (only “extract technical scope” and regeneration). The enumerated scope contract and 0–3 cause labels live in AT-004.20 / .58–60, not here.

### Front end: stream parts and markdown

**Wired routes**

| Client | Edge function | Body | Headers |
|---|---|---|---|
| `readConversation` | `discovery-conversation` | `{ projectId }` | Bearer, apikey, `Content-Type: application/json` |
| `useChat` transport | `discovery-message` | `{ organizationId, projectId, message }` (last user text) | Bearer, apikey, `Accept: text/event-stream` |

**Rendered stream parts:** only `type === "text"` via `textOf`. Assistant: `<Markdown>{text}</Markdown>` (`react-markdown` ^10.1.0, default CommonMark, no `remark-gfm`, no component map). User: raw `<p>`.

**Unknown data part:** `onData` returns if `part.type !== "data-turn"`. Render ignores non-text. A future `data-scope` (or any `data-*` other than `data-turn`) would not update state and would not appear unless this handler and the list are extended. `data-turn.data` is treated as `{ allowance?, turn? }`; other fields (including `elicitation`, `reply`) are unused.

Self-tests of the helpers: `tests/at/harness/discovery-chat.selftest.ts` (messagesFromTurns, parseConversationBody, refusal, poll). **No test** of `onData`, markdown, or unknown data parts.

### Non-Obvious Things

- **JSON vs SSE split.** AT `sendMessage` is JSON (`functionPost` without `Accept: text/event-stream`). The page is SSE. Streaming, abort, and `data-turn` are outside the req-004 suite.
- **UI-marked tests still pass loop on the backend seam.** `{ surface: 'ui' }` only selects `--wired`. Integration still throws `ui.discovery-surface` after the operator/backend proof. The chat page exists; the screen driver does not.
- **Credit line vs AT-004.46 / architecture.** Page shows `{remaining} of {dailyGrant} credits today` plus vetted. Architecture and AT-004.46 also require **per-turn cost**. `DiscoveryTurn` on the client has no `chargedCredits`. Conversation JSON includes it; the page drops it.
- **Elicitation is already a second structured output.** Server conversation and `data-turn` carry `elicitation`. The page never displays it. Scope would be a *third* structured object unless it reuses that slot.
- **`discoveryTurnDeadlineSeconds` ≠ turn ceiling.** 150 s is the in-flight open-turn deadline (AT-004.49 abandon path). Conversation wrap-up ceiling (AT-004.14) is unpinned and pending `discovery.guardrails`.
- **Architecture 3× regeneration is unpinned.** AT-004.37–38 await `discovery.regeneration`; `AT_CONFIG` has no regeneration count.
- **AT-004.23 is retired, not pending.** Auto `discovery_in_progress → scoped` moved to REQ-005.5. Do not add it to `z-later-runs`.
- **Cause labels are empty on the need until Discovery writes them.** AT-003.17 locks the draft at `[]`. Invention is machine-owned (AT-004.60); the chat page has no label UI.
- **`GRANT_TRACKER.source` is `'handwritten'`.** `record-grant-tracker.ts` can overwrite it from a live Anthropic run; AT-004.10 currently scripts the handwritten replies, not a live model (integration awaits `vendors.anthropic`).
- **Malformed allowance on the conversation read becomes `allowance: null`**, which the page shows as “allowance unavailable”, not a failed load (`parseConversationBody` 121–132 in the selftest).
- **`react-markdown` is unsanitized.** Review notes in other items flag default link rendering; the page passes no `urlTransform`.
- **Expected-manifest `requirement` is `"004"`** without `req-` prefix; the file is `req-004.json`.

### Open Questions

- I did not read `@ai-sdk/react` `processUIMessageStream`. I cannot confirm whether an unknown `data-*` part is stored on `UIMessage.parts` or discarded before `onData`. The page’s own code ignores it either way.
- I did not trace how a future scope document would be persisted (new column vs JSON on the turn vs a sibling of `elicitation`). The harness only names capability `discovery.scope-output`.
- I did not find a shared cause-label vocabulary table or API in this slice. AT-004.58’s “food security” fixture is specified in the AT text only.
- I could not determine whether `--wired` has any driver that can open `/discovery/:organizationId/:projectId` today; the integration red `ui.discovery-surface` says it does not.
- Drill-tier behavior for req-004 is undeclared in the expected manifest; I did not trace what `createHarness({ tier: 'drill' })` would load.