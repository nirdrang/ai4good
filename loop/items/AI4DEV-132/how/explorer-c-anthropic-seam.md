The brief is partly stale on the judge. Live product code never calls Anthropic; the parked H4 judge is dead text; UTC-day tests backdate ledger rows instead of advancing the clock.

### Components Found

| Name | Path | What it does |
|---|---|---|
| `createEmailProviderSim` / `EmailProviderStandIn` | `tests/at/harness/vendors.ts` | One object, two faces: test-facing `sim` (`rejectNext`, `acceptButLoseAck`, `attempts`, `accepted`) and SUT-facing `port.deliver` that returns `'accepted' \| 'rejected' \| 'no_ack'`. |
| `Vendors` / `EmailProviderSim` | `tests/at/harness/contracts.ts` 154–156, 138–152 | Shared vendor contract. Only `email` exists. Lines 14–17: Anthropic usage/cost, Stripe, GitHub, Lovable, Linear “are each built with the FIRST test suite that consumes them”. |
| `AtHarness` / `TierHarness` | `tests/at/harness/contracts.ts` 189–227 | Loop harness has `clock` with `freezeAt`/`advance` and `vendors`. Integration drops `vendors` and replaces `clock` with `RealClock.now()` only. |
| `ControlledClock` / `RealClock` | `tests/at/harness/clock.ts` | Loop clock starts at `2026-01-01T00:00:00.000Z`. Integration clock is wall time; no command methods. |
| `FixtureWorld` / `FixtureWorldStore` | `tests/at/harness/fixtures.ts` | Isolated cloneable fixture worlds (NGO, actors, 10 lifecycle projects, ledger, blockers, threads). |
| `createSentinels` | `tests/at/harness/sentinels.ts` | Plant/scan markers. Unknown scope refuses; empty array means searched-and-absent. |
| `createFaults` | `tests/at/harness/faults.ts` | Arm named product points (`crash`/`reject`/`lose_ack`); `triggerCount` is reach-count, not arm-count. |
| `createHarness` | `tests/at/harness/index.ts` 190–250 | Loop: `ControlledClock` + `createEmailProviderSim`, loads `_fixture.ts`. Integration: `RealClock`, `vendors` is `refusing('vendors.email')`, loads `_live.ts`. |
| `CapabilityPending` / `AtPending` | `tests/at/harness/pending.ts` | Two red kinds. `capability-pending` is the declared-red shape for missing surfaces. |
| `atTest` / `Surface` | `tests/at/harness/registry.ts` 58–70, 861–908 | Registers one P0 id. Default `surface` is `'backend'`. `surface: 'ui'` is the `--wired` marker. |
| `childEnv` | `tests/at/harness/local-stack.ts` 76–123 | Allowlist. Drops `ANTHROPIC_API_KEY`, `AT_JUDGE_API_KEY`, service-role keys. Children launch with `--no-env-file`. |
| `requireEnv` / `edgeHandler` / `writeRoute` | `supabase/functions/_shared/edge.ts` | Only Deno I/O module. Secrets via `Deno.env.get`. No npm import. |
| `WRITE_ROUTES['discovery-message']` | `supabase/functions/_shared/write-routes.ts` 67–73 | Stand-in row already: `kind: 'stand-in'`, reason “REQ-002/004 owns the Discovery route”. No function folder. |
| `discoveryMessageAllowed` | `supabase/functions/_shared/verification.ts` | Email-verification floor. Comment: no deployed Discovery caller yet. |
| `discovery-allowance` function | `supabase/functions/discovery-allowance/index.ts` | Ledger only. Header: “creates no conversation, no agent response and no funded turn”. |
| `writeSpendRowAsOperator` | `tests/at/suites/req-002/_fixture.ts` 834–838 and `_live.ts` 616–635 | How UTC-day rollover is simulated: backdate a spend row and delete today’s row. Not `clock.advance`. |
| Parked `createSemanticOracle` | `loop/parked/v1/tests/at/harness/oracles.ts` | Dead H4 judge. Not compiled, not imported. `judge(rubric, material) → SemanticVerdict`. |
| `@anthropic-ai/sdk` | `package.json` 76 | **devDependency** leftover from parked H4. No live import. |

Live `tests/at/harness/` has **no** `oracles.ts`. `createHarness` never mounts an oracle. Grep of live `tests/at/**/*.ts` for `SemanticOracle` / `createSemanticOracle` / `oracles.judge` is empty.

---

### Flow

**1. Does anything call Anthropic today?**

No live product path. `src/` and `supabase/` have zero matches for `anthropic`, `@anthropic-ai`, `messages.create`, `x-api-key`.

