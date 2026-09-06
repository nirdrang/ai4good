# Candidate: SQL owns account lifecycle and administrative writes

Attribution: unattributed; candidate design for the admin-operations subtree. This package changes no files and reports no newly executed tests.

## Problem

The database already provides the universal product-write boundary: `service_role` cannot write public tables directly, and every deployed product write calls a `SECURITY DEFINER`. Account deactivation, contact transfer, and audit must therefore be enforced there. Auth bans cannot provide immediate write rejection because the measured unexpired token remains usable. TypeScript supplies readable refusals and the loop-tier model; it never grants authority that SQL has not independently established.

This candidate follows the supplied Phase A artifacts and architect workflow. Grounding and sketching are complete; synthesis belongs to the orchestrator, and implementation is outside this runnerâ€™s scope.

Two instruction reconciliations are explicit:

- The required exported inventory constant is **generated from migrations**, then checked against both migrations and edge entries. It is not a separately maintained list.
- The design taskâ€™s explicit DECLARE assumption takes precedence over ruling R15â€™s earlier proposal to mark concierge onboarding green. The administrative contact-storage operation ships, but the absent onboarding clause remains integration-red. R15â€™s storage and authority decisions remain intact.
- R11 remains binding: no password-verification hook or product sign-in counter ships. AT-001.34 remains capability-pending at both tiers.

## Usage (callerâ€™s view)

An administrator supplies an existing, completed NGO account as the replacement contact. One request moves the seat, deactivates the former owner, and records the transfer. Lost-access recovery uses exactly that request; the reason explains the recovery.

Every existing write route keeps its current operation and adds `gateWrite` before its RPC. That call authenticates no one by itself: it receives the `Caller` already resolved through Auth. It loads the account facts once, supplies the readable refusal, and returns the target role needed by existing NGO authorization.

The database repeats the lifecycle decision under a row lock. Passing the edge check is never a durable authorization.

### Call site 1: the transfer route

Illustrative body of `supabase/functions/transfer-contact/index.ts`; environment setup and the existing `edgeHandler` wrapper are omitted.

```ts
import {
  gateWrite, resolveCaller, readJsonBody,
  callDatabaseFunction, databaseWriteResponse, json,
} from "../_shared/edge.ts";
import { parseTransferRequest } from "../_shared/admin-operations.ts";

const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
if (!caller) {
  return json({
    ok: false,
    kind: "unauthenticated",
    reason: "Authenticate before transferring an organisation.",
  }, 401);
}

const access = await gateWrite(
  SUPABASE_URL, SERVICE_ROLE_KEY, caller, "transfer-contact",
);
if (!access.ok) return json(access.refusal, access.status);

const body = await readJsonBody(request);
if (!body.ok) {
  return json({ ok: false, kind: "invalid-request", reason: body.reason }, 400);
}
const command = parseTransferRequest(body.value);
if (!command.ok) return json(command, 400);

const result = await callDatabaseFunction(
  SUPABASE_URL, SERVICE_ROLE_KEY, "transfer_contact",
  {
    p_actor_id: caller.id, // Never taken from the request body.
    p_request_id: command.value.requestId,
    p_org_id: command.value.organizationId,
    p_from_id: command.value.previousAccountId,
    p_to_id: command.value.newAccountId,
    p_reason: command.value.reason,
  },
);
return databaseWriteResponse(result, "transfer-contact");
```

Success returns `{ ok: true, organizationId, previousAccountId, newAccountId, auditId }`. Retrying the same request ID and payload returns the same receipt. Reusing that ID for different content refuses.

The caller does not coordinate membership changes, deactivation, audit insertion, or rollback.

### Call site 2: an existing gated write

The existing `update-organization` body replaces `roleIn` with the shared account lookup. Its name validation and organization-role decision remain.

```ts
import { orgAdminActionAllowed } from "../_shared/memberships.ts";
import { gateWrite } from "../_shared/edge.ts";

const access = await gateWrite(
  SUPABASE_URL, SERVICE_ROLE_KEY, caller,
  "update-organization", organizationId,
);
if (!access.ok) return json(access.refusal, access.status);

const allowed = orgAdminActionAllowed(access.account.organizationRole);
if (!allowed.ok) return json(allowed, 403);

// Existing name validation remains here.
const result = await callDatabaseFunction(
  SUPABASE_URL, SERVICE_ROLE_KEY, "update_organization",
  {
    p_account_id: caller.id,
    p_organization_id: organizationId,
    p_name: name.value,
  },
);
return databaseWriteResponse(result, "update-organization");
```

The SQL entry begins with:

```sql
perform public.assert_active_writer(
  p_account_id, array['ngo']::public.account_type[], false
);
```

The existing organization-specific checks still execute afterward.

### Call site 3: the unlink integration body

The Given uses the existing email verification and signup flow, plus the existing operator identity-link Given. It does not claim a real GitHub OAuth handshake.

```ts
const { sut } = await open();
// volunteer is verified, completed, and has email plus GitHub identities.

const before = await sut.authIdentityState(volunteer);
expect(before.kind).toBe("available");
if (before.kind !== "available") throw new Error("Invalid Auth Given");

const github = before.identities.find(identity => identity.provider === "github");
if (!github) throw new Error("Missing GitHub identity in Given");

const result = await sut.unlinkIdentity(volunteer, github.id);
expect(result.ok).toBe(false);

const after = await sut.authIdentityState(volunteer);
expect(after.kind).toBe("available");
if (after.kind !== "available") throw new Error("Auth became unhealthy");
expect(after.identities).toContainEqual(github);

expect(await sut.identityExistsAsOperator(github.id)).toBe(true);
```

The live adapter reads `identity_id` from `/auth/v1/user`, performs the real Auth DELETE, and parses the answer behind the SUT interface. The body does not equate every HTTP error with enforcement: surviving identity storage and a healthy `/user` response are required.

## Shape

### Data structures first

The organizing structures are a two-state account lifecycle, one current organization seat, immutable audit events, and one contact row keyed by organization, per `model-the-domain`.

