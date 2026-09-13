### Components Found

| Name | Path | What it does |
|---|---|---|
| `createNotifications` / `EMITTER_COMPONENT` | `supabase/functions/_shared/notifications.ts` | Pure notification core: one emitter, one worker, six ports. `emit` prepares a branded `WriteSet` and hands it to `OutboxPort.append`. The unique symbol `WRITE_SET` is the type half of “sole writer”. |
| `SENDER_DECLARATIONS` / `NOTIFICATION_COMPONENTS` | `supabase/functions/_shared/notifications.ts` lines 53–70 | Architecture self-report: only `notifications.emitter` may send. Blockers, scope, and lifecycle are declared as non-senders. Path prefixes map files to those components for the source scan. |
| `TAXONOMY` | `supabase/functions/_shared/notification-taxonomy.ts` | Closed 48-row event table. No add path. `runtimeRegistrationSurface()` returns `[]`. Seeded names live in `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`. |
| `public.emit_notification(p_write jsonb)` | `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql` lines 191–240 | The one SQL writer of the outbox. Execute is revoked from public. Only an owner-definer may call it. Inserts event, deliveries, optional ops item. |
| `providerClientImporters` / `strayNotificationWriters` / `taxonomySeedProblems` | `tests/at/suites/req-016/_source-scan.ts` | Three source oracles. AT-016.01 asserts importers `=== ['notifications.emitter']` and stray writers `=== []`. Scans `supabase/functions`, `supabase/migrations`, and `src`. |
| `assertEmitterIsSoleWriter` | `tests/at/suites/req-016/_integration.ts` lines 52–107 | Shared sole-writer proof: source scans, self-report, then a sentinel in each of blockers / scope / lifecycle reaching a recipient only via the emitter. |
| `WRITE_ROUTES` | `supabase/functions/_shared/write-routes.ts` lines 23–70 | Mandatory write-route inventory. Nine edge rows plus stand-in `discovery-message`. A new write folder that reaches the database without an edge row fails `write-route-unregistered`. |
| `writeRoute` | `supabase/functions/_shared/edge.ts` lines 336–379 | The only legal write constructor: JWT caller, `write_standing`, `writePipeline`, one RPC via `callDatabaseFunction`. |
| `projectIsPublic` / `publicProjectAnswer` | `supabase/functions/_shared/public-project.ts` | Public project page. Comment at lines 19–21: `projects` has **no visibility or lifecycle column**; every row is public today. |
| `organizationDashboard` / `projectWorkspace` | `supabase/functions/_shared/tenant-reads.ts` | Authenticated read projections. Project workspace returns `id`, `name`, `org_id`, `assigned_volunteer_id` only. |
| `orgAdminActionAllowed` | `supabase/functions/_shared/memberships.ts` lines 96–114 | Admin-role gate. Distinguishes `not-a-member` vs `not-an-admin`. AT-003.04 uses this gate, not the NGO. |
| `discoveryMessageAllowed` | `supabase/functions/_shared/verification.ts` | Email-verification floor for any Discovery message. Comment: **no deployed Discovery caller yet**. The `discovery-message` stand-in must consult it. |
| `DISCOVERY_DAILY_GRANT` / `dailyAllowanceExhaustedReason` | `supabase/functions/_shared/discovery-allowance.ts` | Daily credits: 10 unverified, 30 vetted. Exhausted sentence names three remedies. Unit 6 reads this ledger; it does not rebuild it. |
| `publishingAllowed` | `supabase/functions/_shared/org-vetting.ts` lines 59–65 | Pure publish gate over the vetted flag. No publish route consults it. |
| `ACKNOWLEDGMENT_IDENTITY_COPY` | `supabase/functions/_shared/acknowledgment-copy.ts` | Shipped signup-acknowledgment copy. Precedent for a disclosure constant. File-policy disclosure is **not** here. |
| `LIFECYCLE_STATES` | `tests/at/harness/fixtures.ts` lines 1–11 | Nine-state list used by the harness fixture world. **Not** a SQL enum. Values: `draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`, `completed`, `cancelled`. |
| `public.projects` | `supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql` lines 57–66 | Columns: `id`, `org_id`, `name`, `assigned_volunteer_id`, `created_at`. Comment: product project creation is **not** landed; `has_platform_acknowledgment` is the hook the creation leaf must call. |
| `TENANT_CATALOG` | `tests/at/suites/req-001/_policy-scan.ts` lines 21–37 | Every public table must be declared `tenant-isolated` or `unreachable-by-client-roles`. A new table without a row fails CI. |
| `AWAITED` / `awaiting` | `tests/at/suites/req-002/_pending.ts` | Pattern for a red id: throw `CapabilityPending` with named surfaces; `tests/at/expected/req-002.json` declares the same shape. |
| `AdapterModules` | `tests/at/harness/suite-adapters.ts` lines 107–112 | Registered suites today: `req-001`, `req-002`, `req-016` only. A `req-003` suite cannot bind until it is added here. |
| Design intake mock | `design/screens/project-intake.html` | Static HTML. Title, problem, **cause-tag picker**, urgency (`soon` / `this-quarter` / `no-deadline`), optional files, “Draft saved just now”, Start Discovery. Not wired. |
| Design reference-files mock | `design/screens/reference-files.html` | Static HTML. Base disclosure copy and Tier-2 fixtures-only modal. Closest thing to file-policy copy in the tree. |

