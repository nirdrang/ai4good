# Admin operations as one function, audit as the spine

Design package for the six units under the admin-operations subtree (contact transfer and recovery, lifecycle gates, append-only audit, leftover privileges, volunteer GitHub unlink, local rate-limit record). Structural direction: one edge function dispatches a closed command vocabulary; every successful command inserts the audit row first in the same transaction; account and seat state are the projection of that row.

## Problem

The tree already has a single write road: an edge function resolves the caller, a pure module decides, and one SECURITY DEFINER function writes. It has no lifecycle column, no audit table, no escalation contact, no write-route inventory, and no product call to Auth's unlink. Ten acceptance ids in sections F, G and H are red as `pending / sut-missing`. Two clauses have no surface here (virtual keys, concierge vetting). Measured facts close several tempting shapes: an Auth ban leaves a live token answering 200 at `/auth/v1/user`; local GoTrue does not throttle password grants at the file's `sign_in_sign_ups`; a BEFORE DELETE trigger on `auth.identities` keeps the row and makes GoTrue answer 500; `service_role` cannot write any public table; the operator bypasses definers and hits only triggers.

The non-obvious choice is where the gate, the admin acts, and the trail sit so that both tiers can prove them without a second authority and without a lifecycle trigger of the AT-001.37 (volunteer cannot hold a per-NGO role) shape, which would block the transfer seat update and the re-enable write.

Constraints this package honours: the fourteen act-on rulings (one typed inventory, honest per-tier volunteer arm, one delete policy, scan growth before new tables, transferee is a completed NGO, refuse other seats, share-lock the account row, product column is the deactivation authority, nullable actor plus `operator` sentinel, kinds on the wire, sign-in limit declared red, audit and escalation unreachable by client roles, lifecycle boundary in unit 1, escalation contact is an admin operation). v1 lifecycle values are `active` and `deactivated` only.

## Usage (caller's view)

A caller of the product never sees the audit table, the apply function, or the share lock. Three surfaces exist.

1. Platform administrators post one function with a tagged command.
2. Existing write routes keep their URLs and gain one standing load plus one gate call before the RPC.
3. Volunteer GitHub unlink stays Auth's own DELETE; the product refusal is the trigger behind it.

### README

**Admin commands.** Authenticate as a platform administrator. POST `/functions/v1/admin-operations` with JSON. The `act` field is a closed list. The function writes the audit row first, then applies that row to accounts, seats, or the escalation contact. A replay of an already-applied command returns success and writes no second row.

```http
POST /functions/v1/admin-operations
Authorization: Bearer <access token>
Content-Type: application/json

{"act":"transfer-contact","organizationId":"<org>","fromAccountId":"<old>","toAccountId":"<new>","reason":"founder left the NGO"}
```

Acts:

| `act` | body fields besides `act` | effect after the audit insert |
|---|---|---|
| `transfer-contact` | `organizationId`, `fromAccountId`, `toAccountId`, `reason` | seat row's `account_id` becomes the transferee; old account becomes `deactivated` |
| `recover-contact` | same as transfer | same apply; the audit `act` records that this was recovery |
| `deactivate-account` | `accountId`, `reason`, `cause` (`aup` or `admin`) | subject lifecycle becomes `deactivated` |
| `re-enable-account` | `accountId`, `reason` | subject lifecycle becomes `active` |
| `set-escalation-contact` | `organizationId`, `name`, `email`, optional `phone` | one escalation row per organisation, replaced in place |

Success:

```json
{"ok":true,"act":"transfer-contact","auditId":"<uuid>"}
```

Refusal carries `kind` and `reason` (same posture as `update-organization`):

```json
{"ok":false,"kind":"not-a-platform-admin","reason":"this action is available to a platform administrator only"}
```

**Gated writes.** `create-organization` and `update-organization` do not change their request bodies. After the caller is resolved they load standing once (type, lifecycle, and role in the named organisation when one is named) and refuse `account-deactivated` before any other product rule. `complete-signup` stays ungated: the account row does not exist yet (explicit inventory exemption).

**Unlink.** A volunteer client still calls `DELETE /auth/v1/user/identities/{identity_id}`. The product does not wrap that URL. The identity row must still exist afterwards. Do not pin GoTrue's status.

**What you import from shared modules**

```ts
import { parseAdminCommand, platformAdminActionAllowed } from '../_shared/admin-commands.ts';
import { writeGateDecision, virtualKeysLive } from '../_shared/lifecycle.ts';
import { WRITE_ROUTES } from '../_shared/write-routes.ts';
import { volunteerGithubUnlinkAllowed } from '../_shared/github.ts';
import { loadCallerStanding, callDatabaseFunction } from '../_shared/edge.ts';
```

### Call site 1 â€” the transfer route (`admin-operations/index.ts`)

```ts
Deno.serve(edgeHandler('admin-operations', async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refusal('admin-operations accepts POST only', 405);

  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
  if (!caller) return refusal('authenticate before running an admin operation', 401);

  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);

  const command = parseAdminCommand(body.value);
  if (!command.ok) return json({ ok: false, kind: command.kind, reason: command.reason }, 400);

  const standing = await loadCallerStanding(SUPABASE_URL, SERVICE_ROLE_KEY, {
    accountId: caller.id,
    organizationId: null,
  });
  if (standing.kind === 'failed') {
    return json({ ok: false, kind: 'refused', reason: standing.detail }, 502);
  }
  if (standing.kind === 'absent') {
    return json({
      ok: false,
      kind: 'not-a-platform-admin',
      reason: 'complete signup before running an admin operation',
    }, 403);
  }

  const gated = writeGateDecision(standing.value);
  if (!gated.ok) return json({ ok: false, kind: gated.kind, reason: gated.reason }, 403);

  const allowed = platformAdminActionAllowed(standing.value.accountType);
  if (!allowed.ok) return json({ ok: false, kind: allowed.kind, reason: allowed.reason }, 403);

  const outcome = await callDatabaseFunction(SUPABASE_URL, SERVICE_ROLE_KEY, 'admin_operations', {
    p_actor_id: caller.id,
    p_act: command.value.act,
    p_payload: command.value,
  });
  if (!outcome.ok) {
    const status = outcome.status >= 400 && outcome.status < 500 ? 409 : 502;
    return json({ ok: false, kind: 'refused', reason: outcome.message }, status);
  }
  return json(outcome.value, 200);
}));
```

The edge never writes a seat, a lifecycle, or an audit row. One RPC is one transaction.

### Call site 2 â€” one gated write (`create-organization/index.ts`)

