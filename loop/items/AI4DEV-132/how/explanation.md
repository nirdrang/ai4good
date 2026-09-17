# How the tree supports the credits engine run (six units)

### Overview

The tree already holds the free daily allowance and every door the six units must pass through. The allowance is one Postgres table, `discovery_spend`, with one row per organisation per UTC day, and one security-definer function, `discovery_allowance`, with a `read` action and a `debit` action. Remaining is never stored. The daily reset is a new primary key, not a cron. The block at zero already carries the tier-split remedy sentence in both SQL and TypeScript. Nothing in the tree calls Anthropic, stores a conversation, records a per-turn cost, holds fuel, or switches Discovery off for one NGO. Those five things are what the run builds.

Every new piece has a fixed shape. A write route is a row in `WRITE_ROUTES`, one `Deno.serve(writeRoute(...))` file, a `verify_jwt` block in `config.toml`, a pure `decide` function in `_shared`, and a SQL definer that re-checks and raises with a `DETAIL` from `WRITE_REFUSAL_KINDS`. A table joins `TENANT_CATALOG` and the revoke posture or the auth suite fails in CI. The acceptance suite for the requirement does not exist yet. It must copy the intake suite under `tests/at/suites/req-003/`, register all fifty-eight P0 ids, declare thirty-eight of them red by capability name in `tests/at/expected/req-004.json` before the first run, and pass the `at:check` bijection. The two hardest facts for the design are that no fuel ledger exists and that the semantic-oracle harness the brief calls built is parked dead text under `loop/parked/v1/`.

### Key Concepts

- **The allowance ledger.** `public.discovery_spend` in `supabase/migrations/20260916120000_discovery_allowance.sql` lines 4 to 13. Columns `org_id`, `utc_day`, `spent`, `granted`. Primary key `(org_id, utc_day)`. Checks `spent >= 0`, `granted > 0`, `spent <= granted`. RLS enabled and `REVOKE ALL` from `anon`, `authenticated`, `service_role`.
- **The grant and the high-water mark.** `discovery_daily_grant(vetted)` returns 30 or 10 (same file, lines 20 to 27). `apply_discovery_grant_mark` upserts the day's row and sets `granted = greatest(old, new)` (lines 32 to 53). The TypeScript twin is `DISCOVERY_DAILY_GRANT`, `highWaterGrant`, `remainingCredits` and `utcDayOf` in `supabase/functions/_shared/discovery-allowance.ts` lines 17 to 43.
- **The three refusal sentences.** `dailyAllowanceExhaustedReason` (already split by tier), `debitExceedsRemainingReason`, `emailUnverifiedReason` in `discovery-allowance.ts` lines 50 to 78. SQL raises the same words at lines 152, 176 and 181 of the migration. A static pin, `exhaustedSentenceProblems` in `tests/at/suites/req-002/_source-pins.ts`, fails if TS and SQL drift.
- **The write frame.** `WRITE_ROUTES` (inventory), `WRITE_REFUSAL_KINDS`, `writeGateDecision`, `writePipeline` in `supabase/functions/_shared/write-routes.ts`. `writeRoute` in `supabase/functions/_shared/edge.ts` lines 337 to 381 is the only Deno I/O constructor for writes.
- **Write standing.** `public.write_standing` returns account type, lifecycle, role in the target org, and org existence. It carries no vetted flag, no email-verified flag, no kill-switch flag (`write-routes.ts` lines 119 to 198).
- **The need.** `public.need_intakes` is 1:1 with a project, stages `draft` and `discovery_in_progress` (`supabase/migrations/20260917120000_project_need_intake.sql` lines 6 to 21). `submit` moves the stage and writes one `need_intake_submitted` audit snapshot per project.
- **The email floor.** `discoveryMessageAllowed` in `supabase/functions/_shared/verification.ts` lines 157 to 167 is a pure TypeScript judgement with no deployed caller. The SQL debit arm reads `auth.users.email_confirmed_at` (migration line 149 to 152).
- **The harness.** `atTest` and `bindSuite` in `tests/at/harness/registry.ts`, `CapabilityPending` and `AtPending` in `tests/at/harness/pending.ts`, `loadTierExpectation` in `tests/at/harness/expected.ts`, `inspectBijection` in `tests/at/harness/check.ts`, `AdapterModules` in `tests/at/harness/suite-adapters.ts` lines 108 to 113.
- **The one vendor stand-in.** `createEmailProviderSim` in `tests/at/harness/vendors.ts`. The contract file, `tests/at/harness/contracts.ts` lines 14 to 15, says the Anthropic, Stripe, GitHub, Lovable and Linear stand-ins are built with the first suite that consumes them.
- **The clock.** `ControlledClock` at loop starts at `2026-01-01T00:00:00.000Z` (`tests/at/harness/clock.ts` line 12). `RealClock` at integration has only `now()`.
- **The notification emitter.** `public.emit_notification(jsonb)` is the sole outbox writer. A producer definer calls it inside its own transaction. The taxonomy is closed at forty-eight rows.

