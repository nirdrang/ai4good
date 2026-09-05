# Candidate design

Direction C: catalog-first.

Attribution: unattributed; design candidate for tenant isolation and visibility, AI4DEV-55. This is a read-only sketch; no files were changed or tests run.

## Problem

The database has six public tables, row-level security enabled, no policies, and almost no client privileges. There is no tenant read surface. This design makes one declarative catalog the authoring source for visibility, generates SQL enforcement and TypeScript conformance decisions from it, and derives acceptance procedures from its resource declarations. Every authenticated product read goes through an edge function that forwards the caller’s JWT to PostgREST. Existing write functions retain their separate authorization contracts.

There is one constraint tension to resolve explicitly: direction C requests a derived TypeScript decision, while the lead rulings prohibit a second tenant rule in handlers. The derived TypeScript decision therefore belongs to build and conformance tooling. It never authorizes a product read and never filters the loop fixture’s stores. SQL remains the only runtime tenant enforcement point.

The acceptance specification is quoted verbatim:

> - **AT-001.21 (P0)** — Given NGO A and NGO B, When NGO B's account requests NGO A's non-public data (drafts, ledger, files, thread, dashboard) by UI or direct API/ID probing, Then access is denied and nothing leaks (no existence oracle beyond public surfaces).
> - **AT-001.22 (P0)** — Given a volunteer not assigned to a project, When they request that project's non-public data (reference files, thread), Then access is denied; the public project page remains visible [cross: REQ-010].
> - **AT-001.23 (P0)** — Given the assigned volunteer of a project, When they request that project's working data (reference files, thread, tasks), Then access succeeds, scoped to that project only.
> - **AT-001.40 (P0)** — Given a platform admin, When they request any NGO's or project's data (drafts, ledger, files, thread, dashboard), Then access succeeds — the admin role spans all accounts. [d65]
> - **AT-001.24 (P0)** — Given a logged-out visitor, When they browse, Then only public surfaces render (listings, project pages); every authenticated surface redirects to sign-in.

The founder ruling controls the result: AT-001.21, AT-001.22, AT-001.23 and AT-001.40 become green at both tiers with their proof boundaries stated. AT-001.24 remains capability-pending at both tiers.

## Usage (caller’s view)

An application caller requests a domain resource through an edge function. It supplies neither a table name nor its supposed account type, membership, or assignment.

The authenticated endpoint is `tenant-read`. Its closed request vocabulary covers the existing data:

```ts
// Future application call site; no src/ implementation ships in this item.
const answer = await edge.invoke("tenant-read", {
  kind: "project",
  projectId,
});

if (answer.status === 404) {
  showUnavailable();
} else if (answer.status === 200) {
  showProject(answer.value);
}
```

An anonymous caller uses a separate endpoint with a deliberately smaller projection:

```ts
// Future public-page caller.
const answer = await edge.invoke("public-project", { projectId });

// A successful value contains exactly projectId and projectName.
```

An acceptance body names the same domain target when comparing the application path with direct database probing:

```ts
// Integration call site, after creating and confirming the actors.
const target = { kind: "project", projectId: projectA.id } as const;

expect(await sut.projectAssignment(projectA.id)).toEqual(projectA);

const ownerSession = await signInNow(sut, ownerEmail);
expect(await sut.readTenant(ownerSession, target))
  .toEqual({ kind: "visible", value: projectA });

const foreignSession = await signInNow(sut, foreignEmail);
const denied = await sut.readTenantRaw(foreignSession, target);
const absent = await sut.readTenantRaw(foreignSession, {
  kind: "project",
  projectId: absentProjectId,
});

expect(denied.status).toBe(404);
expect(denied.text).toBe(absent.text);
expect(denied.status).toBe(absent.status);

const direct = await sut.dataApiReadAsCaller(foreignSession, {
  kind: "project",
  projectId: projectA.id,
});
expect(direct).toMatchObject({ status: 200, rows: [] });
```

`edge.invoke` illustrates the eventual consumer; this item does not introduce a frontend client library. The concrete server and SUT signatures below implement these operations.

For a later database resource, the developer adds its schema migration and catalog declaration, then generates its visibility migration. A missing declaration fails the existing tenant acceptance test in CI.

## Shape

### The catalog owns the declaration

Use one append-only declaration module, `supabase/visibility/catalog.ts`, containing the initial classifications and subsequent visibility amendments. It is build input, not a runtime database table.

The initial declaration describes unit 1. Unit 2 appends grants to that declaration. Applied migration history remains immutable; there is no runtime “unit” flag.

Each existing table has exactly one classification. The final policy set is:

| Table | Scope and binding | Allowed viewers |
|---|---|---|
| `accounts` | Account: `id` | That account; platform admin |
| `organizations` | Organisation: `id` | NGO member of that organisation; platform admin |
| `org_memberships` | Organisation: `org_id` | NGO member of that organisation; platform admin |
| `acknowledgments` | Account: `account_id` | That account; platform admin |
| `volunteer_profiles` | Account: `account_id` | That account; platform admin |
| `projects` | Project: `org_id`, `assigned_volunteer_id` | Owning NGO member; assigned volunteer of type `volunteer`; platform admin |

Acknowledgments remain personal records. Project assignment grants no access to the parent organisation, its membership, or another person’s acknowledgment or volunteer profile.