| Structure | Key and access pattern | Invariant |
|---|---|---|
| `accounts.lifecycle` | Existing account primary key | Exactly `active` or `deactivated`; never inferred from Auth |
| `org_memberships` | Existing unique organization seat; add account-first index | Transfer updates one seat; querying every seat of the former account is indexed |
| `admin_audit` | UUID event primary key; unique non-null transfer request ID | Events survive actor, subject, and organization deletion |
| `admin_audit` organization index | `(org_id, occurred_at, id)` | Transfer and role history can be read without scanning unrelated events |
| `organization_escalation_contacts` | Organization primary key | At most one current non-login contact; no Auth identity or login credential |
| Generated `WRITE_ROUTES` | Route name, RPC signature, admitted account types | SQL definitions determine the deployed inventory |
| Fixture storage | Per-world maps, append-only event collection | Parallel worlds share no mutable fixture state |

No ledger table exists in this tree. Transfer touches no ledger and contains no generic â€œrewrite ownership everywhereâ€ operation. Tests compare every existing history-bearing relation; they do not invent ledger coverage.

### Domain types and pure signatures

Existing `AccountType`, `OrgRole`, `Caller`, and SUT `Session` are reused. All new public types are aliases, matching the harnessâ€™s prohibition on reopenable interfaces. Boundary parsers construct validated commands; raw Auth, PostgREST, and SQL row shapes stay private.

```ts
// supabase/functions/_shared/lifecycle.ts

export type Lifecycle = "active" | "deactivated";

export type AccountFacts = Readonly<{
  id: string;
  accountType: AccountType;
  lifecycle: Lifecycle;
  organizationRole: OrgRole | null;
}>;

export type CallerAccount =
  | { kind: "absent" }
  | { kind: "present"; account: AccountFacts };

export type WriteRule = Readonly<{
  route: string;
  rpc: string; // Internal registration data, not an application API.
  admittedTypes: readonly AccountType[];
  accountRequirement: "completed" | "signup-bootstrap";
}>;

export type WriteRefusalKind =
  | "account-not-completed"
  | "account-deactivated"
  | "not-a-platform-admin"
  | "wrong-account-type";

export type Decision<K extends string> =
  | { ok: true }
  | { ok: false; kind: K; reason: string };

/** Parses database answers; malformed answers are outages, never absent accounts. */
export function parseCallerAccount(value: unknown): CallerAccount {
  throw new Error("not implemented");
}

/** Readable twin of the SQL boundary; success only means â€œcontinue to SQL.â€ */
export function writeAllowed(
  rule: WriteRule,
  caller: CallerAccount,
): Decision<WriteRefusalKind> {
  throw new Error("not implemented");
}
```

```ts
// supabase/functions/_shared/admin-operations.ts

export type TransferRequest = Readonly<{
  requestId: string;
  organizationId: string;
  previousAccountId: string;
  newAccountId: string;
  reason: string;
}>;

export type LifecycleRequest = Readonly<{
  accountId: string;
  lifecycle: Lifecycle;
  reason: string;
}>;

export type EscalationContact = Readonly<{
  name: string;
  email: string;
}>;

export type EscalationContactRequest = Readonly<{
  organizationId: string;
  contact: EscalationContact;
}>;

export type Parsed<T> =
  | { ok: true; value: T }
  | { ok: false; kind: "invalid-request"; reason: string };

export function parseTransferRequest(value: unknown): Parsed<TransferRequest> {
  throw new Error("not implemented");
}
export function parseLifecycleRequest(value: unknown): Parsed<LifecycleRequest> {
  throw new Error("not implemented");
}
export function parseEscalationContactRequest(
  value: unknown,
): Parsed<EscalationContactRequest> {
  throw new Error("not implemented");
}

/** No onboarding workflow: a future completion must consult this presence rule. */
export function conciergeContactAllowed(
  contact: EscalationContact | null,
): Decision<"escalation-contact-required"> {
  throw new Error("not implemented");
}

/** Terminal denial is explicit; re-enabling never implies key issuance. */
export type KeyRecoveryStanding =
  | { kind: "blocked"; reason: "terminal-project" | "vetting" | "role" }
  | { kind: "eligible"; recoveryAuthorized: boolean };

export function virtualKeyAllowed(
  lifecycle: Lifecycle,
  standing: KeyRecoveryStanding,
): Decision<
  "account-deactivated" | "terminal-project" | "vetting" |
  "role" | "recovery-required"
> {
  throw new Error("not implemented");
}

/** Mirrors the direct-delete trigger only, not Auth's remaining unlink rules. */
export function githubUnlinkAllowed(
  accountType: AccountType | null,
  provider: string,
): Decision<"github-link-required"> {
  throw new Error("not implemented");
}
```

These modules contain parsers and readable refusal decisions, not transaction plans, repository interfaces, audit append APIs, or stateful administration services.

The fixture mirrors SQL state changes after these decisions, following the existing fixture posture. Its loop green establishes the imported decision and model; only integration establishes the transaction, constraints, triggers, and locks. Transfer preconditions are authoritative in SQL, not promoted into a second TypeScript transfer engine.

### Edge boundary and route signatures

Three new routes, all POST with explicit `verify_jwt = true`:

```ts
// Each index.ts uses Deno.serve(edgeHandler(name, handler)).
transferContactHandler(request: Request): Promise<Response>;
setAccountLifecycleHandler(request: Request): Promise<Response>;
setEscalationContactHandler(request: Request): Promise<Response>;
```

New or changed signatures in the existing `_shared/edge.ts`:

```ts
type AccountLookup =
  | { ok: true; value: CallerAccount }
  | { ok: false; detail: string };

loadCallerAccount(
  url: string,
  serviceKey: string,
  caller: Caller,
  organizationId?: string,
): Promise<AccountLookup>;

type GateOutcome =
  | { ok: true; account: AccountFacts }
  | { ok: true; account: null } // Only the signup-bootstrap overload.
  | {
      ok: false;
      status: 403 | 502;
      refusal: { ok: false; kind: string; reason: string };
    };

gateWrite(
  url: string,
  serviceKey: string,
  caller: Caller,
  route: WriteRouteName,
  organizationId?: string,
): Promise<GateOutcome>;

databaseWriteResponse(
  outcome: RpcOutcome,
  route: WriteRouteName,
): Response;
```

The implementation gives `gateWrite` separate bootstrap/completed overloads so completed routes receive non-null `account` without casts. A single account query selects `account_type`, `lifecycle`, and the callerâ€™s embedded membership for the target organization. Its absence/failure distinction replaces both hand-written lookup functions. No token claim is added.