---

### Flow

There is **no product intake flow** yet. What exists is the surrounding contract a new route must join.

**1. How a write happens today (the path a need write must reuse)**

1. Browser or live adapter POSTs to `http://127.0.0.1:44321/functions/v1/<name>` with a JWT. Live helper: `functionPost` in `tests/at/harness/live-stack.ts` lines 159–168.
2. `Deno.serve(writeRoute({ name, decide, render }))` in `supabase/functions/<name>/index.ts`. Example: `set-organization-profile/index.ts` lines 13–18.
3. `writeRoute` (`edge.ts` 336–379) refuses non-POST, unresolved caller, bad UUID, then loads `write_standing`.
4. `writePipeline` (`write-routes.ts` 309–319) runs `writeGateDecision` (deactivation, account type) then `spec.decide`.
5. One `callDatabaseFunction(rpc, args)` as service role. SQL definer does the write. `assert_account_active` is required unless the function is in `WRITE_GATE_EXEMPT` (only `complete_signup`).
6. JSON `{ ok: true, ...render(value) }` or `{ ok: false, kind, reason }`.

**2. How a project is read today (do not invent a second shape)**

1. Authenticated: POST `project-workspace` with `{ projectId }` → `projectWorkspace` in `tenant-reads.ts` 96–114. Returns name, org, assigned volunteer. No title-as-need, description, urgency, state, labels, files.
2. Public: POST `public-project` (`verify_jwt = false`) → `publicProjectAnswer`. `projectIsPublic` is `true` for every row because there is no lifecycle column.

**3. How a notification is emitted (what a new route must not do)**

1. TypeScript `prepareWriteSet` builds a branded `WriteSet` (`notifications.ts` 173–206).
2. A **producer definer**, not an edge function, calls `public.emit_notification` in the **same transaction** as its own state change. Live producer: `set_organization_vetting` at `supabase/migrations/20260914120000_org_vetting.sql` lines 469–483. Fixture stand-in: `fixture_commit_transition_and_emit` in `20260913121000_notification_fixture_producers.sql` lines 33–57.
3. Worker `apply_delivery_results` marks sends. Email goes through `notification-provider.ts` to local SMTP on port 44325.
4. Brief fact 4: **no id in this run emits**. If design finds one is owed, it is a “Not done here” line, not a new taxonomy row.

**4. What a new write route must not do around the emitter**

- Do not `insert into public.notification_events|deliveries|ops_items` outside `emit_notification`. `strayNotificationWriters` fails the file.
- Do not `.from('notification_*').insert` from a product module.
- Do not import a mail client, hold `RESEND_API_KEY` / `SMTP_PASS`, mention `ProviderPort`, or call a function named `deliver(` — `providerClientImporters` uses `/\bdeliver\b\s*\(/` (`_source-scan.ts` 49–53). A helper named `deliver(` on an intake route would false-positive as a second sender.
- Do not call `emit_notification` from an edge function. Resume constraint 3: only an owner-definer.
- Do not add a taxonomy row. AT-016.02 is a closed bijection with the seed.
- Do not list a new file under `NOTIFICATION_COMPONENTS` unless it is the emitter. An undeclared send-path file is reported as `undeclared:<path>`.
- `blockers.ts`, `scope.ts`, `lifecycle.ts` **do not exist**. They are declared prefixes so a future file is classified, not so they can be created here.

