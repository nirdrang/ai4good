Confirmed: there is no fuel, Stripe, or checkout ledger in migrations or `_shared`. The rest of this note is the write-frame, intake, admin, notifications, and tenant constraints a new table or route in this run must follow.

### Components Found

**Write frame**

| Name | Path | What it does |
|---|---|---|
| `WRITE_ROUTES` | `supabase/functions/_shared/write-routes.ts` lines 23–74 | Closed inventory of every write. Each row is `{ surface, standing }`. Surface is `{ kind: 'edge', rpc }` or `{ kind: 'stand-in', reason }`. Standing is `account-required` with `admits` types, or `account-absent-by-design` (only `complete-signup`). |
| `WRITE_REFUSAL_KINDS` | same file, lines 78–103 | Closed string list of refusal kinds. `parseWriteRefusalKind` maps SQL `DETAIL` onto this list and returns `'refused'` for anything else. |
| `writeGateDecision` | same file, lines 303–320 | Lifecycle-then-type gate. Deactivated is judged first (`403` `'account-deactivated'`). Then no-account (`409`). Then `admits`. Platform-admin-only routes refuse as `'not-a-platform-admin'`; NGO-only as `'not-an-ngo-account'`. |
| `writePipeline` | same file, lines 322–332 | Gate, then `spec.decide`. |
| `writeRoute` | `supabase/functions/_shared/edge.ts` lines 337–381 | Deno I/O constructor. Throws at boot if `spec.name` is missing from `WRITE_ROUTES` or is a stand-in. Auth → JSON body → UUID check → `write_standing` RPC → `writePipeline` → `callDatabaseFunction(rpc, args)` → JSON. |
| `callDatabaseFunction` | `edge.ts` lines 284–318 | **Not exported.** One PostgREST RPC as the service role. A raised exception with a five-character SQLSTATE becomes HTTP 409; anything else is 502. |
| `rpcRefusalStatus` / `parseWriteRefusalKind` | `write-routes.ts` 239–241 and `edge.ts` 372–376 | SQL backstop: `kind = parseWriteRefusalKind(outcome.details)` only when status is 409. Unknown or missing `DETAIL` becomes `'refused'`. |
| `Caller` / `callerFromAuthAnswer` | `supabase/functions/_shared/caller.ts` | Pure judgement of `/auth/v1/user`. Fields: `id`, `githubHandle`. **No `emailVerified`.** |
| `resolveCaller` | `edge.ts` 166–208 | Fetches Auth, then `callerFromAuthAnswer`. Missing `Authorization` skips the round trip and returns `null` (401). |
| `WriteStanding` / `parseWriteStanding` | `write-routes.ts` 119–198 | Fail-closed parse of `public.write_standing`. Account type, lifecycle, role **in the target org**, `orgExists`, seat holder, optional subject. No vetted flag, no email-verified flag, no Discovery kill-switch flag. |
| `write_standing` | `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql` 94–127 | SQL definer that returns that JSON. Granted to `service_role`. |
| `orgAdminActionAllowed` / `parseOrgRole` | `supabase/functions/_shared/memberships.ts` | Per-org role. Two refusal kinds: `'not-a-member'` vs `'not-an-admin'`. |
| `ACCOUNT_TYPES` / `ACCOUNT_LIFECYCLES` | `supabase/functions/_shared/accounts.ts` | Global type `ngo \| volunteer \| platform_admin`. Lifecycle `active \| deactivated`. |
| `assert_account_active` | `20260908120000_…sql` 69–91 | SQL write gate. Share-locks the account. Raises `'account-deactivated'` with `errcode = '42501'`. Every non-exempt mutating definer granted to `service_role` must call it (`scanWriteGateSql`, `_policy-scan.ts` 587–660). Only exemption: `complete_signup`. |

**Shared modules (one sentence each)**