### How It Works

#### How an allowance is granted, read and debited today

There is no grant event. The grant is computed. A `read` with no row for today returns `spent = 0` and `granted = discovery_daily_grant(vetted)` and writes nothing (migration lines 58 to 211; AT-002.06 asserts no row after a read in `tests/at/suites/req-002/b-allowance.test.ts` lines 142 to 146). A `read` with a row returns `granted = greatest(stored, current-tier grant)` in memory and does not persist the raise.

A `debit` runs through `writeRoute` and then `public.discovery_allowance`. The TypeScript half, `decideDiscoveryAllowance` in `discovery-allowance.ts` lines 153 to 202, checks the organisation id, the action, that the org exists, that the caller is an org admin, and that `credits` is a positive integer. It does not check email verification. The SQL half calls `assert_account_active`, share-locks the organisation, re-checks membership and role, takes the UTC day from `clock_timestamp()` after the lock (line 109), reads `org_vetting.vetted`, refuses if `email_confirmed_at` is null with `DETAIL 'email-unverified'` (line 152), calls `apply_discovery_grant_mark`, locks today's row `FOR UPDATE`, computes `remaining = granted - spent` before adding, raises `P0001` with `DETAIL 'daily-allowance-exhausted'` when remaining is zero or less, raises `'debit-exceeds-remaining'` when `p_credits > remaining`, and otherwise adds to `spent`. Overflow is impossible because the comparison happens before the addition, and only the integration body of AT-002.04 sends `2147483647`.

Vetting is the other writer. `set_organization_vetting` calls `apply_discovery_grant_mark(org, utc_day, previous_vetted OR current.vetted)` (`supabase/migrations/20260914120000_org_vetting.sql` lines 406 to 413), so an unvet never lowers today's grant. The rollover is a new `utc_day` key. Tests simulate it with `writeSpendRowAsOperator`, which writes yesterday's row and deletes today's (`tests/at/suites/req-002/_contract.ts` lines 314 to 322, live SQL at `_live.ts` lines 616 to 634). No test moves a product clock at integration.

The HTTP contract is `POST /functions/v1/discovery-allowance` with `{ organizationId, action, credits? }`. Success returns `{ ok: true, organizationId, utcDay, vetted, dailyGrant, spentToday, remaining }` through `renderDiscoveryAllowance`, which refuses a payload where remaining differs from granted minus spent. Any SQL raise with a five-character SQLSTATE becomes HTTP 409 with `kind` parsed from `DETAIL` (`edge.ts` lines 372 to 376).

What the ledger lacks for this run is a per-turn record. `spent` is one integer. Nothing stores which turn, which project, which provider cost or which ratio produced a delta. Unit 1 adds that beside this ledger and never builds a second spend ledger.

#### How a need reaches `discovery_in_progress`

An NGO org admin calls the `project-need` write route with `action: 'start'`. `decideProjectNeed` (`need-intake.ts` lines 74 to 130) checks the shape. The SQL dispatcher `project_need` (`supabase/migrations/20260918120000_project_need_attach.sql` lines 80 to 113) calls `assert_account_active`, checks org and admin membership, requires `has_platform_acknowledgment` on start, and inserts a `projects` row and a `need_intakes` row at stage `draft`. `save` patches title, description and urgency. `attach` appends metadata only onto `need_intakes.reference_files`. No bytes, no bucket. `submit` (`20260919120000_project_need_snapshot.sql` lines 1 to 27) is idempotent, refuses an empty description, sets `stage = 'discovery_in_progress'` and `submitted_at`, and appends one `need_intake_submitted` audit event guarded by a unique index on `detail->>'project_id'`. No conversation starts. The unit 4 conversation attaches to a need in that stage. The `need-intake` read function is not a write route. It uses `callerReads` with the caller's JWT and RLS `viewer_is_org_member(org_id)` on `need_intakes`.

#### How a write route is framed, registered, audited and refused