The only `messages.create` in the tree is parked:

```813:822:loop/parked/v1/tests/at/harness/oracles.ts
      const message = await client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: request.messages,
        output_config: { effort: request.effort, format: { type: 'json_schema', schema: request.outputSchema } },
      });
```

That file is dead text (`loop/parked/v1/README.md` 57–62). `x-api-key` has **no** hits outside this exploration prompt.

**2. Architecture notes pin for REQ-004** (`.taskmaster/docs/architecture-notes.md` 135–141)

- Model: **Claude Opus**. Cost intent ~$1–2 per scoped run. 5–10 structured turns.
- System-prompt tuning “to extract technical scope from non-technical NGOs”.
- Charging: conversation-weighted; cached content heavily discounted; regenerations + system-error retries cost zero. Marked `[intent]`.
- Free-phase guardrails: system-prompt scope line; **deterministic per-conversation turn ceiling** (platform-configurable, pilot-tuned) → wrap-up; repeated-off-topic counter → founder-visibility flag.
- Scope regenerable **up to 3×** (reason logged) then admin escalation.
- Transparency UI: `"Discovery credits: 7 of 10 today"` + per-turn cost.

What they do **not** pin: storage table for the conversation; how the edge function talks to the model (SDK vs `fetch`); model id string; SSE vs request/response; system-prompt text.

Related, not Discovery-specific: Cross-cutting A line 33 says metered AI audit events are **metadata only; request/response bodies are never persisted**. Decline-review in the PRD wants the **full Discovery conversation** on the admin ops item. Those two claims sit next to each other with no reconciliation in the notes.

Migration notes (`.taskmaster/docs/migration-nextjs-to-tanstack-VERIFIED.md` 103–106, 408, 692) propose:

- `POST {SUPABASE_FUNCTIONS_URL}/discovery-message/{conversationId}` as a Deno edge function streaming SSE.
- Alternate name `discovery-stream`.
- Chat UI at `src/routes/dashboard/ngo/projects/$id/discovery.tsx` via Lovable, consuming the stream.
- Old Next task “Create `src/lib/discovery/agent.ts` with Anthropic SDK client” is **moved into the edge function**.

**3. Email vendor stand-in, loop vs integration**

Loop (`index.ts` 227–231):

1. `createEmailProviderSim()`.
2. Adapter factory gets `{ vendors: { email: provider.port } }`.
3. Harness exposes `{ email: provider.sim }` to the test.

REQ-016 loop fixture (`tests/at/suites/req-016/_fixture.ts` 327–331) wraps the port as the product `ProviderPort`. Tests arm `h.vendors.email.rejectNext(1)` and read `attempts()` / `accepted()` as out-of-band evidence (`c-reliability-guard.test.ts` 169–288).

Integration (`index.ts` 241–249):

- `vendors` is a Proxy that throws `CapabilityPending(['vendors.email'])`.
- `TierHarness` **omits** `vendors`, so `h.vendors.email` is a **compile error** in an integration body.
- REQ-016 integration (`_integration.ts` 247–255) arms `h.faults.at('notifications.provider_send', 'reject')` instead, and witnesses via Mailpit.

Sentence that binds a new Anthropic stand-in (`contracts.ts` 14–17):

> the Anthropic usage/cost, Stripe, GitHub, Lovable and Linear stand-ins are each built with the FIRST test suite that consumes them (founder ruling, 2026-08-04) … their contracts land in this file when they do.

That named Anthropic stand-in is **usage/cost reporting** (board AI4DEV-38), not a Messages API. Discovery’s loop-tier model stand-in is a **new** seam. Do not treat filling AI4DEV-38 as this unit’s job unless the design says so.

**4. How a suite advances a UTC day (REQ-002 allowance ids)**

They do **not** call `h.clock.advance`. `clock.advance` / `freezeAt` appear only in REQ-001 session-expiry and REQ-016 anti-spam.

REQ-002 (`b-allowance.test.ts` 78–93, 164–322):

- Loop and integration share one procedure (`proveUtcReset`, `proveRolloverRemedy`).
- “Advance a day” = `writeSpendRowAsOperator` with `utcDay = previousUtcDay(today)`, which **deletes today’s row**.
- Loop (`_fixture.ts` 834–838): Map keyed by `(org, utcDay)` of `clock.now()`.
- Integration (`_live.ts` 616–635): SQL delete of `(clock_timestamp() at time zone 'utc')::date` then insert yesterday. Postgres `clock_timestamp()` is wall UTC. The test cannot jump midnight.
- Integration bodies pass `utcDayOf(Date.now())` and assert the product day equals the process day.