- `accounts.ts` — Signup type/name/identity judgements, NGO-only action, `decideSignupCompletion`, `decideOrganizationCreation`.
- `acknowledgment-copy.ts` — Shipped ToS/authority strings; signup refuses any other attestation.
- `admin-operations.ts` — Platform-admin decisions for contact transfer, escalation contact, and lifecycle change.
- `caller.ts` — Pure Auth-answer → `Caller` (or `null`).
- `discovery-allowance.ts` — Daily grants 10/30, high-water mark, remaining, debit/read decision, exhausted-remedy sentences.
- `edge.ts` — Deno I/O: CORS, `writeRoute`, `callerReads`, `publicProjectReads`. No type-checker covers it.
- `github.ts` — Linked GitHub handle from Auth identities; stub onboarding stats.
- `memberships.ts` — Org roles, org-admin gate, rename and five-field profile writes.
- `need-intake-copy.ts` — Base and Tier-2-hardened reference-file disclosure copy.
- `need-intake.ts` — Need stages, `decideProjectNeed`, view mapping, submit gate/transition, raw-intake snapshot shape.
- `notification-copy.ts` — Subject/body from a taxonomy row plus payload.
- `notification-provider.ts` — The one SMTP send path (`ProviderPort`). Documented exception to “`edge.ts` is the only I/O module”.
- `notification-taxonomy.ts` — Closed 48-row taxonomy. No add/register API.
- `notifications.ts` — Emitter core, branded `WriteSet`, `emit` / worker, `SENDER_DECLARATIONS`.
- `org-vetting.ts` — Vet/unvet request validation, `publishingAllowed`, `fundingAllowed` (always permit; no checkout exists), notice from `vetting.outcome`.
- `public-project.ts` — Public-page predicate and projection. A need is not public (`need_stage !== null`).
- `tenant-reads.ts` — Caller-bound dashboard and workspace orchestration. Holds no tenant rule.
- `verification.ts` — `emailVerifiedFromUser` and `discoveryMessageAllowed`. The Discovery-message floor. No deployed caller yet except the stand-in.
- `write-routes.ts` — Inventory, standing, gate, pipeline, field parsers, refusal kinds.

**Intake / projects**

| Name | Path | What it does |
|---|---|---|
| `public.projects` | `supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql` 57–63 | Columns: `id`, `org_id`, `name`, `assigned_volunteer_id`, `created_at`. No later migration adds a column. |
| `public.need_intakes` | `20260917120000_project_need_intake.sql` 6–21 | 1:1 with a project (`project_id` PK). Composite FK `(project_id, org_id)`. Stages `draft` / `discovery_in_progress`. |
| `NEED_STAGES` | `need-intake.ts` 6 | TypeScript mirror of that enum. |
| `public.project_need` | rebuilt in `20260917130000_…sql` and `20260918120000_project_need_attach.sql` | SECURITY DEFINER dispatcher: `start`, `save`, `attach`, `submit`. |
| `decideProjectNeed` | `need-intake.ts` 74–130 | TypeScript shape-check. Org-admin only. |
| `needIntakeAnswer` | `need-intake.ts` 221–235 | Read projection. Uses caller-bound `project` + `need` reads. |
| `intakeSnapshotOf` | `need-intake.ts` 183–193 | Raw-intake snapshot shape written into audit `detail` on submit. |

**Allowance (already built; Unit 1 extends it)**

| Name | Path | What it does |
|---|---|---|
| `public.discovery_spend` | `20260916120000_discovery_allowance.sql` 4–13 | One row per `(org_id, utc_day)`. `spent`, `granted`. Remaining is never stored (`granted - spent`). Check `spent <= granted`. |
| `public.discovery_allowance` | same file, 58–211 | Actions `read` and `debit`. Debit checks `auth.users.email_confirmed_at`, high-water grant, never-negative remaining. |
| `DISCOVERY_DAILY_GRANT` | `discovery-allowance.ts` 17–20 | `unverified: 10`, `vetted: 30`. Pinned again in `tests/at/harness/atconfig.ts` as `discoveryDailyCreditsUnverified` / `discoveryDailyCreditsVetted`. |
| `dailyAllowanceExhaustedReason` | `discovery-allowance.ts` 50–59 | Unverified: three remedies (vet, fund, wait). Vetted: two (fund, wait). SQL debit raise uses the same words (`20260916120000_…sql` 172–185). |

**Admin, audit, notifications**