The request path is fixed by `writeRoute`. OPTIONS is 204. Non-POST is 405. `resolveCaller` hits `/auth/v1/user` and a missing token is 401. The body is parsed, the target id must be a UUID or 400 `invalid-request`. `loadWriteStanding` calls the `write_standing` RPC. `writePipeline` (`write-routes.ts` lines 322 to 332) applies `writeGateDecision` in a fixed order. Deactivated is 403 `account-deactivated`. No account is 409 `no-account`. A type outside `admits` is 403 `not-a-platform-admin` or `not-an-ngo-account`. Then `spec.decide` runs, pure, in `_shared`. On admit, `callDatabaseFunction` (not exported, `edge.ts` lines 284 to 318) calls one PostgREST RPC as the service role. The SQL definer re-checks everything and raises with `USING errcode, detail`. Any raise with a five-character SQLSTATE is 409 with `kind = parseWriteRefusalKind(details)`, and an unknown detail becomes `'refused'`. TypeScript refuses at 400 or 403 first, so the same defect has two HTTP shapes depending on which layer catches it. Keep the TypeScript kind, the SQL DETAIL and the test aligned.

Registering is four edits. A row in `WRITE_ROUTES` with `surface: { kind: 'edge', rpc }` and `standing.admits`. A file `supabase/functions/<name>/index.ts` that is exactly one `Deno.serve(writeRoute({ name, target, decide, render }))` (`set-organization-vetting/index.ts` lines 1 to 10 is the template). A `[functions.<name>] verify_jwt = true` block in `supabase/config.toml`. A refusal kind appended to `WRITE_REFUSAL_KINDS` if the route raises a new one. `writeRouteProblems` in the auth suite fails any unregistered database reach, any `_shared` module that mentions `/rest/v1/`, `createClient`, `.rpc(` or a service-role key name, and any stand-in that is not driven by the req-001 fixture.

A platform-admin route copies `set_organization_vetting` (`20260914120000_org_vetting.sql` lines 187 to 197). `admits: ['platform_admin']` in the inventory, then in SQL `perform public.assert_account_active(p_account_id)` and `if account_type <> 'platform_admin' then raise ... detail = 'not-a-platform-admin'`. If the action is audited, the definer calls `append_audit_event(kind, actor, subject_account, subject_org, reason, detail)`. A new `audit_event_kind` value needs its own `ALTER TYPE ... ADD VALUE` migration, then a later migration that uses it, because Postgres refuses both in one transaction (the intake pair is `20260919110000_audit_event_kind_need_intake.sql` and `20260919120000_project_need_snapshot.sql`). `audit_events` is append-only; triggers refuse UPDATE, DELETE and TRUNCATE.

The kill switch of unit 5 has no state to flip today. `organizations` has `id`, `name`, `created_at`, `mission`, `country`, `website`, `logo`. `accounts.lifecycle` deactivation blocks every write, including intake and the allowance, so it cannot serve as a Discovery-only switch. The design adds a column or a table, and then either a `viewer_*` helper or a definer read if a client must see it.

#### How a suite registers ids, declares pending ids, pins facts and is judged

The template is `tests/at/suites/req-003/`. `_bind.ts` calls `bindSuite({ requirement: 'req-003', sut: 'needs' })` and re-exports `atTest`, `CapabilityPending`, `TIER`. `_contract.ts` declares the SUT as type aliases and imports judgement types from shipped modules. `_fixture.ts` exports `requirement = 'req-003' as const` and a loop adapter with in-memory maps that drive `writePipeline` with the shipped `decide` functions. `_live.ts` exports the same literal and `createLiveAdapter({ stack })`, which provisions an NGO through real Auth, Mailpit and `complete-signup`, and reaches SQL as operator. `_pending.ts` holds `AWAITED` names and `awaiting(...surfaces)`, which throws `CapabilityPending(surfaces)`. `_source-need.ts` is a static arm that throws if the function it inspects cannot be found. Only files ending `.test.ts` are scanned.

Registration is one `atTest('AT-003.NN', title, opts, bodies)` per P0 id. `inspectBijection` (`check.ts` lines 48 to 83) parses `AT-{req}.{n} (P0)` from the acceptance file and `atTest('AT-...'` from every `*.test.ts`, and demands exactly one call site per id, none extra, none duplicated. Bodies are a per-tier map. Every tier or `default` must be named; a hole reports MISSING, which no declaration can describe (`registry.ts` lines 740 to 757). The intake pattern for "green at loop, surface missing at integration" is `{ default: async (...) => {...}, integration: awaiting(AWAITED.referenceUpload) }` (`d-reference-files.test.ts` lines 8 to 41). A pending id is a body that throws, never `it.skip`. The first line must be exactly `CapabilityPending: CAPABILITY PENDING — name1, name2` in declaration order. Names must not contain commas.

`--expect` loads `tests/at/expected/req-0NN.json` before spawning tests (`runner.ts` lines 334 to 341). The manifest's `requirement` must match. For each tier, `green[]` plus the keys of `red{}` must equal the P0 set. After the run every declared green is green, every declared red has the rebuilt first line, a red that turned green fails, vitest pass and fail counts equal the declared counts, and no pending, todo or extra test exists. The declaration is authored before the first run (`tests/at/expected/README.md` section 3). Capability names already in use are listed under Constraints.

