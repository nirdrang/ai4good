/**
 * THE CATALOG CONFORMANCE ARM — what makes this leaf's isolation claim SELF-CORRECTING.
 *
 * AT-001.21's criterion enumerates drafts, a ledger, files, a thread and a dashboard, and only the
 * dashboard kind of tenant data exists in this tree. The other kinds belong to requirements that have
 * not landed, and the decomposition manifest gives each acceptance id to exactly one leaf — so no
 * later leaf re-checks isolation of a table that arrives later. Without something that fails when an
 * unclassified table appears, this leaf's green would be a statement about today's six tables and
 * nothing else. This module is that something.
 *
 * ============================================================================================
 * WHY THE DECLARED LISTS LIVE HERE AND NOT IN A SHIPPED MODULE
 * ============================================================================================
 *
 * The plan's decision E says "the declared lists are shipped code". For the ROUTE registry that word
 * is right — a route's class is product behaviour and a router must obey it, so
 * `supabase/functions/_shared/route-visibility.ts` ships. For the CATALOG lists it is not: no edge
 * function needs to know which tables are tenant-isolated and none ever will, and putting non-product
 * code in a product directory to satisfy a word would be worse than saying this plainly.
 *
 * AND THE TWO HOMES ARE EQUAL IN FORCE, which is why honesty decides it rather than strength. A new
 * table in a migration has no compile-time link to any list, in EITHER home. The only signal that a
 * table is undeclared is this arm failing at integration tier, and that works identically wherever
 * the lists sit. So they sit beside `_source-scan.ts`, which is the out-of-band oracle this one is
 * modelled on.
 *
 * ============================================================================================
 * WHAT THIS ARM PROVES, AND WHAT IT DOES NOT
 * ============================================================================================
 *
 * IT PROVES: every table in `public` is DECLARED, each declared-unreachable table really is
 * unreachable by a client role for a stated reason, and each declared-isolated table carries a
 * `select` policy that is not trivially open and names a rule this repository knows.
 *
 * IT DOES NOT PROVE THAT A DECLARED PREDICATE IS CORRECT — that a policy keys on the right column, or
 * that the column it names is the tenant key it should be. `using (org_id = org_id)` would satisfy
 * clause 3 and expose every row. The acceptance denials and the unfiltered listings bracket that from
 * the other side; together they are a bracket and not a proof, and the merge ruling says bracket.
 *
 * THE RULE IS PURE AND THE WITNESS IS HANDED IN, so the failure cases are exercisable with catalogs no
 * database is in. `tests/at/harness/shipped-catalog-conformance.selftest.ts` drives every one of them.
 */

import type { CatalogTable } from './_contract.ts';

/**
 * THE TABLES NO CLIENT ROLE REACHES A ROW OF — declared, with the arm that makes each one true.
 *
 * `accounts` carries `grant select, insert … to authenticated` from the first migration AND row-level
 * security with NO policy, so it is unreachable through the POLICY arm, not the grant arm.
 * `volunteer_profiles` carries `revoke all …`, so it is unreachable through the GRANT arm.
 *
 * THAT SPLIT IS WHY CLAUSE 2 BELOW HAS TWO ARMS. An arm that tested grants alone would classify
 * `accounts` as reachable and fail the build on its first run against a correct database, which is
 * gate-1 addition B written down as code.
 */
export const unreachableByClientRoles: readonly string[] = ['accounts', 'volunteer_profiles'];

/**
 * ONE DECLARED TENANT TABLE — its name, and the columns that carry its tenant key.
 *
 * WHY THE KEY IS A LIST RATHER THAN ONE COLUMN. `public.projects` genuinely has TWO tenant keys after
 * this leaf: `org_id` carries the owning organisation, which is what the organisation-member branch
 * reads, and `assigned_volunteer_id` carries the single developer, which is what the assigned-
 * volunteer branch reads. A single-column declaration could not express a table that two different
 * tenant rules reach, and one of the two policies would then have to be declared wrong to make the
 * arm pass.
 */
export type TenantIsolatedTable = { table: string; tenantKeyColumns: readonly string[] };

/**
 * THE TABLES THAT HOLD ONE TENANT'S DATA AND ARE REACHED BY A POLICY — declared with their keys.
 *
 * `organizations` is keyed by its own identity; `org_memberships` and `projects` by the organisation
 * that owns the row; `acknowledgments` by the ACCOUNT that made it, because an acknowledgment is a
 * platform-level record of one person and belongs to no organisation.
 */