Replace the hand-rolled `accountTypeOf` with the shared loader. Call the gate before `ngoOnlyActionAllowed` and before the RPC. A deactivated NGO is refused for deactivation, not for type.

```ts
  const standing = await loadCallerStanding(SUPABASE_URL, SERVICE_ROLE_KEY, {
    accountId: caller.id,
    organizationId: null,
  });
  if (standing.kind === 'failed') {
    return refusal(`the caller's account could not be read, so no decision was made: ${standing.detail}`, 502);
  }
  if (standing.kind === 'absent') return refusal('complete signup before creating an organisation', 409);

  const gated = writeGateDecision(standing.value);
  if (!gated.ok) return json({ ok: false, kind: gated.kind, reason: gated.reason }, 403);

  const allowed = ngoOnlyActionAllowed(standing.value.accountType);
  if (!allowed.ok) return refusal(allowed.reason, 403);
  // existing name check and callDatabaseFunction('create_organization', â€¦) stay
```

`update-organization` is the same with `organizationId` passed into `loadCallerStanding` so the role read is not a second helper. `sendDiscoveryMessage` in the loop fixture calls `writeGateDecision` before `discoveryMessageAllowed`. That is the volunteer arm of AT-001.29 (every enumerated write rejected when deactivated) at the loop tier.

### Call site 3 â€” the unlink integration body (AT-001.41)

```ts
atTest('AT-001.41', 'a volunteer may not unlink the GitHub identity after signup', { surface: 'backend' }, {
  default: async ({ open }) => {
    const { w, sut } = await open();
    const session = await registerVolunteerWithGithub(sut, w);
    const identities = await sut.githubIdentities(session);
    const github = identities.find((row) => row.provider === 'github');
    expect(github, 'the Given has no GitHub identity to unlink').toBeDefined();
    if (!github) return;

    const allowed = volunteerGithubUnlinkAllowed('volunteer', 'github');
    expect(allowed.ok, 'the shipped decision allowed a volunteer GitHub unlink').toBe(false);

    const result = await sut.unlinkIdentity(session, github.identityId);
    expect(result.ok, 'the unlink wrote through').toBe(false);

    const after = await sut.githubIdentities(session);
    expect(after.some((row) => row.provider === 'github' && row.identityId === github.identityId)).toBe(true);
    expect(await sut.authUserReachable(session)).toBe(true);
  },
});
```

Loop drives `volunteerGithubUnlinkAllowed` and the fixture's unlink (which consults that function and leaves the identity map unchanged). Integration sends a real `DELETE /auth/v1/user/identities/{identity_id}`. The oracle is the identity row plus `GET /auth/v1/user` answering 200. The body never pins GoTrue's 500.

## Shape

### Load-bearing decisions

1. **One admin function.** Transfer, recover, deactivate, re-enable, and the escalation contact share one authority (platform administrator), one audit table, and one transaction. They are a closed command list on `admin-operations`, not five URLs. The existing user writes stay one-function-one-job (`complete-signup`, `create-organization`, `update-organization`). The admin list is not an open `action` string: it is a typed enum that the inventory names.

2. **Audit is the spine; the lifecycle column is the projection.** `admin_operations` inserts `audit_events` first, then calls `apply_admin_act` on that row in the same transaction. The gate does **not** read the audit table (ruling: share-lock the account row; one deactivation authority is the product column). It reads `accounts.lifecycle`, which apply wrote. A reviewer who reads `audit_events` can reconstruct every admin act and every role change. The hot path does not.

3. **Role changes join the same table by trigger**, not by the dispatcher. An AFTER INSERT OR UPDATE OF `role` trigger on `org_memberships` inserts `act = 'role-change'`. A transfer updates `account_id`, not `role`, so it does not double-write. The transfer row is the definer's own insert, with actor, reason, and the two accounts.

4. **The write inventory is the command list plus the three existing edge writes**, plus one stand-in row for Discovery. `admin-operations` is one inventory row admitted to `platform_admin`. The scan does not treat each command as a route.

5. **No lifecycle trigger on tenant tables.** A trigger of the AT-001.37 (volunteer cannot hold a per-NGO role) shape on writes to a deactivated account's rows would refuse the transfer's seat update and the re-enable write. The gate is about the **caller**, in TypeScript and again in the definer.

### Data structures

```ts
/** v1: two values, never a third. A boolean would invite "suspended". */
export const LIFECYCLES = ['active', 'deactivated'] as const;
export type Lifecycle = (typeof LIFECYCLES)[number];

export const ADMIN_ACTS = [
  'transfer-contact',
  'recover-contact',
  'deactivate-account',
  're-enable-account',
  'set-escalation-contact',
] as const;
export type AdminAct = (typeof ADMIN_ACTS)[number];

/** Discriminated union: a transfer cannot be expressed without both accounts. */
export type AdminCommand =
  | {
      act: 'transfer-contact' | 'recover-contact';
      organizationId: string;
      fromAccountId: string;
      toAccountId: string;
      reason: string;
    }
  | {
      act: 'deactivate-account';
      accountId: string;
      reason: string;
      cause: 'aup' | 'admin';
    }
  | { act: 're-enable-account'; accountId: string; reason: string }
  | {
      act: 'set-escalation-contact';
      organizationId: string;
      name: string;
      email: string;
      phone: string | null;
    };

export type AdminRefusalKind =
  | 'not-a-platform-admin'
  | 'account-deactivated'
  | 'unknown-act'
  | 'holds-other-seats'
  | 'transferee-not-ngo'
  | 'transferee-deactivated'
  | 'seat-not-held-by-from'
  | 'reason-blank'
  | 'escalation-contact-invalid'
  | 'no-such-organization'
  | 'refused';

export type AdminDecision<T> =
  | { ok: true; value: T }
  | { ok: false; kind: AdminRefusalKind; reason: string };

export type CallerStanding = {
  id: string;
  accountType: AccountType;
  lifecycle: Lifecycle;
  /** Role in the named organisation, or null when no organisation was named or no row exists. */
  orgRole: OrgRole | null;
};

export type StandingLookup =
  | { kind: 'found'; value: CallerStanding }
  | { kind: 'absent' }
  | { kind: 'failed'; detail: string };

export type WriteRouteSurface = 'edge' | 'stand-in';

export type WriteRouteExemption = {
  reason: 'the account row does not exist yet';
};

/**
 * One typed inventory. AT-001.29 iterates it. The scan checks the tree against it.
 * `admitted` is the global types that have an otherwise-authorized write on this route.
 * A body cannot skip a type: the field is required and the AT iterates `admitted`.
 */