A static arm is a `_source-*.ts` module exporting `*Problems(): string[]`. The test asserts `toEqual([])`. The instrument throws if it cannot read the artefact, so a broken scan cannot look like an absence. `grantPinProblems` extracts the last SQL definition and compares it to `DISCOVERY_DAILY_GRANT` and `AT_CONFIG`. `discoveryWalletProblems`, `scanTrustWording` and `absentPublishFlowProblems` in `req-002/_source-absences.ts` sweep routes, SQL objects, quoted strings, JSX, cron and triggers for forbidden names. Units 5's two absence ids copy this shape.

CI (`.github/workflows/ci.yml`) runs `bun install`, `bun run typecheck`, `bun run at:selftest`, `at:check` on every suite directory, `at:verify --tier loop --expect` on every expected file, and fails if a suite directory has no expected file. It never runs integration and has no secrets block. Integration runs only on a developer machine against the one local stack.

#### How a vendor stand-in is built and consumed

The email stand-in is one object with two faces (`vendors.ts`). The SUT-facing `port.deliver` returns `'accepted' | 'rejected' | 'no_ack'`. The test-facing `sim` has `rejectNext`, `acceptButLoseAck`, `attempts`, `accepted`. At loop, `createHarness` (`index.ts` lines 227 to 231) builds the sim, hands `{ vendors: { email: provider.port } }` to the adapter factory, and exposes `{ email: provider.sim }` to the test. The req-016 fixture wraps the port as the product `ProviderPort`. At integration (`index.ts` lines 241 to 249) `vendors` is a Proxy that throws `CapabilityPending(['vendors.email'])`, and `TierHarness` omits `vendors` so `h.vendors.email` does not compile in an integration body. Integration proves the same behaviour through `h.faults.at(...)` and Mailpit.

An Anthropic Messages stand-in follows the same two-face shape. Its contract lands in `contracts.ts`, its factory in `vendors.ts` or beside the suite, the loop adapter receives the port, the test reads the sim. The name the contract file already reserves, "Anthropic usage/cost", is a different stand-in (usage reporting) and does not fill unit 4's need for a Messages seam. The port must not tell the SUT the "real" outcome the sim hides, the way the email port returns `'no_ack'` and never `'ack_lost'`.

#### How an edge function would call an npm package and read a secret

There is no `supabase/functions/deno.json` and no import map. Edge functions use relative imports. Every `_shared` decision module is compiled twice, by Deno at serve time and by `tests/at` with `types: ["node"]`, so those modules cannot use `Deno`, `jsr:` or `npm:`. Only `edge.ts` and `notification-provider.ts` do I/O. A model client therefore lives in a new Deno-only file that tests never import, and uses either `npm:@anthropic-ai/sdk` or `fetch('https://api.anthropic.com/v1/messages')`. Which one is a founder decision at the unit 4 gate. The `@anthropic-ai/sdk` in `package.json` line 76 is a devDependency left by the parked judge, not a Deno import.

Secrets come from `requireEnv` over `Deno.env.get` (`edge.ts` lines 55 to 61). Names in use are `SUPABASE_URL`, `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`. `.env.example` puts any provider key in git-ignored `.env.local` and has no `ANTHROPIC_API_KEY` line yet. `childEnv` in `tests/at/harness/local-stack.ts` lines 76 to 123 is a positive allowlist, so a vitest child never sees a key the parent holds. `bun run typecheck` does not cover `supabase/functions/*/index.ts` or `edge.ts`; a bad client there fails only when served.

#### What the semantic-oracle harness offers

It does not exist in the live tree. `createSemanticOracle` lives at `loop/parked/v1/tests/at/harness/oracles.ts` and is dead text (`loop/parked/v1/README.md` lines 57 to 62). Live `tests/at/harness/` has no `oracles.ts`, and `createHarness` mounts no oracle. The parked design is worth reading for shape only. `judge(rubric, material)` returned a majority verdict over `k` votes, loop replayed SHA-256-keyed recordings and integration called the SDK with `AT_JUDGE_API_KEY`. The parked README says the next judge is a function the test imports with its own record-and-replay store, not a harness member. `.env.example` line 25 says the same. AT-004.10's fixture-specific oracle is new work in this branch, and no CI path can hold a key to run it live.

### Where Things Live