A Discovery suite that needs “next day” should copy this operator write, not invent a product clock.

**5. Semantic-oracle harness — parked, not live**

Brief line 150 (“The semantic-oracle harness is built”) is **false of this checkout**.

`loop/parked/v1/README.md` 57–62:

> No suite ever called it. The recording store was empty. The recorder never ran. … When one lands, a judge is a function that test imports with its own record-and-replay store, **not a member of the harness object**.

Parked API (dead, for design memory only):

- `createSemanticOracle({ transport, votes }).judge(rubric, material: Record<string,string>): Promise<SemanticVerdict>`
- Rubric = named binary (`semantic`) and numeric (`extraction`) criteria; majority over `k` votes from at-config.
- Loop = filesystem replay of SHA-256-keyed recordings. Miss is `OracleReplayMiss`, never live fallthrough.
- Integration = live `@anthropic-ai/sdk` with `AT_JUDGE_API_KEY` at send time. Missing key → `OracleUnavailable` naming a deferred credential-delivery boundary.
- Judge model pin: `JUDGE_MODEL = 'claude-opus-5'`, `JUDGE_EFFORT = 'low'` (provisional), `JUDGE_MAX_TOKENS = 4000`.
- Fixture-specific oracle = a `Rubric` plus `material` slots (intake text, generated scope). No example suite exists.

`.env.example` 25–28 still lists `AT_JUDGE_API_KEY=` and says nothing live reads it; the runner selftest plants it to prove the allowlist drops it.

**6. Deno / edge / secrets**

No `supabase/functions/deno.json` and no `import_map.json`. Edge functions use **relative imports only**. Shared decision modules (`accounts.ts`, `caller.ts`, `verification.ts`) state they cannot use `jsr:`/`npm:`/`Deno` because `tests/at` compiles them with `types: ["node"]`.

How an edge function would take an npm package on this stack:

- Put it in a **Deno-only** file tests never import (same split as `edge.ts`).
- Use an `npm:` specifier there, **or** `fetch('https://api.anthropic.com/...')`.
- Do **not** put `@anthropic-ai/sdk` in `_shared` decision modules. The existing package.json copy is a Node **devDependency** for the parked judge, not a Deno import.

Secrets: `requireEnv` → `Deno.env.get` (`edge.ts` 55–61). Names used today: `SUPABASE_URL`, `SUPABASE_ANON_KEY`/`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEY`. `[edge_runtime.secrets]` in `config.toml` is commented. `deno_version = 2`. The tree does **not** document Deno `--allow-*` flags; functions already `fetch` and `Deno.env.get`, so the Supabase edge runtime grants net+env in practice. I could not find a permission list in-repo.

`.env.example`: public values in tracked `.env`; **any secret** (named: Anthropic, Stripe, GitHub, Linear, Lovable, service-role) in git-ignored `.env.local`. No `ANTHROPIC_API_KEY=` line; only the comment class “provider API keys (Anthropic, …)”. `.gitignore` 39–41: `.env.local`, `.env.*.local`.

`bun run typecheck` (`tests/at/typecheck.ts`) covers app tsconfig, `tests/at`, and verify-drive scripts. **It does not type-check `supabase/functions/*/index.ts` or `edge.ts`.** Those are covered by serving them.

**7. verify-ai4good**

Drives the real local stack on the 44321 block: Auth, fourteen edge functions, Postgres over `DB_URL`, Mailpit. Four scripts: signup, vetting (includes allowance), need-intake, access-and-admin.

To add a Discovery route:

1. Folder `supabase/functions/<name>/index.ts` + `[functions.<name>] verify_jwt = true` in `config.toml`.
2. Register in `WRITE_ROUTES` (promote the existing `discovery-message` stand-in, or add a new name). Unregistered write paths fail `write-route-unregistered`.
3. Feature file under `.claude/skills/verify-ai4good/features/` and a row in `features/README.md`.
4. Either extend a drive script or add a fifth. SKILL.md lists the function groups; that list would need the new name.
5. Doctor checks: auth health, Mailpit identity, edge-runtime mount of **this** checkout.

**8. Scripts and CI**

| Script | What |
|---|---|
| `db:start` | `bunx supabase start --ignore-health-check` |
| `at:verify` | `bun tests/at/harness/runner.ts` |
| `at:check` | bijection: every P0 in `at-req-0NN.md` has exactly one `atTest('AT-…'` call site |
| `at:selftest` | vitest over `tests/at/harness/` |
| `typecheck` | three tsc projects, none of them edge entry points |

CI (`.github/workflows/ci.yml`): bun install, typecheck, `at:selftest`, `at:check` every suite, **`at:verify --tier loop --expect` only**. No `integration`. No `secrets:` block. No Anthropic env. `GH_TOKEN` is `github.token` for the ownership/reference guards.