export const WRITE_ROUTES = {
  'complete-signup': {
    surface: 'edge' as const,
    admitted: ['ngo', 'volunteer'] as const,
    definer: 'complete_signup',
    gated: false,
    exemption: { reason: 'the account row does not exist yet' } as WriteRouteExemption,
  },
  'create-organization': {
    surface: 'edge' as const,
    admitted: ['ngo'] as const,
    definer: 'create_organization',
    gated: true,
    exemption: null,
  },
  'update-organization': {
    surface: 'edge' as const,
    admitted: ['ngo'] as const,
    definer: 'update_organization',
    gated: true,
    exemption: null,
  },
  'admin-operations': {
    surface: 'edge' as const,
    admitted: ['platform_admin'] as const,
    definer: 'admin_operations',
    gated: true,
    exemption: null,
    commands: ADMIN_ACTS,
  },
  'send-discovery-message': {
    surface: 'stand-in' as const,
    admitted: ['ngo', 'volunteer'] as const,
    definer: null,
    gated: true,
    exemption: null,
  },
} as const;

export type WriteRouteName = keyof typeof WRITE_ROUTES;

export type AuditAct = AdminAct | 'role-change';

export type AuditEventRow = {
  id: string;
  at: string;
  act: AuditAct;
  actorAccountId: string | null;
  actorLabel: string;
  subjectAccountId: string | null;
  subjectAccountType: string | null;
  organizationId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  reason: string;
  payload: Record<string, unknown>;
};

export type EscalationContactRow = {
  organizationId: string;
  name: string;
  email: string;
  phone: string | null;
};

/** AccountRow grows a required lifecycle. Default at insert is active. */
export type AccountRow = {
  id: string;
  accountType: AccountType;
  lifecycle: Lifecycle;
};
```

Access patterns and why the structure is enough:

- **Gate on a write:** read `accounts` by caller id (`FOR SHARE` in SQL). No audit lookup, no map to add later.
- **Transfer apply:** one membership row keyed by `org_id` (unique index already exists). UPDATE `account_id`. Old account row UPDATE `lifecycle`. Both keyed by the audit payload.
- **Reviewer / AT-001.26 and AT-001.33:** `SELECT` from `audit_events` as the operator, filter by `organization_id` or `act`. Indexes on `(organization_id, at)` and `(act, at)`.
- **Escalation contact:** primary key `org_id`, one row, replace in place.
- **Role change:** the membership row is the state; the audit row is the trail. No second role column to sync.
- **Unlink:** `auth.identities` keyed by identity id; the trigger joins `public.accounts` by `user_id`.

### Invariants encoded in types

- Two-value lifecycle enum, not a boolean (ruling: v1 has only active and deactivated).
- `AdminCommand` is a discriminated union; `parseAdminCommand` is the only constructor from `unknown`.
- `actor_account_id` nullable, `actor_label` not null, so a trigger-written row with no actor is representable and AT-001.33 (append-only audit) can accept it.
- `WRITE_ROUTES[name].admitted` is a tuple of account types; AT-001.29 iterates it so a type cannot be skipped silently.
- Audit and escalation tables have no client policy (posture `unreachable-by-client-roles`).
- No foreign keys on `audit_events` (ruling: no cascading FK; actor and subject are uuid plus denormalised labels).

Validation lives at the HTTP and SQL boundaries (`parseAdminCommand`, `loadCallerStanding`, definer re-checks). Inside `apply_admin_act` the audit row is trusted.

What the system deliberately does not do: Auth `ban_duration`; token claims; ending live sessions on deactivation; wrapping Auth unlink in an edge function; a product sign-in counter; a viewer helper for audit; a lifecycle trigger on tenant tables; minting the transferee's account.

### Interface depth

Public surface: one new URL, five tagged commands, two extra calls on two existing files (`loadCallerStanding` then `writeGateDecision`), one inventory constant, one unlink decision. Hidden behind that: audit-first apply, share locks, session GUC for the role-change trigger, the scan, PostgREST mapping, two-tier pending shapes. Callers never import wire types from PostgREST. That is the depth. A factory that rewrote every existing `index.ts` would expose more surface for the same capability; this design does not do that.

### Signatures

**Pure decisions (`supabase/functions/_shared/`)**

```ts
// lifecycle.ts
export function parseLifecycle(raw: unknown): Lifecycle | null;
/** Caller-side gate. Reads standing.lifecycle only. */
export function writeGateDecision(standing: CallerStanding): AdminDecision<CallerStanding>;
/**
 * Hook the LLM gateway leaf must consult.
 * A deactivated account has no live virtual keys. Loop AT-001.30 grades this.
 * Integration names capability gateway.virtual-keys after the write refusal.
 */
export function virtualKeysLive(lifecycle: Lifecycle): boolean;

// admin-commands.ts
export function parseAdminCommand(raw: unknown): AdminDecision<AdminCommand>;
export function platformAdminActionAllowed(accountType: unknown): AdminDecision<'platform_admin'>;
/** Shared apply used by the loop fixture after it inserts the audit row. */
export function applyAdminCommand(
  command: AdminCommand,
  world: {
    accounts: ReadonlyMap<string, AccountRow>;
    membershipsOf: (accountId: string) => readonly MembershipRow[];
    membership: (organizationId: string, accountId: string) => MembershipRow | null;
    account: (accountId: string) => AccountRow | null;
    organization: (organizationId: string) => OrganizationRow | null;
  },
): AdminDecision<{
  nextLifecycle?: { accountId: string; lifecycle: Lifecycle };
  nextSeat?: { organizationId: string; fromAccountId: string; toAccountId: string };
  nextEscalation?: EscalationContactRow;
}>;

// github.ts (added)
export function volunteerGithubUnlinkAllowed(
  accountType: AccountType | null,
  provider: string,
): Decision<true>;

