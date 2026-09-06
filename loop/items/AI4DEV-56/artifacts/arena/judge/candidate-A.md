# Candidate design: the boundary is the handler

Runner: `claude:opus@xhigh`. Structural direction: **a `writeRoute()` constructor owns the whole write
pipeline, and a route registers by being constructed through it.** One design for the six units of
`loop/items/AI4DEV-56/brief.md`.

---

## Problem

REQ-001's admin deliverable asks for four things this tree cannot express today: an organisation's
contact must move to a new account while every old row keeps its attribution, a lifecycle state must
gate **every** write with a check that fails an unregistered route in CI, role changes and the
transfer must leave a record nobody can alter, and a volunteer must never unlink the GitHub identity
signup made mandatory. `public.accounts` holds `id, account_type, created_at` and nothing else. There
is no audit table, no escalation contact, no registry of write routes, and no product code that talks
to Auth's link surface.

Four measured facts make the shape non-obvious.

1. **`service_role` cannot write any public table.** After the privilege overlay it holds `SELECT` on
   `accounts` and `org_memberships` and nothing else
   (`artifacts/measure/unit4-privileges-after-reset.txt`). Every product write therefore passes
   through a SECURITY DEFINER function. That makes the definer layer the universal choke point for
   any running service â€” and it is the layer CI never runs, because CI runs the loop tier only.
2. **An Auth ban does not end a live token.** The same unexpired access token still answers 200 at
   `/auth/v1/user` after a ban; only refresh and new sign-in are refused
   (`artifacts/measure/auth-ban-probe.txt`). "Writes rejected immediately" therefore needs a
   product-side lifecycle read on the write path, not a vendor ban.
3. **`Caller` has no account type.** Every type decision is a second round trip to `public.accounts`,
   and two routes hand-roll their own version of that trip today.
4. **A raising trigger on `auth.identities` keeps the row and Auth stays healthy, but GoTrue answers
   500 `unexpected_failure`, not a shaped 4xx** (`artifacts/measure/unlink-trigger-probe.txt`). The
   refusal is real; the status is not an oracle.

The lead's act-on rulings are constraints on everything below: one rule stated twice (R1), an honest
per-tier shape for the all-types clause (R2), one delete policy (R3), the static scan grows first
(R4), a completed NGO transferee (R5), the transfer refuses when the old account holds another seat
(R6), the gate reads under a share lock (R7), one deactivation authority (R8), a nullable actor with
an operator sentinel (R9), kinds on the wire (R10), AT-001.34 declared (R11), the new tables
unreachable by client roles (R12), the boundary lands in unit 1 (R13), one change touches the catalog
lists (R14), and the escalation contact is a platform-admin operation in its own table (R15).

The design answers with one sentence: **a write route is not a file that remembers to call the gate;
it is a value handed to `writeRoute()`, and there is no other way to reach the database.**

---

## Usage (caller's view)

### The README a route author reads

> **Writing a write route**
>
> A write route is one file. It declares its name, says which part of the request names the target
> organisation and the subject account, and supplies one pure decision. It performs no I/O.
>
> ```ts
> // supabase/functions/set-escalation-contact/index.ts
> import { writeRoute } from '../_shared/edge.ts';
> import { decideEscalationContact, organizationIdField } from '../_shared/admin-operations.ts';
>
> Deno.serve(writeRoute({
>   name: 'set-escalation-contact',
>   target: organizationIdField,
>   decide: decideEscalationContact,
> }));
> ```
>
> `writeRoute` does the rest, in this order: refuse a method that is not POST, resolve the caller
> through Supabase Auth, read the JSON body, load the caller's standing in one call, apply the
> lifecycle gate, run your decision, call the route's database function, and shape the answer.
>
> **You cannot skip it.** `callDatabaseFunction` is not exported from `_shared/edge.ts` any more, so
> a route has no way to reach `/rest/v1/rpc/` on its own. Three things enforce that: the type
> (`name` must be a key of `WRITE_ROUTES`), the run time (`writeRoute` throws at construction on a
> name it does not know, so an unregistered route never serves), and CI (the conformance scan reads
> `supabase/functions/*/index.ts` and fails any file that reaches the database outside this
> constructor).
>
> **Add your route to the inventory first.** `WRITE_ROUTES` in
> `supabase/functions/_shared/write-routes.ts` names every write route, its database function, and
> the global account types it admits. Adding a route is one row. The acceptance body for AT-001.29
> iterates that constant, so a new row is tested for the lifecycle gate the day it lands, and the
> adapter will not compile until it can attempt your route.
>
> **The database still backstops you.** Every database function the service role can reach calls
> `public.assert_account_active(p_account_id)` first, under a share lock. The static scan fails a new
> one that does not.

### Call site 1 â€” the transfer route, whole

```ts
// supabase/functions/transfer-organization-contact/index.ts
/**
 * The audited contact transfer and lost-access recovery (AT-001.25, .26, .27, .35).
 * ONE ROUTE FOR BOTH: AT-001.27's words are "behaves as AT-001.25 (same audited flow)". The
 * difference between a planned handover and a recovery is the reason the administrator gives,
 * and the audit row carries it.
 */
import { writeRoute } from '../_shared/edge.ts';
import { decideContactTransfer, organizationIdField, subjectAccountIdField } from '../_shared/admin-operations.ts';

Deno.serve(writeRoute({
  name: 'transfer-organization-contact',
  target: organizationIdField,
  subject: subjectAccountIdField,
  decide: decideContactTransfer,
  render: (value) => ({ organizationId: (value as { organization_id: string }).organization_id }),
}));
```

### Call site 2 â€” one gated write, after the change

```ts
// supabase/functions/update-organization/index.ts   (was 137 lines; the role lookup and the
// judgement both move out, and nothing is lost â€” `roleIn` becomes the shared standing loader and
// `decideOrganizationRename` is the same two shared rules in the order this file applied them)
import { writeRoute } from '../_shared/edge.ts';
import { decideOrganizationRename, organizationIdField } from '../_shared/memberships.ts';

Deno.serve(writeRoute({
  name: 'update-organization',
  target: organizationIdField,
  decide: decideOrganizationRename,
  render: (value) => value as Record<string, unknown>,
}));
```

A caller sees the same wire shape it saw before, plus one new refusal:

```
POST /functions/v1/update-organization   { "organizationId": "â€¦", "name": "Riverside Shelter" }
200 { "ok": true, "organizationId": "â€¦", "name": "Riverside Shelter" }
403 { "ok": false, "kind": "not-an-admin",         "reason": "â€¦" }     â† unchanged
403 { "ok": false, "kind": "account-deactivated",  "reason": "â€¦" }     â† new, from the gate
```

### Call site 3 â€” the unlink integration body (AT-001.41)