| Name | Path | What it does |
|---|---|---|
| `public.audit_events` | `20260908120000_…sql` 14–26 | Append-only. Triggers refuse UPDATE/DELETE/TRUNCATE. |
| `public.audit_event_kind` | created in that file; values added in later files | `'org_contact_transferred'`, `'account_lifecycle_changed'`, `'org_role_changed'`, plus later `'org_escalation_contact_recorded'`, `'org_vetting_changed'`, `'need_intake_submitted'`. |
| `append_audit_event` | last signature in `20260914120000_org_vetting.sql` 14–56 | `(kind, actor, subject_account, subject_org, reason, detail, occurred_at default null)`. Actor label is `{account_type}:{id}` or `'operator'`. Execute revoked from `public`; **not** granted to `service_role` (other definers call it as owner). |
| `public.acknowledgments` | `20260808120000_…sql` 72–79 plus identity columns in `20260811120000_…sql` | **Account-level**, not org-level. Kind `platform_tos_and_promise`. Keys on `account_id`. |
| `public.org_vetting` | `20260914120000_org_vetting.sql` 59–130 | One row per org after first vet. Unreachable by client roles. |
| `TAXONOMY` / `emit` / `emit_notification` | `notification-taxonomy.ts`, `notifications.ts`, `20260913120000_notification_taxonomy_and_outbox.sql` 191–236 | Sole writer of the outbox. Producers call `public.emit_notification(jsonb)` **inside their own definer transaction**. |
| `discoveryMessageAllowed` | `verification.ts` 157–167 | Email-verified floor. Type-blind. Refusal names verification as the remedy. |

---

### Flow

**A. Write route (every registered write, including a future kill switch and a future Discovery send)**

1. Browser `functions.invoke` → `Deno.serve(writeRoute(spec))` in `supabase/functions/<name>/index.ts`.
2. `edgeHandler` answers OPTIONS 204; anything thrown becomes 502 with a sentence (`edge.ts` 112–125).
3. POST only; else 405.
4. `resolveCaller` (`edge.ts` 166). No caller → 401 `"authenticate before calling <name>"`.
5. `readJsonBody`. Malformed → 400.
6. `spec.target` / `spec.subject` / `spec.from` extract ids. Non-UUID → 400 `'invalid-request'`.
7. `loadWriteStanding` → RPC `write_standing` (`edge.ts` 321–333).
8. `writePipeline` (`write-routes.ts` 322):
   - deactivated caller → 403 `'account-deactivated'`
   - no account (except signup) → 409 `'no-account'`
   - type not in `admits` → 403 `'not-a-platform-admin'` or `'not-an-ngo-account'`
   - then `spec.decide(input)` (pure TypeScript in `_shared`)
9. On admit: `callDatabaseFunction(route.surface.rpc, decision.args)` as service role.
10. SQL definer: `assert_account_active`, then re-checks (type, membership, org exists). `RAISE … USING errcode = '…', detail = '<WRITE_REFUSAL_KIND>'`.
11. Edge maps a five-character SQLSTATE to **409** and `kind` from `DETAIL`. Success: 200 `{ ok: true, …spec.render(value) }`.

**B. Platform-admin write (vetting / lifecycle / transfer / escalation — the frame a kill switch must copy)**

1. Inventory row with `standing: { kind: 'account-required', admits: ['platform_admin'] }` (`write-routes.ts` 47–62).
2. Tiny `index.ts`: `Deno.serve(writeRoute({ name, target: organizationIdField, decide, render }))`. Example: `set-organization-vetting/index.ts` 1–10.
3. TypeScript `decide*` refuses unknown keys, missing note/reason, missing org. Does **not** re-check `accountType === 'platform_admin'` — the gate already did.
4. SQL definer (example `set_organization_vetting`, `20260914120000_org_vetting.sql` 187–197):
   - `perform public.assert_account_active(p_account_id)`
   - `select account_type …; if <> 'platform_admin' then raise … detail = 'not-a-platform-admin'`
5. Same pattern in `set_account_lifecycle` (`20260909120000_account_lifecycle_setter.sql` 18–28) and the contact-transfer / escalation definers.
6. If the action is audited: `perform public.append_audit_event('<kind>', actor, subject_account, subject_org, reason, detail [, occurred_at])`.
7. If a notification is owed: TypeScript builds `{ channels, copy }` from the taxonomy (see `vettingOutcomeNotice` in `org-vetting.ts` 83–97). SQL refuses a channel set that is not the class default, then `v_notification_event_id := public.emit_notification(…)` (`20260914120000_org_vetting.sql` 469–483).

**C. NGO org-admin write (intake, allowance, rename, profile)**

1. Inventory `admits: ['ngo']`.
2. TypeScript `orgAdminActionAllowed(input.standing.orgRole)` → `'not-a-member'` / `'not-an-admin'` at 403.
3. SQL re-reads `org_memberships` `FOR SHARE` and raises the same kinds at 409 (`project_need` in `20260918120000_project_need_attach.sql` 69–78; `discovery_allowance` in `20260916120000_…sql` 88–104).

**D. Need intake: start → draft → submit → `discovery_in_progress` (the conversation’s attach point)**