Accounts and profiles receive narrowly defined own-account reads rather than remaining inaccessible to administrators. This makes the administrator’s cross-account reach explicit across all six tables.

```ts
type AccountScope = {
  kind: "account";
  accountColumn: "id" | "account_id";
  readers: readonly ("self" | "platformAdmin")[];
};

type OrganizationScope = {
  kind: "organization";
  organizationColumn: "id" | "org_id";
  readers: readonly ("ngoMember" | "platformAdmin")[];
};

type ProjectScope = {
  kind: "project";
  organizationColumn: "org_id";
  assigneeColumn: "assigned_volunteer_id";
  readers: readonly (
    | "ngoMember"
    | "assignedVolunteer"
    | "platformAdmin"
  )[];
};

type TableVisibility =
  | {
      kind: "unreachable";
      reason: string;
    }
  | {
      kind: "isolated";
      scope: AccountScope | OrganizationScope | ProjectScope;
    };

type PublicProjectDeclaration = {
  source: "projects";
  eligibility: "all-existing-projects-until-REQ-010";
  fields: {
    projectId: "id";
    projectName: "name";
  };
};

type Catalog = {
  tables: Readonly<Record<string, TableVisibility>>;
  publicProject: PublicProjectDeclaration;
};
```

A declaration cannot grant assigned-volunteer access to an account or organisation scope. The validator additionally verifies table and column existence, identifier spelling, duplicate grants, supported key shapes, and projection fields against the schema inventory. No arbitrary SQL fragment or JavaScript callback is accepted, per `encode-lessons-in-structure`.

The initial entries are concrete:

```ts
export const initialCatalog = {
  tables: {
    accounts: {
      kind: "isolated",
      scope: {
        kind: "account",
        accountColumn: "id",
        readers: ["self"],
      },
    },
    organizations: {
      kind: "isolated",
      scope: {
        kind: "organization",
        organizationColumn: "id",
        readers: ["ngoMember"],
      },
    },
    org_memberships: {
      kind: "isolated",
      scope: {
        kind: "organization",
        organizationColumn: "org_id",
        readers: ["ngoMember"],
      },
    },
    acknowledgments: {
      kind: "isolated",
      scope: {
        kind: "account",
        accountColumn: "account_id",
        readers: ["self"],
      },
    },
    volunteer_profiles: {
      kind: "isolated",
      scope: {
        kind: "account",
        accountColumn: "account_id",
        readers: ["self"],
      },
    },
    projects: {
      kind: "isolated",
      scope: {
        kind: "project",
        organizationColumn: "org_id",
        assigneeColumn: "assigned_volunteer_id",
        readers: ["ngoMember"],
      },
    },
  },
  publicProject: {
    source: "projects",
    eligibility: "all-existing-projects-until-REQ-010",
    fields: {
      projectId: "id",
      projectName: "name",
    },
  },
} as const satisfies Catalog;

// Appended only when unit 2 begins.
export const secondRevision = {
  addPlatformAdminTo: [
    "accounts",
    "organizations",
    "org_memberships",
    "acknowledgments",
    "volunteer_profiles",
    "projects",
  ],
  addAssignedVolunteerTo: ["projects"],
} as const;
```

The revision validator allows each amendment only on a compatible declared table. It rejects an amendment that names a missing table or repeats an existing grant.

### Derivation is mechanical and reviewable

`supabase/visibility/compile.ts` lowers each scope to a small expression tree:

```ts
type Predicate =
  | { op: "self"; column: string }
  | { op: "ngoMember"; column: string }
  | { op: "assignedVolunteer"; column: string }
  | { op: "platformAdmin" }
  | { op: "any"; terms: readonly Predicate[] };
```

There are four leaf operations, with the following exact interpretations:

| Catalog operation | SQL lowering | TypeScript conformance meaning |
|---|---|---|
| `self(column)` | `column = (select auth.uid())` | Non-null viewer ID equals row’s account ID |
| `ngoMember(column)` | `public.viewer_is_org_member(column)` | Viewer is NGO and has membership in row’s organisation |
| `assignedVolunteer(column)` | `column = (select auth.uid()) AND (select public.viewer_is_volunteer())` | Viewer is volunteer and equals non-null assignee |
| `platformAdmin` | `(select public.viewer_is_platform_admin())` | Viewer’s account type is `platform_admin` |
| `any(terms)` | Parenthesized SQL `OR` | At least one term is true |

SQL null comparisons are lowered to “not allowed” in the TypeScript evaluator. An unauthenticated viewer never satisfies any operation.

For example, the final `projects` entry lowers to:

```text
any(
  ngoMember(org_id),
  assignedVolunteer(assigned_volunteer_id),
  platformAdmin
)
```

That same expression is consumed by three outputs:

1. The SQL emitter generates policies, required helper definitions and privilege statements.
2. The TypeScript emitter generates a pure conformance evaluator.
3. The case builder derives the applicable resource probes and actor relationships for each acceptance body.

```ts
type Compilation = {
  migrationSql: string;
  runtimeModule: string;
  conformanceModule: string;
};

export function compileRevision(
  previous: Catalog | null,
  next: Catalog,
): Compilation {
  throw new Error("not implemented");
}

export function checkGeneratedFiles(
  sources: readonly Catalog[],
  files: ReadonlyMap<string, string>,
): readonly string[] {
  throw new Error("not implemented");
}
```

