/**
 * THE ORACLE FOR THE CATALOG CONFORMANCE RULE.
 *
 * `tests/at/suites/req-001/_catalog-conformance.ts` is what makes this leaf's isolation claim
 * self-correcting: it fails when a table exists in `public` and nobody has classified it, when a
 * table declared unreachable is reachable, and when a table declared isolated carries a policy that
 * admits every row. AT-001.21's integration body asserts that its answer over the LIVE catalog is
 * empty — which, on a correct database, proves the rule found no problem and says nothing at all
 * about whether the rule can find one.
 *
 * THIS FILE IS WHAT EXERCISES EVERY FAILURE CASE. Each one is a state no database of this repository
 * is in, and none of them is reachable by running the acceptance suite: reaching them needs a catalog
 * that was constructed rather than read, which is exactly what a pure rule taking its witness as an
 * argument allows.
 *
 * ONE CASE NEEDS THE DECLARATION HANDED IN TOO, and that is why the module exports the rule twice.
 * Clause 1 fails a table declared in BOTH lists; the declaration this tree makes has no overlap and
 * must never gain one, so no catalog argument alone can reach that branch.
 * `catalogProblemsAgainst(catalog, declaration)` is the same rule with the declaration as a
 * parameter, and `catalogConformanceProblems(catalog)` is the entry point the acceptance body calls
 * with this tree's own declaration fixed.
 *
 * WHAT A GREEN HERE CLAIMS: that the rule reports each of the three kinds of disagreement, and
 * reports none against a catalog shaped the way the migrations leave one. WHAT IT DOES NOT CLAIM:
 * that a real database is shaped that way. The catalog in the last case below is a PREDICTION of the
 * two migrations, written by hand; the integration tier is the only thing that grades it, and it has
 * not run at any head of this branch.
 */

import { describe, expect, it } from 'vitest';

import {
  DECLARED_CATALOG,
  catalogConformanceProblems,
  catalogProblemsAgainst,
} from '../suites/req-001/_catalog-conformance.ts';
import type { CatalogTable } from '../suites/req-001/_contract.ts';

/** One catalog row, with the shape a clean unclassified table has, so each case states only its own point. */
const table = (name: string, over: Partial<CatalogTable> = {}): CatalogTable => ({
  table: name,
  selectGrantedTo: [],
  rowLevelSecurity: true,
  selectPolicies: [],
  ...over,
});

/** The `(select auth.uid())` a policy carries, deparsed the way `pg_policies.qual` renders it. */
const OWN_UID = '( SELECT auth.uid() AS uid)';

/**
 * THE CATALOG THE TWO MIGRATIONS LEAVE, as this suite predicts it.
 *
 * `20260812120000_tenant_isolation_policy_set.sql` grants `select` on the four tenant tables to
 * `authenticated` and creates one organisation-member policy on each;
 * `20260813120000_tenant_visibility_volunteer_and_admin.sql` adds the assigned-volunteer policy on
 * `projects` and one platform-admin policy on each of the four. `accounts` keeps its first-migration
 * grant with no policy at all, and `volunteer_profiles` keeps its `revoke all`.
 */
const REAL_SHAPED_CATALOG: CatalogTable[] = [
  // Granted to `authenticated` AND unreachable, because row-level security is on and it has no
  // policy. This is the table that would have failed a grants-only check.
  table('accounts', { selectGrantedTo: ['authenticated'] }),
  // Unreachable the other way: `revoke all` leaves no grant to revoke a policy against.
  table('volunteer_profiles'),
  table('organizations', {
    selectGrantedTo: ['authenticated'],
    selectPolicies: [
      { name: 'organizations_select_org_member', roles: ['authenticated'], qual: 'viewer_is_org_member(id)' },
      { name: 'organizations_select_platform_admin', roles: ['authenticated'], qual: 'viewer_is_platform_admin()' },
    ],
  }),
  table('org_memberships', {
    selectGrantedTo: ['authenticated'],
    selectPolicies: [
      { name: 'org_memberships_select_org_member', roles: ['authenticated'], qual: 'viewer_is_org_member(org_id)' },
      { name: 'org_memberships_select_platform_admin', roles: ['authenticated'], qual: 'viewer_is_platform_admin()' },
    ],
  }),
  table('acknowledgments', {
    selectGrantedTo: ['authenticated'],
    selectPolicies: [
      { name: 'acknowledgments_select_own_account', roles: ['authenticated'], qual: `(account_id = ${OWN_UID})` },
      { name: 'acknowledgments_select_platform_admin', roles: ['authenticated'], qual: 'viewer_is_platform_admin()' },
    ],
  }),
  table('projects', {
    selectGrantedTo: ['authenticated'],
    selectPolicies: [
      { name: 'projects_select_org_member', roles: ['authenticated'], qual: 'viewer_is_org_member(org_id)' },
      { name: 'projects_select_assigned_volunteer', roles: ['authenticated'], qual: `(assigned_volunteer_id = ${OWN_UID})` },
      { name: 'projects_select_platform_admin', roles: ['authenticated'], qual: 'viewer_is_platform_admin()' },
    ],
  }),
];