**5. How the NGO-profile suite proves a write (the shape req-003 must copy)**

Loop: `_fixture.ts` runs shipped `decide*` over in-memory storage.  
Integration: `_live.ts` `postWrite` → `functionPost` against the deployed function. Operator SQL reads rows back.  
Red ids: `atTest(..., awaiting(AWAITED.someSurface))` plus a matching `capability-pending` object in `tests/at/expected/req-002.json`.

**6. Front-end path today**

1. TanStack Start serves `/` from `src/routes/index.tsx`: a heading “ai4good”. `src/routeTree.gen.ts` lists only `/`.
2. No screen calls an edge function. Grep of `src/**` found no `functions/v1`, no `createClient`, no `.from(`.
3. `src/lib/api/example.functions.ts` is a template `createServerFn` that says to use that pattern **instead of** edge functions. That contradicts the standing rule that UI goes through an edge function and never the database.
4. Autosave exists only as copy in `design/screens/project-intake.html` (`data-testid="draft-saved-indicator"`). Brief unit 2: autosave is a **data contract** (write route persists; later read returns it). The typing screen is the wiring leaf, not this run.

**7. Storage path today**

There is none. `[storage]` in `supabase/config.toml` lines 125–135 is enabled with `file_size_limit = "50MiB"` and **no buckets**. No migration creates `storage.buckets`. Access in product terms is AT-032.05: short-lived authorized links; the UI never holds storage credentials.

---

### Files Read

- `loop/items/AI4DEV-120/brief.md`
- `.taskmaster/docs/acceptance/at-req-003.md`
- `loop/decomp/req-003.md`, `req-004.md`, `req-005.5.md`, `req-016.md`, `req-032.md`, `README.md`
- `loop/out/pure-s3-req-001-006.md`, `loop/out/pure-s6-req-027-036.md`
- `.taskmaster/docs/acceptance/at-req-032.md`, `at-req-005.5.md`, `at-req-004.md` (selected)
- `loop/items/AI4DEV-102/resume.md`, `loop/items/AI4DEV-102/design/SYNTHESIS.md`
- `supabase/functions/_shared/notifications.ts`, `notification-taxonomy.ts`, `notification-copy.ts`, `write-routes.ts`, `edge.ts` (writeRoute), `tenant-reads.ts`, `public-project.ts`, `org-vetting.ts`, `verification.ts`, `discovery-allowance.ts`, `memberships.ts`, `acknowledgment-copy.ts`
- `supabase/functions/project-workspace/index.ts`, `public-project/index.ts`, `set-organization-profile/index.ts`
- `supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql`, `20260908120000_account_lifecycle_audit_and_contact_transfer.sql`, `20260913120000_notification_taxonomy_and_outbox.sql`, `20260913121000_notification_fixture_producers.sql`, `20260914120000_org_vetting.sql` (emit site)
- `supabase/config.toml`
- `tests/at/suites/req-016/_source-scan.ts`, `_integration.ts`, `a-emitter-and-taxonomy.test.ts`
- `tests/at/suites/req-002/_bind.ts`, `_contract.ts`, `_pending.ts`, `_fixture.ts`, `_live.ts`, `_source-scan.ts`, `_source-absences.ts`, `a-org-profile.test.ts`, `e-gates.test.ts`
- `tests/at/suites/req-001/_policy-scan.ts`, `_write-route-scan.ts`
- `tests/at/expected/req-002.json`, `tests/at/expected/README.md`
- `tests/at/harness/fixtures.ts`, `suite-adapters.ts`, `live-stack.ts`
- `src/router.tsx`, `src/routes/index.tsx`, `src/routes/__root.tsx`, `src/routes/README.md`, `src/routeTree.gen.ts`, `src/lib/api/example.functions.ts`, `src/lib/config.server.ts`
- `design/screens/project-intake.html`, `design/screens/reference-files.html`
- `design/ui-ux-instructions.md` (Batch 2 table)
- `design/gate-reports/004-batch2-intake-discovery-publish.md`

---

### Boundaries

**Inputs this run may consume**

- Auth: account types, org admin role, email verification, `has_platform_acknowledgment`, write-route inventory, tenant catalog, append-only `audit_events`.
- NGO profile: `discovery-allowance` read/debit, grants 10/30 in `tests/at/harness/atconfig.ts`.
- Notifications: existing emitter. Consume only; do not extend the taxonomy.
- Existing project reads: `project-workspace` and `public-project` define the current project **shape**. A need must not become a second, incompatible projection without a design decision.