CI **cannot** hold an Anthropic key today, and the child allowlist would drop it if a runner secret leaked into the parent. There is **no live precedent** for an integration-tier test that calls a real model. The parked judge’s design was: loop = recordings, integration = live with `AT_JUDGE_API_KEY` **parent-side only**, never in the Vitest child — and that path was never wired.

`--wired` (`runner.ts` 300–307) **refuses** with exit 3: “the screen driver does not exist yet”.

**9. Constraints on unit 4 (conversation)**

Must hold:

1. Agent runs **inside a Supabase edge function on Deno**. UI never calls Anthropic or the DB.
2. Promote or replace the existing `discovery-message` stand-in; register the write; add `[functions.*] verify_jwt`.
3. Shared `_shared` modules stay Node∩Deno: relative imports, no `Deno`, no `npm:`. Model I/O lives in a Deno-only file.
4. Secret in `.env.local` / function env, never a committed file. Name it in `.env.example` as an empty key if a new name is introduced.
5. Loop-tier Anthropic stand-in is **this suite’s** to build (`contracts.ts` first-consumer rule). Integration drops harness vendor control; prove against the real function + Mailpit-style live witness, or declare red.
6. Semantic judge is **not** on the harness. Parked README: the test imports a judge with its own record/replay store. AT-004.10’s fixture-specific oracle is new work.
7. Loop cannot call a real model in CI (no key, allowlist, loop-only CI). Loop must be deterministic against a stand-in or recordings.
8. Integration against the real model needs a local key; CI will not run that tier. If integration is declared green without a model, it must not require a network call, or it must be `capability-pending` until a credential path exists.
9. Conversation persist/resume is a product requirement (AT-004.11) with **no storage design** in architecture notes. Audit doctrine says bodies are not persisted; decline-review wants the full conversation. Design must pick a table (or equivalent) and say how it differs from the money-path audit event.
10. New suite: `tests/at/suites/req-004/`, one line in `AdapterModules` (`suite-adapters.ts` 108–113), `export const requirement = 'req-004' as const`, `tests/at/expected/req-004.json` authored **before** the first run, all 58 P0 ids registered via `atTest` (20 proved, 38 `awaiting(...)` with named capabilities). Reuse `ui.discovery-surface`, `checkout.project-fuel`, `billing.funded-turn` from REQ-002. `surface: 'ui'` only on ids a later wiring leaf will re-run; default is `'backend'`.
11. Bring the model-client choice (SDK `npm:` vs `fetch`) to the founder at the unit-4 gate. Architecture notes pin Opus and a system prompt, not a client.

---

### Files Read

- `loop/items/AI4DEV-132/brief.md`
- `.taskmaster/docs/architecture-notes.md` (REQ-004 + Cross-cutting A)
- `.taskmaster/docs/requirements/req-004.md`
- `.taskmaster/docs/acceptance/at-req-004.md`
- `.taskmaster/docs/migration-nextjs-to-tanstack-VERIFIED.md` (Discovery SSE lines)
- `loop/bringup/AI4DEV-3-at-harness.md`
- `loop/parked/v1/README.md`
- `loop/parked/v1/tests/at/harness/oracles.ts` (API + live transport)
- `loop/parked/v1/tests/at/harness/recordings/README.md`
- `tests/at/harness/contracts.ts`, `vendors.ts`, `vendors.selftest.ts`, `clock.ts`, `fixtures.ts`, `sentinels.ts`, `faults.ts`, `index.ts`, `pending.ts`, `registry.ts`, `suite-adapters.ts`, `local-stack.ts`, `runner.ts`, `runner.selftest.ts`, `check.ts`, `expected.ts`/`expected/README.md`, `atconfig.ts`, `typecheck.ts`, `write-route-scan.selftest.ts`
- `tests/at/suites/req-002/b-allowance.test.ts`, `_fixture.ts`, `_live.ts`, `_contract.ts`, `_pending.ts`
- `tests/at/suites/req-016/_fixture.ts`, `_integration.ts`
- `tests/at/expected/req-002.json`, `req-003.json`
- `supabase/config.toml`, `supabase/functions/_shared/edge.ts`, `write-routes.ts`, `accounts.ts`, `github.ts`, `verification.ts`, `notification-provider.ts`, `discovery-allowance/index.ts`, `complete-signup/index.ts`
- `package.json`, `.env.example`, `.gitignore`, `.github/workflows/ci.yml`
- `.claude/skills/verify-ai4good/SKILL.md`, `features/README.md`, `features/discovery-allowance.md`