1. `project-need` write, `action: 'start'`. `decideProjectNeed` (`need-intake.ts` 113–129) requires org, title, known urgency.
2. SQL `project_need` (`20260918120000_…sql` 80–113):
   - `assert_account_active`
   - org exists, caller is org admin
   - `has_platform_acknowledgment` (start only) else `'platform-acknowledgment-missing'`
   - `insert into projects (org_id, name)` then `insert into need_intakes (project_id, org_id, description, urgency)` at stage default `'draft'`, `submitted_at` null.
3. `save` patches title/description/urgency via `need_intake_save` (`20260917130000_…sql` 1–53). Title lives on `projects.name`.
4. `attach` appends one metadata object onto `need_intakes.reference_files` jsonb (`20260918120000_…sql` 1–38). Fields: `id`, `file_name`, `media_type`, `byte_size`, `description`, `added_by_account_id`, `added_at`. **No file bytes. No storage bucket.**
5. `submit` (`need_intake_submit` in `20260919120000_project_need_snapshot.sql` 1–27):
   - If already `discovery_in_progress`, return `changed: false` (idempotent).
   - Empty description → `'missing-description'`.
   - Else `stage = 'discovery_in_progress'`, `submitted_at = clock_timestamp()`.
   - `append_audit_event('need_intake_submitted', …, detail = { project_id, org_id, title, description, urgency, reference_files, submitted_at })`.
   - Unique index `audit_events_need_intake_snapshot_once` on `(detail->>'project_id')` where `event_kind = 'need_intake_submitted'` — one raw-intake snapshot per project.
6. Constraint `need_intakes_submitted_iff_started`: `(stage = 'draft') = (submitted_at is null)`.
7. Constraint `need_intakes_draft_has_no_labels`: a draft cannot carry cause labels.
8. Read path: `need-intake` is **not** a write route. `need-intake/index.ts` uses `edgeHandler` + `callerReads` + `needIntakeAnswer`. RLS on `need_intakes` is `viewer_is_org_member(org_id)` and `viewer_is_platform_admin()`. **No assigned-volunteer policy** (the subquery version from an earlier design is not in this tree).

**E. Email-unverified gate (two places, not the generic write gate)**

1. Generic `writeGateDecision` does **not** check email verification. `Caller` has no verified field. `write_standing` does not return one.
2. TypeScript hook: `discoveryMessageAllowed` (`verification.ts` 157). The `discovery-message` **stand-in** in `tests/at/suites/req-001/_fixture.ts` 770–778 calls it with `input.body.emailVerified === true` (a fixture fact, not a request field the real route may trust). Kind there is `'refused'` at 403, not `'email-unverified'`.
3. SQL hook already on the ledger: `discovery_allowance` debit (`20260916120000_…sql` 149–152) reads `auth.users.email_confirmed_at` and raises `detail = 'email-unverified'`. The req-002 fixture mirrors that as 409 (`_fixture.ts` 789–796).
4. AT-004.41 needs the **Discovery message** path to consult (2) and/or (3). Allowance debit already blocks unverified spend.

**F. Notification emit (the pattern a kill-switch or founder-visibility notice would follow)**

1. Look up `taxonomyRow(event)` in TypeScript. Missing row → do not invent one (brief: “Not done here”).
2. `prepareWriteSet` is the only `WriteSet` constructor (`notifications.ts` 173).
3. Product path does **not** call the TypeScript `emit()` from an edge function. The producer definer calls `public.emit_notification(p_write jsonb)` in the same transaction as the state change.
4. `emit_notification` inserts `notification_events`, then deliveries (`emitted_by` must be `'notifications.emitter'`), then optional ops item. Execute revoked from `public`; **no `GRANT EXECUTE` to `service_role`** — only owner/other definers.
5. `strayNotificationWriters()` (`tests/at/suites/req-016/_source-scan.ts` 197) fails any `INSERT INTO` the three outbox tables outside that function body, and any client `.from('notification_*').insert` in product modules.
6. `providerClientImporters()` fails any new file that mentions `deliver(`, `ProviderPort`, or a mail-client import unless that path is declared under `NOTIFICATION_COMPONENTS` as the emitter.

**G. Tenant read**

1. One rule: the database filters. `callerReads` (`edge.ts` 399–428) uses the **caller JWT**, not the service role, against PostgREST.
2. Zero rows and “not yours” are the same 404 `TENANT_NOT_FOUND` (`tenant-reads.ts` 11–14).
3. `anon` holds nothing. `authenticated` holds `SELECT` only on tenant-isolated tables, with policies. `service_role` holds `SELECT` only on `accounts` and `org_memberships` (live pin in `_integration.ts` 166–184).