export const tenantIsolated: readonly TenantIsolatedTable[] = [
  { table: 'organizations', tenantKeyColumns: ['id'] },
  { table: 'org_memberships', tenantKeyColumns: ['org_id'] },
  { table: 'acknowledgments', tenantKeyColumns: ['account_id'] },
  { table: 'projects', tenantKeyColumns: ['org_id', 'assigned_volunteer_id'] },
];

/** The two lists as one value, so the rule below can be driven against a declaration that is not this one. */
export type CatalogDeclaration = {
  unreachableByClientRoles: readonly string[];
  tenantIsolated: readonly TenantIsolatedTable[];
};

/** THE DECLARATION THIS TREE MAKES — the two lists above, and the one `catalogConformanceProblems` uses. */
export const DECLARED_CATALOG: CatalogDeclaration = { unreachableByClientRoles, tenantIsolated };

/**
 * THE POLICY HELPERS A `qual` MAY NAME — the three `security definer` functions the migrations ship.
 *
 * A policy naming one of these is making a claim this repository can point at. A policy naming
 * neither, and no tenant key column either, is asking to be read as isolation on the strength of
 * existing, which is the thing gate-1 ruling 8 refuses.
 */
const KNOWN_POLICY_HELPERS: readonly string[] = [
  'viewer_is_org_member',
  'viewer_is_platform_admin',
  'viewer_is_volunteer',
];

/**
 * THE TWO CLIENT ROLES THE WITNESS ANSWERS ABOUT — the roles a client key can act as.
 *
 * The grant arm of clause 2 compares against this list directly, and that is correct because
 * `selectGrantedTo` is an EFFECTIVE privilege answer rather than a list of grantees: `_live.ts` asks
 * `has_table_privilege` per role, which already accounts for a grant made to `PUBLIC` and for role
 * inheritance. `'public'` is deliberately NOT a member of this list — the witness can never emit it,
 * and a branch nothing can drive is the thing this repository distrusts. The POLICY arms below are a
 * different question: `pg_policies.roles` reports the role names a policy was written `to`, where
 * `public` really can appear and really does reach both client roles.
 */
const CLIENT_ROLES: readonly string[] = ['anon', 'authenticated'];

/** Whether a policy's role list reaches any client role — `public` grants to every role, `anon` included. */
function reachesClientRole(roles: readonly string[]): boolean {
  return roles.some((role) => role === 'public' || CLIENT_ROLES.includes(role));
}

/** Whether a policy's role list reaches an authenticated caller specifically. */
function reachesAuthenticated(roles: readonly string[]): boolean {
  return roles.some((role) => role === 'public' || role === 'authenticated');
}

/**
 * Whether a `qual` NAMES an identifier — as a whole word, never as a substring.
 *
 * THE WORD BOUNDARY IS LOAD-BEARING, and a substring test would have made one declaration vacuous:
 * `organizations`'s tenant key is `id`, and `id` appears inside `assigned_volunteer_id`,
 * `account_id` and `org_id`. A substring test would therefore accept any qual at all on that table
 * while looking like a check.
 */