// write-routes.ts
export const WRITE_ROUTES: { /* as above */ };
export type WriteRouteName = keyof typeof WRITE_ROUTES;
```

`writeGateDecision` and `platformAdminActionAllowed` throw `not implemented` until unit 1 fills them. `applyAdminCommand` is the fixture's projection, the TypeScript twin of `apply_admin_act`, so the loop tier grades the same command vocabulary.

**Edge (`supabase/functions/_shared/edge.ts`)**

```ts
export function refusalWithKind(kind: string, reason: string, status: number): Response;
export async function loadCallerStanding(
  supabaseUrl: string,
  serviceRoleKey: string,
  args: { accountId: string; organizationId: string | null },
): Promise<StandingLookup>;
```

`loadCallerStanding` replaces `accountTypeOf` in `create-organization` and `roleIn` in `update-organization`. One function returns type, lifecycle, and optional org role. It is I/O, not a judgement.

**New edge function**

- `supabase/functions/admin-operations/index.ts` â€” call site 1.
- `supabase/config.toml`: `[functions.admin-operations] verify_jwt = true`.

**SQL functions and triggers** (see migration sketch)

- `assert_account_active(p_account_id uuid) returns void` â€” `SELECT lifecycle FROM accounts WHERE id = p FOR SHARE`; raise if missing or not `active`. Not granted to `service_role`.
- `admin_operations(p_actor_id uuid, p_act text, p_payload jsonb) returns jsonb` â€” granted to `service_role` only.
- `apply_admin_act(p_event public.audit_events) returns void` â€” not granted to `service_role`.
- `audit_events_append_only()` BEFORE UPDATE OR DELETE on `audit_events` â€” raises.
- `org_memberships_audit_role_change()` AFTER INSERT OR UPDATE OF `role` on `org_memberships` â€” inserts `role-change` (unit 3).
- `volunteer_github_identity_permanent()` BEFORE DELETE on `auth.identities` when `pg_trigger_depth() = 0` (unit 5).

**Altered definers (unit 1, same migration that adds the helper)**

- `create_organization` and `update_organization`: first statement `perform public.assert_account_active(p_account_id);`. Drop-and-recreate restates `revoke execute from public` and `grant execute to service_role`.
- `complete_signup`: unchanged. Inventory exemption: the account row does not exist yet.

**AccountsSut members (contract, fixture, live)**

```ts
runAdminCommand(session: Session, command: AdminCommand): Promise<
  { ok: true; act: AdminAct; auditId: string } | { ok: false; kind: AdminRefusalKind; reason: string }
>;
auditEvents(filter: {
  organizationId?: string;
  subjectAccountId?: string;
  act?: AuditAct;
}): Promise<AuditEventRow[]>; // operator at live; fixture storage at loop
escalationContact(organizationId: string): Promise<EscalationContactRow | null>;
mutateAuditEventAsOperator(id: string, patch: { reason?: string }): Promise<{ ok: false; kind: 'append-only' }>;
deleteAuditEventAsOperator(id: string): Promise<{ ok: false; kind: 'append-only' }>;
unlinkIdentity(session: Session, identityId: string): Promise<{ ok: true } | { ok: false; reason: string }>;
githubIdentities(session: Session): Promise<{ identityId: string; provider: string }[]>;
authUserReachable(session: Session): Promise<boolean>; // GET /auth/v1/user is 2xx
```

`AccountRow.lifecycle` is required. Fixture `completeSignup` and `provisionPlatformAdmin` write `active`. `CreateOrganizationOutcome` and `SendDiscoveryMessageOutcome` gain optional `kind?: 'account-deactivated'`. `UpdateOrganizationOutcome` adds `'account-deactivated'` to its kind union. Live `createOrganization` and `updateOrganization` pass that kind through when the wire sends it.

No `attemptWrite` helper. AT-001.29 switches on the inventory name and calls the existing members (`createOrganization`, `updateOrganization`, `runAdminCommand` with `transfer-contact`, `sendDiscoveryMessage`).

**Static scan and selftest**

- `_policy-scan.ts`: `WRITE_PRIVS` adds `references` and `trigger`. Baseline revoke tracks `service_role` as well as `anon` and `authenticated`. `TENANT_CATALOG` gains `audit_events` and `org_escalation_contacts` as `unreachable-by-client-roles`.
- `policy-scan.selftest.ts`: a grant of `references` or `trigger` to `service_role` is `service-role-write`; a `revoke all` that omits `service_role` is `no-baseline-revoke`.
- `_write-route-scan.ts` + `tests/at/harness/write-route-scan.selftest.ts` (unit 2).
- `_integration.ts`: both catalog lists name the two new tables. `SERVICE_ROLE_SELECT` stays `{accounts, org_memberships}`. `VIEWER_FUNCTIONS` unchanged.

### Module map

```
admin-operations/index.ts          thin: parse, standing, gate, admin-allowed, one RPC
create-organization/index.ts       add standing + gate; delete local accountTypeOf
update-organization/index.ts       add standing + gate; delete local roleIn
complete-signup/index.ts           untouched (exemption)

_shared/admin-commands.ts          parseAdminCommand, platformAdminActionAllowed, applyAdminCommand
_shared/lifecycle.ts               Lifecycle, writeGateDecision, virtualKeysLive
_shared/write-routes.ts            WRITE_ROUTES (the inventory)
_shared/github.ts                  + volunteerGithubUnlinkAllowed
_shared/edge.ts                    + loadCallerStanding, refusalWithKind
_shared/accounts.ts                AccountType unchanged; no lifecycle here
_shared/memberships.ts             unchanged
_shared/verification.ts            unchanged; Discovery stand-in calls the gate first

migrations/20260908120000_â€¦        unit 1: enum, column, tables, helper, admin_operations, apply, append-only, alter two definers
migrations/20260908130000_â€¦        unit 3: role-change trigger
migrations/20260908140000_â€¦        unit 5: identities BEFORE DELETE

_write-route-scan.ts               unit 2 conformance
write-route-scan.selftest.ts       negative directions
_policy-scan.ts                    unit 4 growth + new catalog keys with unit 1 tables
_contract.ts / _fixture.ts / _live.ts
e-admin-operations.test.ts         AT-001.25â€“28, .35
f-lifecycle-and-audit.test.ts      AT-001.29â€“31, .33, .34
g-github-unlink.test.ts            AT-001.41 (or a-signup, same bijection)
live-stack.ts                      + authDelete
```

Call chain for a transfer, three hops: `admin-operations/index.ts` â†’ `_shared/admin-commands.ts` + `lifecycle.ts` â†’ `public.admin_operations`. Call chain for a gated create: `create-organization/index.ts` â†’ `lifecycle.ts` â†’ `public.create_organization` (which calls `assert_account_active`). Call chain for unlink: Auth DELETE â†’ trigger â†’ `public.accounts`. Nothing needs a fourth file to trace.

### Migration sketch

Unit 1 file `supabase/migrations/20260908120000_admin_operations_audit_and_lifecycle.sql`. Static scan requires `revoke all â€¦ from anon, authenticated, service_role` after every `create table`, `revoke execute from public` on every definer, and no client write privilege.

```sql
-- lifecycle on accounts (v1: two values)
create type public.account_lifecycle as enum ('active', 'deactivated');
alter table public.accounts
  add column lifecycle public.account_lifecycle not null default 'active';

create type public.audit_act as enum (
  'transfer-contact',
  'recover-contact',
  'deactivate-account',
  're-enable-account',
  'set-escalation-contact',
  'role-change'
);