---

### Files Read

- `loop/items/AI4DEV-132/brief.md`
- `loop/decomp/req-004.md`
- `supabase/functions/_shared/` — all 19 modules: `accounts.ts`, `acknowledgment-copy.ts`, `admin-operations.ts`, `caller.ts`, `discovery-allowance.ts`, `edge.ts`, `github.ts`, `memberships.ts`, `need-intake-copy.ts`, `need-intake.ts`, `notification-copy.ts`, `notification-provider.ts`, `notification-taxonomy.ts`, `notifications.ts`, `org-vetting.ts`, `public-project.ts`, `tenant-reads.ts`, `verification.ts`, `write-routes.ts`
- Edge entries: `complete-signup`, `create-organization`, `update-organization`, `set-organization-profile`, `project-need`, `need-intake`, `discovery-allowance`, `set-organization-vetting`, `set-account-lifecycle`, `transfer-organization-contact`, `set-escalation-contact`, `organization-dashboard`, `project-workspace`, `public-project`
- Migrations: `20260808120000_accounts_org_membership_and_acknowledgments.sql`, `20260811120000_acknowledgment_signer_identity.sql`, `20260811130000_single_seat_org_and_single_developer_projects.sql`, `20260906120000_tenant_read_posture_and_org_member_policies.sql`, `20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql`, `20260908120000_account_lifecycle_audit_and_contact_transfer.sql`, `20260909120000_account_lifecycle_setter.sql`, `20260912110000_audit_event_kind_escalation_contact.sql`, `20260912120000_audit_actor_on_product_paths.sql`, `20260913120000_notification_taxonomy_and_outbox.sql`, `20260913121000_notification_fixture_producers.sql`, `20260914110000_audit_event_kind_org_vetting.sql`, `20260914120000_org_vetting.sql`, `20260915120000_organization_profile.sql`, `20260916120000_discovery_allowance.sql`, `20260917120000_project_need_intake.sql`, `20260917130000_project_need_save_and_submit.sql`, `20260918120000_project_need_attach.sql`, `20260919110000_audit_event_kind_need_intake.sql`, `20260919120000_project_need_snapshot.sql`
- Scans/tests: `tests/at/suites/req-001/_write-route-scan.ts`, `_policy-scan.ts`, `_live-tenant-reads.ts`, `_integration.ts` (catalog + `writeRouteProblems`), `_fixture.ts` (discovery-message stand-in), `tests/at/suites/req-002/_source-absences.ts`, `_fixture.ts` (debit/email), `tests/at/suites/req-016/_source-scan.ts`, `tests/at/suites/req-003/_pending.ts`, `_source-need.ts`, `tests/at/expected/req-003.json`, `tests/at/harness/atconfig.ts`, `config.ts`
- `supabase/config.toml` function blocks

---

### Boundaries

**Inputs this run will sit on**

- A submitted need: `need_intakes.stage = 'discovery_in_progress'` with a non-null `submitted_at` and a snapshot in `audit_events` (`need_intake_submitted`).
- Daily free ledger: `discovery_spend` + `discovery_allowance` read/debit. Unit 1 extends this ledger; it must not create a second one.
- Email verification: Auth’s `email_confirmed_at`, judged by `discoveryMessageAllowed` / the allowance debit raise.
- Org admin of the NGO, or platform admin for the kill switch.
- Platform acknowledgment required to **start** a need; Discovery attaches to a need that already exists.

**Outputs this run must produce through existing doors**

- Write routes: register in `WRITE_ROUTES`, `Deno.serve(writeRoute(`, `[functions.<name>] verify_jwt = true` in `config.toml`.
- New SQL tables: `TENANT_CATALOG` row in `_policy-scan.ts` **and** live catalog (`_integration.ts` `assertTenantCatalog`).
- New audit kinds: own migration `ALTER TYPE … ADD VALUE`, then a later migration that uses it (Postgres forbids using a new enum value in the same transaction — comments in `20260914110000_…sql` and `20260919110000_…sql`).
- New refusal kinds: add to `WRITE_REFUSAL_KINDS` **and** use the same string as SQL `DETAIL`.
- Notifications: existing taxonomy row + `emit_notification` inside the producer definer, or a “Not done here” line. No new taxonomy row in this run (brief).

**Read vs write**