The CLI is:

```text
bun supabase/visibility/generate.ts --write
bun supabase/visibility/generate.ts --check
```

`--write` emits deterministic artifacts in stable table/reader order and writes each file through a temporary sibling followed by rename. `--check` compares expected bytes without writing. A crash between files leaves a detectable mismatch; rerunning converges. It never updates an applied migration silently, per `make-operations-idempotent`.

Generated files carry their catalog revision and source digest. The digest is provenance, not proof: conformance checks compare generated content and effective schema state.

The generated runtime module contains domain target descriptors, request decoding, fixed projections, public eligibility and the refusal representation. It contains no tenant evaluator. The generated evaluator lives under `supabase/visibility/`, outside the edge-function import graph.

### Acceptance bodies derive coverage, not their own correctness

The catalog case builder enumerates resources and their applicable owner, member, assignee, admin and outsider probes. It cannot decide whether an acceptance ID is green, pending, or unregistered.

```ts
type VisibilityId =
  | "AT-001.21"
  | "AT-001.22"
  | "AT-001.23"
  | "AT-001.40";

type CaseRelation =
  | "rightfulOwner"
  | "foreignNgo"
  | "assignedVolunteer"
  | "unassignedVolunteer"
  | "platformAdmin"
  | "absent";

type VisibilityCase = {
  resource: TenantKind;
  relation: CaseRelation;
  expected: "visible" | "notVisible";
};

export function casesFor(
  catalog: Catalog,
  id: VisibilityId,
): readonly VisibilityCase[] {
  throw new Error("not implemented");
}
```

Each acceptance ID still has one literal `atTest` registration. Its body iterates catalog-derived cases.

Independent assertions anchor the compiler to the specification: foreign NGOs are denied; an assigned volunteer is admitted only to the assigned project; assignment does not grant organisation access; an administrator reaches both tenants. These assertions do not import expected booleans from the evaluator. Removing an administrator clause cannot make the tests quietly accept administrator denial.

Compiler selftests separately pin the four primitive meanings. Live differential checks compare the emitted evaluator’s expected row IDs with actual PostgREST results. They provide drift evidence, not an independent replacement for those acceptance assertions.

### Domain interfaces and response shape

The domain model uses existing row shapes where they already fit. The acknowledgment request is a collection keyed by its acting account, avoiding a fabricated organization ownership key.

```ts
type TenantTarget =
  | { kind: "account"; accountId: string }
  | { kind: "organization"; organizationId: string }
  | {
      kind: "membership";
      organizationId: string;
      accountId: string;
    }
  | { kind: "acknowledgments"; accountId: string }
  | { kind: "volunteerProfile"; accountId: string }
  | { kind: "project"; projectId: string };

type TenantKind = TenantTarget["kind"];

type TenantValues = {
  account: {
    id: string;
    accountType: "ngo" | "volunteer" | "platform_admin";
  };
  organization: {
    id: string;
    name: string;
  };
  membership: {
    organizationId: string;
    accountId: string;
    role: "admin" | "member";
  };
  acknowledgments: readonly {
    accountId: string;
    kind: string;
    acknowledgedAt: string;
    ip: string;
    textVersion: string;
    signerName: string;
    signerTitle: string;
    authorityAttestation: string;
  }[];
  volunteerProfile: {
    accountId: string;
    githubHandle: string;
    topLanguages: readonly string[];
    repositoryCount: number;
    contributionSummary: string;
    importedAt: string;
  };
  project: {
    id: string;
    organizationId: string;
    name: string;
    assignedVolunteerId: string | null;
  };
};

type TenantAnswer<K extends TenantKind> =
  | { kind: "visible"; value: TenantValues[K] }
  | { kind: "notVisible" }
  | { kind: "signInRequired" }
  | { kind: "unavailable" };

type PublicProject = {
  projectId: string;
  projectName: string;
};
```

Wire rows, PostgREST filters, bearer tokens and SQL names remain inside adapters, per `boundary-discipline`. The finite target union is not a general table-query endpoint.

The shipped orchestration core has a deliberately narrower database result than PostgREST itself:

```ts
type CallerRead<K extends TenantKind> =
  | { kind: "rows"; value: TenantValues[K] | null }
  | { kind: "signInRequired" }
  | { kind: "unavailable" };

type ReadPort = {
  read<K extends TenantKind>(
    target: Extract<TenantTarget, { kind: K }>,
  ): Promise<CallerRead<K>>;
};

export async function readTenant<K extends TenantKind>(
  target: Extract<TenantTarget, { kind: K }>,
  port: ReadPort,
): Promise<TenantAnswer<K>> {
  throw new Error("not implemented");
}
```

The port is request-scoped and already bound to the JWT validated through `resolveCaller`. It cannot report “exists but forbidden”; PostgREST has already collapsed that distinction into no visible rows.

The orchestration is:

```text
Resolve live caller.
Validate the closed target request.
Issue one fixed PostgREST query as that caller.
Parse successful rows into the domain value.
Map no rows to notVisible.
Serialize notVisible using the single refusal.
```

For acknowledgments, zero rows becomes `notVisible`; successful reads return the visible collection. There is no separate account-existence lookup.