- `supabase/migrations/20260916120000_discovery_allowance.sql`. Ledger table, grant, grant mark, definer.
- `supabase/functions/_shared/discovery-allowance.ts`. TS twin, sentences, `decideDiscoveryAllowance`, `renderDiscoveryAllowance`.
- `supabase/functions/discovery-allowance/index.ts`. The route.
- `supabase/functions/_shared/write-routes.ts`. Inventory, refusal kinds, gate, pipeline, standing parser.
- `supabase/functions/_shared/edge.ts`. `writeRoute`, `callerReads`, `requireEnv`, the only I/O besides SMTP.
- `supabase/functions/_shared/verification.ts`. `discoveryMessageAllowed`.
- `supabase/functions/_shared/need-intake.ts` and migrations `20260917120000`, `20260917130000`, `20260918120000`, `20260919110000`, `20260919120000`. Intake.
- `supabase/functions/_shared/notifications.ts`, `notification-taxonomy.ts`, migration `20260913120000_notification_taxonomy_and_outbox.sql`. Emitter and taxonomy.
- `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql`. `audit_events`, `append_audit_event`, `write_standing`, `assert_account_active`.
- `supabase/migrations/20260914120000_org_vetting.sql`. Vetting, grant mark on vet, the platform-admin SQL check template.
- `supabase/config.toml`. `[functions.<name>] verify_jwt` blocks, `deno_version = 2`.
- `tests/at/harness/`. `registry.ts`, `check.ts`, `expected.ts`, `runner.ts`, `pending.ts`, `suite-adapters.ts`, `atconfig.ts`, `config.ts`, `contracts.ts`, `vendors.ts`, `clock.ts`, `local-stack.ts`.
- `tests/at/expected/req-001.json`, `req-002.json`, `req-003.json`, `req-016.json`, `README.md`.
- `tests/at/suites/req-001/_policy-scan.ts` (`TENANT_CATALOG` line 32), `_integration.ts` (`VIEWER_FUNCTIONS` line 167, live catalog), `_write-route-scan.ts`, `_fixture.ts` (the `discovery-message` stand-in at lines 770 to 778).
- `tests/at/suites/req-002/`. `b-allowance.test.ts`, `e-gates.test.ts`, `_source-pins.ts`, `_source-absences.ts`, `_fixture.ts`, `_live.ts`, `_contract.ts`.
- `tests/at/suites/req-003/`. The template suite.
- `tests/at/suites/req-016/_source-scan.ts`. `strayNotificationWriters`, `providerClientImporters`.
- `.taskmaster/docs/acceptance/at-req-004.md`, `loop/decomp/req-004.md`, `.taskmaster/docs/architecture-notes.md` lines 135 to 141.
- `loop/parked/v1/tests/at/harness/oracles.ts`. Dead judge.
- `.claude/skills/verify-ai4good/`. Live drive scripts; a new route needs a feature file and a README row.

### Constraints for the design

Harness

1. Register `'req-004': typeof import('../suites/req-004/_fixture.ts')` in `AdapterModules`, `tests/at/harness/suite-adapters.ts` lines 108 to 113, or `bindSuite` does not type-check.
2. `_fixture.ts` and `_live.ts` both export `requirement = 'req-004' as const` (pattern in `tests/at/suites/req-003/_fixture.ts` and `_live.ts`).
3. Exactly fifty-eight `atTest('AT-004.…'` call sites in `tests/at/suites/req-004/*.test.ts`, retired 07, 23 and 40 excluded (`tests/at/harness/check.ts` lines 48 to 83).
4. Author `tests/at/expected/req-004.json` before the first run with both tiers, `green[]` plus `red{}` covering the exact P0 set (`tests/at/expected/README.md` section 3, `tests/at/harness/expected.ts`).
5. A pending body throws `CapabilityPending([...])` or `AtPending(id, phase, detail)`, never skips, and the joined names match the declaration in order (`tests/at/harness/pending.ts`).
6. Every per-tier body map names every tier or `default` (`tests/at/harness/registry.ts` lines 740 to 757).
7. Reuse existing capability names where one fits. In use are `ui.discovery-surface`, `checkout.project-fuel`, `billing.funded-turn`, `publish.flow`, `triage.queue`, `ui.public-listing-screens` (`tests/at/expected/req-002.json`), `storage.reference-upload`, `ui.reference-upload-surface` (`req-003.json`), `ui.authenticated-surface-rendering`, `sut.accounts.sendDiscoveryMessage` and others (`req-001.json`). No commas inside a name.
8. Set `surface: 'ui'` only on an id the wiring leaf will re-run; `--wired` refuses with exit 3 today (`tests/at/harness/runner.ts` lines 300 to 307).
9. Do not hard-code 10 or 30. Read `req-002.discovery.daily_credits.unverified` and `.vetted` (`tests/at/harness/config.ts` lines 32 to 33, `atconfig.ts` lines 83 to 93). A new knob such as the cost-to-credit ratio needs an `AT_CONFIG` entry and a `CONFIG_KEYS` dotted key.
10. Integration cannot move time. Simulate a new UTC day with `writeSpendRowAsOperator` (`tests/at/suites/req-002/_live.ts` lines 616 to 634), never with a product clock.
11. A static arm throws when it cannot read the tree and returns a problem list otherwise (`tests/at/suites/req-002/_source-absences.ts`, `req-003/_source-need.ts`).
12. Contract types are aliases, not interfaces, and judgement types import from shipped modules (`tests/at/suites/req-003/_contract.ts`).
13. Any red id that turns green fails `--expect` until the JSON moves in the same change (`tests/at/harness/expected.ts`).