**Outputs this run is expected to add (from the brief, not yet in the tree)**

- `tests/at/suites/req-003/` and `tests/at/expected/req-003.json`.
- One line in `AdapterModules` for `'req-003'`.
- Thirteen `atTest` call sites. Retired ids 06, 08, 13, 15 stay out.
- Write routes registered in `WRITE_ROUTES` + `[functions.<name>] verify_jwt = true`.
- New public tables: baseline revoke, RLS, `TENANT_CATALOG` row, posture. New audit enum values in their **own** migration files.

**Surfaces owned elsewhere (cross-contracts)**

| Surface | Owner | What REQ-003 may do |
|---|---|---|
| File format/size caps, metadata listing, access, short-lived links | REQ-032 | Consume disclosure **copy as a fixture**. Do not land the file-policy contract. |
| Tier-2 classification event | REQ-004 D5.L1 | Stub until Discovery lands. Hardening triggers on classification, not on the next upload. |
| Cause-label generation | REQ-004 D4.L4 | Negative claim only: a pre-Discovery draft shows zero labels. Stub the producer. |
| `draft → discovery_in_progress` engine, verification/capacity remedies | REQ-005.5 D1.L1 / D2 | Design how to prove the transition until the engine exists. AT-003.13 is retired into 005.5. |
| NGO profile / vetting | REQ-002 | Not exercised. Any NGO drafts. Vetting gates publishing, not Discovery. |
| Cross-NGO isolation | REQ-001 | AT-003.15 retired. Gate is the admin **role**. |
| Intake **screens** (form, upload, submit) | REQ-003 D3.LW | **Not in this run.** Brief: no screen renders the disclosure here. |
| Wiring under `src/` | wiring leaf | NGO-profile synthesis: “Nothing under `src/`.” Same for this run. |

**UI ↔ database**

The rule is: UI never touches the DB; it calls an edge function. Today the UI calls **neither**. The only HTTP examples are acceptance live adapters posting to `/functions/v1/<name>`.

**Storage**

Local API is port **44321** (`/storage/v1` rides that). DB 44322, Studio 44323, mail web 44324, SMTP 44325. Auth `site_url` is `http://127.0.0.1:3000`. No product bucket. Default cap 50MiB is stack config, not the REQ-032 per-file/per-project caps (those are at-config pins, not landed).

---

### Non-Obvious Things

**1. The nine lifecycle states are vocabulary, not schema.**  
`LIFECYCLE_STATES` lives only in `tests/at/harness/fixtures.ts`. No SQL enum, no `projects.status` column. `publicProject.ts` 19–21 states that absence. `project-workspace` cannot return `draft` or `discovery_in_progress` today.

**2. `public.projects` is a single-developer seat, not a need.**  
Columns are org, name, volunteer seat. Comment says product creation is not landed. Design must decide: extend this table or add a need table joined to it. Brief unit 1 asks that explicitly.

**3. Design mocks still have a cause-tag picker.**  
`design/screens/project-intake.html` line 27 and `design/ui-ux-instructions.md` line 314 still list cause tags. d90 removed the cause field from intake. Gate report 004 still flags “cause taxonomy unresolved”. The PRD and AT-003.02/17 win over the mock.

**4. File-policy disclosure copy is not a shipped constant.**  
REQ-032 D3.L1 and AT-032.06 own the words. They exist as HTML in `design/screens/reference-files.html` (`data-testid="data-disclosure-notice"` and `tier2-ack-modal`) and as PRD prose. There is no `file-policy-copy.ts`. Brief unit 4: backend proves the disclosure the upload route **serves** (copy or a flag the screen must render). Design must say which.

**5. AT-032’s boundary note and the decomp disagree on who owns “tier”. **  
`at-req-032.md` line 5: “tier definitions REQ-003’s”. `loop/decomp/req-003.md` and `req-004.md`: the classification **event** is produced by REQ-004 D5.L1; REQ-003 consumes a stub. Treat REQ-004 as the producer.

**6. `deliver(` is a landmine.**  
The sole-writer scan treats any `deliver(` in `supabase/functions`, `migrations`, or `src` as a send path. Do not name an upload helper `deliver`.