```ts
export const TENANT_NOT_FOUND = {
  status: 404,
  body: {
    ok: false,
    reason: "No such resource is visible.",
  },
} as const;

export function serializeTenantAnswer<K extends TenantKind>(
  answer: TenantAnswer<K>,
): {
  status: number;
  text: string;
  contentType: "application/json";
} {
  throw new Error("not implemented");
}
```

The serializer has one `notVisible` branch and always returns the same serialized bytes. The refusal is returned, never thrown. Invalid requests answer 400 before target reads; invalid sessions answer 401; infrastructure failures answer a fixed 502 without forwarding upstream messages.

Read denials use 404 to avoid distinguishing absence from forbidden existence. Existing writes retain 403 and their operation-specific reasons.

### Public access is separately declared

The public endpoint calls one service-role-only RPC returning only project ID and name. It receives no private workspace fields and performs no second lookup.

The generated shipped predicate is `publicProjectEligible`. Its catalog selection currently means every existing project is eligible. Its header names REQ-010 as the owner of the eventual lifecycle rule. No visibility column is introduced.

```ts
export function publicProjectEligible(
  project: { id: string; name: string },
): boolean {
  throw new Error("not implemented");
}

export function publicProjectView(
  project: { id: string; name: string },
): PublicProject {
  throw new Error("not implemented");
}
```

Generation expands the projection into explicit assignments:

```text
projectId ← project.id
projectName ← project.name
```

There is no object spread. Public existence is deliberately observable. This RPC survives as a privileged read because `anon` has no table privileges; it is a single target read and therefore also the last read.

### Access patterns and state

| Access pattern | Structure and execution |
|---|---|
| Keyed account, organisation, profile or project read | Catalog-generated fixed query; existing primary key; one PostgREST call |
| Membership read | Existing `(org_id, account_id)` key; organisation membership checked by definer helper |
| Personal acknowledgments | Existing `account_id, kind` index; deterministic ordering by timestamp and ID |
| Organisation project listing | Existing `projects_org_id_idx`; RLS filters rows |
| Volunteer project listing | Direct assignee comparison plus viewer type; no separately maintained assignment map |
| Administrator listing | Caller-only account-type helper in an uncorrelated subquery; no organisation enumeration |
| Public project read | Primary-key lookup through the narrow public-projection RPC |
| Catalog lookup | Immutable table-keyed object; no runtime cache or mutable registry |

There is no shared authorization cache. Each request holds its own caller token and read port. Database statements observe current membership and assignment under ordinary statement snapshots. Per-test injected answers are local immutable values; tests do not share a permission map, per `separate-before-serializing-shared-state`.

### Module map and interface depth

| Module | Responsibility |
|---|---|
| `supabase/visibility/catalog.ts` | Initial declaration and append-only amendments |
| `supabase/visibility/compile.ts` | Closed predicate lowering, SQL/TypeScript emission and case derivation |
| `supabase/visibility/generate.ts` | Read/write CLI shell |
| `supabase/visibility/conformance.generated.ts` | Derived evaluator for tooling only |
| `supabase/functions/_shared/visibility.generated.ts` | Domain descriptors, projections, eligibility and refusal representation |
| `supabase/functions/_shared/tenant-read.ts` | Framework-free read orchestration and response serialization |
| `supabase/functions/tenant-read/index.ts` | Session gate, request boundary and caller-token PostgREST port |
| `supabase/functions/public-project/index.ts` | Anonymous request boundary and narrow public RPC |
| Two new migrations | Unit 1 normalization/base policy set; unit 2 additional readers and assignment guard |
| `tests/at/suites/req-001/_catalog-conformance.ts` | Static and live schema comparison; catalog-derived probe execution |

The ordinary caller learns one target union and one result union. The implementation hides privilege ordering, SQL helpers, token forwarding, policy evaluation, database field names and denial serialization. A new resource cannot demand that callers assemble authorization facts.

The runtime trace needs the endpoint, orchestration module and generated descriptor module; SQL policies are the enforcement boundary. Build tooling is outside that runtime chain, per `laziness-protocol` and `minimize-reader-load`.

## Synthesis decision

## Migration sketch

The following SQL illustrates generated output. Routine validation bodies remain marked. Actual migrations receive fresh, unique timestamps.

### Unit 1: normalize privileges and establish base readers

The migration header states: client roles receive no privileges by default; isolated tables grant only `SELECT` to `authenticated`; `anon` receives nothing; policy helpers answer only about `auth.uid()`, use `viewer_` names and an empty search path, and are executable by `authenticated`. Existing writer RPCs remain service-role-only. No service-role table privilege is widened, and no table uses forced RLS.