`callDatabaseFunction` keeps its existing signature. Its failure branch additionally preserves recognized database error codes and structured details for `databaseWriteResponse`. Older unrecognized errors retain the existing generic conflict/outage behavior.

### SQL is the source of truth

The SQL gate:

1. Reads the callerâ€™s account under `FOR SHARE`.
2. Refuses a deactivated account before operation-specific authorization.
3. Refuses missing accounts except the explicitly identified signup bootstrap.
4. Checks admitted global types.
5. Returns control to the original operation-specific checks.

The gate evaluates the **caller**, not every account mentioned by a write. Otherwise transfer to another account and re-enabling a deactivated subject would be impossible.

The TypeScript twin may never:

- Treat an active snapshot as a capability to bypass SQL.
- Authorize from request-supplied account type, actor ID, or lifecycle.
- Decide which SQL mutation constitutes a transfer.
- Preserve a decision in a JWT or cache for later writes.
- Infer key re-issuance from reactivation.
- Convert unknown database errors into meaningful product refusals.

The small interface hides database locking, actor authorization, multi-row atomicity, retry recognition, and audit production. Callers retain only the business command and its outcome, per `boundary-discipline` and `minimize-reader-load`.

### Transfer, row by row

The replacement must be a distinct, active NGO account with a completed platform acknowledgment. The organizationâ€™s current seat must still belong to the supplied former account and carry the ownerâ€™s admin role.

| Row or relation | Successful transfer |
|---|---|
| Named `org_memberships` seat | Update `account_id` from A to B; retain organization and role |
| Other memberships | Unchanged; refuse if A holds any other seat |
| Aâ€™s `accounts` row | Set lifecycle to `deactivated`; keep ID, type, and creation timestamp |
| Bâ€™s `accounts` row | Unchanged |
| `acknowledgments` | No updates or deletes; Aâ€™s signatures remain Aâ€™s |
| `projects` | No changes to organization, volunteer assignment, or other fields |
| `volunteer_profiles` | No changes |
| Earlier audit events | Unchanged |
| New audit event | Record actor, time, reason, organization, A, B, and request ID |
| Bâ€™s signup organization | Remains Bâ€™s; explicitly accepted residual |
| Escalation contact | Remains attached to the organization |

The current membership table is not historical storage. The immutable transfer event preserves the previous seat attribution. The membership audit trigger also records a repoint, even when the role value itself stays `admin`.

The definer gates the administrator first, locks A and B in UUID order, then locks and rechecks the seat. Lock A before checking its other memberships. Existing product writers creating a membership for A hold the gateâ€™s share lock on A, so they cannot introduce another seat past that check while transfer owns Aâ€™s update lock. Operator provisioning is outside this product-write guarantee.

### Concurrency and retries

Account state and organization ownership genuinely need one canonical row, so they retain database locking. Audit events and fixture worlds do not need a shared mutable accumulator; each event/world owns its state, per `separate-before-serializing-shared-state`.

