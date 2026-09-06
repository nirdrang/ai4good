# Candidate: shared module first

Direction: the boundary is a typed caller-account loader plus one pure `writeAllowed` decision in `supabase/functions/_shared/`. Every write route and the loop fixture import it. The edge entries become one declarative call over a route table. The route table is the write inventory: one exported constant that the AT-001.29 body iterates and the conformance scan checks against the tree. The definer-side helper is the backstop.

## Problem

Ten acceptance ids and one new one need a lifecycle state on `public.accounts`, an admin-only transfer, an append-only audit table, an escalation contact, a gate on every write, a conformance check that fails an unregistered route, and a refusal of GitHub unlink for volunteers. The tree already has a shape for judgement: pure TypeScript in `_shared/` that both the edge and the fixture import, plus a SECURITY DEFINER backstop in SQL. What makes this run's shape non-obvious is that the three write routes each hand-roll their own caller lookup in an untyped file, so there is no one place to put a gate, and nothing enumerates write routes at all. The constraints from Phase A that this design honours: `Caller` has no account type (one service-role read learns it); `service_role` cannot write any table, so every product write passes a definer; a ban leaves a live token working, so the gate must read the product column on every write (R8); the static scan runs in CI and the live catalog walks `public` both ways (R4, R14); the unlink surface is Auth's own endpoint and a raising trigger makes GoTrue answer 500 while the row survives and `/user` stays 200 (measured); the local limiter does not throttle sign-in (R11); and no row trigger may express the lifecycle gate, because it would block the transfer's seat update and the re-enable (grok's constraint). Every lead ruling R1 to R15 is a constraint here and each is named where it lands.

## Usage (caller's view)

### The README a route author reads

A write route is one row in `WRITE_ROUTES` and one declarative entry file. You never call `resolveCaller`, `accountTypeOf` or `callDatabaseFunction` from an entry file. You add the row, write a parser for the request body, say which definer arguments the judged request becomes, and the conformance scan refuses the pull request until the row, the directory, the `config.toml` block and the definer's `assert_account_active` call all agree.

```ts
// supabase/functions/_shared/write-routes.ts   (the inventory; excerpt)
export const WRITE_ROUTES = {
  'complete-signup':               { admits: 'no-account-yet',   definer: 'complete_signup',               organization: 'none'  },
  'create-organization':           { admits: ['ngo'],            definer: 'create_organization',           organization: 'none'  },
  'update-organization':           { admits: ['ngo'],            definer: 'update_organization',           organization: 'admin' },
  'transfer-organization-contact': { admits: ['platform_admin'], definer: 'transfer_organization_contact', organization: 'exists' },
  'set-account-lifecycle':         { admits: ['platform_admin'], definer: 'set_account_lifecycle',         organization: 'none'  },
  'set-escalation-contact':        { admits: ['platform_admin'], definer: 'set_escalation_contact',        organization: 'exists' },
  'send-discovery-message':        { admits: ['ngo', 'volunteer'], definer: null,                          organization: 'none'  },
} as const satisfies Record<string, WriteRouteSpec>;
```

The last row has no definer and no directory: it is the loop-only stand-in the fixture runs over `discoveryMessageAllowed`. Its presence in the inventory is what gives AT-001.29 a volunteer arm (R2).

### Call site 1: the transfer route, whole file

```ts
// supabase/functions/transfer-organization-contact/index.ts
import { WRITE_ROUTES } from '../_shared/write-routes.ts';
import { parseTransferRequest } from '../_shared/transfer.ts';
import { edgeHandler, requireEnv, writeRoute } from '../_shared/edge.ts';

Deno.serve(edgeHandler('transfer-organization-contact', writeRoute({
  name: 'transfer-organization-contact',
  route: WRITE_ROUTES['transfer-organization-contact'],
  env: { url: requireEnv('SUPABASE_URL'), anonKey: requireEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY'), serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY') },
  parse: parseTransferRequest,
  args: (request, account) => ({
    p_actor_id: account.id,
    p_organization_id: request.organizationId,
    p_to_account_id: request.toAccountId,
    p_reason: request.reason,
  }),
})));
```