Database posture

14. Every new table runs `REVOKE ALL ... FROM anon, authenticated, service_role` and `ENABLE ROW LEVEL SECURITY`, never `FORCE`, never `GRANT TO anon|public`, never `ALTER DEFAULT PRIVILEGES` (`tests/at/suites/req-001/_policy-scan.ts`).
15. Every new table gets a `TENANT_CATALOG` row, `'tenant-isolated'` or `'unreachable-by-client-roles'` (`_policy-scan.ts` lines 21 to 38), and the live catalog demands every `public` table be listed (`_integration.ts` lines 174 to 195).
16. An isolated table grants SELECT to `authenticated` only, with a `FOR SELECT TO authenticated` policy whose USING names `auth.uid()` or `public.viewer_*`, no tautology, no `FOR ALL`, no table-reading subquery; denormalise `org_id` as `need_intakes` does.
17. `service_role` holds no INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER or ALL on any table, and no SELECT except `accounts` and `org_memberships` (`_integration.ts` lines 166 to 184).
18. A new `viewer_*` helper is SECURITY DEFINER with `search_path = ''`, revoked from `public`, granted to `authenticated`, and added to `VIEWER_FUNCTIONS` at `_integration.ts` line 167.
19. A mutating definer granted to `service_role` calls `public.assert_account_active`, sets `search_path = ''`, revokes from `public` and grants to `service_role` (`scanWriteGateSql`, `_policy-scan.ts` lines 587 to 660). `complete_signup` is the only exemption.
20. Do not name any new object with discovery plus wallet, buy, purchase, top-up or balance; `scanDiscoveryWallet` in `req-002/_source-absences.ts` fires on names.

Write routes

21. Every write route is a `WRITE_ROUTES` row with `surface.kind: 'edge'` and an RPC name (`supabase/functions/_shared/write-routes.ts` lines 23 to 74), and `WriteRouteName` is derived from that object.
22. `supabase/functions/<name>/index.ts` is exactly one `Deno.serve(writeRoute({...}))` with no database reach of its own, plus `[functions.<name>] verify_jwt = true` in `supabase/config.toml`.
23. `decide` is pure, in `_shared`, relative imports only, no `Deno`, no `npm:`, no `/rest/v1/`, `createClient`, `.rpc(` or service-role key names (`writeRouteProblems`, `tests/at/suites/req-001/_integration.ts`).
24. A new refusal kind is appended to `WRITE_REFUSAL_KINDS` (`write-routes.ts` lines 78 to 103) and SQL raises `USING detail = '<that string>'`, with errcodes `42501` authz, `22023` bad parameter, `23503` missing org, `P0001` business rule.
25. A platform-admin route uses `admits: ['platform_admin']` and SQL re-checks `account_type` with `detail = 'not-a-platform-admin'` (`20260914120000_org_vetting.sql` lines 187 to 197).
26. An NGO route uses `admits: ['ngo']`, `orgAdminActionAllowed` in TypeScript, and a SQL membership re-check raising `not-a-member` or `not-an-admin`.
27. Promoting `discovery-message` from stand-in means changing the row's `surface` (`write-routes.ts` lines 67 to 73), adding the function folder and config block, and updating the req-001 live adapter that throws `CapabilityPending(['sut.accounts.sendDiscoveryMessage'])` at `tests/at/suites/req-001/_live.ts` lines 1026 to 1028.
28. A new audit kind is its own `ALTER TYPE audit_event_kind ADD VALUE` migration followed by a separate migration that writes it; `reason` and `actor_label` are non-blank; nothing updates or deletes `audit_events`.
29. Email verification is not in `writeGateDecision`, `Caller` or `write_standing`; a Discovery send consults `discoveryMessageAllowed` (`verification.ts` lines 157 to 167) or the SQL `email_confirmed_at` check, and picks one HTTP shape.

Notifications