- Write inventory today: `complete-signup`, `create-organization`, `update-organization`, `set-organization-profile`, `project-need`, `transfer-organization-contact`, `set-escalation-contact`, `set-account-lifecycle`, `set-organization-vetting`, `discovery-allowance`, plus stand-in `discovery-message`.
- Read functions (not in `WRITE_ROUTES`; they import `callerReads` / `publicProjectReads` and do not match the scan’s “reaches the database” regex in their own `index.ts`): `organization-dashboard`, `project-workspace`, `need-intake`, `public-project`.
- Promoting `discovery-message` from stand-in to edge: change `surface` to `{ kind: 'edge', rpc: '…' }`, add `supabase/functions/discovery-message/index.ts`, add `config.toml` block. A stand-in cannot be served (`edge.ts` 342).

**Fuel / Stripe / checkout — confirmed absent**

Grep of `supabase/migrations/` and `supabase/functions/_shared/`:

- No Stripe, no checkout table, no fuel-balance column, no project funding state.
- `projects` never gains a column after creation (`alter table public.projects` appears only to enable RLS).
- `fuel.threshold_20`, `fuel.threshold_5`, `fuel.depleted` are **notification event names** only (`notification-taxonomy.ts` 80–82, seed in `20260913120000_…sql` 73–75).
- `discovery_spend` is the **free daily credit** ledger, not fuel.
- `notification_fixture_transitions` is a stand-in ledger for guarded notification rows until real money producers exist (`20260913121000_…sql` 19–27).
- `fundingAllowed` in `org-vetting.ts` 73–75 always permits and states “NO CHECKOUT CONSULTS IT YET”.
- `src/lib/config.server.ts` has a commented `stripeSecretKey`.
- req-002 expected-state already names pending capabilities `checkout.project-fuel` and `billing.funded-turn` (`tests/at/expected/req-002.json`).

The brief’s “no fuel ledger exists” is true.

**Disabled / kill-switch state today**

- Per-**account** `accounts.lifecycle` = `active | deactivated`. Deactivation blocks **every** write (`writeGateDecision` + `assert_account_active`), including profile, intake, allowance.
- No per-org disabled / Discovery-off / kill-switch column on `organizations` (columns: `id`, `name`, `created_at`, `mission`, `country`, `website`, `logo`).
- Reusing account deactivation for a Discovery kill switch would also kill intake, rename, profile, and allowance. A Discovery-only switch needs a new column (likely on `organizations`) or a new table.

---

### Non-Obvious Things

1. **SQL backstop always returns HTTP 409**, even when TypeScript would have used 400 or 403. TypeScript is the first layer (400/403). If a request reaches SQL, `rpcRefusalStatus` maps any raised exception to 409. Live allowance email-unverified is 409; the discovery-message stand-in is 403 `'refused'`. A real Discovery send should pick one and keep TypeScript kind, SQL `DETAIL`, and tests aligned.

2. **`discovery-allowance` `read` is a write route.** It goes through `writeRoute` and the org-admin gate. The SQL read path does not insert a spend row; it computes remaining from the day’s row or the current-tier grant. Transparency’s “remaining credits” already exists here. Per-turn cost does not.

3. **Email verification is not a generic write-gate.** Only allowance debit (SQL) and the Discovery-message hook (TypeScript) check it. `project-need` does not. Extending `Caller` or `write_standing` is a design choice; today neither carries verified.

4. **`acknowledgments` is account-level, not org-level.** The brief’s “org-level acknowledgments table” is this table keyed on `account_id` with kind `platform_tos_and_promise`. There is no org-scoped acknowledgments table.

5. **New audit enum values need two migration files.** Postgres refuses `ADD VALUE` and use in one transaction. Intake did this as `20260919110000_audit_event_kind_need_intake.sql` then `20260919120000_project_need_snapshot.sql`. Vetting and escalation did the same.

6. **“No subquery in USING” is a design rule, not a scanner rule.** `_policy-scan.ts` only requires `auth.uid()` or `public.viewer_*` in USING, forbids tautology / `to anon` / `for all`, and forbids non-`viewer_` function calls. It does **not** detect `EXISTS (SELECT … FROM other_table)`. `need_intakes` denormalises `org_id` so the member policy is `viewer_is_org_member(org_id)` with no join. `(select auth.uid())` wrapping is the PostgREST initplan pattern and is already used (`projects_select_assigned_volunteer`, `notification_deliveries_own_inapp`). A conversation table that needs volunteer visibility must denormalise a column or add a `viewer_*` helper — not `EXISTS (SELECT FROM projects)`.