---

### Boundaries

| In | Out |
|---|---|
| NGO JWT → edge function (`verify_jwt = true`) | JSON (or future SSE) to UI; never a browser Anthropic call |
| `discovery-allowance` debit/read | ledger remaining + grant; no conversation |
| Loop vendor `port.deliver` | product send path; test reads `sim.attempts()` |
| Integration | live SMTP/Mailpit or SQL; no `h.vendors` |
| `writeSpendRowAsOperator` | simulated next UTC day at both tiers |
| `.env.local` / `Deno.env.get` | function secrets; test children never inherit them |
| `atTest` call sites | `at:check` bijection; `--expect` matches `tests/at/expected/` |
| Parked H4 judge | **not** a boundary the live harness exposes |

Suite-authoring rules that bind a new REQ-004 suite (`loop/bringup/AI4DEV-3-at-harness.md` 121–158 plus Part A.8):

1. Capture once, assert many.
2. Generic self-checks live in the harness; domain oracles stay in the suite and need their own unit tests.
3. Fresh world only when state demands it; one `atTest` per P0 id.
4. Must-keeps: sole-writer firings; oracle logic unit-tested.
5. Shared contract, thin adapters. Vendor contracts land in `contracts.ts` with the first consumer.
6. Anthropic/Stripe/GitHub/Lovable/Linear stand-ins are not built ahead of a consumer.
7. `capability-pending` reds: `awaiting('name')` + matching `tests/at/expected/` object; names joined with `, ` in declared order; a red that turns green fails until the declaration moves.
8. `surface: 'ui'` lives on the `atTest` registration, not in the acceptance markdown. `--wired` selects those ids and currently **refuses**. Do not mark an id `ui` unless a wiring leaf will re-run it.

---

### Non-Obvious Things

1. **Brief vs tree on the judge.** Brief: harness is built, write fixture oracles. Tree: parked 2026-09-02; next judge is a test-imported function, not `h.oracles`.
2. **Two different “Anthropic stand-ins”.** H5/AI4DEV-38 is **usage/cost**. Discovery needs a **Messages** stand-in. First-consumer rule applies to both; they are not the same contract.
3. **UTC day is not `clock.advance`.** REQ-002 backdates `discovery_spend`. Integration cannot move GoTrue or Postgres `now()`.
4. **`discovery-message` already exists as a stand-in write route.** Unit 4 should promote that row, not invent a second inventory name, unless the design splits stream vs write.
5. **`@anthropic-ai/sdk` in package.json is not a product client.** Parked-judge leftover. Putting it on an edge function still needs an `npm:` import in a Deno-only file.
6. **Audit “bodies never persisted” vs “conversation persists”.** Architecture notes vs PRD/AT-004.11/decline-review. Unresolved.
7. **CI never runs integration and never has a model key.** A green integration id that calls Opus cannot pass on GitHub as CI is written.
8. **Typecheck does not cover edge entry points.** A bad Anthropic client in `index.ts` will not fail `bun run typecheck`.
9. **`--wired` is a hard refuse**, not an empty re-run. `surface: 'ui'` without a driver is a trap if someone later runs `--wired`.
10. **Email stand-in `port` cannot see `'ack_lost'`.** It returns `'no_ack'`. A model stand-in that told the SUT the “real” outcome would break the same class of proof.

---

### Open Questions

- Exact Opus model id string for the product (notes say “Claude Opus”; parked judge used `claude-opus-5` for a **different** role).
- Client in the edge function: `npm:@anthropic-ai/sdk` vs raw `fetch`. Not in the tree; unit-4 gate.
- Conversation storage: table, columns, resume key, relation to `need_intakes.stage = discovery_in_progress`. Not specified.
- Whether request/response bodies may be stored despite Cross-cutting A’s “never persisted” audit rule.
- Whether the loop Messages stand-in lives under `h.vendors.anthropic` (extending `Vendors`) or only inside the suite adapter, given parked README’s “not a harness member” for the **judge**.
- How an integration-tier AT-004.10 ever goes green in CI without a key. No precedent.
- Deno permission set of `supabase_edge_runtime_*`: not documented here; only inferred from existing `fetch` + `Deno.env.get`.
- Whether promoting `discovery-message` to `kind: 'edge'` breaks REQ-001 tests that currently throw `CapabilityPending(['sut.accounts.sendDiscoveryMessage'])` on that route (`req-001/_live.ts` 1026–1028). Those tests must be updated in the same change.
- Turn-ceiling numeric pin: architecture says “platform-configurable, pilot-tuned”; `atconfig.ts` has no Discovery turn-ceiling entry yet.