**7. A `WRITE_ROUTES` row is a claim the auth suite will drive the route.**  
SYNTHESIS: no row for a surface that does not exist. A stand-in (`discovery-message`) is the pattern for a decision without a folder. A real write folder without a row fails `write-route-unregistered`.

**8. `emit_notification` is not granted to `service_role`.**  
Vetting grants execute on `set_organization_vetting` to `service_role`; that definer calls emit as owner. An edge function cannot emit.

**9. New audit enum values need their own migration.**  
Precedent: `20260914110000_audit_event_kind_org_vetting.sql` is a one-line `ALTER TYPE ... ADD VALUE` **before** the table that uses it. Postgres cannot add an enum value and use it in the same transaction.

**10. Exactly three `viewer_` helpers.**  
`viewer_is_org_member`, `viewer_is_platform_admin`, `viewer_is_volunteer`. A fourth fails the live catalog check.

**11. Template leftover contradicts the UI rule.**  
`src/lib/api/example.functions.ts` lines 11–12 tells authors to use TanStack `createServerFn` instead of edge functions. Do not follow it.

**12. Autosave is not a debounce in the browser.**  
Brief: “each change persists through the write route with no explicit save call, and a later read returns it.” AT-003.06 (crash/network recovery) is retired.

**13. No id here should emit, even at submission.**  
REQ-016 taxonomy has no `intake.submitted` / `discovery.started` row. Starting Discovery is a lifecycle transition (REQ-005.5), not a notification.

**14. `architecture-notes#req-003` is a decomp source label, not a file in this tree.**  
I found no `architecture-notes` document. The live sources are the PRD, AT file, and decomp.

**15. Integration runs reset the stack.**  
Gotcha: a check that starts during reset sees 502s. Re-run before blaming the diff. Never paste `bun run db:start` output (secret key).

**16. Grants 10 and 30 are pinned in `tests/at/harness/atconfig.ts`.**  
Never write those numerals in a test body.

---

### Vocabulary already in the tree

| Term | What it already means |
|---|---|
| `discovery_in_progress` | Second of nine lifecycle states in PRD REQ-005.5, AT-005.5.01, and `LIFECYCLE_STATES`. Not a SQL type. Transition `draft → discovery_in_progress` is REQ-005.5’s engine (decomp edge D1.L1 → REQ-003 D3.L1). |
| `draft` | First lifecycle state. Any NGO including unvetted may create one (AT-005.5.05). `projects` has no such column. |
| `Tier-2` | Data-sensitivity tier from REQ-004: special-category / high-volume PII; fixtures-only during build; real data never reaches Anthropic, Lovable, or the volunteer. No `tier_2` column, enum, or event in SQL or TypeScript product code. |
| `classification` | In this requirement: Discovery assigning a data-sensitivity tier. Produced by REQ-004 D5.L1. Stubbed fixture for AT-003.10. Other hits of the word are test-oracle jargon, not this event. |
| `cause` / `label` | Machine-generated 0–3 normalized cause labels (d90). Producer REQ-004 D4.L4. NGO may delete, never type. No cause-label table or column. Intake must not have a cause field. Design HTML still shows one. |
| `urgency` | Intake field in PRD REQ-003 and AT-003.02. Design values: `soon`, `this-quarter`, `no-deadline` (`project-intake.html` `data-testkey`s). No SQL type. Unrelated marketing “no urgency” copy on the landing mock. |
| `snapshot` / raw intake | AT-003.14/16: retained audit snapshot of submitted raw intake, immutable under later edits. Not implemented. Closest analog: append-only `public.audit_events` with `detail jsonb` for org/vetting events — different subject. |
| `disclosure` / `data-responsibility` | REQ-032 / AT-032.06 / AT-003.09: redacted or sample data only; ai4good and the volunteer will see the files. Copy in design HTML, not shipped TS. |
| `fixtures-only` | Tier-2 hardened acknowledgment (AT-003.10, AT-032.06): made-up records only; NGO connects real data itself after completion. Design modal in `reference-files.html` 27–35. |
| `REQ-032` | Need attachments: upload primitive, caps, access, disclosure, listing. Disclosure copy is a fixture consumed here. Format/size/metadata are out of scope (AT-003.08 retired). |
| `REQ-004` | Discovery agent: conversation, credits, **tier assignment**, **cause-taxonomy producer**, fit decline. Classification event and labels come from here. |
| `REQ-005.5` | Lifecycle state-transition table: nine states, every legal edge, intake→Discovery **gates and remedies**. AT-003.13 retired into this suite. |