7. **A new `viewer_*` helper has a fourth pin.** Static: definer, `search_path = ''`, revoke from `public`, grant execute to `authenticated`. Live: `_integration.ts` 167 hard-codes `VIEWER_FUNCTIONS = { viewer_is_org_member, viewer_is_platform_admin, viewer_is_volunteer }`. A fourth helper that grants execute to `authenticated` fails AT-001.21/22 live until that set is updated.

8. **`emit_notification` is not callable from `writeRoute`.** No execute grant to `service_role`. The producer definer (which runs as owner) must call it. Copying the TypeScript `emit()` into an edge handler would also trip `providerClientImporters` / `strayNotificationWriters` if it writes the outbox or talks SMTP.

9. **Taxonomy is closed.** Forty-eight rows, seeded in SQL, declared in TypeScript, compared both ways (`taxonomySeedProblems`). No row named kill-switch, Discovery-disabled, off-topic, or founder-visibility. Closest Discovery rows: `discovery.fit_declined`, `discovery.fit_decline_review` (`opsItem: true`, recipient `platform_admin`), `discovery.decline_overturned`. Those are fit-decline, not abuse. Brief: if a notice is owed and no row fits, write “Not done here”, do not add a row.

10. **Zero-credit remedies already split by tier in the allowance debit raise.** Unit 3 may be a change to that sentence / reason, not a second copy. TypeScript `dailyAllowanceExhaustedReason` and SQL must stay in lockstep (req-002 `_source-pins.ts` already pins this).

11. **`WRITE_ROUTES` is `as const satisfies`.** Adding a route is a type change. `WriteRouteName` and every `WriteRouteSpec.name` follow. The scan also requires the req-001 fixture to mention a stand-in as `writeGateDecision('<name>'` or `name: '<name>'`.

12. **Shared `_shared/*.ts` must not mention `/rest/v1/`, `createClient`, `.rpc(`, or service-role key names.** Only `edge.ts` may, and only inside `callDatabaseFunction`, `publicProjectReads`, and `callerReads`. A new module that fetches PostgREST fails `shared-module-reaches-database`.

13. **Discovery wallet absence oracle will fire on names.** `scanDiscoveryWallet` (`req-002/_source-absences.ts`) refuses identifiers/copy that pair “discovery” with wallet / buy / purchase / top-up / holdable balance. Daily-grant words (`grant`, `spent`, `remaining`, `debit`, `allowance`) are allowed. Do not name a table `discovery_balance` or a route `discovery-topup`.

14. **No circuit breaker exists** (grep of `supabase/` for circuit/breaker/global cap is empty). Absence proofs for AT-004.43/44 should follow `_source-absences.ts`: throw if the instrument cannot read the tree; return a problem list if a forbidden path appears.

15. **`discovery_spend` is `unreachable-by-client-roles`.** RLS enabled, `REVOKE ALL` from anon/authenticated/service_role, no SELECT grant, no policy. Remaining credits are read only through the `discovery_allowance` RPC (service_role execute) via the edge route. A per-turn cost table should likely be the same posture, with a definer read, unless the surface is meant to be a caller-bound SELECT.

16. **Need attach stores metadata only.** Unit 4’s conversation may cite `reference_files` metadata. Actual bytes and Discovery-visible flags are REQ-032, not this tree.

17. **Public project hides any need.** `projectIsPublic` is `need_stage === null` (`public-project.ts` 19–21). Once intake exists, the public page 404s. Discovery does not change that.

---

### Open Questions

- I did not trace every line of `github.ts` stub stats or the SMTP session in `notification-provider.ts`; neither is on the Discovery write path.
- I did not read the full `set_organization_vetting` grant-execute tail after line 499, or every admin definer body after the platform-admin check (transfer remaining, escalation remaining). The check itself is the same `account_type <> 'platform_admin'` + `detail = 'not-a-platform-admin'` in all five places listed under Boundaries.
- Whether Unit 4 **promotes** the existing `discovery-message` stand-in or adds a differently named route is a design choice. The stand-in already occupies the inventory name `discovery-message` and is gated in the req-001 fixture. A second name would be a second inventory row.
- How a turn learns provider cost, and whether an underfunded turn is refused or capped, is explicitly left to design (brief Unit 1). Nothing in this tree records per-turn cost today.
- How funded routing is proven without a fuel ledger is left to design (brief Unit 2). There is no project funding column to read; a pure function needs a seam (argument, stub table, or pending capability `billing.funded-turn`).
- I did not confirm whether `scanWriteGateSql` treats `create or replace` of `append_audit_event` as a mutating definer that needs `assert_account_active`. It would only flag it if execute were granted to `service_role`. Currently it is not.
- Live catalog’s tautology check on policies does not re-run the “USING must name auth.uid or viewer_” rule; that is static-only. A live policy that used a table subquery would still pass AT-001.21 live as long as it is not `true`/`1=1`.