```ts
export async function at00141(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  // A volunteer with TWO identities, so the vendor's own last-identity rule is not what refuses.
  const volunteer = await registerConfirmAndSignIn(sut, w.email('permanent-github'));
  await sut.linkGithubIdentity(volunteer, 'permanent-github-handle');
  await sut.completeSignup(volunteer, { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER }, CLIENT_IP);

  const before = await sut.linkedIdentities(volunteer.accountId);
  expect(before.map((i) => i.provider), 'the Given is a volunteer holding email and github').toContain('github');

  // THE ACT. The oracle is the ROW, never the status: GoTrue answers 500 unexpected_failure for a
  // refused delete (measured, artifacts/measure/unlink-trigger-probe.txt line 11) and pinning that
  // would pin a vendor's error mapping instead of the product's rule.
  await sut.unlinkGithubIdentity(volunteer, 'github');

  expect((await sut.linkedIdentities(volunteer.accountId)).map((i) => i.provider),
    'the mandatory GitHub identity was unlinked').toContain('github');
  expect(await sut.authUserIsHealthy(volunteer), 'the refusal broke Auth for this user').toBe(true);

  // THE CONTROL. An NGO account's GitHub identity is not mandatory, so the same call succeeds â€”
  // which is what makes the refusal above about volunteers rather than about unlink in general.
  const ngo = await registerConfirmAndSignIn(sut, w.email('ngo-with-github'));
  await sut.linkGithubIdentity(ngo, 'ngo-github-handle');
  await sut.completeSignup(ngo, { accountType: 'ngo', organizationName: 'Riverside Shelter 41', â€¦ }, CLIENT_IP);
  await sut.unlinkGithubIdentity(ngo, 'github');
  expect((await sut.linkedIdentities(ngo.accountId)).map((i) => i.provider),
    'the control was refused too, so the refusal is not about volunteers').not.toContain('github');
}
```

---

## Shape

### 1. The data structures, first

**The lifecycle state, on `public.accounts`.** RM-14 gives v1 two values and no third, so it is an
enum with two labels, not a boolean and not a nullable timestamp. Two values in a type mean
`suspended` cannot be written by accident, and a null cannot mean "probably active".

```sql
create type public.account_lifecycle as enum ('active', 'deactivated');
alter table public.accounts add column lifecycle public.account_lifecycle not null default 'active';
```

`accounts` carries the state and nothing else â€” no `deactivated_at`, no `deactivation_reason`. When
and why live in the audit table, which is the only place they are written, so there is nothing to
keep in step (*single source of truth per invariant; derive instead of sync*).

**The write-route inventory** is the second structure, and it is what makes "every write" a value
rather than a claim.

```ts
// supabase/functions/_shared/write-routes.ts   (pure; imported by the edge routes AND the fixture)

/** Where a route lives. A stand-in has no deployed function; the fixture drives the gate over it. */
export type RouteSurface =
  | { readonly kind: 'edge'; readonly rpc: string }
  | { readonly kind: 'stand-in'; readonly reason: string };

/** What the caller must be. The exemption carries its reason IN THE TYPE, so nothing is a bare flag. */
export type RouteStanding =
  | { readonly kind: 'account-required'; readonly admits: readonly AccountType[] }
  | { readonly kind: 'account-absent-by-design'; readonly reason: string };

export const WRITE_ROUTES = {
  'complete-signup': {
    surface: { kind: 'edge', rpc: 'complete_signup' },
    standing: { kind: 'account-absent-by-design',
      reason: 'the account row is what this route creates; the lifecycle check still applies when a row already exists' },
  },
  'create-organization': {
    surface: { kind: 'edge', rpc: 'create_organization' },
    standing: { kind: 'account-required', admits: ['ngo'] },
  },
  'update-organization': {
    surface: { kind: 'edge', rpc: 'update_organization' },
    standing: { kind: 'account-required', admits: ['ngo'] },
  },
  'transfer-organization-contact': {
    surface: { kind: 'edge', rpc: 'transfer_organization_contact' },
    standing: { kind: 'account-required', admits: ['platform_admin'] },
  },
  'set-escalation-contact': {
    surface: { kind: 'edge', rpc: 'set_escalation_contact' },
    standing: { kind: 'account-required', admits: ['platform_admin'] },
  },
  'set-account-lifecycle': {
    surface: { kind: 'edge', rpc: 'set_account_lifecycle' },
    standing: { kind: 'account-required', admits: ['platform_admin'] },
  },
  'discovery-message': {
    surface: { kind: 'stand-in',
      reason: 'REQ-002/004 owns the Discovery route; this tree ships the decision it must consult' },
    standing: { kind: 'account-required', admits: ['ngo', 'volunteer', 'platform_admin'] },
  },
} as const satisfies Record<string, { surface: RouteSurface; standing: RouteStanding }>;

export type WriteRouteName = keyof typeof WRITE_ROUTES;
```

The stand-in row is the honest answer to R2's volunteer arm: no deployed write admits a volunteer, so
the loop tier grades the shipped gate over `sendDiscoveryMessage`, and the integration tier says so
by name rather than pretending.

**The caller's standing**, loaded once, is the third structure. It replaces `accountTypeOf` in
`create-organization` and `roleIn` in `update-organization` with one shape and one round trip.

```ts
export type SubjectStanding = { readonly accountType: AccountType; readonly lifecycle: AccountLifecycle; readonly seatCount: number };

export type WriteStanding =
  | { readonly kind: 'no-account' }
  | { readonly kind: 'unreadable'; readonly detail: string }
  | {
      readonly kind: 'account';
      readonly accountType: AccountType;
      readonly lifecycle: AccountLifecycle;
      /** the caller's role in the TARGET organisation, or null â€” never a role held elsewhere */
      readonly orgRole: OrgRole | null;
      readonly orgExists: boolean;
      /** the organisation's single seat holder, which the transfer compares against */
      readonly orgSeatAccountId: string | null;
      /** the subject account a route names, when it names one */
      readonly subject: SubjectStanding | null;
      readonly subjectExists: boolean;
    };

export function parseWriteStanding(raw: unknown): WriteStanding;   // fail-closed; unknown â†’ 'unreadable'
```

`unreadable` is a third state on purpose, exactly as `failed` is in the two lookups it replaces: a
read that did not happen is not a judgement about the caller, and collapsing it into `no-account`
would tell a caller with a database outage to complete signup.

**The audit table** carries no foreign key and no cascade (R3). Actor and subject are plain `uuid`
beside denormalised labels, in the spirit of `acknowledgments.signer_name`, so a later account delete
cannot take the history with it.

```sql
create type public.audit_event_kind as enum
  ('org_contact_transferred', 'account_lifecycle_changed', 'org_role_changed');

create table public.audit_events (
  id                uuid primary key default gen_random_uuid(),
  occurred_at       timestamptz not null default now(),
  event_kind        public.audit_event_kind not null,
  actor_account_id  uuid,                     -- null on an operator path (R9)
  actor_label       text not null,            -- 'platform_admin:<uuid>' or 'operator'
  subject_account_id uuid,
  subject_org_id    uuid,
  reason            text,
  detail            jsonb not null default '{}'::jsonb,
  -- AT-001.26's "why", encoded rather than described. A transfer with no reason cannot be stored.
  constraint audit_events_transfer_states_a_reason check (
    event_kind <> 'org_contact_transferred'
    or (reason is not null and btrim(reason, E' \t\r\n\f') <> '')
  ),
  constraint audit_events_actor_label_populated check (btrim(actor_label, E' \t\r\n\f') <> '')
);
```