30. Do not add a taxonomy row; if a notice is owed and no row fits, write "Not done here" (`supabase/functions/_shared/notification-taxonomy.ts`, brief fact 5).
31. If a producer emits, its SQL definer calls `public.emit_notification` in the same transaction; no `INSERT INTO notification_events|deliveries|ops_items` elsewhere and no `ProviderPort`, `deliver(` or mail-client import in a new module (`tests/at/suites/req-016/_source-scan.ts` line 197 and `providerClientImporters`).

The allowance contract

32. Unit 1 extends `discovery_spend` and `discovery_allowance`; it does not create a second spend ledger (`supabase/migrations/20260916120000_discovery_allowance.sql`, brief fact 3).
33. `read` never writes a row, `granted` never drops on unvet, remaining is never a column (AT-002.06, .07, .08 in `tests/at/suites/req-002/b-allowance.test.ts`).
34. Remaining is computed before the addition and a refused debit writes no row (AT-002.04, integration sends `2147483647`).
35. The three sentences in `discovery-allowance.ts` lines 50 to 78 stay in lockstep with the SQL raises at migration lines 152, 176 and 181; `exhaustedSentenceProblems` and `grantPinProblems` in `req-002/_source-pins.ts` pin them and forbid a numeral in the format string.
36. AT-002.05 at loop asserts `/get vetted/i`, `daily grant becomes ${vettedPin}`, `/fund project fuel/i` and `/wait for the next UTC day/i` on the unverified sentence; AT-002.18, .21, .22 and .27 read the same route.

Projects and needs

37. `projects` has only `id`, `org_id`, `name`, `assigned_volunteer_id`, `created_at` (`20260811130000_single_seat_org_and_single_developer_projects.sql` lines 57 to 63); there is no funding column, no fuel table, no Stripe object anywhere in `supabase/`.
38. `need_intakes` is `project_id` primary key with composite FK `(project_id, org_id)`, stages `draft` and `discovery_in_progress`, and constraint `(stage = 'draft') = (submitted_at is null)`; the conversation attaches to `discovery_in_progress`.
39. Reference files are jsonb metadata only, no bytes, no storage bucket (`20260918120000_project_need_attach.sql` lines 1 to 38).

Environment and CI

40. The agent runs inside a Supabase edge function on Deno; model I/O lives in a Deno-only file; the UI never calls Anthropic or the database.
41. A key lives in `.env.local` or the function environment, named as an empty line in `.env.example`, never in a committed file; `childEnv` (`tests/at/harness/local-stack.ts` lines 76 to 123) never passes it to a test child.
42. CI runs loop `--expect` only, with no secrets and no integration; an integration id that needs a live model cannot be green in CI (`.github/workflows/ci.yml`).
43. `bun run typecheck` does not cover `supabase/functions/*/index.ts` or `edge.ts` (`tests/at/typecheck.ts`).
44. The pull request must name no Linear id but the branch's own; the reference guard fails the build otherwise.

### Ids whose proof waits on another surface

The verdicts assume the run builds per-turn metering with a stored turn record, a funding-state seam with a pure routing function, the kill switch route, a conversation table, a Discovery send route on the edge, and a loop-tier Messages stand-in.