Nothing in this file decides anything. `writeRoute` resolves the caller, loads the account row (and the organisation's existence, because the row says `organization: 'exists'`), runs `writeAllowed`, parses the body, calls the definer, and maps the answer. The same file shape, with a different row and parser, is `create-organization`, `update-organization`, `set-account-lifecycle` and `set-escalation-contact`. `complete-signup` keeps its GitHub stats step in its `args` function and nothing else.

### Call site 2: one gated write in the loop fixture

```ts
// tests/at/suites/req-001/_fixture.ts (excerpt)
createOrganization: async (session, organizationName): Promise<CreateOrganizationOutcome> => {
  const caller = resolveCaller(session);
  if (caller === null) return { ok: false, reason: DEAD_SESSION_REASON };
  const account = callerAccountFromRows(state.accounts.get(caller.id) ?? null, null);
  const allowed = writeAllowed(WRITE_ROUTES['create-organization'], account, null);
  if (!allowed.ok) return { ok: false, kind: allowed.kind, reason: allowed.reason };
  const name = validateOrganizationName(organizationName);
  if (!name.ok) return { ok: false, kind: 'invalid-name', reason: name.reason };
  // ... storage writes, unchanged
},
```

The fixture and the edge run the same three shipped functions in the same order: `callerAccountFromRows`, `writeAllowed`, then the request parser. A loop green over AT-001.29 is therefore a claim about the code the edge runs.

### Call site 3: the unlink integration body

```ts
// tests/at/suites/req-001/a-signup-and-signin.test.ts (AT-001.41, integration arm)
integration: async ({ open }) => {
  const { w, sut } = await open();
  const volunteer = await registerConfirmSignIn(sut, w.email('unlink-41'), PASSWORD);
  await sut.linkGithubIdentity(volunteer, 'unlink-41-handle');
  const done = await sut.completeSignup(volunteer, { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER }, CLIENT_IP);
  expect(done).toMatchObject({ ok: true });

  const before = await sut.identitiesOf(volunteer);
  expect(before.map((i) => i.provider)).toContain('github');

  const attempt = await sut.unlinkIdentity(volunteer, 'github');   // DELETE /auth/v1/user/identities/{id}
  expect(attempt.ok, 'a volunteer unlinked the mandatory GitHub identity').toBe(false);

  // THE ORACLE IS THE ROW AND THE USER'S HEALTH, never GoTrue's status (R10).
  const after = await sut.identitiesOf(volunteer);
  expect(after.map((i) => i.provider)).toContain('github');
  expect(after.length).toBe(before.length);
  expect(await sut.createOrganization(volunteer, 'still alive 41')).toMatchObject({ ok: false, kind: 'not-an-ngo-account' });
  // the last line proves /auth/v1/user still answers 200 for the user: the refusal is the type gate's, not a 401.
},
```

## Shape

### Data structures

**Lifecycle on `accounts`.** One enum column, two values, no third (RM-14, R8).

```sql
create type public.account_lifecycle as enum ('active', 'deactivated');
alter table public.accounts
  add column lifecycle public.account_lifecycle not null default 'active',
  add column lifecycle_changed_at timestamptz;
```

The pure twin in `_shared/lifecycle.ts`:

```ts
export const LIFECYCLE_STATES = ['active', 'deactivated'] as const;
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];
export function parseLifecycleState(raw: unknown): LifecycleState | null;   // fails closed

/** What is TRUE of the caller's account, read once per write. Never a request field. */
export type CallerAccount = {
  id: string;
  accountType: AccountType;
  lifecycle: LifecycleState;
};

/** Narrow two service-role rows into a CallerAccount, or null when there is no account row. Unknown type or lifecycle â†’ null (refused). */
export function callerAccountFromRows(accountRow: unknown, _reserved: null): CallerAccount | null;
```

Two rows exist per account: the `accounts` row and, when the route names an organisation, the `org_memberships` row. `callerAccountFromRows` reads only the first. The membership role goes through `parseOrgRole`, which already exists, and is handed to `writeAllowed` beside the account. That keeps one parser per row shape.

**The inventory row.**

```ts
// supabase/functions/_shared/write-routes.ts
export type WriteRouteSpec = {
  /**
   * Which global types this write admits, or 'no-account-yet' for the one route a caller reaches
   * BEFORE an account row exists. A route admitting 'no-account-yet' is exempt from the lifecycle
   * gate by construction (there is no row to read) and from the AT-001.29 enumeration for the same
   * reason; the scan carries that exemption with this reason.
   */
  admits: readonly AccountType[] | 'no-account-yet';
  /** The SECURITY DEFINER function the route calls, or null for a loop-only stand-in with no edge directory. */
  definer: string | null;
  /**
   * What the route needs to know about the organisation named in the body:
   *   'none'   â€” the body names no organisation
   *   'exists' â€” the organisation must exist; the caller's role there is not consulted (admin routes)
   *   'admin'  â€” the caller must hold the admin role there (orgAdminActionAllowed decides)
   */
  organization: 'none' | 'exists' | 'admin';
};

export type WriteRouteName = keyof typeof WRITE_ROUTES;
export const WRITE_ROUTE_NAMES: readonly WriteRouteName[];
/** Rows with an edge directory (definer !== null). The scan enumerates these against supabase/functions/*. */
export function edgeWriteRoutes(): readonly WriteRouteName[];
/** Rows that admit this type. The AT-001.29 body iterates ACCOUNT_TYPES and calls this for each. */
export function routesAdmitting(type: AccountType): readonly WriteRouteName[];
```

**The decision.**

```ts
// supabase/functions/_shared/lifecycle.ts
export type WriteRefusalKind =
  | 'no-account'            // 409: complete signup first
  | 'already-signed-up'     // 409: the 'no-account-yet' route with a row present
  | 'account-deactivated'   // 403: the lifecycle gate; AT-001.29's kind
  | 'not-an-ngo-account'    // 403: type gate on a row admitting ngo (reason keeps "NGO accounts only" for AT-001.06)
  | 'not-a-platform-admin'  // 403: type gate on a row admitting platform_admin; AT-001.35's kind
  | OrgAdminRefusalKind;    // 403: 'not-a-member' | 'not-an-admin', passed through unchanged (AT-001.16/.36)

export type WriteDecision =
  | { ok: true; account: CallerAccount | null }
  | { ok: false; kind: WriteRefusalKind; reason: string };

/**
 * THE ONE GATE. Order is load-bearing: presence, then lifecycle, then type, then the organisation
 * role. Lifecycle before type is what makes AT-001.29's refusal "come from deactivation, not an
 * ordinary role precondition": a deactivated account of the wrong type is still refused as
 * deactivated. Pure; the same call runs at the edge and in the fixture.
 */
export function writeAllowed(
  route: WriteRouteSpec,
  account: CallerAccount | null,
  orgRole: OrgRole | null,
): WriteDecision;

/** The HTTP status each refusal kind carries. One table, imported by writeRoute and by the live adapter's classifier. */
export const WRITE_REFUSAL_STATUS: Record<WriteRefusalKind, 401 | 403 | 409>;
```

`ngoOnlyActionAllowed` is deleted; its one deployed caller and the fixture move to `writeAllowed`, and the reason text for a row admitting `ngo` keeps the phrase "NGO accounts only" that AT-001.06 matches. `orgAdminActionAllowed` stays as the organisation-role rule; `writeAllowed` calls it when the row says `organization: 'admin'`. No rule is stated twice on the TypeScript side.

**The audit table** (R3, R9, R12).

```sql
create type public.audit_event_kind as enum
  ('role_granted', 'seat_repointed', 'role_changed', 'role_revoked', 'contact_transferred', 'lifecycle_changed');

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  event public.audit_event_kind not null,
  actor_account_id uuid,                                   -- plain uuid, no foreign key: rows outlive accounts
  actor_label text not null check (actor_label !~ '^\s*$'), -- 'platform_admin', 'operator', 'definer'
  subject_account_id uuid,
  organization_id uuid,
  reason text,
  detail jsonb not null default '{}'::jsonb
);
```

No foreign key on any uuid column, so deleting an account never cascades into the audit. Append-only is three statements the scan and the live catalog can pin: `revoke all` from `anon, authenticated, service_role` with nothing granted back; no definer contains an `update` or `delete` on it (the write-route scan greps definer bodies for `audit_events` after `update`/`delete` and refuses); and a BEFORE UPDATE OR DELETE trigger raises `42501`. The operator can drop that trigger. That residual is stated in the migration header and in the AT-001.33 body's evidence, not hidden.

**The escalation contact** (R15).

```sql
create table public.escalation_contacts (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  full_name text not null check (full_name !~ '^\s*$'),
  email text not null check (email !~ '^\s*$'),
  phone text,
  set_by_account_id uuid not null,
  set_at timestamptz not null default now()
);
```

One row per organisation, primary key on the organisation, so "one non-login escalation contact" is a fact about the shape. Written by the platform administrator through `set-escalation-contact`; the upsert makes a second call idempotent. It is not a login, so it is never an `accounts` row and never a membership.

**The virtual-key stand-in** (declared, per the working assumption).

```ts
// supabase/functions/_shared/gateway-keys.ts
/** The decision the LLM-gateway leaf must consult when a lifecycle changes. Pure. No key exists in this tree. */
export type VirtualKeyAction = 'revoke' | 'reissue';
export function virtualKeyActionFor(transition: { from: LifecycleState; to: LifecycleState }): VirtualKeyAction | null;
// activeâ†’deactivated: 'revoke'; deactivatedâ†’active: 'reissue'; sameâ†’same: null
```

The fixture keeps a `projectVirtualKeys: Map<projectId, 'issued' | 'revoked'>` and applies `virtualKeyActionFor` inside its `setAccountLifecycle`. The live adapter throws `CapabilityPending(['gateway.virtual-key-revocation'])` from `virtualKeysOf`.

### How data flows through the signatures

```
request â”€â”€â–º resolveCaller (edge.ts, I/O) â”€â”€â–º Caller | null
        â”€â”€â–º loadCallerAccount (edge.ts, I/O): one service-role read of accounts, one of org_memberships when route.organization !== 'none'
        â”€â”€â–º callerAccountFromRows + parseOrgRole (pure)
        â”€â”€â–º writeAllowed(route, account, orgRole) (pure) â”€â”€â–º refusal { kind, reason } at WRITE_REFUSAL_STATUS[kind]
        â”€â”€â–º parse(body) (pure, per route) â”€â”€â–º 400 { kind: 'invalid-request', reason }
        â”€â”€â–º callDatabaseFunction(route.definer, args(request, account)) (I/O)
              â””â”€â–º definer: perform public.assert_account_active(p_actor) FIRST (share lock, R7), then its own backstops, then writes
        â”€â”€â–º definerRefusal(outcome) (pure): 4xx â†’ 409 { kind: <from DETAIL> | 'refused', reason }; 5xx/transport â†’ 502
```

`writeRoute` in `edge.ts`:

```ts
export type WriteRouteEnv = { url: string; anonKey: string; serviceRoleKey: string };

/** The whole write-route pipeline, once. An entry file supplies a row, a parser and an argument mapper, and decides nothing. */
export function writeRoute<Req>(spec: {
  name: WriteRouteName;
  route: WriteRouteSpec;
  env: WriteRouteEnv;
  /** the field of the body that names the organisation when route.organization !== 'none' */
  organizationIdField?: string;
  parse: (body: Record<string, unknown>, account: CallerAccount | null) => Decision<Req>;
  args: (request: Req, account: CallerAccount | null, ip: string | null) => Record<string, unknown> | Promise<Record<string, unknown>>;
}): (request: Request) => Promise<Response>;

/** One read of accounts, and of org_memberships when asked. Three-way, like the two lookups it replaces. */
export async function loadCallerAccount(env: WriteRouteEnv, callerId: string, organizationId: string | null):
  Promise<{ kind: 'found'; account: CallerAccount; orgRole: OrgRole | null; organizationExists: boolean } | { kind: 'absent'; organizationExists: boolean } | { kind: 'failed'; detail: string }>;
```

`complete-signup`'s `parse` receives `account === null` on the happy path and `validateCompleteSignup` runs unchanged inside it; the GitHub stats stub moves into its `args`. The organisation id is parsed before the gate only when the row needs it, and the rest of the body after, so an unauthorised caller learns nothing about name validation (the property `update-organization` keeps today).

The definer refusal kinds travel in `RAISE ... USING DETAIL = '<kind>'`. `RpcOutcome` gains `details: string | null`; the pure `definerRefusal(outcome)` maps a `details` value in `DEFINER_REFUSAL_KINDS` to that kind and anything else to `'refused'`, the same fail-closed posture `parseOrgRole` takes.

### The SQL side, in the form the static scan accepts

```sql
-- 20260908120000_lifecycle_transfer_audit_and_escalation.sql   (unit 1, R13)

-- the shared backstop, first line of every gated definer
create function public.assert_account_active(p_account_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_lifecycle public.account_lifecycle;
begin
  select lifecycle into v_lifecycle from public.accounts where id = p_account_id for share;   -- R7
  if v_lifecycle is null then
    raise exception 'no account has completed signup for %', p_account_id using errcode = '42501', detail = 'no-account';
  end if;
  if v_lifecycle <> 'active' then
    raise exception 'account % is deactivated and may not write', p_account_id using errcode = '42501', detail = 'account-deactivated';
  end if;
end $$;
revoke execute on function public.assert_account_active(uuid) from public;
grant execute on function public.assert_account_active(uuid) to service_role;

create or replace function public.create_organization(p_account_id uuid, p_name text) ... as $$
begin
  perform public.assert_account_active(p_account_id);
  -- body unchanged
$$;
-- same one-line insertion at the top of update_organization. complete_signup is exempt: no row yet.
revoke execute on function public.create_organization(uuid, text) from public;
grant execute on function public.create_organization(uuid, text) to service_role;
-- (revoke+grant restated because create or replace of a dropped-and-recreated signature drops grants)

create function public.set_account_lifecycle(p_actor_id uuid, p_account_id uuid, p_lifecycle public.account_lifecycle, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_account_active(p_actor_id);
  if not exists (select 1 from public.accounts where id = p_actor_id and account_type = 'platform_admin') then
    raise exception 'set_account_lifecycle refuses %: not a platform administrator', p_actor_id using errcode = '42501', detail = 'not-a-platform-admin';
  end if;
  if p_actor_id = p_account_id then
    raise exception 'an administrator may not change its own lifecycle' using errcode = '42501', detail = 'self-lifecycle';
  end if;
  update public.accounts set lifecycle = p_lifecycle, lifecycle_changed_at = now()
   where id = p_account_id and lifecycle <> p_lifecycle;      -- idempotent: a repeat is a no-op write
  if not found and not exists (select 1 from public.accounts where id = p_account_id) then
    raise exception 'no such account %', p_account_id using errcode = '23503', detail = 'no-such-account';
  end if;
  if found then
    insert into public.audit_events (event, actor_account_id, actor_label, subject_account_id, reason, detail)
    values ('lifecycle_changed', p_actor_id, 'platform_admin', p_account_id, p_reason, jsonb_build_object('to', p_lifecycle));
  end if;
  return jsonb_build_object('account_id', p_account_id, 'lifecycle', p_lifecycle);
end $$;
revoke execute on function public.set_account_lifecycle(uuid, uuid, public.account_lifecycle, text) from public;
grant execute on function public.set_account_lifecycle(uuid, uuid, public.account_lifecycle, text) to service_role;

create function public.transfer_organization_contact(p_actor_id uuid, p_organization_id uuid, p_to_account_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_from uuid; v_to_type public.account_type; v_to_lifecycle public.account_lifecycle; v_others uuid[];
begin
  perform public.assert_account_active(p_actor_id);
  if not exists (select 1 from public.accounts where id = p_actor_id and account_type = 'platform_admin') then
    raise exception '...' using errcode = '42501', detail = 'not-a-platform-admin';
  end if;
  select account_id into v_from from public.org_memberships where org_id = p_organization_id for update;
  if v_from is null then raise exception '...' using errcode = '23503', detail = 'no-such-organization'; end if;
  if v_from = p_to_account_id then raise exception '...' using errcode = '22023', detail = 'transferee-is-holder'; end if;
  select account_type, lifecycle into v_to_type, v_to_lifecycle from public.accounts where id = p_to_account_id for share;
  if v_to_type is null then raise exception '...' using errcode = '23503', detail = 'transferee-not-found'; end if;
  if v_to_type <> 'ngo' then raise exception '...' using errcode = '42501', detail = 'transferee-not-ngo'; end if;      -- R5
  if v_to_lifecycle <> 'active' then raise exception '...' using errcode = '42501', detail = 'transferee-deactivated'; end if;
  select array_agg(org_id) into v_others from public.org_memberships where account_id = v_from and org_id <> p_organization_id;
  if v_others is not null then
    raise exception 'account % holds seats in other organisations: %', v_from, v_others using errcode = '42501', detail = 'holds-other-seats';  -- R6
  end if;
  perform set_config('ai4good.actor_account_id', p_actor_id::text, true);   -- the membership audit trigger reads it (R9)
  update public.org_memberships set account_id = p_to_account_id where org_id = p_organization_id;   -- the seat moves; the NGO-only trigger re-checks the grantee
  update public.accounts set lifecycle = 'deactivated', lifecycle_changed_at = now() where id = v_from;
  insert into public.audit_events (event, actor_account_id, actor_label, subject_account_id, organization_id, reason, detail)
  values ('contact_transferred', p_actor_id, 'platform_admin', v_from, p_organization_id, p_reason, jsonb_build_object('to_account_id', p_to_account_id));
  return jsonb_build_object('organization_id', p_organization_id, 'from_account_id', v_from, 'to_account_id', p_to_account_id);
end $$;
revoke execute on function public.transfer_organization_contact(uuid, uuid, uuid, text) from public;
grant execute on function public.transfer_organization_contact(uuid, uuid, uuid, text) to service_role;

create function public.set_escalation_contact(p_actor_id uuid, p_organization_id uuid, p_full_name text, p_email text, p_phone text)
returns jsonb ... as $$
begin
  perform public.assert_account_active(p_actor_id);
  -- platform_admin backstop as above, detail = 'not-a-platform-admin'
  insert into public.escalation_contacts (organization_id, full_name, email, phone, set_by_account_id)
  values (p_organization_id, btrim(p_full_name, E' \t\r\n\f'), btrim(p_email, E' \t\r\n\f'), p_phone, p_actor_id)
  on conflict (organization_id) do update set full_name = excluded.full_name, email = excluded.email, phone = excluded.phone, set_by_account_id = excluded.set_by_account_id, set_at = now();
  return jsonb_build_object('organization_id', p_organization_id);
end $$;
-- revoke/grant as above

create table public.audit_events (...);          -- as in Shape
revoke all on table public.audit_events from anon, authenticated, service_role;
alter table public.audit_events enable row level security;   -- no policy: unreachable-by-client-roles (R12)

create function public.audit_events_are_append_only() returns trigger language plpgsql security definer set search_path = '' as $$
begin raise exception 'audit_events is append-only' using errcode = '42501'; end $$;
revoke execute on function public.audit_events_are_append_only() from public;
create trigger audit_events_are_append_only before update or delete on public.audit_events for each row execute function public.audit_events_are_append_only();

create table public.escalation_contacts (...);
revoke all on table public.escalation_contacts from anon, authenticated, service_role;
alter table public.escalation_contacts enable row level security;

notify pgrst, 'reload schema';
```

```sql
-- 20260909120000_role_change_audit.sql   (unit 3)
create function public.org_memberships_audit() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := nullif(current_setting('ai4good.actor_account_id', true), '')::uuid;
begin
  insert into public.audit_events (event, actor_account_id, actor_label, subject_account_id, organization_id, detail)
  values (
    case tg_op when 'INSERT' then 'role_granted' when 'DELETE' then 'role_revoked'
               when 'UPDATE' then case when new.account_id <> old.account_id then 'seat_repointed' else 'role_changed' end end,
    v_actor,
    case when v_actor is null then 'operator' else 'platform_admin' end,      -- R9: the operator is a sentinel label
    coalesce(new.account_id, old.account_id),
    coalesce(new.org_id, old.org_id),
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
  return null;
end $$;
revoke execute on function public.org_memberships_audit() from public;
create trigger org_memberships_audit after insert or update or delete on public.org_memberships for each row execute function public.org_memberships_audit();
```

`complete_signup` and `create_organization` insert a membership, so from unit 3 on every seat grant leaves a `role_granted` row with `actor_label = 'definer'`; the two definers set the session variable to the caller so `actor_account_id` is filled. A transfer therefore leaves two rows, `seat_repointed` from the trigger and `contact_transferred` from the definer, and AT-001.33's body accepts both.

```sql
-- 20260910120000_volunteer_github_unlink_refused.sql   (unit 5)
create function public.refuse_volunteer_github_unlink() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- pg_trigger_depth() = 0 discriminates a DIRECT delete (the unlink endpoint) from the cascade of an admin user delete (R3).
  if pg_trigger_depth() = 0 and old.provider = 'github'
     and exists (select 1 from public.accounts a where a.id = old.user_id and a.account_type = 'volunteer') then
    raise exception 'a volunteer may not unlink the mandatory GitHub identity' using errcode = '42501', detail = 'github-unlink-refused';
  end if;
  return old;
end $$;
revoke execute on function public.refuse_volunteer_github_unlink() from public;
create trigger refuse_volunteer_github_unlink before delete on auth.identities for each row execute function public.refuse_volunteer_github_unlink();
```

The function is in `public` so the live catalog check sees it and pins `anonExecute = false`; the trigger is on `auth.identities`, which `postgres` was measured able to create (probe step 7). The pure twin `githubUnlinkAllowed({ accountType, provider })` in `_shared/identities.ts` is what the fixture's `unlinkIdentity` consults, so the loop tier grades the rule and the integration tier grades the trigger.

Static-scan changes that land BEFORE the first new table (R4, unit 4's record): `no-baseline-revoke` requires `service_role` in the baseline revoke; `WRITE_PRIVS` gains `references` and `trigger`; `TENANT_CATALOG` gains `audit_events` and `escalation_contacts` as `unreachable-by-client-roles`; `policy-scan.selftest.ts` gains one case per new refusal. `SERVICE_ROLE_SELECT` in `_integration.ts` is unchanged; the live walk finds the two new tables through the catalog (R14). A grep of definer bodies for `update public.audit_events` or `delete from public.audit_events` is a new refusal code `audit-mutation-in-definer`.

### The conformance check, mechanically

`tests/at/suites/req-001/_write-route-scan.ts`, run by the AT-001.29 body at the loop tier (so in CI) and at integration. It reads the tree, never a list somebody remembers:

1. **Edge candidates.** Every directory `supabase/functions/<name>/` with an `index.ts`, `<name>` not starting with `_`. For each, the file text. A candidate is a write route when its text imports `writeRoute` or `callDatabaseFunction` from `../_shared/edge.ts`.
2. **Registered** means, for an edge candidate: (a) `<name>` is a key of `WRITE_ROUTES` with `definer !== null`; (b) the text contains the literal `WRITE_ROUTES['<name>']` (its own name, so a copied file registered under the wrong row fails); (c) the text does not import `callDatabaseFunction` (the only path to the RPC is `writeRoute`, and the gate sits inside it); (d) `supabase/config.toml` has a `[functions.<name>]` block with `verify_jwt = true`.
3. **Both ways.** Every inventory key with `definer !== null` has a directory that passes 2. Every inventory key with `definer === null` (the stand-in) appears in `tests/at/suites/req-001/_fixture.ts` as `writeAllowed(WRITE_ROUTES['<name>']`.
4. **Definer candidates.** From the migrations, using `splitSqlStatements` from `_policy-scan.ts`: every `create [or replace] function public.X` that is `security definer`, does not return `trigger`, is not `stable`, and (by overlay) has `grant execute ... to service_role`. Each must be some row's `definer`, and its body text must contain `perform public.assert_account_active(` unless its row's `admits` is `'no-account-yet'` (exemption with reason: the row does not exist yet). Every row's `definer` must exist as such a function.

Problem codes: `unregistered-write-route`, `route-registered-under-other-name`, `direct-rpc-in-entry`, `route-without-config-block`, `route-without-entry`, `stand-in-not-gated`, `definer-not-in-inventory`, `definer-ungated`, `inventory-definer-missing`, `audit-mutation-in-definer`. It throws when `supabase/functions/` holds no directory, the `_source-scan.ts` posture.

The negative-direction selftest `tests/at/harness/write-route-scan.selftest.ts` builds a synthetic tree in a temp directory: the real inventory, a `delete-project/index.ts` that imports `callDatabaseFunction`, and a migration adding `public.delete_project` as a service-role definer with no `assert_account_active` call. It asserts `unregistered-write-route`, `direct-rpc-in-entry`, `definer-not-in-inventory` and `definer-ungated` all fire, one `it` per code, and one `it` that the real tree yields `[]`. The vitest glob already includes the file.

What the scan proves, in one sentence: that every write entry in the tree is registered under its own row and reaches the RPC only through `writeRoute`, and that every service-role definer calls the SQL backstop. What only integration proves: that the definer actually refuses a deactivated caller (AT-001.29's integration arm drives it through the deployed route).

Paths named and covered or out: the HTTP path is covered by `writeAllowed` (TypeScript) and `assert_account_active` (SQL); the raw service-role RPC path is covered by `assert_account_active` alone; the operator path (`postgres` over the database URL) bypasses definers and is out, with the reason that it is test-only and no running service holds it; Auth's own endpoints are out of the lifecycle gate (R8: sessions are not ended), and the one Auth write this run cares about, unlink, has its own trigger.

### Interface depth

The public surface a route author sees is one row, one parser, one `args` function. Behind it, `writeRoute` hides caller resolution, two service-role reads, the four-step gate, status mapping and definer-refusal parsing, which today are written three times across three untyped files. The surface a test author sees is the same `WRITE_ROUTES` constant and `writeAllowed`, so the loop fixture stops re-implementing lookups. What stays exposed: the per-route parser (it has to, the bodies differ) and the definer's own backstops (SQL cannot import TypeScript; R1 accepts the rule twice at that boundary). The interface is no larger than needed because nothing in it is per-route except the two functions that are genuinely per-route.

Invariants encoded in types: `admits` is `readonly AccountType[]`, so an inventory row cannot name a type the enum lacks; `WriteRouteName` is the keyof the constant, so a body table keyed by it fails to compile when a row is added without a body line (the AT-001.29 body is `satisfies Record<WriteRouteName, WriteAttempt>`); `WriteRefusalKind` is closed and `WRITE_REFUSAL_STATUS` is `Record` over it, so a kind without a status does not compile; `LifecycleState` has two members and the SQL enum has two, and `parseLifecycleState` fails closed on a third. Validation at boundaries: `callerAccountFromRows`, `parseOrgRole`, `parseLifecycleState`, `definerRefusal` all take `unknown` and fail closed; inside `writeAllowed` everything is typed and trusted (boundary-discipline). Idempotent transitions: `set_account_lifecycle` writes only when the state differs and audits only when it wrote; `set_escalation_contact` upserts; a transfer run twice refuses the second time with `transferee-is-holder` and writes nothing (make-operations-idempotent). Single source per invariant: the inventory is the only list of write routes; the scan derives candidates from the tree and compares (derive, never sync). Shared state: the only two writers of one row are a gated write reading `lifecycle` and a deactivation updating it; `for share` in the helper serialises exactly that pair and nothing else (R7).

### Per id, per tier

| id | Given | act | assertion | loop shape | integration shape |
|---|---|---|---|---|---|
| AT-001.25 | admin A; NGO account X completed signup with org O and acknowledgment; NGO account Y completed signup (own org, R5); operator project P under O | `sut.transferOrganizationContact(A, O, Y, 'contact changed')` | `membership(O)` holds Y admin; `acknowledgments(X)` unchanged and still X; `projectAssignment(P)` unchanged; `volunteerProfile` untouched; `account(X).lifecycle = 'deactivated'`; `account(Y).lifecycle = 'active'`; one transaction: a transfer to a deactivated Y refuses `transferee-deactivated` and changes nothing | green | green |
| AT-001.26 | the .25 transfer | read `sut.auditEvents({ organizationId: O })` | one `contact_transferred` row with `actorAccountId = A`, `occurredAt` within the world clock window, `reason` as sent | green | green |
| AT-001.27 | as .25, X's contact unreachable | the same call with reason `'lost access'` | same assertions as .25 and .26; no second route exists | green | green |
| AT-001.28 | admin A, org O (the administrator acting on an organisation is the concierge act, R15; the vetting surface is REQ-002's and the body says so) | `sut.setEscalationContact(A, O, { fullName, email, phone })` twice | `escalationContact(O)` is one row with the second values; an NGO caller refused `not-a-platform-admin`; the contact is not an account and holds no seat | green | green |
| AT-001.35 | as .25 | the transfer as NGO X, as a volunteer V, with no session | 403 `not-a-platform-admin`, 403 `not-a-platform-admin`, 401; membership unchanged after each | green | green |
| AT-001.29 | per type in `ACCOUNT_TYPES`: an active control and a subject, both otherwise authorised for each route in `routesAdmitting(type)`; subject deactivated via `setAccountLifecycle(A, â€¦)`; scan `[]` | each route's write for control then subject | control `ok`; subject `{ ok: false, kind: 'account-deactivated' }`; read-back shows no write; `writeRouteProblems()` equals `[]` | green over all three arms (volunteer via the stand-in) | NGO and admin arms real, then `CapabilityPending(['sut.accounts.sendDiscoveryMessage'])` (R2) |
| AT-001.30 | volunteer V completed, project P assigned to V, keys `issued` in the stand-in | `setAccountLifecycle(A, V, 'deactivated', 'aup')` then V's write | write refused `account-deactivated` at once (no wait, no token change); `virtualKeysOf(P) = 'revoked'` | green over `virtualKeyActionFor` | real deactivation, then `CapabilityPending(['sut.accounts.sendDiscoveryMessage', 'gateway.virtual-key-revocation'])` |
| AT-001.31 | NGO X deactivated (R8 route), org O, org Q where X holds nothing | `setAccountLifecycle(A, X, 'active', 'recovered')`; `createOrganization(X)`; `updateOrganization(X, Q)` | create ok; update refused `not-a-member` (independent gate kept); keys `issued` in the stand-in | green | real re-enable and both writes, then `CapabilityPending(['gateway.virtual-key-reissue'])` |
| AT-001.33 | a seat grant (product), a repoint (operator), a transfer (product) | read `auditEvents`; `alterAuditEventAsOperator(id)` update and delete | rows `role_granted` (actor set), `seat_repointed` (actor null, label `operator`), `contact_transferred`; both alterations refused, rows unchanged; catalog scan `[]` and live facts show no privilege for any role | green (fixture refuses alteration through the same shipped `AUDIT_APPEND_ONLY` reason) | green |
| AT-001.34 | none | none | throws first | `CapabilityPending(['vendors.supabase-auth.sign-in-rate-limit'])` | same (R11) |
| AT-001.41 | volunteer with a linked GitHub identity | `unlinkIdentity(session, 'github')` | refused; identity row survives; `/user` 200 (the type-gate refusal on `createOrganization` is the proof); an NGO unlinking its GitHub identity succeeds as the control | green over `githubUnlinkAllowed` | green over the trigger |

Refusal shapes on the wire. Admin-only routes: 401 `{ ok:false, reason }` with no caller; 409 `no-account`; 403 `account-deactivated`; 403 `not-a-platform-admin`; 400 `invalid-request`; 409 `holds-other-seats` / `transferee-not-ngo` / `transferee-deactivated` / `transferee-not-found` / `transferee-is-holder` / `no-such-organization` / `no-such-account` / `self-lifecycle`; 502 `refused` for a transport failure. Gated writes: 403 `account-deactivated` before any type or role kind; `create-organization` 403 `not-an-ngo-account` with "NGO accounts only" in the reason; `update-organization` 403 `not-a-member` / `not-an-admin` unchanged. Unlink: GoTrue answers 500 `unexpected_failure`; the adapter reports `{ ok: false, kind: 'refused', reason }` and no body pins the status.

The transfer, row by row: `org_memberships` â€” the one row for O changes `account_id` from X to Y, keeps `role = 'admin'` and `created_at`; `accounts` â€” X gains `lifecycle = 'deactivated'`, Y unchanged; `acknowledgments` â€” no row touched, X's signer name, title and attestation stay X's; `projects` â€” no row touched, `org_id` still O, the volunteer seat untouched; `volunteer_profiles` â€” never touched by an NGO transfer; `audit_events` â€” two rows appended. Y's own organisation from signup stays seated by Y (R5 residual). X's Auth user is not deleted, banned or logged out (R8; "Not done here").

If the founder says "stub" instead of declare: `gateway-keys.ts` gains a table `public.project_virtual_keys (project_id pk, state)` with a definer `set_project_virtual_keys` called from `set_account_lifecycle` and `transfer_organization_contact`; `virtualKeysOf` reads it live; AT-001.30 and .31 go green at integration and the two `gateway.*` capability strings disappear from the manifest; the table is declared `unreachable-by-client-roles` in the three catalog lists. The stand-in seam and every other line of this design stay the same.

### New surface, counted

Edge functions: 3 (`transfer-organization-contact`, `set-account-lifecycle`, `set-escalation-contact`). Shared pure modules: 4 (`lifecycle.ts`, `write-routes.ts`, `transfer.ts` for the three parsers, `gateway-keys.ts`, plus `identities.ts` for the unlink rule; `ngoOnlyActionAllowed` deleted). `edge.ts` gains `writeRoute` and `loadCallerAccount` and loses nothing public. SQL: 1 enum, 2 tables, 5 functions (`assert_account_active`, `set_account_lifecycle`, `transfer_organization_contact`, `set_escalation_contact`, `audit_events_are_append_only`), 2 trigger functions (`org_memberships_audit`, `refuse_volunteer_github_unlink`), 3 triggers. `AccountsSut` members: 8 (`transferOrganizationContact`, `setAccountLifecycle`, `setEscalationContact`, `escalationContact`, `auditEvents`, `alterAuditEventAsOperator`, `unlinkIdentity`, `identitiesOf`, `virtualKeysOf` â€” nine with the stand-in read), and `AccountRow` gains `lifecycle`. Harness: `authDelete` in `live-stack.ts` (no DELETE helper exists), `_write-route-scan.ts`, `write-route-scan.selftest.ts`, three cases added to `policy-scan.selftest.ts`. Unit 4 is the scan change plus `loop/items/AI4DEV-56/unit4-record.md` citing the measurement; no migration. Unit 6 is `unit6-record.md`: the local CLI pushes `jwt_expiry` and the hook block but not `email_sent` or a working `sign_in_sign_ups`; both limits are verified on the hosted platform, and AT-001.34 is declared on that capability.

## Synthesis decision

*Filled in by arena.*

## Tradeoffs accepted

- We accept rewriting the three existing write entries into the declarative shape in exchange for one gate and one scan that can check them; the alternative was a fourth hand-rolled lookup per route.
- We accept the lifecycle rule stated twice, in `writeAllowed` and in `assert_account_active`, in exchange for covering the raw service-role RPC path (R1). The admitted-types table is stated once; the SQL side checks lifecycle only and keeps the type backstops the definers already carry.
- We accept a text scan over untyped entry files and SQL as the CI oracle, in exchange for running in CI at all; the selftest is what keeps the oracle honest, and what the scan cannot prove is stated.
- We accept deleting `ngoOnlyActionAllowed` and moving its reason into the gate, in exchange for not stating the type rule twice on the TypeScript side; AT-001.06's matched phrase is kept.
- We accept two audit rows per transfer (trigger and definer) in exchange for one trigger path that also catches operator repoints.
- We accept GoTrue's 500 on a refused unlink, in exchange for the only in-tree placement that sits where Auth deletes the row; the oracle is the row and the user's health (R10).
- We accept that a deactivated account's live token keeps answering 200 at `/user` and that its sessions are not ended (R8); the write path refuses it on the next call.
- We accept the refusal kind travelling in `DETAIL` from the definer, which looks like a convention, in exchange for one pure parser that fails closed and no per-route status table in SQL.
- We accept a `platform_admin` who is not seated in the organisation writing its escalation contact, in exchange for not building the vetting surface early (R15).

## Alternatives considered

- **Gate in each entry file, no shared pipeline.** Exposes the whole caller-loading sequence to every route author and leaves the fixture re-implementing it; the scan would have to prove call order inside untyped files. Hides nothing. Lost on interface depth.
- **Gate as a BEFORE trigger on the writable tables.** Sits on the operator path too, but a trigger sees rows, not the caller, and would block the transfer's seat update and the re-enable (grok's constraint). Lost on correctness, not depth.
- **A token claim (`custom_access_token` hook) carrying type and lifecycle.** Saves one read per write and hides it well, but a claim is a cached copy of the row, wrong for "immediately" (R8), and the last merge declined the hook. Lost on the criterion's word.
- **One `admin-operation` edge function with an `op` field for all three admin acts.** Fewer directories, but one entry then maps to three definers, the row-per-route shape breaks, and the scan's "one entry, one definer" check becomes a switch. Lost on the scan's simplicity for a saving of two thin files.
- **A product sign-in counter through `password_verification_attempt`** (the CLI does push the hook, measured). It is SQL the loop tier cannot grade and a control the criterion did not ask for; declared instead (R11).

## Open questions and risks

- Does `postgres` on the hosted platform hold TRIGGER on `auth.identities`, and does `pg_trigger_depth() = 0` really discriminate the unlink endpoint from an admin user delete's cascade? Both are the prototype's first measurement (R3); if the second fails, the trigger should also allow when `current_setting('role') = 'supabase_auth_admin'` and the delete is by user, which is a different discriminator to measure.
- Should `admits` for `update-organization` be `['ngo']`? The membership trigger already makes a seat holder an NGO, so the row adds no refusal today; it exists so the AT-001.29 enumeration is typed by account type. Is a row whose type check can never fire acceptable, or should `admits` there be `'seated'`?
- Is the transfer's refusal `holds-other-seats` (R6) the wanted behaviour for an NGO account that legitimately administers two organisations, or should the founder want a per-organisation transfer that leaves the account active when other seats remain?
- The escalation contact is written by the administrator, not at concierge onboarding (R15 narrowing). Does AT-001.28's Given need a rewording through doc-sync in the same run, or is the narrowing stated in the body enough?
- Does the founder overturn R11 given the hook-push measurement, and if so at which tier is a product counter proved?
- `set_config(..., true)` scopes the actor to the transaction; PostgREST runs one RPC per transaction, so it holds. A future definer that batches must set it per call. Worth a comment, or a check?

## Next implementation step

Land the R4 scan changes with their selftest cases, then write `lifecycle.ts` and `write-routes.ts` with `writeAllowed` and its shipped selftest, and convert `create-organization` to `writeRoute` as the first declarative entry, so the conformance scan has one registered route to compare against before any new table exists.