**The escalation contact** is one row per organisation, and "non-login" is structural: the table has
no account id for the contact and no link to `auth.users`, so there is nothing for a login to attach
to (R15).

```sql
create table public.org_escalation_contacts (
  org_id                 uuid primary key references public.organizations(id) on delete cascade,
  contact_name           text not null,
  contact_email          text not null,
  contact_phone          text,
  recorded_by_account_id uuid not null,
  recorded_at            timestamptz not null default now(),
  constraint org_escalation_contacts_populated check (
    btrim(contact_name, E' \t\r\n\f') <> '' and btrim(contact_email, E' \t\r\n\f') <> ''
  )
);
```

The primary key on `org_id` is AT-001.28's "one non-login escalation contact" as a fact about the
shape, not a rule somebody applies. A second capture updates the row.

### 2. The pipeline, and why the handler is the boundary

```ts
// supabase/functions/_shared/write-routes.ts â€” the PURE spine, graded at the loop tier
export type WriteRouteInput = {
  readonly caller: Caller;
  readonly standing: WriteStanding;
  readonly body: Record<string, unknown>;
  readonly target: string | null;
  readonly subject: string | null;
  readonly ip: string | null;
};

export type WriteRouteDecision<Args> =
  | { readonly ok: true; readonly args: Args }
  | { readonly ok: false; readonly kind: WriteRefusalKind; readonly reason: string; readonly status: number };

export type WriteRouteSpec<Args> = {
  readonly name: WriteRouteName;
  readonly target?: (body: Record<string, unknown>) => string | null;
  readonly subject?: (body: Record<string, unknown>) => string | null;
  readonly decide: (input: WriteRouteInput) => WriteRouteDecision<Args>;
  readonly render?: (value: unknown) => Record<string, unknown>;
};

/** The gate, alone, so a body can grade it without building a request. */
export function writeGateDecision(name: WriteRouteName, standing: WriteStanding): WriteRouteDecision<'admitted'>;

/** Gate then decide. ONE spine; the edge and the fixture are two shells around it. */
export function writePipeline<Args>(spec: WriteRouteSpec<Args>, input: WriteRouteInput): WriteRouteDecision<Args>;

/** The kind a type mismatch carries, DERIVED from `admits` so there is no second field to sync. */
export function typeRefusalKind(admits: readonly AccountType[]): WriteRefusalKind;
```

`writeGateDecision` checks in this order, and the order is the load-bearing part:

1. `unreadable` â†’ `refused`, 502. Never a judgement about the caller.
2. `lifecycle === 'deactivated'` â†’ `account-deactivated`, 403. **Before** the type check and before
   the presence check, because AT-001.29 asks that the rejection be deactivation's rather than "an
   ordinary role/lifecycle precondition". A deactivated volunteer that calls the admin route is told
   it is deactivated, not that it is not an administrator.
3. Route admits an absent account â†’ admitted. `complete-signup` reaches here, and note that step 2
   already ran: a deactivated account that tries to complete signup a second time is refused by the
   gate, not by a primary-key collision.
4. `no-account` â†’ `no-account`, 409.
5. Type not in `admits` â†’ `typeRefusalKind(admits)`, 403.

The I/O shell is one function, in the file that already owns I/O:

```ts
// supabase/functions/_shared/edge.ts
export function writeRoute<Args extends Record<string, unknown>>(
  spec: WriteRouteSpec<Args>,
): (request: Request) => Promise<Response>;

/** One round trip for type, lifecycle, role-in-target, the organisation's seat and the subject. */
async function loadWriteStanding(
  accountId: string, organizationId: string | null, subjectAccountId: string | null,
): Promise<WriteStanding>;

/** NO LONGER EXPORTED. This one line is the whole structural claim of this design. */
async function callDatabaseFunction(url: string, key: string, name: string, args: Record<string, unknown>): Promise<RpcOutcome>;
```

`writeRoute` reads its own environment, so a route file carries no `requireEnv` lines; it wraps
`edgeHandler`, so the preflight and the shaped 502 are unchanged; and it calls
`WRITE_ROUTES[spec.name]` at construction, so an unknown name throws before `Deno.serve` ever runs.

**Interface depth, judged.** The public surface a route author touches is one function and one
object type with four fields, three of them optional. Behind it sit: method refusal, CORS, the Auth
round trip, `callerFromAuthAnswer`, body parsing, the standing RPC and its fail-closed parser, the
lifecycle gate, the refusal-to-status map, the database call, the 4xx/5xx split and the answer shape
â€” nine steps and about 120 lines that every route used to restate in part. What stays exposed to the
caller is exactly what differs between routes: which field names the organisation, which field names
the subject, and the route's own judgement. Nothing transport-shaped crosses the surface: `decide`
never sees a `Request`, a `Response`, a status from PostgREST or a header. It sees `WriteStanding`,
a parsed body and a `Caller`, and it answers with arguments or a refusal (*per boundary-discipline*).

**Why the pipeline is not stated twice.** `writePipeline` is pure and lives in the module the
acceptance program compiles. The edge shell supplies real I/O; the fixture supplies Maps. The loop
tier therefore grades the shipped gate, the shipped decisions and the shipped inventory â€” not a copy
(*per encode-lessons-in-structure*: the rule is a value both shells consume, so they cannot drift).

**Short call chains.** A reader tracing a refusal reads two files: the route's four-line `index.ts`
and the shared module holding its `decide`. The gate is a third file only when the refusal came from
the gate, and then the kind on the wire says so.

### 3. What the SQL side still backstops

The handler cannot stand in front of a service-role key holder that calls `/rest/v1/rpc/` directly,
and it cannot stand in front of the operator. So the same rule is stated once more in SQL, the way
every rule in this tree already is (R1).

```sql
-- Called FIRST by every database function the service role can reach.
create function public.assert_account_active(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lifecycle public.account_lifecycle;
begin
  -- `for share` (R7): a gated write in flight blocks a concurrent deactivation, and a write that
  -- arrives during one blocks until it commits and then re-reads the committed state. That is the
  -- whole concurrency contract; nothing else here is serialised.
  select lifecycle into v_lifecycle
    from public.accounts where id = p_account_id for share;

  -- ABSENCE IS NOT A LIFECYCLE REFUSAL. The calling function answers for a missing account with its
  -- own sentence; this one answers for exactly one thing.
  if v_lifecycle = 'deactivated' then
    raise exception 'this account is deactivated, so it may perform no write (REQ-001, AT-001.29)'
      using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.assert_account_active(uuid) from public;
-- NO GRANT. It is reached only from inside other definers, which run as the owner.
```

The SQL side backstops four things and the design says which: the caller's lifecycle (this helper),
the caller's authority for that route (each definer re-reads type or role, as they do today), the row
invariants (the NGO-only, single-seat and single-developer triggers, and the new append-only one),
and atomicity (one RPC is one transaction, so a transfer cannot half-happen).