describe('the catalog conformance rule reports what the declaration does not cover', () => {
  it('reports nothing against a catalog shaped the way the migrations leave one', () => {
    expect(
      catalogConformanceProblems(REAL_SHAPED_CATALOG),
      'the rule objects to the shape this leaf ships, so it can never pass at the integration tier',
    ).toEqual([]);
  });

  it('reports a table that exists and is declared in NEITHER list', () => {
    // THE TRIPWIRE, and the reason the whole arm exists. A later requirement lands `drafts`, nobody
    // classifies it, and this is the failure that makes somebody decide.
    const problems = catalogConformanceProblems([...REAL_SHAPED_CATALOG, table('drafts', { selectGrantedTo: ['authenticated'] })]);
    expect(problems, 'a table nobody classified must be reported').toHaveLength(1);
    expect(problems[0], 'the problem must name the table a reader has to go and classify').toContain('public.drafts');
  });

  it('reports a table declared in BOTH lists', () => {
    // No catalog argument can reach this branch against this tree's own declaration, because the two
    // lists do not overlap and must not. The declaration is handed in instead — a contradictory one,
    // which is what a careless edit to either list would produce.
    const contradictory = {
      unreachableByClientRoles: [...DECLARED_CATALOG.unreachableByClientRoles, 'projects'],
      tenantIsolated: DECLARED_CATALOG.tenantIsolated,
    };
    const problems = catalogProblemsAgainst(REAL_SHAPED_CATALOG, contradictory);
    expect(problems, 'a table declared both unreachable and isolated must be reported').toHaveLength(1);
    expect(problems[0], 'the problem must name the contradicted table').toContain('public.projects');
  });

  it('reports a table declared unreachable that holds BOTH a client grant and a policy reaching a client role', () => {
    // The two arms of clause 2, each defeated at once. Either arm on its own would have made this
    // table pass, which is why the check needs both: a grant AND a policy is what reachable means.
    const problems = catalogConformanceProblems(
      REAL_SHAPED_CATALOG.map((entry) =>
        entry.table === 'accounts'
          ? table('accounts', {
              selectGrantedTo: ['authenticated'],
              selectPolicies: [{ name: 'accounts_select_self', roles: ['authenticated'], qual: `(id = ${OWN_UID})` }],
            })
          : entry,
      ),
    );
    expect(problems, 'a declared-unreachable table that is reachable must be reported').toHaveLength(1);
    expect(problems[0], 'the problem must name the table that is reachable after all').toContain('public.accounts');
  });

  it('accepts each arm of the unreachable check on its own, which is gate-1 addition B', () => {
    // ARM ONE — no grant to a client role. `volunteer_profiles` is this case in the real tree, and it
    // stays unreachable even if row-level security were off, because a role with no privilege reads
    // nothing whatever the policies say.
    expect(
      catalogConformanceProblems(
        REAL_SHAPED_CATALOG.map((entry) => (entry.table === 'volunteer_profiles' ? table('volunteer_profiles', { rowLevelSecurity: false }) : entry)),
      ),
      'a table with no client grant is unreachable by privilege, whatever row-level security says',
    ).toEqual([]);
    // ARM TWO — granted, but row-level security is on with no policy. `accounts` is this case, and an
    // arm that tested grants alone would have called it reachable and failed the build on its first
    // run against a correct database.
    expect(
      catalogConformanceProblems(REAL_SHAPED_CATALOG),
      'accounts is granted select to authenticated and must still be accepted through the zero-policy arm',
    ).toEqual([]);
    // AND THE ONE THAT MUST FAIL: granted, no policy, and row-level security OFF. That table really is
    // readable by every signed-in caller.
    const problems = catalogConformanceProblems(
      REAL_SHAPED_CATALOG.map((entry) =>
        entry.table === 'accounts' ? table('accounts', { selectGrantedTo: ['authenticated'], rowLevelSecurity: false }) : entry,
      ),
    );
    expect(problems, 'a granted table with row-level security off and no policy is readable and must be reported').toHaveLength(1);
    expect(problems[0], 'the problem must name the readable table').toContain('public.accounts');
  });

  it('reports a tenant-isolated table whose select policy is using (true)', () => {
    // THIS IS GATE-1 RULING 8's WHOLE POINT. `using (true)` satisfies "the table carries a select
    // policy" while exposing every row, so presence of a policy can never be the test.
    for (const qual of ['true', '(true)', ' TRUE ']) {
      const problems = catalogConformanceProblems(
        REAL_SHAPED_CATALOG.map((entry) =>
          entry.table === 'projects'
            ? table('projects', {
                selectGrantedTo: ['authenticated'],
                selectPolicies: [{ name: 'projects_select_everything', roles: ['authenticated'], qual }],
              })
            : entry,
        ),
      );
      expect(problems, `a policy with a qual of ${JSON.stringify(qual)} must be reported as trivially open`).toHaveLength(1);
      expect(problems[0], 'the problem must name the trivially open policy').toContain('projects_select_everything');
    }
  });

  it('reports a tenant-isolated table whose policy names no known helper and no declared tenant key', () => {
    const problems = catalogConformanceProblems(
      REAL_SHAPED_CATALOG.map((entry) =>
        entry.table === 'org_memberships'
          ? table('org_memberships', {
              selectGrantedTo: ['authenticated'],
              selectPolicies: [{ name: 'org_memberships_select_by_created_at', roles: ['authenticated'], qual: "(created_at > '2020-01-01'::date)" }],
            })
          : entry,
      ),
    );
    expect(problems, 'a policy keyed on something that is not a tenant key must be reported').toHaveLength(1);
    expect(problems[0], 'the problem must name the policy and what it was expected to name').toContain('org_memberships_select_by_created_at');
  });

  it('matches a tenant key as a WHOLE identifier, never as a substring', () => {
    // `organizations` declares `id` as its tenant key, and `id` sits inside `assigned_volunteer_id`,
    // `account_id` and `org_id`. A substring test would have accepted any qual at all on that table
    // while looking exactly like a check.
    const problems = catalogConformanceProblems(
      REAL_SHAPED_CATALOG.map((entry) =>
        entry.table === 'organizations'
          ? table('organizations', {
              selectGrantedTo: ['authenticated'],
              selectPolicies: [{ name: 'organizations_select_by_other_key', roles: ['authenticated'], qual: `(some_other_id = ${OWN_UID})` }],
            })
          : entry,
      ),
    );
    expect(problems, "a qual naming `some_other_id` must not satisfy a tenant key of `id`").toHaveLength(1);
    expect(problems[0], 'the problem must name the policy that named the wrong column').toContain('organizations_select_by_other_key');
  });

  it('reports a tenant-isolated table no authenticated caller is judged by', () => {
    // A table reached only by a policy for another role admits the rightful tenant nothing, so every
    // denial over it would pass while proving nothing — the same defect gate-2 ruling 3 found in the
    // positive controls, seen from the catalog side.
    const problems = catalogConformanceProblems(
      REAL_SHAPED_CATALOG.map((entry) =>
        entry.table === 'acknowledgments'
          ? table('acknowledgments', {
              selectGrantedTo: ['authenticated'],
              selectPolicies: [{ name: 'acknowledgments_select_service', roles: ['service_role'], qual: `(account_id = ${OWN_UID})` }],
            })
          : entry,
      ),
    );
    expect(problems, 'a table with no policy for an authenticated caller must be reported').toHaveLength(1);
    expect(problems[0], 'the problem must name the table the rightful tenant cannot read').toContain('public.acknowledgments');
  });

  it('reports a select policy that carries no using expression at all', () => {
    // `pg_policies.qual` is null for a policy that states only a `with check`. Nothing then says which
    // rows it admits, so it cannot be read as isolation and is not silently accepted.
    const problems = catalogConformanceProblems(
      REAL_SHAPED_CATALOG.map((entry) =>
        entry.table === 'projects'
          ? table('projects', {
              selectGrantedTo: ['authenticated'],
              selectPolicies: [{ name: 'projects_select_no_using', roles: ['authenticated'], qual: null }],
            })
          : entry,
      ),
    );
    expect(problems, 'a policy with no using expression must be reported').toHaveLength(1);
    expect(problems[0], 'the problem must name the policy that states nothing').toContain('projects_select_no_using');
  });
});