function namesIdentifier(qual: string, identifier: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9_])${identifier}([^A-Za-z0-9_]|$)`).test(qual);
}

/** Whether a `qual` is the trivially open one. `using (true)` deparses as `true`, sometimes parenthesised. */
function isTriviallyOpen(qual: string): boolean {
  return qual.trim().replace(/^\(+|\)+$/g, '').trim().toLowerCase() === 'true';
}

/**
 * EVERY WAY THE LIVE CATALOG DISAGREES WITH THE DECLARATION — an empty array is the assertion.
 *
 * The three checks are gate-1 ruling 8's, in its order:
 *
 *   1. Every table in `public` appears in EXACTLY ONE of the two declared lists. In neither, or in
 *      both, fails. This is the tripwire: a table a later requirement lands arrives in neither list
 *      and fails the build until somebody decides which it is.
 *   2. A table declared unreachable really is unreachable, for one of TWO stated reasons — no `select`
 *      grant to a client role, or row-level security on with no `select` policy reaching one. Both
 *      arms are needed and the declaration's own comment says which table proves which.
 *   3. A table declared isolated carries at least one `select` policy an authenticated caller can be
 *      judged by; no `select` policy on it is trivially open; and every `select` policy on it names a
 *      known helper or one of that table's declared tenant key columns.
 *
 * EACH PROBLEM IS A SENTENCE NAMING THE TABLE AND WHAT WAS MEASURED, because the reader of a failure
 * is somebody who has just added a table and does not yet know this arm exists.
 *
 * THE DECLARATION IS A PARAMETER, AND ONE OF THE THREE CHECKS CANNOT BE DRIVEN WITHOUT THAT. Clause 1
 * fails a table declared in BOTH lists, and the declaration this tree makes has no overlap and must
 * not gain one — so no `catalog` argument alone can reach that branch, and a defensive branch nothing
 * drives is exactly what this repository has learned to distrust. `catalogConformanceProblems` below
 * is the entry point the acceptance body calls, with the shape and the single argument the plan
 * names; this is the same rule with the declaration handed in, so the selftest can drive a
 * declaration that contradicts itself without this tree ever holding one.
 */
export function catalogProblemsAgainst(catalog: readonly CatalogTable[], declaration: CatalogDeclaration): string[] {
  const problems: string[] = [];
  const isolatedByTable = new Map(declaration.tenantIsolated.map((entry) => [entry.table, entry]));

  for (const table of catalog) {
    const declaredUnreachable = declaration.unreachableByClientRoles.includes(table.table);
    const declaredIsolated = isolatedByTable.has(table.table);

    /* --- 1. exactly one list --------------------------------------------------------------- */

    if (declaredUnreachable && declaredIsolated) {
      problems.push(
        `public.${table.table} is declared BOTH unreachable by client roles and tenant-isolated, and it cannot be both`,
      );
      continue;
    }
    if (!declaredUnreachable && !declaredIsolated) {
      problems.push(
        `public.${table.table} exists and is declared in neither list — classify it in ` +
          `tests/at/suites/req-001/_catalog-conformance.ts as unreachable by client roles or as tenant-isolated`,
      );
      continue;
    }

    const selectPolicies = table.selectPolicies;

    /* --- 2. unreachable, for a stated reason ------------------------------------------------ */

    if (declaredUnreachable) {
      const noClientGrant = !table.selectGrantedTo.some((role) => CLIENT_ROLES.includes(role));
      const noClientPolicy = table.rowLevelSecurity && !selectPolicies.some((policy) => reachesClientRole(policy.roles));
      if (!noClientGrant && !noClientPolicy) {
        problems.push(
          `public.${table.table} is declared unreachable by client roles and is reachable: it grants select to ` +
            `[${table.selectGrantedTo.join(', ')}] and it carries ${selectPolicies.length} select policy or policies ` +
            `reaching a client role, with row-level security ${table.rowLevelSecurity ? 'on' : 'OFF'}`,
        );
      }
      continue;
    }

    /* --- 3. isolated, and not trivially open ------------------------------------------------ */

    const declared = isolatedByTable.get(table.table)!;
    if (!selectPolicies.some((policy) => reachesAuthenticated(policy.roles))) {
      problems.push(
        `public.${table.table} is declared tenant-isolated and carries no select policy an authenticated caller ` +
          `is judged by, so the rightful tenant reads nothing and every denial over it proves nothing`,
      );
    }
    for (const policy of selectPolicies) {
      if (policy.qual === null) {
        problems.push(
          `public.${table.table}'s select policy ${policy.name} carries no using expression, so nothing states which ` +
            `rows it admits`,
        );
        continue;
      }
      if (isTriviallyOpen(policy.qual)) {
        problems.push(
          `public.${table.table}'s select policy ${policy.name} is using (true), which admits every row while ` +
            `satisfying "the table carries a select policy"`,
        );
        continue;
      }
      const named =
        KNOWN_POLICY_HELPERS.some((helper) => namesIdentifier(policy.qual!, helper)) ||
        declared.tenantKeyColumns.some((column) => namesIdentifier(policy.qual!, column));
      if (!named) {
        problems.push(
          `public.${table.table}'s select policy ${policy.name} names neither a known policy helper ` +
            `(${KNOWN_POLICY_HELPERS.join(', ')}) nor a declared tenant key column ` +
            `(${declared.tenantKeyColumns.join(', ')}): ${policy.qual}`,
        );
      }
    }
  }

  return problems;
}

/**
 * EVERY WAY THE LIVE CATALOG DISAGREES WITH THE DECLARATION THIS TREE MAKES — the arm's entry point,
 * and the one AT-001.21's integration body calls.
 *
 * An empty array is the assertion. The rule is `catalogProblemsAgainst` above; this fixes its second
 * argument at `DECLARED_CATALOG` so no caller can grade the live catalog against a declaration
 * somebody invented for the occasion.
 */
export function catalogConformanceProblems(catalog: readonly CatalogTable[]): string[] {
  return catalogProblemsAgainst(catalog, DECLARED_CATALOG);
}