```sql
begin;

revoke all privileges on table
  public.accounts,
  public.organizations,
  public.org_memberships,
  public.acknowledgments,
  public.volunteer_profiles,
  public.projects
from public, anon, authenticated;

grant select on table
  public.accounts,
  public.organizations,
  public.org_memberships,
  public.acknowledgments,
  public.volunteer_profiles,
  public.projects
to authenticated;

create function public.viewer_is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.org_memberships m
      join public.accounts a on a.id = m.account_id
     where m.org_id = p_org_id
       and m.account_id = (select auth.uid())
       and a.account_type = 'ngo'::public.account_type
  );
$$;

revoke execute on function public.viewer_is_org_member(uuid)
  from public, anon, authenticated;
grant execute on function public.viewer_is_org_member(uuid)
  to authenticated;

create policy visibility_accounts_self
on public.accounts for select to authenticated
using (id = (select auth.uid()));

create policy visibility_organizations_member
on public.organizations for select to authenticated
using (public.viewer_is_org_member(id));

create policy visibility_memberships_member
on public.org_memberships for select to authenticated
using (public.viewer_is_org_member(org_id));

create policy visibility_acknowledgments_self
on public.acknowledgments for select to authenticated
using (account_id = (select auth.uid()));

create policy visibility_profiles_self
on public.volunteer_profiles for select to authenticated
using (account_id = (select auth.uid()));

create policy visibility_projects_member
on public.projects for select to authenticated
using (public.viewer_is_org_member(org_id));

create function public.read_public_project(p_project_id uuid)
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name
    from public.projects p
   where p.id = p_project_id;
$$;

revoke execute on function public.read_public_project(uuid)
  from public, anon, authenticated;
grant execute on function public.read_public_project(uuid)
  to service_role;

notify pgrst, 'reload schema';

commit;
```

RLS is already enabled on all six tables. Static and live conformance require it to remain enabled.

Removing `authenticated` INSERT on `accounts` changes the historical local proof in `loop/items/AI4DEV-57/proof-local.ts`, which explicitly expected an RLS insert error. The current acceptance bodies do not pin that behavior. Preserve the historical artifact and record that its privilege-layer premise was superseded; do not preserve an unnecessary write privilege for it.

### Unit 2: assignment boundary and additional readers

Before installing the assignment guard, the migration checks existing non-null assignments for missing or non-volunteer accounts. It fails with an operator-readable diagnostic if any exist; it does not silently clear or replace assignments.

```sql
begin;

do $$
begin
  -- TODO: reject existing assignments whose account is not a volunteer.
end;
$$;

create function public.project_assignee_must_be_volunteer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type public.account_type;
begin
  if new.assigned_volunteer_id is null then
    return new;
  end if;

  select a.account_type into v_type
    from public.accounts a
   where a.id = new.assigned_volunteer_id;

  if v_type is null then
    raise exception
      'projects refuses assignment: no account has completed signup'
      using errcode = '23503';
  end if;

  if v_type <> 'volunteer'::public.account_type then
    raise exception
      'projects refuses assignment: assigned accounts must be volunteers'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.project_assignee_must_be_volunteer()
  from public, anon, authenticated;

create trigger projects_assignee_must_be_volunteer
before insert or update on public.projects
for each row
execute function public.project_assignee_must_be_volunteer();

create function public.viewer_is_volunteer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
     where a.id = (select auth.uid())
       and a.account_type = 'volunteer'::public.account_type
  );
$$;

create function public.viewer_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
     where a.id = (select auth.uid())
       and a.account_type = 'platform_admin'::public.account_type
  );
$$;

revoke execute on function public.viewer_is_volunteer()
  from public, anon, authenticated;
revoke execute on function public.viewer_is_platform_admin()
  from public, anon, authenticated;

grant execute on function public.viewer_is_volunteer()
  to authenticated;
grant execute on function public.viewer_is_platform_admin()
  to authenticated;

create policy visibility_projects_assignee
on public.projects for select to authenticated
using (
  assigned_volunteer_id = (select auth.uid())
  and (select public.viewer_is_volunteer())
);

create policy visibility_accounts_admin
on public.accounts for select to authenticated
using ((select public.viewer_is_platform_admin()));

create policy visibility_organizations_admin
on public.organizations for select to authenticated
using ((select public.viewer_is_platform_admin()));

create policy visibility_memberships_admin
on public.org_memberships for select to authenticated
using ((select public.viewer_is_platform_admin()));

create policy visibility_acknowledgments_admin
on public.acknowledgments for select to authenticated
using ((select public.viewer_is_platform_admin()));

create policy visibility_profiles_admin
on public.volunteer_profiles for select to authenticated
using ((select public.viewer_is_platform_admin()));

create policy visibility_projects_admin
on public.projects for select to authenticated
using ((select public.viewer_is_platform_admin()));

notify pgrst, 'reload schema';

commit;
```

The assignment trigger and the read conjunct derive the account-type requirement from the same `assignedVolunteer` catalog operation. The existing single-seat trigger stays intact. Reassigning the same volunteer remains idempotent; assigning a different volunteer to an occupied seat still fails.

No product path changes account types today. The policy still checks current type, so a later operator type change cannot retain volunteer read authority accidentally.

## Read surfaces

| Surface | Inputs and output | Refusal | Acceptance use |
|---|---|---|---|
| `POST /functions/v1/tenant-read` | Caller JWT and closed `TenantTarget`; returns its domain value | One 404 body for absent or invisible data; 401 for invalid session; fixed 502 for unavailable backend | AT-001.21, AT-001.22, AT-001.23, AT-001.40 |
| `POST /functions/v1/public-project` | `{ projectId }`; returns exactly project ID and name | 404 for absent/ineligible project; fixed 502 for backend failure | AT-001.22; supporting API evidence for pending AT-001.24 |
| Direct PostgREST keyed GET | Catalog-derived fixed table, projection and key filter; caller’s JWT | HTTP 200 with `[]` for foreign and absent identifiers | All four green IDs |
| Direct PostgREST listing GET | Catalog-derived projection and deterministic key ordering; caller’s JWT | HTTP 200 with only visible rows | Cross-tenant completeness and project scope |
| Direct PostgREST anonymous GET | Same six table probes with anon key and no user bearer | Privilege refusal; require 401 and permission-denied message | AT-001.21 supporting posture check; pending AT-001.24 API evidence |
| `read_public_project(uuid)` RPC | Service-role-only fixed projection source | Empty result for absent project | Internal public endpoint dependency |