A writer that already holds the share lock finishes before deactivation can commit. A writer arriving after the lifecycle update has locked the row waits and then observes the committed state. â€œImmediatelyâ€ means no admitted product write after deactivation commits; it does not cancel an earlier transaction. PostgreSQLâ€™s row-lock conflict rules support this ordering. [PostgreSQL locking documentation](https://www.postgresql.org/docs/17/explicit-locking.html)

Transfer checks for an existing request receipt both before and after acquiring its subject locks. A matching receipt returns unchanged; a mismatching request ID refuses. Seat update, lifecycle update, trigger events, and transfer receipt commit together. A crash before commit leaves none; a lost HTTP response permits replay.

Lifecycle setting uses desired-state semantics: setting the existing state is a no-op. A real transition records its reason in the audit. Repeated identical escalation-contact storage is a no-op; different concurrent edits serialize on the organization row and the last completed update supplies the one current contact. These two operations do not promise permanent deduplication across intervening, opposing commands.

Cross-administrator lifecycle changes can still deadlock through caller locks and target locks. PostgreSQL aborts one transaction; the endpoint returns a retryable conflict without partial mutation. No global application lock or silent retry loop is added.

### Migration sketch

These are design stubs, not runnable product implementations. Bodies deliberately raise `not implemented`. The DDL and explicit privilege syntax fit `_policy-scan.ts`; catalog additions and the specified scanner extension land with them.

```sql
create type public.account_lifecycle as enum ('active', 'deactivated');

alter table public.accounts
  add column lifecycle public.account_lifecycle not null default 'active';

-- Existing primary key begins with org_id; the other-seats check needs account_id.
create index org_memberships_by_account
  on public.org_memberships (account_id, org_id);

create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  event_kind text not null check (
    event_kind in ('contact-transfer', 'membership-change', 'lifecycle-change')
  ),
  occurred_at timestamptz not null default clock_timestamp(),
  actor_account_id uuid,
  actor_label text not null check (actor_label !~ '^\s*$'),
  org_id uuid,
  subject_account_id uuid not null,
  subject_label text not null check (subject_label !~ '^\s*$'),
  replacement_account_id uuid,
  replacement_label text,
  reason text,
  request_id uuid unique,
  old_role public.org_role,
  new_role public.org_role,
  old_lifecycle public.account_lifecycle,
  new_lifecycle public.account_lifecycle,
  check (
    (event_kind = 'contact-transfer'
      and actor_account_id is not null and org_id is not null
      and replacement_account_id is not null
      and replacement_account_id <> subject_account_id
      and replacement_label is not null
      and replacement_label !~ '^\s*$'
      and reason is not null and reason !~ '^\s*$'
      and request_id is not null
      and old_role is null and new_role is null
      and old_lifecycle is not null and new_lifecycle = 'deactivated')
    or
    (event_kind = 'membership-change'
      and org_id is not null and new_role is not null
      and request_id is null
      and old_lifecycle is null and new_lifecycle is null)
    or
    (event_kind = 'lifecycle-change'
      and actor_account_id is not null
      and reason is not null and reason !~ '^\s*$'
      and old_lifecycle is not null and new_lifecycle is not null
      and old_lifecycle <> new_lifecycle
      and request_id is null and replacement_account_id is null
      and old_role is null and new_role is null)
  )
);
-- Deliberately no foreign keys, including org_id and actor/subject columns.
alter table public.admin_audit enable row level security;
revoke all on table public.admin_audit from anon, authenticated, service_role;
create index admin_audit_by_org
  on public.admin_audit (org_id, occurred_at, id);

create table public.organization_escalation_contacts (
  org_id uuid primary key references public.organizations(id),
  name text not null check (name !~ '^\s*$'),
  email text not null check (email !~ '^\s*$'),
  recorded_at timestamptz not null default clock_timestamp(),
  recorded_by uuid not null
);
alter table public.organization_escalation_contacts enable row level security;
revoke all on table public.organization_escalation_contacts
  from anon, authenticated, service_role;

-- Neither table has a policy, viewer helper, or client SELECT grant.
```

The contact email is a reachability address, not a login identity. Boundary validation applies the projectâ€™s chosen email syntax; the SQL boundary independently rejects missing/blank values. The organization FK uses default restriction, not a cascade; organization deletion is not a product operation here.

```sql
create function public.assert_active_writer(
  p_actor_id uuid,
  p_admitted_types public.account_type[],
  p_signup_bootstrap boolean
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  -- TODO: SELECT account_type, lifecycle FROM public.accounts
  --       WHERE id = p_actor_id FOR SHARE.
  -- TODO: missing row permitted only with bootstrap=true;
  --       an existing deactivated row is NEVER exempt.
  -- TODO: otherwise enforce lifecycle, then admitted types.
  -- TODO: raise stable product code and JSON detail on refusal.
  raise exception 'not implemented';
end;
$$;
revoke execute on function public.assert_active_writer(
  uuid, public.account_type[], boolean
) from public;
-- Private helper: no service_role EXECUTE grant.

create function public.transfer_contact(
  p_actor_id uuid, p_request_id uuid, p_org_id uuid,
  p_from_id uuid, p_to_id uuid, p_reason text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_active_writer(
    p_actor_id, array['platform_admin']::public.account_type[], false
  );
  -- TODO: validate command; resolve identical request replay.
  -- TODO: lock A/B in UUID order, then organization seat; recheck receipt.
  -- TODO: require completed active NGO B and its platform acknowledgment.
  -- TODO: require current admin seat A; enumerate/refuse A's other seats.
  -- TODO: set transaction-local actor context, UPDATE seat, deactivate A.
  -- TODO: INSERT transfer receipt/event with database time and actor labels.
  -- TODO: return receipt; rollback everything on any failure.
  raise exception 'not implemented';
end;
$$;
revoke execute on function public.transfer_contact(
  uuid, uuid, uuid, uuid, uuid, text
) from public;
grant execute on function public.transfer_contact(
  uuid, uuid, uuid, uuid, uuid, text
) to service_role;
comment on function public.transfer_contact(
  uuid, uuid, uuid, uuid, uuid, text
) is 'at-write: {"route":"transfer-contact"}';

create function public.set_account_lifecycle(
  p_actor_id uuid, p_account_id uuid,
  p_lifecycle public.account_lifecycle, p_reason text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_active_writer(
    p_actor_id, array['platform_admin']::public.account_type[], false
  );
  -- TODO: validate subject and reason; lock subject.
  -- TODO: identical desired state returns unchanged.
  -- TODO: UPDATE lifecycle and INSERT lifecycle-change event atomically.
  -- TODO: no Auth ban and no key issuance.
  raise exception 'not implemented';
end;
$$;
revoke execute on function public.set_account_lifecycle(
  uuid, uuid, public.account_lifecycle, text
) from public;
grant execute on function public.set_account_lifecycle(
  uuid, uuid, public.account_lifecycle, text
) to service_role;
comment on function public.set_account_lifecycle(
  uuid, uuid, public.account_lifecycle, text
) is 'at-write: {"route":"set-account-lifecycle"}';

create function public.set_escalation_contact(
  p_actor_id uuid, p_org_id uuid, p_name text, p_email text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_active_writer(
    p_actor_id, array['platform_admin']::public.account_type[], false
  );
  -- TODO: validate input, lock organization, upsert exactly one contact.
  -- TODO: unchanged content keeps its original recorded_at/recorded_by.
  raise exception 'not implemented';
end;
$$;
revoke execute on function public.set_escalation_contact(
  uuid, uuid, text, text
) from public;
grant execute on function public.set_escalation_contact(
  uuid, uuid, text, text
) to service_role;
comment on function public.set_escalation_contact(
  uuid, uuid, text, text
) is 'at-write: {"route":"set-escalation-contact"}';
```

The existing three write functions are replaced without changing their signatures:

| Function | First executable statement |
|---|---|
| `complete_signup` | `assert_active_writer(p_account_id, ARRAY['ngo','volunteer']::public.account_type[], true)` |
| `create_organization` | `assert_active_writer(p_account_id, ARRAY['ngo']::public.account_type[], false)` |
| `update_organization` | Same NGO gate |

Each replacement restates its exact existing `revoke execute â€¦ from public` and `grant execute â€¦ to service_role`. Each gets `at-write` metadata naming its route. Signupâ€™s metadata additionally records: `"exemption":"account row does not exist before first completion"`.

Declaration initializers must remain side-effect-free; moving a write into `DECLARE` must not evade â€œfirst executable statement.â€

```sql
create function public.audit_membership_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- TODO: INSERT records initial grant; UPDATE records changed role or account.
  -- TODO: unchanged UPDATE emits nothing.
  -- TODO: actor from transaction-local app.actor_id when present;
  --       otherwise actor_account_id=NULL, actor_label='operator'.
  -- TODO: store OLD/NEW attribution as immutable event values.
  raise exception 'not implemented';
end;
$$;
revoke execute on function public.audit_membership_change() from public;

create trigger org_memberships_audit
after insert or update on public.org_memberships
for each row execute function public.audit_membership_change();

create function public.refuse_audit_mutation()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- TODO: unconditional append-only refusal, including operator DML.
  raise exception 'not implemented';
end;
$$;
revoke execute on function public.refuse_audit_mutation() from public;

create trigger admin_audit_no_change
before update or delete on public.admin_audit
for each row execute function public.refuse_audit_mutation();

create trigger admin_audit_no_truncate
before truncate on public.admin_audit
for each statement execute function public.refuse_audit_mutation();

create function public.refuse_volunteer_github_unlink()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- TODO: if OLD.provider='github' and account is volunteer, raise 42501.
  -- TODO: otherwise RETURN OLD.
  raise exception 'not implemented';
end;
$$;
revoke execute on function public.refuse_volunteer_github_unlink() from public;

create trigger volunteer_github_identity_permanent
before delete on auth.identities
for each row
when (pg_trigger_depth() = 0)
execute function public.refuse_volunteer_github_unlink();

notify pgrst, 'reload schema';
```

The depth condition belongs in `WHEN`, before entering this trigger. Inside the trigger function the nesting level is already nonzero. The supplied probe established refusal and Auth health, but did **not** establish this direct-delete/cascade discriminator; that prototype remains an implementation prerequisite. [PostgreSQL trigger-depth definition](https://www.postgresql.org/docs/current/functions-info.html)

No ownership change or grant on `auth.identities` is proposed. The measured `postgres` migration authority creates the trigger. No client can invoke its function directly.

The two absent-surface rules also have private SQL twins:

```sql
create function public.concierge_contact_refusal(p_contact_present boolean)
returns text language sql immutable set search_path = ''
as $$ select 'not implemented'::text $$;
revoke execute on function public.concierge_contact_refusal(boolean) from public;

create function public.virtual_key_refusal(
  p_lifecycle public.account_lifecycle,
  p_independent_block text,
  p_recovery_authorized boolean
)
returns text language sql immutable set search_path = ''
as $$ select 'not implemented'::text $$;
revoke execute on function public.virtual_key_refusal(
  public.account_lifecycle, text, boolean
) from public;
```

Their intended result is null for permission to continue, otherwise the corresponding refusal kind. They perform no gateway or concierge work. Future SQL definers consult these rules; future TypeScript surfaces consult the pure twins. Invalid SQL arguments fail closed at that boundary.

### Audit authority and deletion

Append-only has four enforceable parts:

1. No client role or `service_role` has INSERT, UPDATE, DELETE, or TRUNCATE privileges.
2. Only event-producing definers/triggers insert audit rows; none modifies existing events.
3. BEFORE UPDATE/DELETE and BEFORE TRUNCATE triggers reject operator DML.
4. No cascading foreign key can erase an audit row.

Transaction-local actor context is set by authenticated product definers using the server-resolved actor ID. The membership trigger writes the `operator` sentinel when no context exists. Labels are database-derived snapshots, with account UUID labels available where no person-name source exists; they are not request assertions.

A database owner can disable/drop triggers or forge actor context. The design does not claim protection from an administrator who can change the schema. Existing `auth.users` cascades affecting acknowledgments and memberships remain unchanged, as R3 requires. Transfer deactivates and never invokes those deletes.

### Derived inventory and conformance

The inventory begins with migrations, not edge filenames.

The `_policy-scan.ts` extension folds migrations in filename order and tracks each function by **schema plus argument types**, including replacement, drop, volatility, grants, and revokes. Default volatility is treated as volatile. It considers every public SECURITY DEFINER with effective EXECUTE granted to `service_role` that is not STABLE. New private helpers above are not service-role entry points.

Registration means:

- The function has supported `at-write` metadata naming its edge route.
- Its first executable statement calls `assert_active_writer` with the actor parameter, literal admitted account types, and literal bootstrap flag.
- Only the exact existing signup signature may use bootstrap.
- The referenced route exists, has explicit configuration, imports `callDatabaseFunction`, and passes its resolved caller to `gateWrite` before the RPC.
- Its RPC target and gate route name agree with the SQL-derived registration.

Metadata owns only the transport association and exemption explanation. The actual SQL gate arguments own admitted types and bootstrap behavior.

A deterministic emitter produces:

```ts
// _shared/write-inventory.generated.ts â€” generated, never hand-maintained
export const WRITE_ROUTES = [
  // Six entries derived from the three existing and three new write definers.
] as const satisfies readonly WriteRule[];

export type WriteRouteName = typeof WRITE_ROUTES[number]["route"];
```

CI recomputes this text in memory and compares it with the committed artifact. Unknown route or function names fail; they do not become implicit exemptions.

The independent edge pass enumerates every `supabase/functions/*/index.ts`, excluding `_shared`. Every import of `callDatabaseFunction`, including an alias, creates a candidate. The scanner uses the TypeScript syntax tree to require the guardâ€™s refusal-return branch before its matching RPC, rather than finding a string in a comment. Unsupported dynamic RPC names or indirect forwarding fail explicitly. Entries using a new direct REST mutation transport also fail the established transport restriction; this is not a general proof about arbitrary network effects.

The SQL pass tokenizes function bodies separately from their dollar-quoted outer statements. Comments, string literals, nested conditional calls, executable declaration initializers, and dynamic calls cannot satisfy the gate check. Unsupported syntax fails closed. Function-header volatility must not be inferred from the word `stable` inside prose or a body.

The scan proves registration, supported control-flow placement, and the declared SQL gate call. Only integration proves that the live definer actually refuses and rolls back.

New exports in `_policy-scan.ts`:

```ts
type WriteTree = {
  migrations: readonly MigrationFile[];
  entries: readonly { path: string; text: string }[];
  configText: string;
  generatedInventoryText: string;
};

deriveWriteInventory(
  migrations: readonly MigrationFile[],
): readonly WriteRule[];

renderWriteInventory(rows: readonly WriteRule[]): string;

scanWriteConformance(tree: WriteTree): PolicyProblem[];

writeConformanceProblems(repoRoot?: string): PolicyProblem[];
```

These are four additions to the existing scanner module, not a parallel scanner framework. The small emitter shell calls the same derivation/rendering functions during implementation; CI only compares and never rewrites.

Negative selftests must demonstrate:

- A fourth write entry absent from SQL registration fails.
- A granted volatile definer without metadata fails.
- Registered edge code without `gateWrite`, or with the gate after its RPC, fails.
- A SQL gate only in a comment, string, conditional, or after a write fails.
- A bootstrap flag on any other function fails.
- Replacing a gated function with an ungated body fails.
- A stale generated constant fails.
- Overloaded signatures cannot overwrite one another.
- Missing `service_role` baseline revoke fails.
- REFERENCES and TRIGGER grants each fail separately.
- Empty or unreadable migration/entry inputs throw rather than certify emptiness.

AT-001.29 invokes the real conformance scan before opening its fixture. Existing CI already runs its loop tier and the harness selftest glob.

### Bootstrap and the missing volunteer write

`complete_signup` is registered and gated, including rejection of already-deactivated accounts. However, an already-completed active account cannot successfully complete signup again: the current SQL deliberately raises a unique-conflict refusal.

Therefore signup is an explicit bootstrap row, not a fabricated completed-account control for AT-001.29. Its separate boundary tests prove fresh NGO/volunteer completion succeeds and existing deactivated identities cannot bypass the gate. The completed-account matrix iterates every non-bootstrap deployed inventory row.

That deployed matrix admits NGO and platform-admin callers. The volunteer arm uses the existing `sendDiscoveryMessage` stand-in through `writeAllowed`, with verification otherwise satisfied. A typed coverage object requires an arm for every `AccountType`; it cannot silently omit volunteers. This stand-in is identified as a stand-in and is never emitted as a deployed RPC.

### SUT additions: contract, fixture, live

Ten new members extend `AccountsSut`; existing members are reused for sessions, signup, memberships, projects, acknowledgment history, and discovery.

```ts
type AdminRefusalKind =
  | WriteRefusalKind | "unauthenticated" | "invalid-request"
  | "holds-other-seats" | "transferee-not-ngo"
  | "transferee-not-completed" | "transferee-deactivated"
  | "owner-changed" | "request-id-conflict" | "retryable-conflict"
  | "not-found";

type AdminOutcome<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      kind: AdminRefusalKind;
      reason: string;
      otherOrganizationIds?: readonly string[];
    };

type TransferReceipt = Readonly<{
  organizationId: string;
  previousAccountId: string;
  newAccountId: string;
  auditId: string;
}>;

type AuditEvent = Readonly<{
  id: string;
  occurredAt: string;
  actorAccountId: string | null;
  actorLabel: string;
  subjectAccountId: string;
  subjectLabel: string;
}> & (
  | {
      kind: "contact-transfer";
      organizationId: string;
      replacementAccountId: string;
      replacementLabel: string;
      reason: string;
      requestId: string;
    }
  | {
      kind: "membership-change";
      organizationId: string;
      oldRole: OrgRole | null;
      newRole: OrgRole;
      replacementAccountId: string | null;
    }
  | {
      kind: "lifecycle-change";
      previous: Lifecycle;
      current: Lifecycle;
      reason: string;
    }
);

type Identity = Readonly<{ id: string; provider: string }>;
type AuthIdentityState =
  | { kind: "available"; identities: readonly Identity[] }
  | { kind: "unavailable" };

type AdminSutAdditions = {
  transferContact(
    session: Session | null, request: TransferRequest,
  ): Promise<AdminOutcome<TransferReceipt>>;

  setAccountLifecycle(
    session: Session | null, request: LifecycleRequest,
  ): Promise<AdminOutcome<{ lifecycle: Lifecycle }>>;

  setEscalationContact(
    session: Session | null, request: EscalationContactRequest,
  ): Promise<AdminOutcome<EscalationContact>>;

  escalationContact(organizationId: string): Promise<EscalationContact | null>;
  auditEvents(organizationId: string): Promise<readonly AuditEvent[]>;

  changeMembershipRoleAsOperator(
    organizationId: string, accountId: string, role: OrgRole,
  ): Promise<void>;

  attemptAuditMutationAsOperator(
    auditId: string, mutation: "update" | "delete" | "truncate",
  ): Promise<{ ok: boolean }>;

  authIdentityState(session: Session): Promise<AuthIdentityState>;

  unlinkIdentity(
    session: Session | null, identityId: string,
  ): Promise<
    | { ok: true }
    | { ok: false; kind: "github-link-required" | "unauthenticated" | "auth-refused" }
  >;

  identityExistsAsOperator(identityId: string): Promise<boolean>;
};
```

`AccountRow` gains `lifecycle`; existing write outcome unions gain lifecycle refusal kinds.

| Members | Fixture implementation | Live implementation |
|---|---|---|
| Three admin commands | Shared refusal decisions, then atomic world-local SQL model | New deployed routes; parse wire results into domain outcomes |
| Contact/audit reads | World storage | Operator SELECT; no product read grant |
| Role-change Given | Update membership and mirror audit trigger | Operator UPDATE; actual trigger |
| Audit mutation attempts | Reject without changing event collection | Operator UPDATE, DELETE, or TRUNCATE |
| Auth identity state | Render and parse model identities | GET `/auth/v1/user` |
| Unlink | Shared permanence refusal plus existing Auth-model constraints | Auth DELETE using real identity row ID |
| Identity existence | World identity lookup | Operator SELECT on `auth.identities` |

The harness adds private `authDelete(stack, path, accessToken?)`, returning the existing HTTP-answer shape. Raw service-role RPC checks and two-connection locking proofs remain integration helpers beside the bodies; they do not expand the product SUT API.

### Refusals on the wire

New edge routes and lifecycle failures use `{ ok: false, kind, reason }`.

| Situation | HTTP | `kind` |
|---|---:|---|
| Missing/unusable caller resolved by edge | 401 | `unauthenticated` |
| Deactivated caller | 403 | `account-deactivated` |
| NGO/volunteer calls admin operation | 403 | `not-a-platform-admin` |
| Missing completed account | 403 | `account-not-completed` |
| Wrong type on an ordinary write | 403 | Existing operation kind where applicable |
| Invalid command | 400 | `invalid-request` |
| Former owner has other seats | 409 | `holds-other-seats`, with organization IDs |
| Replacement is not NGO | 409 | `transferee-not-ngo` |
| Replacement lacks completion acknowledgment | 409 | `transferee-not-completed` |
| Replacement is deactivated | 409 | `transferee-deactivated` |
| Seat no longer belongs to expected owner | 409 | `owner-changed` |
| Request ID reused for different transfer | 409 | `request-id-conflict` |
| Transaction deadlock/serialization failure | 409 | `retryable-conflict` |
| Database transport/invalid response | 502 | `refused` |

SQL raises reserved product SQLSTATEs with structured detail containing the recognized kind and necessary context. The adapter allowlists this mapping; it does not parse English messages. Direct service-role RPC tests assert those database codes/details. Edge races preserve the same lifecycle kind when SQL rejects a snapshot that passed TypeScript.

Auth unlink is different: the measured response is **500**, `error_code: "unexpected_failure"`, with **no product `kind`**. No token produced 401 `no_authorization`. The live adapter reports `auth-refused` rather than fabricating a product wire kind. The permanent-link assertion is the surviving row plus healthy Auth, not a pinned vendor status.

### Per-ID, per-tier acceptance design

All live Givens register, follow verification, and sign in before completing signup. Operator-only Givens are explicitly labeled. Every refusal also checks that the intended mutation did not occur.

| ID | Loop: Given â†’ act â†’ assertion | Integration: Given â†’ act â†’ assertion and shape |
|---|---|---|
| **AT-001.25** | Completed NGO A with its sole seat, completed NGO B, administrator, attributed project/profile/acknowledgment and prior audit snapshots â†’ transfer â†’ seat becomes B, A deactivated, B active, all prior history unchanged | Same through real route; compare operator snapshots and audit prefix. Replay same request and assert same audit ID. **Green** |
| **AT-001.26** | Transfer Given with fixed clock and nonblank reason â†’ transfer â†’ one receipt records actor, reason, and instant | Real transfer; database event time lies between pre/post bounds, actor equals authenticated administrator, reason exact. **Green** |
| **AT-001.27** | Aâ€™s original session unavailable; B completed â†’ same transfer method with recovery reason â†’ identical ownership/history/audit properties | Do not authenticate as A; admin invokes same deployed endpoint. No second recovery mutation path. **Green** |
| **AT-001.28** | Administrator, NGO, absent contact â†’ store contact and consult `conciergeContactAllowed` â†’ one non-login contact; missing contact refuses completion | Real admin storage, overwrite cardinality, non-admin refusal, and no Auth-user creation are verified; then throw `CapabilityPending(["ngo.concierge-onboarding"])`. **Declared red** |
| **AT-001.29** | Run conformance; construct active otherwise-authorized control and deactivated counterpart for each non-bootstrap route/type, plus volunteer Discovery stand-in â†’ attempt each â†’ control succeeds, deactivated kind exact, no write | Exercise every deployed NGO/admin row through HTTP and raw RPC; active control succeeds for each. Check signup exemption separately. Then `CapabilityPending(["sut.accounts.sendDiscoveryMessage"])`. **Declared red** |
| **AT-001.30** | Verified volunteer with modeled project key eligibility â†’ admin deactivates for AUP â†’ Discovery refused immediately; shared key decision refuses previously eligible key use | Real admin deactivation; retain the original live token and prove product lifecycle state. No deployed volunteer write or key gateway exists. Throw `CapabilityPending(["sut.accounts.sendDiscoveryMessage", "gateway.virtual-key-revocation"])`. **Declared red** |
| **AT-001.31** | Deactivated NGO/admin controls â†’ admin re-enables â†’ same valid writes succeed; NGO role denial and Discovery verification denial persist. Key seam still rejects independent blockers and missing recovery authorization | Real lifecycle route followed by successful NGO/admin writes; member-role and non-admin refusals persist. Then `CapabilityPending(["gateway.virtual-key-recovery"])`. Terminal/vetting key checks remain stand-ins, not invented live project surfaces. **Declared red** |
| **AT-001.33** | Membership insertion, actual role change, repoint, transfer â†’ inspect events and attempt mutations â†’ events exist, operator sentinel permitted, update/delete/truncate leave them unchanged | Same trigger-producing acts; operator mutation attempts fail; exact client privilege catalog and no audit-mutating definer scan pass. **Green** |
| **AT-001.34** | Auth flow â†’ state required above-limit rejection and valid below-limit control â†’ throw vendor capability; no fake limiter success | Hosted verification target is named; local measurement is retained. Throw `CapabilityPending(["auth.sign-in-rate-limit"])`. **Declared red at both tiers** |
| **AT-001.35** | Valid transfer Given with NGO, volunteer, null caller â†’ each attempts transfer â†’ exact authorization refusal; active administrator succeeds on independent Given | Same real edge calls; no-caller may be rejected by the platform before edge, so assert authentication rejection without inventing its `kind`; NGO/volunteer edge kinds are exact. **Green** |
| **AT-001.41** | Completed volunteer with email and GitHub identities â†’ unlink GitHub â†’ shared permanence refusal, identity survives, Auth model healthy | Real Auth DELETE, live `identity_id`, surviving row and healthy `/user`; no-token negative and non-volunteer control prevent a universal-delete-block oracle. **Green**, conditional on discriminator proof |

For AT-001.29, every fixture setup must assert its successful control before testing deactivation. An endpoint that refuses both accounts is a failure, not gate evidence. Transfer controls use independent organizations so successful transfer does not destroy the deactivated armâ€™s Given.

Supplementary integration proofs attached to these bodies cover transaction rollback after a deliberately failing audit insertion, both lock acquisition orders, concurrent competing transfers, and unchanged history after refusal. They are planned evidence, not tests run by this candidate.

The declared-red entries use these exact ordered capability arrays. Bodies perform available assertions before throwing; `CapabilityPending` is never wrapped in a plain `Error`.

### Missing surfaces and a possible â€œstubâ€ ruling

Under DECLARE, no gateway, key table, concierge workflow, or onboarding-completion endpoint is fabricated. The two shipped pure seams make loop assertions meaningful and define what future leaves must consult. If the founder chooses â€œstub,â€ add an explicitly named onboarding-completion adapter and a per-project virtual-key stub with issued/revoked state; deactivation must revoke that stubâ€™s actual key records and documented recovery must issue distinct replacement credentials. Integration could then grade those stub surfaces, with their limited claim stated in the bodies and declarations changed atomically. Such a ruling does not automatically overturn R11 or make the vendor sign-in limiter green.

### Remaining two units and acceptance bookkeeping

**Leftover table privileges:** retain `unit4-privileges-after-reset.txt` as the proof that existing public tables already have no TRUNCATE, TRIGGER, or REFERENCES for client roles. No redundant privilege migration. Extend `WRITE_PRIVS` with `references` and `trigger`, require the baseline revoke to include `service_role`, and add separate negative selftests. Those guard changes precede the first new table, even though the unitâ€™s proof record is finalized in unit order.

Every new public table is added to `TENANT_CATALOG` and both `_integration.ts` lists in the same change, with `unreachable-by-client-roles` posture. The live exact-seven-privilege assertion remains.

**Local email rate limit:** record the measured CLI and GoTrue versions, file value `email_sent = 2`, effective environment `EMAIL_SENT=360000`, and the distinction between configuration presence and enforced behavior. The password-grant probe establishes 45 unthrottled invalid grants; the hook probe establishes configuration propagation only. Neither proves the configured email threshold. Verification moves to a designated hosted staging project with its effective Auth configuration and real SMTP: exercise within-limit delivery and above-limit rejection, recording reset window and legitimate recovery. This package does not claim that hosted check has happened.

**New unlink criterion:** propose AT-001.41 (P0): â€œGiven a completed volunteer account with a linked GitHub identity, when the volunteer attempts to unlink that identity after signup, the attempt is refused and the GitHub link remains.â€ Land it through `/doc-sync fold`: decision record, pure REQ-001 source amendment, regenerated products, acceptance text, owning decomposition leaf, coverage map, P0 count 38, call site, and both expected entries together. Retired IDs remain retired.

Replace the ten existing pending bodies, remove each unused `LEAF` key, and write the current pending ledger. It must list both untouched pending work and this packageâ€™s capability declarations; it must not imply only AT-001.18 and AT-001.24 remain red.

### Module map and implementation order

| Location | Responsibility |
|---|---|
| New lifecycle/admin migrations | Lifecycle, gate, transfer, contact storage, audit |
| Later unlink migration | Auth identity trigger after discriminator prototype |
| `_shared/lifecycle.ts` | Account parser and readable write refusal |
| `_shared/admin-operations.ts` | Command parsers and three narrow stand-in/refusal decisions |
| `_shared/write-inventory.generated.ts` | SQL-derived constant |
| Existing `_shared/edge.ts` | Shared account lookup, gate orchestration, error translation |
| Three new route directories | Transfer, lifecycle setting, contact storage |
| Existing three write routes | One gate boundary; existing business checks retained |
| Existing `_policy-scan.ts` | Privilege and write conformance extension |
| Existing contract/fixture/live adapters | Ten SUT additions and lifecycle read-back |
| Existing admin/lifecycle suites | Eleven IDs, including the new unlink criterion |
| Harness selftests | Negative scanner and pure-boundary cases |

The SQL additions are eight new functions in public schema: one gate, three write definers, three trigger functions, and the two stand-in SQL functionsâ€”**nine functions total**, of which only three gain service-role EXECUTE. Four triggers attach to membership, audit twice, and Auth identities. Three existing write definers are replaced. No standalone audit-insert RPC or admin read endpoint is added.

Unit 1 carries the prerequisite scanner privilege strengthening, lifecycle boundary, generated inventory, transfer, audit storage/protection, and escalation storage. Unit 2 adds complete conformance, lifecycle setting, and key seams. Unit 3 adds membership-event audit and the honest sign-in declaration. Units 4 and 6 finalize their records; unit 5 lands the unlink trigger and folded criterion.

## Synthesis decision

Reserved for the arena orchestrator. This is the SQL-first candidate; no base selection or cross-candidate graft has occurred.

## Tradeoffs accepted

- We accept a TypeScript refusal twin and fixture mutation model in exchange for useful loop evidence; integration remains the SQL oracle.
- We accept a generated inventory artifact in exchange for one editable authority in migration definitions.
- We accept conservative scanner syntax restrictions in exchange for failing unfamiliar write paths visibly.
- We accept an Auth 500 on forbidden unlink in exchange for enforcement at the actual delete surface.
- We accept serialized changes to canonical account/seat rows in exchange for atomic transfer and immediate post-commit gating.
- We accept B retaining its signup organization in exchange for using the existing completed-account path.
- We accept explicit integration-red capabilities in exchange for preserving the full acceptance clauses.
- We accept owner-level schema tampering and existing Auth-user cascades as residuals outside this subtree.

## Alternatives considered

- **TypeScript administration service with a hand-maintained operation registry:** hides some orchestration but exposes atomicity and race coordination to callers or adapters. A service-role RPC still needs SQL enforcement, leaving two substantive administration engines.
- **Lifecycle triggers on all product tables:** hides checks from routes but exposes the wrong conceptâ€”whose row changed instead of who acted. It cannot distinguish authorized recovery from a deactivated subjectâ€™s own write without adding pervasive actor plumbing.
- **Auth ban plus token claims:** offers a small apparent interface but hides no immediate-write guarantee; the supplied measurement disproves bans as sufficient, and claims cache lifecycle.
- **Edge-only unlink wrapper:** offers a friendly refusal but leaves the real Auth DELETE reachable. It cannot own the invariant.

## Open questions and risks

- Will the founder retain DECLARE for concierge and virtual keys, superseding R15â€™s earlier narrowed green?
- Does the required live discriminator prototype confirm that the trigger `WHEN` blocks direct identity deletion while permitting Authâ€™s cascading administrator user deletion?
- Is restricting all nested identity deletes through the depth discriminator acceptable, given that trigger depth distinguishes nesting rather than authenticating the cause of deletion?
- Which hosted staging project and SMTP setup will own the vendor rate-limit evidence?
- Does the founder want volunteer lost-GitHub-access recovery to mean identity replacement on the same account? The supplied transfer requirement specifies NGO ownership recovery; that additional workflow needs its own contract.
- Should a future scope extend lifecycle gating to Auth credential mutations? This candidate follows the grounded product-write inventory and separately protects mandatory identity permanence.
- Can the existing scanner extension represent the repositoryâ€™s function signatures and TypeScript call sites conservatively without accepting unsupported syntax? Its negative selftests are the decision gate.

## Next implementation step

Strengthen the existing privilege scanner and its negative selftests, then implement the SQL lifecycle gate and transfer transaction against the generated-inventory contract.

## Five lines

Output: `loop/items/AI4DEV-56/artifacts/arena/candidate-B.md` â€” launcher saves this final message.
Word count: approximately 6,600.
Direction: SQL owns lifecycle, transfer, audit, contact storage, and write registration; TypeScript supplies readable refusals.
Least certain decision: using trigger nesting to distinguish forbidden identity unlink from permitted Auth-user deletion cascades.
Graft: derive the typed write inventory from effective migration definitions and prove its omissions fail CI.