-- SPINE. No FKs. Actor/subject are uuid plus labels, in the spirit of acknowledgments.signer_name.
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  act public.audit_act not null,
  actor_account_id uuid,
  actor_label text not null check (length(btrim(actor_label, E' \t\r\n\f')) > 0),
  subject_account_id uuid,
  subject_account_type text,
  organization_id uuid,
  from_account_id uuid,
  to_account_id uuid,
  reason text not null check (length(btrim(reason, E' \t\r\n\f')) > 0),
  payload jsonb not null default '{}'::jsonb
);
create index audit_events_org_at_idx on public.audit_events (organization_id, at);
create index audit_events_act_at_idx on public.audit_events (act, at);

revoke all on table public.audit_events from anon, authenticated, service_role;
-- no policy, no select grant: unreachable-by-client-roles
alter table public.audit_events enable row level security;

create table public.org_escalation_contacts (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  name text not null check (org_id is not null and length(btrim(name, E' \t\r\n\f')) > 0),
  email text not null check (length(btrim(email, E' \t\r\n\f')) > 0),
  phone text,
  captured_at timestamptz not null default now()
);
revoke all on table public.org_escalation_contacts from anon, authenticated, service_role;
alter table public.org_escalation_contacts enable row level security;
-- no policy

-- Append-only: no client role and not service_role holds UPDATE, DELETE or TRUNCATE
-- (revoke all above). No definer updates or deletes this table. The trigger is the third lock.
-- Residual: the operator can drop this trigger.
create function public.audit_events_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_events is append-only'
    using errcode = '25006';
end;
$$;
revoke execute on function public.audit_events_append_only() from public;

create trigger audit_events_append_only
  before update or delete on public.audit_events
  for each row execute function public.audit_events_append_only();

-- Gate helper. VOLATILE because of FOR SHARE. Not granted to service_role.
create function public.assert_account_active(p_account_id uuid)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_lifecycle public.account_lifecycle;
begin
  select lifecycle into v_lifecycle
    from public.accounts
   where id = p_account_id
     for share;
  if v_lifecycle is null then
    raise exception 'assert_account_active refuses %: no account row', p_account_id
      using errcode = '42501';
  end if;
  if v_lifecycle <> 'active' then
    raise exception 'assert_account_active refuses %: account is deactivated', p_account_id
      using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.assert_account_active(uuid) from public;

-- Projection. Called only from admin_operations after the insert.
create function public.apply_admin_act(p_event public.audit_events)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- TODO: switch on p_event.act
  -- transfer-contact / recover-contact:
  --   update org_memberships set account_id = p_event.to_account_id
  --    where org_id = p_event.organization_id and account_id = p_event.from_account_id;
  --   if not found, raise seat-not-held-by-from;
  --   update accounts set lifecycle = 'deactivated' where id = p_event.from_account_id;
  -- deactivate-account:
  --   update accounts set lifecycle = 'deactivated' where id = p_event.subject_account_id;
  -- re-enable-account:
  --   update accounts set lifecycle = 'active' where id = p_event.subject_account_id;
  -- set-escalation-contact:
  --   insert into org_escalation_contacts â€¦ on conflict (org_id) do update â€¦;
  -- role-change: no-op (state already written)
  raise exception 'not implemented';
end;
$$;
revoke execute on function public.apply_admin_act(public.audit_events) from public;