`tenant-read` declares `verify_jwt = true`; `public-project` declares `verify_jwt = false`. Both use POST, matching the existing shared CORS method policy.

The caller-token port checks exact successful status and response shape. It never turns a 401, permission error, parse failure or outage into an empty collection.

## Proof map

A loop green proves shipped handler behavior, projection and source conformance. It does not prove that PostgreSQL admitted or rejected an actor. An integration green adds real JWT, PostgREST, grants and policy evidence.

The existing manifest format has no field for narrative coverage. Keep its schema unchanged; record these boundaries in body evidence and the adjacent acceptance notes.

| ID | Tier | Body and layer proved | Positive control | Exact manifest declaration |
|---|---|---|---|---|
| AT-001.21 | Loop | Catalog-derived resource cases drive shipped orchestration with injected no-row results; compare refusal bytes for foreign/absent cases; verify fixed query targeting; run static catalog and generation checks | Inject a visible value for each resource and require the shipped success projection | `"AT-001.21"` in `green` |
| AT-001.21 | Integration | Establish both tenants with operator read-backs; each owner reads its rows; foreign/absent probes compare raw edge responses and direct `200 []`; listings exclude foreign rows; live catalog check | Each isolated table has an existing row visible to its rightful caller through both paths | `"AT-001.21"` in `green` |
| AT-001.22 | Loop | Shipped project handler maps no rows to the single refusal; public handler applies generated eligibility and explicit projection | Visible private project result succeeds; public result contains exactly the declared fields | `"AT-001.22"` in `green` |
| AT-001.22 | Integration | Unassigned volunteer receives private 404 and direct `200 []`; absent ID matches; anonymous and volunteer public requests succeed without private fields | Owning NGO reads the same private project; public endpoint returns that project | `"AT-001.22"` in `green` |
| AT-001.23 | Loop | Shipped handler passes through a visible assigned-project result, preserves its identity, and refuses injected no-row results for another project and parent organisation | Exact project value succeeds; repeat read returns identical value | `"AT-001.23"` in `green` |
| AT-001.23 | Integration | Assigned volunteer reads project A; cannot read sibling project B in the same NGO or project C in another NGO; cannot read parent organisation/membership; listing contains exactly A; exercise assignment trigger | Volunteer reads A through edge and direct GET; NGO reads B; valid assignment succeeds after wrong-type probes | `"AT-001.23"` in `green` |
| AT-001.40 | Loop | Catalog enumerates all resources; shipped handler returns supplied visible values from both tenants without requiring caller memberships; compiler anchors require admin branches | Exact distinct values from A and B survive; an injected no-row response still refuses | `"AT-001.40"` in `green` |
| AT-001.40 | Integration | Provisioned administrator with no memberships reads both NGOs, their projects and the account-owned records; generated differential matrix matches actual row visibility | All requested seeded rows return; non-admin repeats a foreign read and is refused | `"AT-001.40"` in `green` |
| AT-001.24 | Loop | Exercise shipped anonymous/private and public API handling, then throw the named capability; no render or redirect claim | Public project projection succeeds; missing-session private request performs no tenant read | `{"kind":"capability-pending","capabilities":["ui.logged-out-surface-rendering"]}` |
| AT-001.24 | Integration | Verify anonymous private-edge refusal, anonymous table privilege refusal and public projection, then throw the named capability | Public endpoint returns seeded project; owner can read private project | `{"kind":"capability-pending","capabilities":["ui.logged-out-surface-rendering"]}` |

AT-001.24’s preliminary assertions run before the capability throw. An API regression therefore produces an unexpected failure, not the expected pending result.

AT-001.21 and AT-001.22 retain `surface: "ui"` to identify their deferred browser wiring. AT-001.24 also uses that tag. No route registry ships.

## Harness changes

### `_contract.ts`

Add typed product reads and separately named evidence reads:

```ts
type RawReadEvidence = {
  status: number;
  text: string;
  contentType: string | null;
};

type DataApiProbe =
  | TenantTarget
  | { kind: "listing"; resource: TenantKind };

type DataApiEvidence =
  | {
      status: 200;
      rows: readonly unknown[];
      text: string;
    }
  | {
      status: number;
      rows: null;
      text: string;
    };

type TenantReadSut = {
  readTenant<K extends TenantKind>(
    session: Session | null,
    target: Extract<TenantTarget, { kind: K }>,
  ): Promise<TenantAnswer<K>>;

  readTenantRaw(
    session: Session | null,
    target: TenantTarget,
  ): Promise<RawReadEvidence>;

  publicProject(
    projectId: string,
  ): Promise<
    | { kind: "visible"; value: PublicProject }
    | { kind: "notVisible" }
    | { kind: "unavailable" }
  >;

  dataApiReadAsCaller(
    session: Session | null,
    probe: DataApiProbe,
  ): Promise<DataApiEvidence>;

  publicSchemaCatalog(): Promise<SchemaEvidence>;
};
```