**PRD quotes (verbatim from `loop/out/pure-s3-req-001-006.md` and `pure-s6-req-027-036.md`)**

REQ-004, classification and cause (lines 60–63 of `pure-s3`):

> **Data-sensitivity tiers** (Discovery asks what data the tool will handle before assigning one): Tier 0 (no restriction); Tier 1 (ordinary PII — a minimization reminder and NGO data-responsibility acknowledgment); Tier 2 (special-category or high-volume PII — synthetic/anonymized fixtures only during build, the NGO connecting real data itself after completion; real Tier-2 data never reaches Anthropic, Lovable, or the volunteer).

> **Cause-taxonomy generation is self-generated and normalizing, never curated.** … A project shown before Discovery has run (a `draft`) legitimately carries no cause labels at all.

REQ-005.5, transition engine (lines 76–85 of `pure-s3`):

> Nine states: `draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`, `completed`, `cancelled`. Every transition has an actor, preconditions, side effects, and failure handling.

> draft → Discovery requires submitted intake, an email-verified NGO admin, and Discovery capacity (free credits or funded fuel); otherwise the transition is blocked and the NGO is shown its remedies (verify, fund now, or return later).

REQ-032, file policy (lines 23–27 of `pure-s6`):

> PII is governed by disclosure: the NGO is told to provide redacted/sample data only, not real beneficiary records, and that ai4good and the volunteer will see the files. Tier-2 adds a hard acknowledgment restating fixtures-only — the NGO connects real data itself, in its own environment, after completion. There is no upload scanning in v1; the NGO owns the risk per the data-responsibility acknowledgment (→ RM-37).

---

### Constraints that carry over from the NGO-profile run

From `loop/items/AI4DEV-102/resume.md` **Standing constraints** (lines 154–170) and **Gotchas** (172–193), plus `SYNTHESIS.md` “What the build does not do”:

1. Clock after the row lock, with `clock_timestamp()`, never at transaction start.
2. Unvetted org keeps credits until the next UTC day; store spent + high-water `granted`; remaining is the difference.
3. `public.emit_notification` is callable only by an owner-definer, never by an edge function.
4. Notification taxonomy is closed. Named copy is separate from registration.
5. A new audit enum value needs its own migration file.
6. Every new public table: baseline revoke from anon/authenticated/service_role, RLS, `TENANT_CATALOG` row, posture.
7. No fourth `viewer_` helper.
8. No `WRITE_ROUTES` row for a route that does not exist. A row is a claim.
9. Grants 10 and 30 live in `tests/at/harness/atconfig.ts`. Do not hard-code them in tests.
10. No new harness machinery (no new sentinels, faults, vendor stand-ins, fixture worlds, or capabilities).
11. Nothing under `src/` in this run (wiring leaf later).
12. PowerShell only; never paste `bun run db:start`; a writer lane can stop the stack; integration 502s during reset are environment, not the diff; `grok.exe` needs `$env:USERPROFILE\.grok\bin`; launch the external runner as `bun <path>`, not the bare path.

---

### Open Questions

- I could not find an `architecture-notes` file. Decomp cites `architecture-notes#req-003`. If it exists, it is outside this worktree.
- Whether the need is a row on `public.projects` or a joined table is a **design** question the brief assigns to the arena. I did not pick.
- How to prove `draft → discovery_in_progress` until REQ-005.5’s engine exists is also a design question (brief unit 6). Options visible in the tree: a local state column plus a pure transition helper; a stand-in WRITE_ROUTES row; or declare AT-003.12 red as `capability-pending` on the engine. I did not pick.
- Which ids this run will declare red is a design/build choice. Surfaces that do not exist: the classification event, the cause producer, the lifecycle engine, the wired screens. Brief unit 4 says the backend can still prove disclosure as copy or flag without rendering.
- I did not trace a storage RLS policy because there is no bucket and no `storage.objects` policy in migrations. Default Supabase storage policies, if any, are not in this tree.
- I did not read every line of `edge.ts` constructors `callerReads` / `publicProjectReads`; the write constructor and the two project entrypoints were enough to see that a new **read** must not go through `WRITE_ROUTES`, and a new **write** must.