What the SQL side does **not** cover is the operator connection, which bypasses definers and reaches
only triggers. That is stated, not hidden: a lifecycle trigger of the AT-001.37 shape would refuse
the transfer's own seat update and the re-enable write, because a trigger sees `NEW` and `OLD` and
never the actor. The gate is about the **caller**, so no row trigger can express it. The operator
path is test-only and no running service holds it.

### 4. The conformance check, mechanically

A new module, `tests/at/suites/req-001/_write-route-scan.ts`, on the `_source-scan.ts` and
`_policy-scan.ts` pattern: a pure core that takes its inputs, and a wrapper that reads the real tree.

```ts
export type RouteProblem = { code: string; detail: string };
export type RouteFile = { name: string; text: string };

export function scanWriteRoutes(
  inventory: typeof WRITE_ROUTES, files: readonly RouteFile[], configToml: string, edgeModule: string,
): RouteProblem[];

/** Reads supabase/functions/*/index.ts, supabase/config.toml and _shared/edge.ts. Throws on an
 *  empty functions directory â€” an absence reported by a broken instrument is the false green this
 *  whole arrangement exists to remove. */
export function writeRouteProblems(): RouteProblem[];
```

It derives candidates from the tree in two directions and compares both against the inventory.

| Code | What it refuses |
|---|---|
| `write-route-unregistered` | an `index.ts` whose text names `writeRoute`, `callDatabaseFunction` or `/rest/v1/rpc/`, and whose directory is not an `edge` row of `WRITE_ROUTES` |
| `write-route-missing-entry` | an `edge` row with no `supabase/functions/<name>/index.ts` |
| `write-route-not-constructed` | a registered route whose file does not contain `Deno.serve(writeRoute(`, or contains a second `Deno.serve(` |
| `write-route-bypasses-boundary` | a registered route whose file still names `callDatabaseFunction` or `/rest/v1/rpc/` |
| `write-route-unconfigured` | a registered route with no `[functions.<name>]` block in `config.toml` |
| `write-route-jwt-unverified` | a registered route whose block does not state `verify_jwt = true` |
| `rpc-caller-exported` | `_shared/edge.ts` exports `callDatabaseFunction` again |

"Registered" means, mechanically: the directory name is a key of `WRITE_ROUTES` with
`surface.kind === 'edge'`, **and** the file's only server is `Deno.serve(writeRoute({ â€¦ }))`, **and**
the file reaches the database through no other path. The last row is what keeps the first six honest:
if `callDatabaseFunction` were exported again, a route could be written the old way, and the scan says
so in the same run.

**What this scan proves and what it does not.** It proves registration and construction â€” that every
file able to reach the database does so through the one constructor, and that the constructor's list
and the tree agree in both directions. It does not prove that the gate refuses; only the integration
tier does that, by deactivating an account and driving the deployed function. Both sentences belong
in the merge record.

**The negative-direction selftest**, `tests/at/harness/write-route-scan.selftest.ts`, builds a
synthetic tree per code. The load-bearing case is a fourth write route a later wave adds:

```ts
it('fails a write route that reaches the database without registering', () => {
  const problems = scanWriteRoutes(WRITE_ROUTES, [
    ...realRouteFiles(),
    { name: 'donate-fuel/index.ts', text: `Deno.serve(async (r) => fetch(\`\${URL}/rest/v1/rpc/donate_fuel\`, â€¦));` },
  ], realConfigToml(), realEdgeModule());
  expect(problems.map((p) => p.code)).toContain('write-route-unregistered');
});
```

**The SQL half of the same check** grows inside `_policy-scan.ts`, which already parses every
migration statement, tracks `security definer` and tracks `grant execute`:

| Code | What it refuses |
|---|---|
| `definer-no-write-gate` | a `public.` SECURITY DEFINER function that is not `stable` or `immutable`, is granted EXECUTE to `service_role`, and whose body does not call `public.assert_account_active(` |

The predicate is exactly "reachable by the service role and able to write", which is the real RPC
surface. Internal helpers (`assert_account_active`, `append_audit_event`, `change_account_lifecycle`)
carry no `service_role` grant and are excluded by construction; read definers (`write_standing`,
`read_public_project`, the `viewer_` set) are `stable` and excluded the same way. One exemption row
exists, and it is R1's own:

```ts
export const WRITE_GATE_EXEMPT: Readonly<Record<string, string>> = {
  complete_signup:
    'the caller holds no account row when this runs; a second completion is refused by the accounts ' +
    'primary key, and the TypeScript gate refuses a deactivated account before the call is made',
};
```

### 5. The migration sketch

Three migrations, one per commit group that needs one. Version stamps follow the two on `main`
(`20260907120000`), and a stamp is a key â€” a collision stops the replay, which this tree has already
paid for once.

```sql
-- 20260908120000_account_lifecycle_audit_and_contact_transfer.sql   (unit 1, per R13)

create type public.account_lifecycle as enum ('active', 'deactivated');
alter table public.accounts add column lifecycle public.account_lifecycle not null default 'active';

create type public.audit_event_kind as enum ('org_contact_transferred', 'account_lifecycle_changed', 'org_role_changed');
create table public.audit_events ( â€¦ as above â€¦ );
create table public.org_escalation_contacts ( â€¦ as above â€¦ );

-- BOTH TABLES ARE UNREACHABLE BY CLIENT ROLES (R12). `revoke all` is what makes "no privilege"
-- true, and it names service_role as well (R4): the default ACL still hands Dxtm to every new
-- public table (unit4-privileges-after-reset.txt line 31).
revoke all on table public.audit_events, public.org_escalation_contacts from anon, authenticated;
revoke all on table public.audit_events, public.org_escalation_contacts from service_role;
alter table public.audit_events            enable row level security;
alter table public.org_escalation_contacts enable row level security;
-- No policy and no viewer_ helper, by decision. An admin screen later adds a definer read, the
-- read_public_project shape.

/* -------- append-only, in the schema (R3): no grant, no definer that writes it, and a trigger --- */
create function public.audit_events_are_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'public.audit_events is append-only: % is refused (REQ-001, AT-001.33)', tg_op
    using errcode = '42501';
end;
$$;
revoke execute on function public.audit_events_are_append_only() from public;

create trigger audit_events_no_update_or_delete
before update or delete on public.audit_events for each row
execute function public.audit_events_are_append_only();

-- TRUNCATE takes a statement trigger; a row trigger never sees it.
create trigger audit_events_no_truncate
before truncate on public.audit_events for each statement
execute function public.audit_events_are_append_only();

/* ---------------------------------------------------------------- the write gate, in SQL -------- */
create function public.assert_account_active(p_account_id uuid) returns void â€¦ ;   -- body above

/* ------------------------------------------------------- the one standing read, `stable` --------- */
create function public.write_standing(p_account_id uuid, p_org_id uuid, p_subject_account_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  -- account_type, lifecycle, the caller's role in p_org_id, whether p_org_id exists, that
  -- organisation's single seat holder, and the subject's type, lifecycle and seat count.
  select jsonb_build_object('not_implemented', true);
$$;
revoke execute on function public.write_standing(uuid, uuid, uuid) from public;
grant execute on function public.write_standing(uuid, uuid, uuid) to service_role;

/* -------------------------------------------------- audit writing, internal to the definers ----- */
create function public.append_audit_event(
  p_kind public.audit_event_kind, p_actor uuid, p_subject_account uuid, p_subject_org uuid,
  p_reason text, p_detail jsonb
) returns void language plpgsql security definer set search_path = ''
as $$ begin raise exception 'not implemented'; end; $$;   -- writes actor_label 'platform_admin:<id>' or 'operator'
revoke execute on function public.append_audit_event(public.audit_event_kind, uuid, uuid, uuid, text, jsonb) from public;

create function public.change_account_lifecycle(
  p_account_id uuid, p_lifecycle public.account_lifecycle, p_actor uuid, p_reason text
) returns boolean language plpgsql security definer set search_path = ''
as $$ begin raise exception 'not implemented'; end; $$;
-- IDEMPOTENT: updates only when the state differs, returns whether it changed, and writes an audit
-- row only on a change. Running it twice leaves one row, not two.
revoke execute on function public.change_account_lifecycle(uuid, public.account_lifecycle, uuid, text) from public;

/* ------------------------------------------- role changes reach the audit from a trigger (R9) ---- */
create function public.org_membership_role_change_audit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- The actor is a transaction-local setting the product definers set before they write. An operator
  -- statement sets nothing, so actor_account_id is null and actor_label is 'operator'.
  -- current_setting('app.actor_account_id', true)
  raise exception 'not implemented';
end;
$$;
revoke execute on function public.org_membership_role_change_audit() from public;
create trigger org_memberships_role_change_audit
after insert or update on public.org_memberships for each row
execute function public.org_membership_role_change_audit();

/* ------------------------------------------------------------- the two admin write functions ----- */
create function public.transfer_organization_contact(
  p_account_id uuid, p_organization_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_reason text
) returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_account_active(p_account_id);
  -- 1. re-check platform_admin, the current seat holder, the transferee's type and lifecycle, and
  --    that the outgoing account holds no other seat (R6) â€” every one a backstop for a caller that
  --    bypassed the handler, raising rather than answering.
  -- 2. set_config('app.actor_account_id', p_account_id::text, true)
  -- 3. update public.org_memberships set account_id = p_to_account_id
  --      where org_id = p_organization_id and account_id = p_from_account_id;   â† the seat moves
  -- 4. public.change_account_lifecycle(p_from_account_id, 'deactivated', p_account_id, p_reason)
  -- 5. public.append_audit_event('org_contact_transferred', â€¦, p_reason, â€¦)
  raise exception 'not implemented';
end;
$$;
revoke execute on function public.transfer_organization_contact(uuid, uuid, uuid, uuid, text) from public;
grant execute on function public.transfer_organization_contact(uuid, uuid, uuid, uuid, text) to service_role;

create function public.set_escalation_contact(
  p_account_id uuid, p_organization_id uuid, p_name text, p_email text, p_phone text
) returns jsonb language plpgsql security definer set search_path = ''
as $$ begin perform public.assert_account_active(p_account_id); raise exception 'not implemented'; end; $$;
revoke execute on function public.set_escalation_contact(uuid, uuid, text, text, text) from public;
grant execute on function public.set_escalation_contact(uuid, uuid, text, text, text) to service_role;

/* ------------------------- the two existing writers gain the gate; grants restated ---------------- */
create or replace function public.create_organization(p_account_id uuid, p_name text) â€¦ ;  -- + assert_account_active first
create or replace function public.update_organization(p_account_id uuid, p_organization_id uuid, p_name text) â€¦ ;
revoke execute on function public.create_organization(uuid, text) from public;
grant  execute on function public.create_organization(uuid, text) to service_role;
revoke execute on function public.update_organization(uuid, uuid, text) from public;
grant  execute on function public.update_organization(uuid, uuid, text) to service_role;

notify pgrst, 'reload schema';
```

```sql
-- 20260909120000_account_lifecycle_setter.sql   (unit 2)
create function public.set_account_lifecycle(
  p_account_id uuid, p_subject_account_id uuid, p_lifecycle public.account_lifecycle, p_reason text
) returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_account_active(p_account_id);      -- the CALLER's gate, so a deactivated
                                                           -- administrator cannot re-enable itself
  -- re-check platform_admin, then public.change_account_lifecycle(...) and return {changed: â€¦}
  raise exception 'not implemented';
end;
$$;
revoke execute on function public.set_account_lifecycle(uuid, uuid, public.account_lifecycle, text) from public;
grant  execute on function public.set_account_lifecycle(uuid, uuid, public.account_lifecycle, text) to service_role;
notify pgrst, 'reload schema';
```

```sql
-- 20260910120000_volunteer_github_identity_is_permanent.sql   (unit 5)
-- Measured first: a BEFORE DELETE trigger on auth.identities keeps the row and Auth stays healthy
-- for the user (unlink-trigger-probe.txt lines 8, 9, 12). GoTrue answers 500, so the test's oracle
-- is the row (R10). `pg_trigger_depth() = 0` refuses only a DIRECT delete, so the vendor's admin
-- user delete, which cascades, still works (R3) â€” the discriminator is measured before this lands.
create function public.github_identity_is_permanent_for_volunteers()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then return old; end if;       -- a cascade, not a direct unlink
  -- if old.provider = 'github' and the owning public.accounts row is of type 'volunteer' â†’ raise
  raise exception 'not implemented';
end;
$$;
revoke execute on function public.github_identity_is_permanent_for_volunteers() from public;
create trigger volunteer_github_identity_is_permanent
before delete on auth.identities for each row
execute function public.github_identity_is_permanent_for_volunteers();
```

The static scan reads all three files and must find, for every new table, a `revoke all â€¦ from anon,
authenticated` and from `service_role`, no client grant, and a `revoke execute from public` on every
new function. Two catalog rows are added in the same change:
`TENANT_CATALOG.audit_events = 'unreachable-by-client-roles'` and the same for
`org_escalation_contacts`. **R14's cost is smaller than the ruling estimated**: the other two lists in
`_integration.ts` are `SERVICE_ROLE_SELECT` (the new tables grant the service role nothing) and
`VIEWER_FUNCTIONS` (the new functions are not `viewer_`), so neither changes. One list edit, not three.

### 6. The transfer, row by row

An NGO seat moving from account A to account B, inside one definer and therefore one transaction:

| Table | What changes | Why |
|---|---|---|
| `org_memberships` | `account_id` moves from A to B on the single seat row; `role` is untouched | the shape `repointMembershipAsOperator` already proves live; the NGO-only trigger checks B, and the `after` trigger writes the `org_role_changed` audit row |
| `accounts` (A) | `lifecycle` becomes `deactivated` | AT-001.25's "the old account is deactivated"; `account_type` and `id` are untouched |
| `accounts` (B) | nothing | B is a completed NGO account and stays active (R5) |
| `acknowledgments` | **nothing** | `account_id` still points at A â€” this is AT-001.25's "still attributed to the original acting humans"; the signer name, title and attestation stay exactly as A signed them |
| `projects` | **nothing** | keyed by `org_id`, which does not move; `assigned_volunteer_id` is a volunteer's and untouched |
| `volunteer_profiles` | **nothing** | keyed by a volunteer account; an NGO transfer does not reach it |
| `organizations` | **nothing** | the organisation is the thing being kept, not moved |
| `audit_events` | three rows appended | `org_contact_transferred` (definer, with the reason), `org_role_changed` (trigger), `account_lifecycle_changed` (from `change_account_lifecycle`) |

Two deliberate refusals guard the shape. **The transfer names the outgoing account** and refuses when
that account no longer holds the seat, so a retry after a timeout cannot move a seat from a state the
caller never saw (*per make-operations-idempotent*: run twice, the second run answers
`not-the-current-contact` and writes nothing). And **the transfer refuses when the outgoing account
holds another seat** (R6), naming the other organisations in the refusal body, because lifecycle is
account-level and deactivating A would silently gate A's writes in organisations this transfer never
looked at.

Nothing is deleted anywhere, at any point, which is the whole of "history preserved". The existing
cascade from `auth.users` to `accounts` is untouched and goes in "Not done here".

### 7. The refusal shapes on the wire

| Route | Condition | Status | Body |
|---|---|---|---|
| any write | no `Authorization`, dead or expired token | 401 | `{ ok: false, reason }` (unchanged) |
| any write | the standing read failed | 502 | `{ ok: false, kind: "refused", reason }` |
| any write | caller deactivated | 403 | `{ ok: false, kind: "account-deactivated", reason }` |
| any write | caller has no account row (route requires one) | 409 | `kind: "no-account"` |
| admin routes | caller is `ngo` or `volunteer` | 403 | `kind: "not-a-platform-admin"` |
| `create-organization` | caller is not `ngo` | 403 | `kind: "not-an-ngo-account"` |
| `update-organization` | caller holds no seat / holds `member` | 403 | `kind: "not-a-member"` / `"not-an-admin"` (unchanged) |
| transfer | organisation unknown | 409 | `kind: "no-such-organisation"` |
| transfer | the named outgoing account does not hold the seat | 409 | `kind: "not-the-current-contact"` |
| transfer | the outgoing account holds other seats | 409 | `kind: "holds-other-seats"`, `organizations: [...]` |
| transfer | transferee has no account row | 409 | `kind: "transferee-no-account"` |
| transfer | transferee is not `ngo` | 409 | `kind: "transferee-not-ngo"` |
| transfer | transferee is deactivated | 409 | `kind: "transferee-deactivated"` |
| transfer | no reason given | 400 | `kind: "invalid-request"` |
| escalation | name or email blank | 400 | `kind: "invalid-contact"` |
| lifecycle | subject account unknown | 409 | `kind: "subject-no-account"` |
| lifecycle | success | 200 | `{ ok: true, changed: boolean }` |
| any write | the definer's backstop raised | 409 (4xx) / 502 (5xx) | `kind: "refused"`, the database's sentence |
| unlink (Auth's own endpoint) | a volunteer's GitHub identity | 500 `unexpected_failure` | **not an oracle**; the test reads the row |
| unlink | no token | 401 | the vendor's shape |

### 8. The two clauses with no surface

Both are declared, per the brief's working assumption.

**Virtual keys** (AT-001.30's second clause, AT-001.31's parenthetical). The tree ships one pure
decision, `supabase/functions/_shared/gateway-keys.ts`, the hook the gateway leaf must consult â€”
the same posture as `discoveryMessageAllowed`, which no deployed function imports either:

```ts
export type KeyAction = 'revoke' | 'reissue' | 'none';
/** What a lifecycle change requires of the project's virtual keys (REQ-009's leaf must consult it). */
export function virtualKeyActionFor(from: AccountLifecycle, to: AccountLifecycle): KeyAction;
```

Loop: green, over the shipped decision through the fixture. Integration: red, `CapabilityPending`
naming `gateway.virtual-key-revocation` (AT-001.30) and `gateway.virtual-key-reissue` (AT-001.31),
thrown after the real arms have run, the AT-001.24 shape.

**Concierge onboarding** (AT-001.28's Given). R15 narrows rather than declares: the vetting act stays
the NGO profile requirement's, and the escalation contact is captured by a platform-admin operation on
the same admin surface as the transfer. AT-001.28 is green at both tiers with the narrowing stated in
the body, and no capability string.

**If the founder says "stub" instead.** The two virtual-key capabilities become a
`public.project_virtual_keys` table (project id, key id, state, revoked_at), a revoke and a re-issue
call inside `change_account_lifecycle`, one more SUT member (`virtualKeysFor(projectId)`), one more
`TENANT_CATALOG` row and one more `_policy-scan` pass. AT-001.30 and AT-001.31 go green at both tiers
and no capability string is minted. The cost is a table with no consumer, whose shape the LLM gateway
requirement did not choose and will have to migrate; the benefit is that "immediately" is proved end
to end rather than at the seam. The work is about one commit group. Nothing else in this design moves:
the stand-in decision module becomes the caller of the new table instead of a hook.

### 9. Every id, per tier

`G` = green, `CP` = `capability-pending` with the named capability.

| Id | Given | Act | Assertion | loop | integration |
|---|---|---|---|---|---|
| **.25** transfer | admin; NGO A completed signup, holds its seat, has an acknowledgment and a project; NGO B completed signup (R5) | `transferOrganizationContact(admin, {org, from: A, to: B, reason})` | seat is B's; `membershipsOf(A)` no longer names the org; `acknowledgments(A)` byte-identical; `projectAssignment` unchanged; `account(A).lifecycle === 'deactivated'`; `account(B).lifecycle === 'active'` | G | G |
| **.26** who/when/why | the transfer of .25 | read `auditEvents({ orgId })` | one `org_contact_transferred` row: `actorAccountId === admin`, `actorLabel` names the admin, `occurredAt` inside the test window, `reason` equals the string sent | G | G |
| **.27** recovery | a second organisation whose contact cannot sign in | the **same** route, `reason: 'lost access â€” recovery'` | identical postconditions to .25 plus its own audit row; the body states that recovery is the same operation and the reason carries the story | G | G |
| **.28** escalation contact | admin; an organisation | `setEscalationContact(admin, {org, name, email, phone})` | `escalationContact(org)` returns the row; a sign-in attempt with that email is refused, so the contact is non-login; the body states R15's narrowing | G | G |
| **.35** admin only | an NGO account, a volunteer, no session, and an admin control | the transfer route, four times | NGO â†’ 403 `not-a-platform-admin`; volunteer â†’ the same; no session â†’ 401; admin â†’ 200; and after the three refusals the seat and both lifecycles are unchanged | G | G |
| **.29** every write | per admitted type: one active control and one deactivated account, otherwise authorised | iterate `WRITE_ROUTES`; for each row and each admitted type, `attemptWrite(route, session, subject)` twice | every deactivated attempt refuses with `account-deactivated`; every active control succeeds. Plus `writeRouteProblems()` is empty, at both tiers | G | **CP** `product.volunteer-write-route` (after the NGO and admin arms run for real) |
| **.30** AUP volunteer | an active volunteer with a live token | `setAccountLifecycle(admin, {volunteer, 'deactivated', reason: 'AUP'})`, then immediately a write | the write refuses `account-deactivated` with no wait; at integration the volunteer's token still answers 200 at `/auth/v1/user` (the measured fact), so the refusal is the product's; keys: `virtualKeyActionFor('active','deactivated') === 'revoke'` | G | **CP** `gateway.virtual-key-revocation`, `product.volunteer-write-route` |
| **.31** re-enable | the deactivated account of .29 | `setAccountLifecycle(admin, {account, 'active', reason})`, then the same writes | the writes succeed again; independent gates still refuse (the re-enabled NGO is still `not-an-admin` where it holds `member`; a re-enabled volunteer is still refused the NGO-only action); a deactivated admin cannot re-enable itself, so a second admin is required; keys: `virtualKeyActionFor('deactivated','active') === 'reissue'` | G | **CP** `gateway.virtual-key-reissue` |
| **.33** append-only | the transfer of .25, plus an operator role change | `attemptAuditTamper('update' \| 'delete' \| 'truncate')` | rows exist for all three kinds; the operator row carries `actorAccountId === null` and `actorLabel === 'operator'` (R9); all three tampers are refused and every row survives; `audit_events` privileges are empty for all three client roles | G | G |
| **.34** sign-in limit | â€” | â€” | declared (R11): the local GoTrue answered 45 password grants in 0.66 s with zero 429 | **CP** `vendors.gotrue-sign-in-rate-limit` | **CP** same |
| **.41** unlink refused | a volunteer holding email and github identities; an NGO with a github identity as the control | `unlinkGithubIdentity(session, 'github')` | the volunteer's github row survives and `/auth/v1/user` still answers 200; the NGO's row is removed | G (static arm) | G (live arm) |

AT-001.41's loop arm is a static oracle, not a fixture mirror, and the reason is the one this tree
keeps repeating: there is no TypeScript on Auth's delete path, so shipping a decision module for it
would be a rule stated twice with only one copy live. Instead `_policy-scan.ts` gains
`identityPermanenceProblems()`, which reads the migrations and refuses when there is no
`before delete on auth.identities` trigger, or when its function does not name `pg_trigger_depth`.
The integration arm drives the real DELETE.

### 10. Module map, and the count

**New pure modules (3)** â€” all under `supabase/functions/_shared/`, all imported by the fixture, so
all inside the strict acceptance program:

| File | Exports |
|---|---|
| `write-routes.ts` | `WRITE_ROUTES`, `WriteRouteName`, `RouteSurface`, `RouteStanding`, `WriteStanding`, `SubjectStanding`, `WriteRefusalKind`, `parseWriteStanding`, `writeGateDecision`, `writePipeline`, `typeRefusalKind`, `WriteRouteSpec`, `WriteRouteInput`, `WriteRouteDecision` |
| `admin-operations.ts` | `decideContactTransfer`, `decideEscalationContact`, `decideLifecycleChange`, `organizationIdField`, `subjectAccountIdField`, `validateEscalationContact`, `TransferRefusalKind` |
| `gateway-keys.ts` | `KeyAction`, `virtualKeyActionFor` (the declared seam) |

**Edited pure modules (2)**: `accounts.ts` gains `ACCOUNT_LIFECYCLES`, `AccountLifecycle`,
`parseAccountLifecycle`, `decideSignupCompletion` and `decideOrganizationCreation`;
`memberships.ts` gains `decideOrganizationRename`.

**Edited I/O module (1)**: `edge.ts` gains `writeRoute` and `loadWriteStanding`, and
`callDatabaseFunction` stops being exported.

**Edge functions**: 3 new (`transfer-organization-contact`, `set-escalation-contact`,
`set-account-lifecycle`), 3 rewritten to four lines each. Three new `[functions.*]` blocks with
`verify_jwt = true`.

**SQL**: 2 tables, 2 enums, 1 column, 4 service-role-reachable functions (`write_standing`,
`transfer_organization_contact`, `set_escalation_contact`, `set_account_lifecycle`), 4 internal
functions (`assert_account_active`, `append_audit_event`, `change_account_lifecycle`,
`audit_events_are_append_only`), 2 trigger functions (`org_membership_role_change_audit`,
`github_identity_is_permanent_for_volunteers`), 4 triggers.

**New `AccountsSut` members (9)**, each named for the criterion that needs it, plus one field:

```ts
  /** AT-001.29/.30/.31: the smallest legal write on one inventory route, as this session. */
  attemptWrite(route: WriteRouteName, session: Session | null, subject: WriteSubject): Promise<WriteAttemptOutcome>;
  transferOrganizationContact(session: Session | null, request: TransferRequest): Promise<TransferOutcome>;
  setEscalationContact(session: Session | null, request: EscalationContactRequest): Promise<EscalationOutcome>;
  setAccountLifecycle(session: Session | null, request: LifecycleRequest): Promise<LifecycleOutcome>;
  auditEvents(filter: { subjectOrgId?: string; subjectAccountId?: string }): Promise<AuditEventRow[]>;
  escalationContact(organizationId: string): Promise<EscalationContactRow | null>;
  /** AT-001.33: the operator attempts to alter the record. The refusal is the criterion. */
  attemptAuditTamper(attempt: 'update' | 'delete' | 'truncate'): Promise<TamperOutcome>;
  /** AT-001.41 */
  unlinkGithubIdentity(session: Session, provider: string): Promise<void>;
  linkedIdentities(accountId: string): Promise<{ provider: string }[]>;
  // and AccountRow gains `lifecycle: AccountLifecycle` rather than a tenth member
```

`attemptWrite` is the deep one. Both adapters implement it as a
`Record<WriteRouteName, (session, subject) => Promise<WriteAttemptOutcome>>`, so **an inventory row
the adapter cannot attempt is a type error**, not a body somebody forgot to extend. That is what makes
AT-001.29's "every enumerated write" mechanically true as later waves add routes. The live adapter's
`discovery-message` entry throws `CapabilityPending(['product.volunteer-write-route'])`.

**New harness pieces (4)**: `_write-route-scan.ts`, `write-route-scan.selftest.ts` (8 cases),
`authDelete` in `live-stack.ts` (no DELETE helper exists today), and 5 new cases in
`policy-scan.selftest.ts` (`definer-no-write-gate`, the widened `service-role-write` for `references`
and `trigger`, the `service_role` baseline revoke, and the two identity-permanence codes).

**Unit 4 is a check plus a record, not a migration** (R4). Measured on the reset stack: no client role
holds TRUNCATE, TRIGGER or REFERENCES on any public table, and the live catalog already pins the exact
sets. What changes is the static scan: `WRITE_PRIVS` gains `references` and `trigger` (a leftover
`REFERENCES` grant to `service_role` passed the static scan and would have failed only the live
exact-set assertion), and the baseline revoke must name `service_role`. Both strengthenings pass on
today's migrations, which is the point of landing them before any new table.

**Unit 6 is a record.** The local CLI does not push `email_sent` (the container carries
`EMAIL_SENT=360000` against the file's `2`), and it does not throttle password grants at the file's
`sign_in_sign_ups = 30`: 45 grants in 0.66 s, all 400, no 429, no rate-limit header. The three
candidate causes stay open and named, so a later leaf does not re-measure blind. It does push
`[auth.hook.password_verification_attempt]` into the container â€” measured â€” so a product-side counter
is reachable; R11 rules it out and the record says why. AT-001.34 is verified on the hosted platform's
own limiter, outside this tree, under `vendors.gotrue-sign-in-rate-limit`.

---

## Synthesis decision

*Filled in by the arena.*

---

## Tradeoffs accepted

- **We accept that `callDatabaseFunction` stops being exported, in exchange for a boundary nothing can
  forget.** A future route with a genuinely different pipeline must extend `writeRoute` rather than
  work beside it. That is the cost of the property, and it is the property the manifest asked for.
- **We accept one extra database round trip on the transfer path, in exchange for the transfer's
  judgement being pure and graded at loop.** The alternative â€” a definer that answers refusals as
  data â€” keeps the round trip count at two and puts the reasoning where CI cannot read it.
- **We accept that `write_standing` returns fields a given route does not use, in exchange for one
  loader instead of four.** A route that names no organisation passes `null` and the corresponding
  fields come back null. The read is one `stable` definer over two tables the service role already
  reads.
- **We accept a fixture that mirrors the append-only triggers, in exchange for a loop-tier body for
  AT-001.33.** The mirror is labelled as a mirror in `_fixture.ts`, as every operator mirror there is,
  and the integration tier is its oracle.
- **We accept that the operator can drop the audit trigger** (R3). No object in a database protects
  against its owner. The residual is stated in the migration and in the merge record rather than
  papered over with a second trigger that the same authority could also drop.
- **We accept that a deactivated account's live sessions keep working at Auth** (R8). The write path
  refuses them, which is what the criterion reads. Ending sessions needs an admin ban whose semantics
  we measured and did not adopt; it goes in "Not done here".
- **We accept `pg_trigger_depth()` as the discriminator for the unlink trigger**, which is a
  measurement we have not taken yet. If a cascade turns out to fire at depth 0, the trigger refuses a
  legitimate user delete, so the measurement is the first step of unit 5 and not an assumption inside
  it.
- **We accept three admin routes rather than one `admin-operations` endpoint with an operation field.**
  One endpoint would be cheaper by two files and two config blocks, and it would put a switch back
  inside a handler â€” the exact shape this design removes everywhere else.

## Alternatives considered

**A. The gate in each `index.ts`, after `resolveCaller`.** The smallest diff: three files gain four
lines each. It exposes the whole pipeline to every route author and hides nothing, so the interface is
as wide as the implementation. Its conformance check must prove a *call order* by reading text, which
is a weaker oracle than "there is no other way to reach the database". Rejected on interface depth.

**B. The gate only in the definers, with no TypeScript half.** The deepest coverage of running
services â€” it catches a raw service-role RPC, which the handler cannot â€” and it needs no inventory at
all. But CI runs the loop tier, which grades TypeScript, so the rule would be enforced by an object no
CI run ever executes, and the refusal would reach the caller as `kind: "refused"` with a database
sentence rather than as `account-deactivated`. It is kept as the backstop, not as the boundary.

**C. A BEFORE trigger on every writable table, the AT-001.37 shape.** It covers the operator path,
which nothing else does. It cannot express this rule at all: a trigger sees `NEW` and `OLD`, never the
actor, so it would refuse the transfer's own seat update and the re-enable write, and it would gate
rows rather than callers. Grok's finding, and it is decisive.

**D. The account type and lifecycle as a `custom_access_token` claim.** No standing round trip at all,
and the fastest gate available. A claim is a cached copy of a row with the token's lifetime, so a
deactivation would take effect up to two minutes later â€” against a criterion whose word is
"immediately". Rejected on the measurement, not on taste.

**E. One `admin-operations` edge function with a discriminated `operation` field.** Hides three
operations behind one surface, which is real depth, and it is one config block instead of three. It
also makes the inventory's per-route `admits` less useful, gives AT-001.29 one endpoint where the
criterion asks for an enumeration, and puts a `switch` in a handler. Rejected as the wrong axis of
compression: the depth this design wants is in the pipeline, not in the endpoint count.

**F. A shipped TypeScript decision for the unlink refusal.** It would give AT-001.41 a loop body that
grades product code. There is no deployed TypeScript on Auth's delete path, so the module would be a
second statement of a rule only SQL enforces â€” the exact defect `accounts.ts`'s header exists to
delete. Replaced by a static arm over the migration text, which is a claim about the thing that
actually enforces.

## Open questions and risks

1. **Does a cascade delete from `auth.users` fire the identity trigger at `pg_trigger_depth() > 0`?**
   The probe measured a direct delete only. If the depth guard does not discriminate, does the founder
   prefer that the trigger refuse the vendor's user delete too, or that unit 5 ship without the guard
   and accept that a user delete is refused for volunteers?
2. **The measurement says the CLI does push `[auth.hook.password_verification_attempt]`. Does that
   change R11?** A product-side sign-in counter is now reachable locally. It would be SQL the loop
   tier cannot grade and a control AT-001.34's words do not ask for, which is why R11 declares. Should
   the founder overturn that, given the hook now provably lands?
3. **Should the transfer refuse, or cascade, when the outgoing account holds another seat?** R6 says
   refuse and name the organisations. Is that right for a real recovery, where the unreachable contact
   may well hold two seats, or should the route grow an explicit "transfer all seats" request?
4. **Is `attemptWrite` too much authority for one SUT member?** It is the member that makes AT-001.29
   total over the inventory. It is also the member a careless future author could implement as a
   pass-through that always succeeds. Should the contract require each entry to return the route's own
   refusal kind, so a stub cannot be silent?
5. **Where does AT-001.41's manifest leaf sit?** The board hangs unit 5 under the authentication root
   rather than under D6, so a new leaf under D1 is the natural home, and the header count moves from
   37 P0 to 38 in the same fold. Does the founder want it as D1.L3, or as a third leaf under D2?
6. **Risk: `create or replace` on the two existing write functions.** Replacement keeps privileges,
   but this tree has been bitten by a drop-and-recreate dropping grants, so both migrations restate
   the revoke and the grant. If a reviewer prefers, the safer shape is drop-and-create with the full
   body copied, at the cost of a much larger diff.
7. **Risk: the standing loader is one more `stable` definer on the hot path of every write.** It
   replaces two ad-hoc reads, so the count does not grow â€” but it does put one more object in the
   dependency chain of every route, and a schema-cache miss on it would 404 every write at once. The
   `notify pgrst` is therefore not optional in these migrations.

## Next implementation step

Write `supabase/functions/_shared/write-routes.ts` â€” the inventory, `WriteStanding` with its
fail-closed parser, and `writeGateDecision` with its five ordered checks â€” plus
`tests/at/harness/shipped-write-gate.selftest.ts` driving every refusal and every admitted shape,
before any migration or route file exists.