Raw HTTP evidence is intentionally harness-only. Product callers receive domain answers.

Retain existing operator read-backs. Add a narrowly named `provisionPlatformAdminForUserAsOperator(accountId)` method so these integration bodies can register, confirm by mail and sign in an administrator before provisioning its account type. The existing `provisionPlatformAdmin` method remains for its existing callers.

Correct the comment claiming that memberships reach no Data API role. Extend `AssignVolunteerOutcome` with `not-a-volunteer-account`, classified by message first.

### `_fixture.ts`

Keep the existing maps and acknowledgment array as storage. Do not add a visibility map, SQL mirror, policy evaluator or simulated PostgREST reader.

The new database-backed SUT methods throw their named `CapabilityPending` values at loop. Loop acceptance bodies instead import the shipped orchestration and supply local `ReadPort` functions returning the precise boundary answer under examination.

The body may obtain a domain value from existing fixture storage for its positive control. It must never choose visible rows by filtering that storage on memberships or assignments.

Public projection can use the existing project store because eligibility and projection are shipped TypeScript. Any new local state must be cleared at teardown.

### `_live.ts`

Implement new viewer methods using the private session-token map and `tokensOf`. Preserve operator read-backs as operator evidence.

Add read-as-caller helper `restGetAsCaller` in `tests/at/harness/live-stack.ts`:

```ts
export async function restGetAsCaller(
  stack: Stack,
  path: string,
  accessToken: string | null,
): Promise<RawReadEvidence> {
  throw new Error("not implemented");
}

export async function functionPostRaw(
  stack: Stack,
  name: string,
  body: unknown,
  accessToken: string | null,
): Promise<RawReadEvidence> {
  throw new Error("not implemented");
}
```

The REST helper always sends `apikey: stack.anonKey`. With a session it sends `Authorization: Bearer <accessToken>`; without one it sends no user authorization header. It has no service-role fallback.

`functionPostRaw` preserves the response text before any parsing. It does not change `functionPost`, which existing tests rely on.

Tenant integration bodies sign an actor in immediately before its probe group, and again before subsequent groups following slower setup. Expiry remains a visible 401; it is not repaired by interpreting the response as denial.

Correct the project reachability comment. New assignment refusal classification follows the existing message-first, SQLSTATE-second pattern.

### `_integration.ts`

Add `at00121`, `at00122`, `at00123`, `at00140` and `at00124`, using `registerConfirmAndSignIn`.

Use existing operator organization, membership, project and assignment operations for Givens. Volunteers use the existing explicit operator GitHub identity setup followed by deployed signup completion; no live GitHub service is invented.

Each body asserts seeded rows before probing. Generated resource coverage invokes those existing read-backs through an exhaustive adapter switch. Every branch must produce evidence; there are no optional callbacks that allow an unhandled resource to disappear.

An administrator’s unfiltered listing can legitimately include rows created by other tests. Assert inclusion of the body’s seeded rows and compare the full listing with an operator snapshot when testing exact differential equality. Ordinary actor listings use fresh identities with exact expected sets.

Correct adjacent comments claiming that no read policies or client-readable memberships exist. AT-001.17’s anonymous privilege assertion remains unchanged.

### `d-tenant-isolation.test.ts`

Replace the four green IDs with per-tier body maps. Keep literal registrations so the acceptance bijection scanner sees every ID.

Loop bodies grade the shipped handler and generated runtime projections. Catalog compiler checks are supporting assertions, never substitutes for those shipped-code assertions.

AT-001.24 uses explicit per-tier procedures ending in:

```ts
throw new CapabilityPending(["ui.logged-out-surface-rendering"]);
```

### `_pending.ts` and `expected/req-001.json`

Unit 1 removes `D5_L1` and moves AT-001.21 and AT-001.22 to both green arrays.

Unit 2 moves AT-001.23 and AT-001.40 to both green arrays. AT-001.24 changes to the exact capability declaration at both tiers. Remove `D5_L2` from the generic unlanded-leaf map because no registration uses it; retain explicit prose naming the outstanding UI capability.

Final totals, if all unrelated declarations remain unchanged:

- Loop: 25 green, 12 red.
- Integration: 21 green, 16 red.

### Static and live conformance

`_catalog-conformance.ts` follows the source-scan precedent. AT-001.21 calls the static half at loop, ensuring ordinary CI runs it.

The static scanner reads migrations in order and checks effective state, rather than finding one historical grant or policy and declaring success. It recognizes table creation/removal, RLS changes, grants/revokes, policies and relevant helper definitions. Dollar-quoted function bodies and comments are separated from top-level statements. Unsupported visibility-affecting syntax fails closed with the file and statement named.

Checks include:

- Every live-declared `public` table has exactly one catalog entry.
- Every entry’s binding columns exist.
- Every isolated table has RLS, exactly the declared client privileges and generated SELECT policies.
- Unreachable entries have zero effective client privileges.
- No unexpected policy, client write privilege or unconditional policy exists.
- Every policy helper has the prescribed prefix, arguments, security mode, search path and execute grants.
- No generated file is stale.
- No edge module imports the tooling evaluator.

The integration half reads `pg_class`, `pg_namespace`, `pg_attribute`, `pg_policies`, `pg_proc` and effective `has_table_privilege`/column privilege results. It includes ordinary and partitioned public tables, verifies no forced RLS, and compares the exact declared policy set. It also checks that the service role gained no direct write privilege.