create function public.admin_operations(
  p_actor_id uuid,
  p_act text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.audit_events;
  v_actor_type public.account_type;
  v_other_seats int;
begin
  perform public.assert_account_active(p_actor_id);

  -- TODO: lock and re-check actor type = platform_admin
  -- TODO: validate payload against act (transferee completed ngo and active;
  --       from holds this seat; from holds no other seat; reason non-blank;
  --       organisation exists)
  -- Idempotent replay: if the projected state already matches, return ok with the
  -- existing audit id and insert nothing.
  -- Then, FIRST:
  --   insert into public.audit_events (act, actor_account_id, actor_label, â€¦)
  --   values (â€¦) returning * into v_event;
  -- THEN:
  --   perform public.apply_admin_act(v_event);
  --   return jsonb_build_object('ok', true, 'act', v_event.act, 'audit_id', v_event.id);
  raise exception 'not implemented';
end;
$$;
revoke execute on function public.admin_operations(uuid, text, jsonb) from public;
grant execute on function public.admin_operations(uuid, text, jsonb) to service_role;

-- Recreate create_organization and update_organization with
--   perform public.assert_account_active(p_account_id);
-- as the first statement after the name/id checks. Restate revoke/grant.
```

Unit 3 adds the role-change trigger (same audit table, no new table):

```sql
create function public.org_memberships_audit_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_label text;
begin
  v_actor := nullif(current_setting('app.actor_account_id', true), '')::uuid;
  v_label := coalesce(nullif(btrim(current_setting('app.actor_label', true), E' \t\r\n\f'), ''), 'operator');
  insert into public.audit_events (
    act, actor_account_id, actor_label, subject_account_id, organization_id, reason, payload
  ) values (
    'role-change',
    v_actor,
    v_label,
    new.account_id,
    new.org_id,
    case when tg_op = 'INSERT' then 'membership granted' else 'role changed' end,
    jsonb_build_object('old_role', case when tg_op = 'UPDATE' then old.role else null end, 'new_role', new.role)
  );
  return new;
end;
$$;
revoke execute on function public.org_memberships_audit_role_change() from public;

create trigger org_memberships_audit_role_change
  after insert or update of role on public.org_memberships
  for each row execute function public.org_memberships_audit_role_change();
```

`admin_operations` sets `app.actor_account_id` and `app.actor_label` in the same transaction before apply, so a future membership write on an operator path still records `operator`. Transfer does not fire this trigger: it updates `account_id`, not `role`.

Unit 5:

```sql
create function public.volunteer_github_identity_permanent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() <> 0 then
    return old; -- vendor admin user delete still cascades
  end if;
  if old.provider = 'github'
     and exists (
       select 1 from public.accounts a
        where a.id = old.user_id and a.account_type = 'volunteer'
     ) then
    raise exception 'a volunteer may not unlink the GitHub identity'
      using errcode = '42501';
  end if;
  return old;
end;
$$;
revoke execute on function public.volunteer_github_identity_permanent() from public;

create trigger volunteer_github_identity_permanent
  before delete on auth.identities
  for each row execute function public.volunteer_github_identity_permanent();
```

Measured: `postgres` can create this trigger; a raising trigger keeps the GitHub row; `GET /user` still answers 200; no token answers 401. The test does not pin the 500.

Unit 4 ships **no** migration. After reset, no client role holds TRUNCATE, TRIGGER or REFERENCES on any public table. The default ACL still hands `Dxt` to every **new** public table, which is why the scan's baseline revoke must name `service_role` and `WRITE_PRIVS` must include `references` and `trigger` before unit 1's tables land.

### Conformance check (unit 2)

File: `tests/at/suites/req-001/_write-route-scan.ts`. It runs at the loop tier (CI).

**How it enumerates candidates from the tree** (not from a remembered list):

1. Every directory `supabase/functions/<name>/` other than `_shared` that contains `index.ts` whose text matches `\bcallDatabaseFunction\b`. That is a write-route candidate. Today: `complete-signup`, `create-organization`, `update-organization`, and after unit 1 `admin-operations`. Reads (`organization-dashboard`, `project-workspace`, `public-project`) do not import it.
2. Every `create function public.<fn>` in migrations, overlaid in name order, that is `security definer`, not `stable`/`immutable`, and still has EXECUTE granted to `service_role`. That is a write-definer candidate.

**What "registered" means mechanically**

- An edge candidate `<name>` is registered when `WRITE_ROUTES` has a key `<name>` with `surface: 'edge'`.
- A gated edge row (`gated: true`) is well-wired when that `index.ts` text contains `\bwriteGateDecision\b` and `\bcallDatabaseFunction\b`.
- An exempt edge row is well-wired when it names `exemption.reason` in the inventory; the scan does not require `writeGateDecision` there.
- A write-definer candidate `<fn>` is registered when some inventory row has `definer: '<fn>'`.
- A gated definer is well-wired when the latest function body text contains `\bassert_account_active\b`.
- The stand-in row `send-discovery-message` is not an edge candidate. The scan requires `sendDiscoveryMessage` in `_fixture.ts` to contain `\bwriteGateDecision\b`. It does not require a directory.

**What the scan proves, in one sentence:** every edge file that imports `callDatabaseFunction` is in `WRITE_ROUTES`, and every gated one names `writeGateDecision` in that file; every volatile definer granted to `service_role` is in `WRITE_ROUTES` and, unless exempt, names `assert_account_active`. **What only integration proves:** the definer actually refuses a deactivated caller (`assert_account_active` raises and the write does not land).

Operator SQL is out: it is test-only `postgres` over the database URL, it bypasses definers, and a lifecycle trigger would block transfer and re-enable. Raw service-role RPC is in: it must call a gated definer.

**Negative-direction selftest** (`tests/at/harness/write-route-scan.selftest.ts`):

```ts
it('fails an unregistered edge write', () => {
  const problems = scanWriteRoutes(WRITE_ROUTES, {
    functions: [
      { name: 'create-organization', text: 'import { callDatabaseFunction, writeGateDecision }' },
      { name: 'sneaky-write', text: 'import { callDatabaseFunction } from "../_shared/edge.ts"' },
    ],
    definers: [],
    fixtureText: 'writeGateDecision',
  });
  expect(problems.some((p) => p.code === 'write-route-unregistered' && p.detail.includes('sneaky-write'))).toBe(true);
});

it('fails a registered edge write that never calls the gate', () => {
  const problems = scanWriteRoutes(WRITE_ROUTES, {
    functions: [{ name: 'create-organization', text: 'callDatabaseFunction(' }],
    definers: [],
    fixtureText: 'writeGateDecision',
  });
  expect(problems.some((p) => p.code === 'write-route-ungated')).toBe(true);
});

it('fails a volatile service_role definer that never calls assert_account_active', () => {
  const problems = scanWriteRoutes(WRITE_ROUTES, {
    functions: [],
    definers: [{ name: 'create_organization', body: 'update public.organizations', serviceRoleExecute: true, stable: false }],
    fixtureText: 'writeGateDecision',
  });
  expect(problems.some((p) => p.code === 'definer-ungated')).toBe(true);
});
```

AT-001.29's loop body also asserts `writeRouteProblems()` is `[]`.

### Transfer, row by row (one transaction)

Given organisation O, old NGO account A (the unique seat), transferee B (completed `ngo`, active). Command `{ act: 'transfer-contact', organizationId: O, fromAccountId: A, toAccountId: B, reason }`.

| table | what changes | what does not |
|---|---|---|
| `audit_events` | one new row, `act = transfer-contact`, actor = platform admin, `from_account_id = A`, `to_account_id = B`, `reason` set, `at` set | never updated or deleted |
| `org_memberships` | the one row `(O, A, admin)` becomes `(O, B, admin)` â€” same row, `account_id` updated, `role` unchanged | no second row (unique on `org_id`); no history table |
| `accounts` for A | `lifecycle` becomes `deactivated` | `id`, `account_type`, `created_at` |
| `accounts` for B | nothing | B stays `active`; B's own signup organisation stays B's (accepted residual) |
| `acknowledgments` | nothing | still `account_id = A` (original acting humans) |
| `projects` | nothing | still `org_id = O`; volunteer seat untouched |
| `volunteer_profiles` | nothing | not an NGO transfer |
| `organizations` | nothing | O's id and name |
| `auth.users` | nothing | A is not deleted, so cascades do not fire |

If A holds any other seat, the function inserts nothing and returns `holds-other-seats`. Blast radius of a successful transfer: A loses the named seat and cannot write anywhere; B holds two organisations (signup org + O). Lost-access recovery is the same apply with `act = recover-contact`. It must work when A is already `deactivated` (the caller gate is on the administrator, not on A).

Idempotency: if the seat already belongs to B and A is already `deactivated`, return success and insert no second audit row. Crash halfway: one transaction, so the audit insert rolls back with the apply. Replay is a new request.

### Refusal shapes on the wire

| situation | HTTP | `kind` |
|---|---|---|
| no / dead token on `admin-operations` | 401 | none (`{ ok: false, reason }`, same as today's writes) |
| NGO, volunteer, or other completed type | 403 | `not-a-platform-admin` |
| unauthenticated already covered | 401 | none |
| caller deactivated (admin or gated user write) | 403 | `account-deactivated` |
| transfer, old account holds another seat | 409 | `holds-other-seats` |
| transferee missing, not `ngo`, or not completed | 409 | `transferee-not-ngo` |
| transferee deactivated | 409 | `transferee-deactivated` |
| `fromAccountId` does not hold the seat | 409 | `seat-not-held-by-from` |
| organisation missing | 409 | `no-such-organization` |
| unknown `act` or malformed command | 400 | `unknown-act` |
| blank reason / blank escalation fields | 400 | `reason-blank` or `escalation-contact-invalid` |
| SQL backstop disagrees with TypeScript | 409 | `refused` |
| gated `create-organization` / `update-organization` / Discovery stand-in, deactivated caller | 403 | `account-deactivated` |
| volunteer GitHub unlink | do not pin (measured 500 `unexpected_failure`) | oracle is the surviving row; `GET /user` 200 |
| unlink with no token | 401 | Auth `no_authorization` |

Existing AT-001.06 (volunteer refused NGO-only action) type refusals on `create-organization` stay reason-only 403 so that id does not move.

### Per id, per tier

Capability strings, locked:

- `product.volunteer-write-route` â€” no deployed volunteer write
- `gateway.virtual-keys` â€” LLM gateway not in this tree
- `vendor.signin-rate-limit` â€” local GoTrue did not throttle 45 password grants

If the founder says **stub** instead of **declare** for the two missing surfaces: keep `virtualKeysLive` as the shipped decision; add a small `public.virtual_key_revocations` table (or fixture Map) that `apply_admin_act` writes on `deactivate-account` with `cause = aup` and deletes on `re-enable-account`; AT-001.30 and AT-001.31 go green at **both** tiers against that table; drop `gateway.virtual-keys` from the expected JSON; the future gateway leaf reads the same table. Concierge stays an admin command (ruling: AT-001.28 is green at both tiers with that narrowing). No other id changes. Sign-in (AT-001.34) stays declared: a stub counter would be SQL the loop tier cannot grade and a control the criterion did not ask for.

| id | Given | act | assertion | loop | integration |
|---|---|---|---|---|---|
| **AT-001.25** (contact transfer) | completed NGO A with seat on O, projects and acknowledgments on A; completed NGO B; provisioned platform admin | `runAdminCommand(transfer-contact)` | seat is B; A is `deactivated`; acknowledgments still A; projects still O; B's signup org still B's | G: fixture Maps + shipped parse/apply | G: deployed function + operator reads |
| **AT-001.26** (who / when / why) | the transfer in .25 | read `auditEvents({ organizationId: O })` | one `transfer-contact` row with actor = admin, `at` set, `reason` the posted reason | G | G (operator SELECT) |
| **AT-001.27** (lost-access recovery) | same as .25, A unreachable (do not sign A in) | `recover-contact` with the same payload shape | same row outcomes as .25; audit `act` is `recover-contact` | G | G |
| **AT-001.28** (escalation contact) | platform admin, existing organisation | `set-escalation-contact` | one row stored; NGO/volunteer/anon refused | G at both tiers. Narrowing stated in the body: concierge onboarding here is the administrator acting on the organisation, not REQ-002 vetting. No capability-pending. | G |
| **AT-001.35** (admin-only executor) | NGO session, volunteer session, no token | each posts `transfer-contact` | NGO/volunteer 403 `not-a-platform-admin`; no token 401; no seat move | G | G |
| **AT-001.29** (every enumerated write) | for each `WRITE_ROUTES` row and each `admitted` type: an active otherwise-authorized control that succeeds, and a deactivated account of that type | the route's write | deactivated â†’ 403 `account-deactivated` and no write; active control succeeds; `writeRouteProblems()` is empty | G including volunteer via `sendDiscoveryMessage`. Scan selftest is a separate harness file. | G for NGO (`create-organization`, `update-organization`) and admin (`admin-operations`). Then `CapabilityPending(['product.volunteer-write-route'])` after those arms have run, AT-001.24 shape. |
| **AT-001.30** (AUP volunteer) | completed verified volunteer, optionally assigned to a project | admin `deactivate-account` with `cause: 'aup'` | writes refused immediately (`account-deactivated`); `virtualKeysLive('deactivated') === false` | G over the shipped decision + Discovery stand-in | write refusal G, then `CapabilityPending(['gateway.virtual-keys'])` |
| **AT-001.31** (re-enable) | deactivated NGO (and admin arm); independent gate: member in org B | `re-enable-account` then the otherwise-authorized write; member rename in B | writes work again; `not-an-admin` still holds in B | G | G for writes; keys clause `CapabilityPending(['gateway.virtual-keys'])` |
| **AT-001.33** (append-only) | a transfer (.25) and a role change (operator grant or complete-signup membership insert after unit 3 trigger) | `mutateAuditEventAsOperator` / `deleteAuditEventAsOperator`; live also tries UPDATE/DELETE as `service_role` (privilege denied) | both events have a row; mutation refused; trigger raise `audit_events is append-only`; trigger-written role-change row may have `actor_account_id` null and `actor_label = operator` | G on fixture refusal | G on live trigger + privileges |
| **AT-001.34** (sign-in rate limit) | auth flow | excess password grants | â€” | `CapabilityPending(['vendor.signin-rate-limit'])` at both tiers after `open()`. Unit 6 record names hosted platform as where the vendor limiter is verified. | same |
| **AT-001.41** (GitHub unlink, new) | volunteer with linked GitHub after signup | `unlinkIdentity` on the GitHub identity id from `/user` | identity row remains; `/user` still 200; shipped `volunteerGithubUnlinkAllowed` is false | G | G (row oracle, do not pin 500). Unauthenticated DELETE is 401 (measured). |

AT-001.41 lands through `/doc-sync fold` in unit 5: a `dNN` row in `loop/state/decisions.jsonl`; edit `loop/out/pure-s3-req-001-006.md` so the GitHub link is permanent after volunteer signup; assemble; extract isolates; `at-req-001.md` adds `AT-001.41 (P0)`; `loop/decomp/req-001.md` adds D1.L3 (GitHub identity stays linked after volunteer signup) and moves the header from 37 P0 to 38; `atTest` call site; expected JSON green at both tiers; no `LEAF` key. Three bijections in one change.

### Unit 4 proof record

No migration. Measurement `loop/items/AI4DEV-56/artifacts/measure/unit4-privileges-after-reset.txt` lines 10â€“27: after reset, `anon`, `authenticated` and `service_role` hold no TRUNCATE, TRIGGER or REFERENCES on any public table. `revoke all` in `20260906120000` already cleared the four tables the item named plus `volunteer_profiles` and `projects`. The durable artefact is the scan change (baseline revoke includes `service_role`; `WRITE_PRIVS` includes `references` and `trigger`) plus a selftest case for each. The live catalog already pins all seven privileges; it does not change its list, only gains the two new unreachable tables in unit 1. Checks still cover `public` only, never `auth.*`.

### Unit 6 record

Local CLI v2.110 does not honour `[auth.rate_limit] email_sent = 2`: the running container has `GOTRUE_RATE_LIMIT_EMAIL_SENT=360000`. It does not throttle password grants at `sign_in_sign_ups = 30`: 45 grants in 0.7 s all answered 400 `invalid_credentials`, no 429. The CLI **does** push `[auth.hook.password_verification_attempt]` into the container when that block is present; this run does not ship a hook (ruling: AT-001.34 declared red). The record states the email and sign-in limits are unverifiable against the local tool as configured, and they are verified on the hosted Supabase project instead. File: `loop/items/AI4DEV-56/unit6-local-rate-limit-record.md`. No product code.

### Commit groups

- **Unit 1:** lifecycle column, helper, pure gate, inventory, `admin-operations` with all five acts implemented, audit table, append-only trigger, escalation table, standing loader, gate on `create-organization` and `update-organization`, AT-001.25â€“28 and .35 green, catalog keys. Deactivate and re-enable exist so the spine is complete; their AT ids wait for unit 2. No earlier user route is reopened after this.
- **Unit 2:** write-route scan + selftest; AT-001.29â€“31 bodies; Discovery stand-in calls the gate; virtual-keys decision; expected JSON.
- **Unit 3:** role-change trigger; AT-001.33; AT-001.34 declared red both tiers.
- **Unit 4:** scan growth + selftest + the measurement record. Lands **before** unit 1's tables if the scan change is split first; otherwise in the same change as unit 1's migration because the scan must accept the new tables. Preferred: scan growth first (can merge with unit 1's migration commit if the arena wants fewer PRs; this item is one PR with ordered commits).
- **Unit 5:** doc-sync fold, identities trigger, AT-001.41, `authDelete`.
- **Unit 6:** the record file only.

Pending ledger after the run: AT-001.18 and AT-001.24 remain. Remove `LEAF.D6_L1/L2/L3` as those ids leave `notLanded`.

### Not done here

- Ending a deactivated account's live sessions (ban leaves the access token working; out of scope by the product-column ruling).
- `deno check` over `supabase/functions`.
- Raising-on-delete for `acknowledgments` or `org_memberships`; the existing cascade from `auth.users` stays.
- Transferee's leftover signup organisation.
- Operator path around the gate.
- Auth schema privilege scan.
- Hosted rate-limit proof.
- Admin-mediated volunteer GitHub recovery (out of scope of the unlink unit; recovery here is NGO contact transfer).

## Synthesis decision

Filled in by the arena after the picker chooses a base.

## Tradeoffs accepted

- We accept one dispatcher with a closed `act` enum in exchange for a single audit writer and a four-row inventory, against this tree's "one function, one job" comment on `complete-signup`. The enum is closed and scanned; it is not an open action string.
- We accept a projected `accounts.lifecycle` column in exchange for a share-lockable gate that does not query the audit table on every write. The column is not a second authority: only `apply_admin_act` (and the unit 1 transfer/deactivate path that calls it) writes it.
- We accept that apply is a function called after insert, not an AFTER INSERT trigger on `audit_events`, in exchange for "a raw owner INSERT into audit is not a command". The operator remains able to insert audit rows that do not move seats. Stated residual.
- We accept GoTrue 500 on volunteer GitHub unlink in exchange for a refusal that sits where Auth deletes the row. The test oracle is the row, not the status.
- We accept AT-001.34 red at both tiers in exchange for not shipping a product counter the criterion did not ask for, against a local limiter that did not fire.
- We accept a text oracle for registration (scan proves names in files, not that the definer refuses) in exchange for a CI-wired all-endpoints check. Integration proves the raise.
- We accept B holding two organisations after transfer in exchange for not minting accounts on the transfer path.
- We accept that unit 1 implements deactivate/re-enable before their AT ids, in exchange for not reopening `admin-operations` in unit 2.

## Alternatives considered

- **One edge function per admin act** (`transfer-organization-contact`, `deactivate-account`, â€¦). Hides nothing extra from callers and exposes four more URLs and four inventory rows. The audit writer would be copied or extracted anyway. Lost on interface depth: the closed vocabulary is the smaller surface for the same capability.
- **Apply via AFTER INSERT on `audit_events`.** Makes "insert is the only write" literal and lets a reviewer replay the log by inserting. It also makes any owner insert a command, including a mistaken operator row. Lost: the blast radius on the operator path is silent. The chosen apply function keeps the insert-first order without that gun.
- **A `writeRoute()` factory that owns every `index.ts`.** Pulls standing, gate, and RPC into one wrapper. Callers of existing routes would change shape; the conformance scan would grade the factory rather than the files. Lost: it enlarges the public surface of every current write for a capability (registration) that a scan over the inventory already gives. This design adds two calls to two files instead.
- **Gate by querying the latest audit row.** Single source of truth with no projection column. Lost: it cannot take `FOR SHARE` on the account row the deactivation updates, so a write in flight would not block behind a concurrent deactivate (the share-lock ruling).
- **Auth ban as deactivation.** Lost: measured, the same unexpired token still answers 200 at `/user`. "Immediately" needs the product column on the write path.

## Open questions and risks

- Does a migration that creates a trigger on `auth.identities` apply on the hosted project, where `supabase_auth_admin` owns that table? Local `postgres` could. If hosted refuses, where does unit 5's refusal live instead?
- Should `complete_signup` set `app.actor_account_id` so the unit 3 role-change row for an NGO signup carries the new account rather than `operator`? AT-001.33 accepts a null actor. Which does the founder want on product membership inserts?
- Is landing deactivate and re-enable in unit 1's dispatcher acceptable, given their ids belong to unit 2?
- For AT-001.29 at integration, is throwing `product.volunteer-write-route` after the NGO and admin arms the right capability name, or should it stay aligned with `sut.accounts.sendDiscoveryMessage` (already used by AT-001.10)?
- If hosted Auth ever maps a raising `auth.identities` trigger to a 4xx, should the live adapter start asserting that status, or stay with the row oracle forever?

## Next implementation step

Grow `_policy-scan.ts` (`WRITE_PRIVS` + baseline `service_role`) and its selftest so the unit 1 migration can add `audit_events` and `org_escalation_contacts` without a false green.

---

## Five lines

`loop/items/AI4DEV-56/artifacts/arena/candidate-C.md`

about 6200 words

One `admin-operations` function dispatches a closed command list; each act inserts `audit_events` first and `apply_admin_act` projects lifecycle, seat, and escalation from that row.

Least sure: apply as a function after insert rather than an AFTER INSERT trigger on the audit table, which would make the log literally the only write.

Graft if this loses: the one-function command vocabulary plus insert-audit-then-apply, so the inventory stays four edge writes and a reviewer still has one table.