- **AT-004.01.** Green at loop and integration. Turns debit the existing ledger at the pinned 10 and 30 through the new send route. Certain, provided "converses" means a turn through the send route and not a UI.
- **AT-004.02.** Green at loop against the stand-in with controlled provider costs, reading the turn record. Integration is red on `ui.discovery-surface` for the "shown to the NGO" half, and cannot control provider cost against the real model without a seam. Open. The design may split the id into a green loop proof and a pending integration declaration, the way AT-002.05 does.
- **AT-004.03a.** Backend block and three-remedy sentence green at loop. Integration is red on `ui.discovery-surface`, as AT-002.05 already declares. Open only on whether integration should instead go green on the `reason` string; both are consistent with existing practice and the brief chose the pending shape.
- **AT-004.03b.** Same split. The SQL and TypeScript sentences already drop "get vetted" for a vetted caller (`discovery-allowance.ts` line 53, migration line 176). Certain at loop, pending at integration on `ui.discovery-surface`.
- **AT-004.04.** The routing decision is green at loop as a pure function. The fuel debit does not exist. Pending at integration on `checkout.project-fuel, billing.funded-turn`. Certain.
- **AT-004.05.** Isolation between a funded and an unfunded project is green at loop if the funding state comes from the seam. Pending at integration on `checkout.project-fuel, billing.funded-turn`. Certain.
- **AT-004.06.** The mid-conversation switch is green at loop through the seam. Pending at integration on `checkout.project-fuel, billing.funded-turn`. Certain.
- **AT-004.08.** Green at both tiers by operator backdate, as AT-002.06. Certain.
- **AT-004.09.** The allowance-unchanged half is green at both tiers. The model id and priority half needs the send route to store or expose its request settings; green at loop against the stand-in, pending at integration on `checkout.project-fuel`. Open on whether the design records request settings per turn.
- **AT-004.10.** Green at loop only against recordings or a deterministic stand-in with a fixture-specific oracle built in this branch. Integration needs a real Opus call with a local key and a judge; declare pending on a new name such as `vendors.anthropic` or `oracle.semantic-judge`, no existing name fits. Open; this is unit 4's gate decision.
- **AT-004.11.** Green at loop once a conversation table and a resume path exist. Green at integration only if `signInAgain` plus backdate plus the real route work without a model call; otherwise pending on the same new name as .10. Open.
- **AT-004.41.** Green at both tiers once the send route consults the email floor; the debit half is already proven by AT-002.22. Certain, given the route.
- **AT-004.42.** Green at both tiers once the kill switch route and its state exist and the send route reads them. Certain, given the route.
- **AT-004.43.** Green at both tiers as a static absence arm over routes, SQL objects and copy. Certain.
- **AT-004.44.** Green at both tiers as a static absence arm; no circuit, breaker or global cap exists in `supabase/`. Certain.
- **AT-004.45.** The never-purchasable half is green through `discoveryWalletProblems`. The "outside the money ledger" half has no money tables to scan; pending at integration on `checkout.project-fuel`, as AT-002.10. Open on whether loop may also be pending.
- **AT-004.46.** Remaining credits and the turn-record read are green at loop and integration. The rendering half is pending at integration on `ui.discovery-surface`. Zero-cost attach can be proven; regeneration and error retry do not exist yet and are later leaves. Certain on the split, open on whether loop declares the rendering half too.
- **AT-004.47.** Green at both tiers; the grant is per organisation and the debit carries no project id. Certain.
- **AT-004.48.** Routing refuses fallback at loop through the seam. Pending at integration on `checkout.project-fuel, billing.funded-turn`. Certain.
- **AT-004.49.** Green at both tiers; `spent <= granted` and `debit-exceeds-remaining` already bound spend, and the metering adds the per-turn preflight or cap. Certain.

Under these verdicts twelve ids are pending at integration (.02, .03a, .03b, .04, .05, .06, .09, .10, .11, .45, .46, .48) and eight are green at integration with what this run builds (.01, .08, .41, .42, .43, .44, .47, .49). If the send route or the kill switch slips, .41 and .42 join the pending set on `sut.accounts.sendDiscoveryMessage`.

### Gotchas

1. The brief says the semantic-oracle harness is built. All three explorers and `.env.example` line 25 say it is parked. Trust the tree.
2. The email gate is SQL-only on the allowance. `decideDiscoveryAllowance` admits an unverified debit and the definer refuses it at 409. The req-001 `discovery-message` stand-in refuses at 403 `'refused'`. A real send route must pick one shape.
3. The AT_CONFIG pin named "email-verified NGO" is the unverified vetting tier, 10, not an email-confirmation grant.
4. `discovery-allowance` `read` is a write route. It goes through the org-admin gate and the service-role RPC; a caller-bound SELECT on `discovery_spend` is impossible because the table is unreachable.
5. The stand-in `discovery-message` row admits `ngo`, `volunteer` and `platform_admin` (`write-routes.ts` line 72). A promoted send route probably narrows that to `ngo`, and the req-001 fixture that drives the stand-in must change with it.
6. `emit_notification` and `append_audit_event` have no execute grant to `service_role`. Only a definer running as owner can call them.
7. `acknowledgments` is account-level, keyed on `account_id`. There is no org-level acknowledgments table.
8. Architecture notes say metered AI audit events never persist request or response bodies, and the PRD wants the full conversation on the decline ops item. The conversation table of unit 4 must say how it differs from the audit event.
9. `--wired` exits 3 and CI never runs integration. An integration-only defect can merge on a green loop run.
10. A second row for the same taxonomy event or a second `canSendDirectly` sender fails AT-016.01.
11. The write-route scan reads `index.ts` files for a database-reach regex; a read function that only imports `callerReads` is exempt, but a new file that mentions `.rpc(` is not.
12. The loop clock starts at 2026-01-01, so `utcDayOf(clock.now())` in a loop fixture is not today's date; integration compares to `utcDayOf(Date.now())`.
13. Fuel words are already notification event names, `fuel.threshold_20`, `fuel.threshold_5`, `fuel.depleted`, and `notification_fixture_transitions` is a stand-in ledger for those rows. Do not read them as a fuel table.
14. Only `.test.ts` files are scanned for ids; a pending id registered inside `_pending.ts` is invisible to `at:check`.
15. The parked judge pinned `claude-opus-5` for a different role. The product model id for Discovery is not pinned anywhere in the tree.