Add `tests/at/harness/visibility-catalog.selftest.ts` for missing tables, dropped grants, later `DISABLE ROW LEVEL SECURITY`, unexpected policies, `USING (true)`, unsafe helper arguments, stale generation and correlated compiler mistakes.

These are source analysis, catalog inspection and pure compiler tests. They introduce no sentinel, registered fault, vendor stand-in or fixture world. Existing harness infrastructure remains unchanged.

## Unit split

### Unit 1: cross-organisation denial and no existence oracle

Land the initial catalog, generator, base migration, two endpoints, shipped orchestration, raw helpers and both conformance checks.

Base access admits own-account and NGO-member reads. Project denial has a real owning-NGO positive control; it does not depend on the later assigned-volunteer branch. The public project projection lands here because AT-001.22 requires it.

AT-001.21 and AT-001.22 become green at both tiers. AT-001.23, AT-001.40 and AT-001.24 retain their existing pending declarations at this boundary.

Verify typecheck, acceptance bijection, generator check, harness selftests and both `--expect` tier runs before beginning unit 2.

### Unit 2: assigned-volunteer scope, administrator reach and declared UI gap

Append the catalog amendment and generate the second migration. Add the volunteer-type assignment trigger, assignee policy and six administrator policies.

Implement the remaining bodies. Move AT-001.23 and AT-001.40 to green and AT-001.24 to its named capability shape at both tiers. Re-run unit 1’s proofs against the enlarged policy set.

The implementation executor builds against this fixed contract. New authorization choices discovered during implementation return to design instead of becoming handwritten policy exceptions.

## Tradeoffs accepted

- We accept a small compiler in exchange for one authored declaration governing SQL, TypeScript conformance and resource coverage.
- We accept that loop greens cover shipped response behavior rather than isolation in exchange for avoiding a fixture implementation of PostgreSQL.
- We accept generated SQL checked into migration history in exchange for reviewable, reproducible deployment artifacts.
- We accept all existing projects being publicly identifiable by ID and name in exchange for honoring the ruling without inventing lifecycle state.
- We accept own-account reads of accounts and profiles in exchange for an explicit, consistent administrator policy across the full schema.
- We accept a closed generic tenant endpoint in exchange for avoiding six nearly identical handlers; it exposes no arbitrary filters, joins or table names.
- We accept a constrained static SQL scanner in exchange for CI enforcement without a running database; unsupported security-changing syntax fails instead of being guessed.
- We accept that the catalog does not independently prove its own semantic intent in exchange for deriving implementation and coverage; literal acceptance assertions remain independent anchors.

## Alternatives considered

- **A catalog that merely lists protected tables:** it hides inventory bookkeeping but leaves developers coordinating SQL, TypeScript and test matrices manually. Its public authoring interface is shallow because adding one resource still requires rediscovering every enforcement detail.
- **A runtime authorization catalog queried by generic SECURITY DEFINER functions:** it hides more policy compilation but exposes mutable security state and generic privileged query machinery. Migration data changes could alter visibility without an ordinary policy diff.
- **A TypeScript interpreter inside every edge handler:** it offers a simple permission call but requires privileged data lookup or duplicated scope acquisition before reading. It exposes more orchestration and violates the ruling that tenant reads enforce through caller-token SQL policies.

## Open questions and risks

- Does the lead accept the derived TypeScript evaluator being restricted to conformance tooling as the reconciliation between direction C and the prohibition on a second runtime tenant rule?
- Will the future public-project lifecycle requirement replace the current eligibility declaration before introducing projects whose identity must remain private?
- Should future operator account-type changes be prohibited while volunteer assignments exist, or should those changes clear assignments transactionally?
- Does direct PostgREST accept a revoked but unexpired JWT on this stack, and should a later session-revocation change close that interval beyond the existing edge `resolveCaller` gate?
- At realistic project volumes, does the volunteer listing need an assignee index, or do measured query plans justify retaining the current schema?
- Will later storage and external-task requirements adopt equivalent catalog declarations for signed URLs and external reads, which the public-table inventory cannot discover?

## Not built here

The existing rows are explicit stand-ins for the ownership boundaries named by the acceptance criteria. A green does not claim that the following resources exist or have been exercised:

| Deferred surface | Owning requirement |
|---|---|
| Drafts | REQ-003 |
| Ledger and fuel transactions | REQ-006 |
| Files, reference files and storage access | REQ-032 |
| Comment threads | REQ-015 |
| Dashboards and their aggregations | REQ-013/014 |
| External tasks | REQ-026 |
| Listings, public pages and project lifecycle | REQ-010/011 |
| Authenticated route guards, sign-in redirects and browser driver | Auth-screens leaf |

Later database resources must join the catalog and provide owner, foreign-NGO, administrator, absent-ID and applicable assignment probes. Storage URLs and external task access need the same matrix at their own read boundaries.

No `src/` change, route registry, JWT account-type claim, collaborator seat, project creation flow, matching workflow or shared authorization cache ships here. Documentation changes go through the project’s `/doc-sync fold` workflow after each change bundle.

## Next implementation step

Build the initial catalog compiler and AT-001.21’s static conformance arm first, with independent fixtures proving that an undeclared public table, an extra permissive policy and a stale generated artifact all fail before generating unit 1’s migration.