---

### Constraints a new table, route, definer, or notification in this run must respect

**Table**

1. `CREATE TABLE` then `REVOKE ALL ON TABLE … FROM anon, authenticated, service_role` (all three, or `no-baseline-revoke`).
2. `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (isolated and unreachable both do this today).
3. **Never** `FORCE ROW LEVEL SECURITY`, `GRANT … TO anon`, `GRANT … TO public`, `GRANT … ON ALL TABLES`, `ALTER DEFAULT PRIVILEGES`.
4. Declare in `TENANT_CATALOG` (`_policy-scan.ts` 21–38) as `'tenant-isolated'` or `'unreachable-by-client-roles'`.
5. Isolated: `GRANT SELECT` to `authenticated` only; at least one `CREATE POLICY … FOR SELECT TO authenticated`; USING names `auth.uid()` or `public.viewer_*`; no tautology; no `FOR ALL`; no `TO anon`; no non-`viewer_` function in USING; **no table-reading subquery** (design, not scanned). Denormalise `org_id` if the member policy needs it.
6. Unreachable: no remaining `authenticated` grant (live expects `authenticated: []`).
7. `service_role` must not hold INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/`ALL`. Live also expects no SELECT except on `accounts` and `org_memberships`.
8. Live: every `public` table must be in the catalog and vice versa (`_integration.ts` 174–195).

**Viewer helper**

- Name `viewer_*`, `SECURITY DEFINER`, `SET search_path = ''`, no argument that names another person, `REVOKE EXECUTE FROM public`, `GRANT EXECUTE TO authenticated`.
- Add the name to `VIEWER_FUNCTIONS` in `tests/at/suites/req-001/_integration.ts` or live fails.

**Write route**

1. Row in `WRITE_ROUTES` with `surface.kind: 'edge'` and the RPC name.
2. `supabase/functions/<name>/index.ts` is exactly one `Deno.serve(writeRoute({ name: '<name>', … }))`.
3. No `callDatabaseFunction` / REST / service-role key in that file.
4. `[functions.<name>] verify_jwt = true` in `config.toml`.
5. `decide` lives in `_shared`, pure, relative imports only.
6. Platform-admin: `admits: ['platform_admin']`. SQL re-checks `account_type` and raises `detail = 'not-a-platform-admin'`.
7. NGO org-admin: `admits: ['ngo']` plus `orgAdminActionAllowed`; SQL re-checks membership.
8. New refusal: add to `WRITE_REFUSAL_KINDS`; SQL `USING DETAIL =` that exact string.
9. SQL errcode convention in this tree: `42501` privilege/authz, `22023` bad parameter, `23503` missing org/FK, `P0001` business rule (exhausted, missing description).
10. Mutating definer granted to `service_role`: call `public.assert_account_active`; `REVOKE EXECUTE FROM public` (and typically from `anon, authenticated` too); `GRANT EXECUTE TO service_role`; `SET search_path = ''`. Do not UPDATE/DELETE `audit_events`.
11. `complete_signup` is the only write-gate exemption.

**Audit**

- Append only via `append_audit_event`. New kind = its own `ALTER TYPE` migration, then a following migration that writes it.
- `reason` and `actor_label` must be non-blank (table CHECKs).

**Notification**

- Do not add a taxonomy row in this run.
- If emitting: producer definer calls `public.emit_notification` after the state write, same transaction; `emitted_by` must be `'notifications.emitter'`; channels must match the class default if you copy the vetting pattern.
- Do not import `ProviderPort` / `deliver(` / mail clients in a new module.
- Do not `INSERT INTO notification_events|deliveries|ops_items` outside `emit_notification`.
- Adding a path under `NOTIFICATION_COMPONENTS` for a new sender with `canSendDirectly: true` would fail AT-016.01 (exactly one sender).

**Intake attach for Discovery**

- Conversation starts from `discovery_in_progress`.
- Snapshot is in `audit_events.detail` for `need_intake_submitted`, once per `project_id`.
- Reference files are jsonb metadata on the need row, with base vs Tier-2-hardened disclosure from `tier2_classified_at` (monotonic; cannot be cleared).