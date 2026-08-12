/**
 * THE TENANT-READ DECISION — the one rule that says whether this caller may READ this thing, and the
 * one refusal every non-public read surface answers with.
 *
 * It is a separate module from `./memberships.ts` because the two answer different questions.
 * `memberships.ts` judges whether an ADMIN-ONLY ACTION may be performed in an organisation — a write
 * question, on one axis, with two refusal kinds a caller branches on. This module judges READS across
 * three viewer kinds and two scopes, and its refusal is deliberately a SINGLE constant that says
 * nothing at all.
 *
 * IT IS UNDER THE SAME TWO CONSTRAINTS `./memberships.ts` states, for the same two reasons:
 *   1. ZERO NON-RELATIVE IMPORTS AND NO DENO GLOBAL. It is compiled by `tests/at/tsconfig.json`,
 *      which is `strict` with `skipLibCheck: false` and no DOM library, and it is also run by Deno
 *      inside the edge runtime. The intersection is plain TypeScript over plain data.
 *   2. NO I/O, NO CLOCK, NO RANDOMNESS. Every row a decision needs is READ by the caller and handed
 *      here; this module never asks a database anything.
 *
 * ============================================================================================
 * "NO EXISTENCE ORACLE" IS STRUCTURAL HERE, NOT A RULE SOMEBODY APPLIES
 * ============================================================================================
 *
 * AT-001.21's clause is that a denial must not reveal whether the thing exists. That is a property of
 * two answers being IDENTICAL, so the answer itself is exported: `TENANT_NOT_FOUND`. Every non-public
 * read surface returns exactly that constant for BOTH "no such row" and "exists, and is not yours".
 * There is nowhere in the surface to put a second refusal, so the two cannot drift apart through an
 * edit that looks harmless.
 *
 * AND THE SURFACES READ THE TARGET ROW LAST. That ordering is the second half of the property and it
 * lives in the surfaces rather than here, because it is about I/O and this module performs none. It
 * is written down here anyway, because a reader of this constant has to know what makes it enough:
 * every read a decision needs is issued BEFORE the target row is read, and the target read is the
 * LAST read the handler makes. Then a fault answers the same 502 for a real foreign identifier and
 * for one that names nothing, by construction rather than by care. With a lookup AFTER the target
 * read, a fault reachable only on the existing-row path would answer 502 for the foreign identifier
 * while the nonexistent one had already answered 404 — an existence oracle outside this constant.
 *
 * WHAT IS NOT CLAIMED: TIMING. Response time is a side channel this leaf does not measure and does
 * not defend.
 */

import { ACCOUNT_TYPES, type AccountType } from './accounts.ts';
import { parseOrgRole, type OrgRole } from './memberships.ts';

/* -------------------------------------------------------------------------- the one refusal */

/**
 * THE ONE ANSWER A NON-PUBLIC READ SURFACE GIVES WHEN IT DOES NOT ANSWER — for a row that does not
 * exist AND for a row that exists and belongs to somebody else, with no way to tell which.
 *
 * 404 RATHER THAN 403, AND THE ALTERNATIVE WAS CONSIDERED. `update-organization` answers one 403 for
 * both of its cases and is equally non-oracular; either works so long as it is the SAME answer. 404
 * is chosen because it carries no information at all, while a 403 states that something is there to
 * be forbidden. The cost is that a 404 for a row that does exist is, strictly, not true — and that
 * cost is the point of the criterion.
 *
 * IT IS RETURNED, NEVER THROWN. `edgeHandler` in `./edge.ts` turns anything thrown into a shaped 502,
 * so a thrown constant would become a different answer on one of the two paths and the two would
 * diverge through the error path.
 */
export const TENANT_NOT_FOUND = {
  status: 404,
  body: {
    ok: false,
    reason:
      'no such thing is visible to this caller — it does not exist, or it exists and is not yours, ' +
      'and this answer deliberately does not say which',
  },
} as const;

/* ------------------------------------------------------------------- who is asking, and for what */

/**
 * WHICH KIND OF THING IS BEING READ. Two scopes, because two different rules admit two different
 * viewers: an organisation's non-public data belongs to the organisation's member, and a project's
 * working data belongs to that project's assigned developer.
 */
export type TenantReadScope = 'organization' | 'project';

/**
 * THE VIEWER'S STANDING RELATIVE TO THE TARGET — never a list, and that is the device rather than a
 * convention.
 *
 * `roleInTargetOrganization` is the role the viewer holds IN THE ORGANISATION BEING READ, and there
 * is nowhere here to put a second role. So an implementation that authorised from the caller's
 * standing in some OTHER organisation cannot express itself through this type at all — the same
 * device `orgAdminActionAllowed` uses, and the same reason. `assignedVolunteerOfTargetProject` is the
 * same shape for the project scope: one boolean about THIS project, never a list of projects.
 *
 * EVERY FIELD ARRIVES AS DATA A CALLER READ, so every field is narrowed here rather than trusted.
 */
export type TenantViewer = {
  /** the caller's GLOBAL account type, or `null` when the caller holds no account row at all */
  accountType: AccountType | null;
  /** the caller's role in the organisation being read, or `null` when it holds no membership there */
  roleInTargetOrganization: OrgRole | null;
  /** whether the caller is the assigned developer OF THE PROJECT being read */
  assignedVolunteerOfTargetProject: boolean;
};

/**
 * WHY ACCESS WAS GRANTED, carried out of the decision rather than left implicit.
 *
 * It is the same device `OrgAdminRefusalKind` is: a reader that could only see `ok: true` could not
 * tell "the platform administrator reached across accounts" from "this happened to be the caller's
 * own organisation". The basis is what makes the grant's reason readable at all.
 *
 * ITS CONSUMER IS `tests/at/harness/shipped-visibility.selftest.ts`, WHICH DRIVES THIS MODULE
 * DIRECTLY — and naming it matters, because this paragraph used to imply the consumer was AT-001.40.
 * IT IS NOT. THE ACCEPTANCE SURFACE DELIBERATELY DOES NOT CARRY THE BASIS: `TenantReadOutcome` is a
 * status and a value, or a status and a body, and its own header gives the reason — the claim under
 * test is that two whole answers are IDENTICAL, and an outcome carrying more fields would invite an
 * assertion weaker than the criterion. So AT-001.40 makes its reach attributable a different way, and
 * the right way: two different tenants read by ONE administrator, and a NON-ADMIN repeating one of
 * those reads and being refused. Widening a product surface for a test's convenience would be the
 * defect rather than the fix.
 */
export type TenantReadBasis = 'platform-admin' | 'organisation-member' | 'assigned-volunteer';

/**
 * A tenant-read decision. Its refusal carries a SENTENCE FOR A READER, and that sentence NEVER
 * travels to the caller — `TENANT_NOT_FOUND` is what travels. Keeping the two apart is what stops a
 * helpful refusal becoming the existence oracle the constant exists to remove.
 */
export type TenantReadDecision = { ok: true; basis: TenantReadBasis } | { ok: false; reason: string };

/** The account type, or `null` for every value this module does not recognise — it fails closed. */
function knownAccountType(raw: unknown): AccountType | null {
  if (typeof raw !== 'string') return null;
  const candidate = raw.trim();
  return (ACCOUNT_TYPES as readonly string[]).includes(candidate) ? (candidate as AccountType) : null;
}

/**
 * AT-001.21, .22, .23 and .40 as ONE decision: may this viewer read this thing's non-public data.
 *
 * THE FOUR CLAUSES, each traceable to its criterion:
 *   * A PLATFORM ADMIN reads both scopes, for every account — AT-001.40, the founder's d65 ruling
 *     that the admin role spans all accounts.
 *   * AN NGO ACCOUNT reads an organisation's non-public data only where it holds a membership row IN
 *     THAT organisation — AT-001.21, whose whole content is that acting in one NGO grants nothing in
 *     another.
 *   * A VOLUNTEER reads a project's working data only where it is THAT project's assigned developer
 *     — AT-001.22's denial and AT-001.23's grant, which are the two halves of one rule.
 *   * EVERYBODY ELSE, including a logged-out viewer, reads neither — AT-001.24's API half.
 *
 * IT FAILS CLOSED ON EVERY VALUE IT DOES NOT RECOGNISE, the posture `parseOrgRole` states and gives
 * its reasons for: an unknown account type, an unknown role, AN UNKNOWN SCOPE, `undefined`, a number
 * and a missing row all reach the same refusal, and no value widens authority.
 *
 * THE SCOPE IS NAMED OUT LOUD BECAUSE IT IS THE ONE THIS SENTENCE USED TO BE UNTRUE OF. Gate 2
 * measured it: every value other than `'organization'` fell through to the project rule, where an
 * assigned volunteer is allowed, so an unrecognised value WIDENED authority while this paragraph
 * promised the opposite. `tests/at/harness/shipped-visibility.selftest.ts` is the oracle for the
 * whole promise, that branch included.
 *
 * THE PLATFORM-ADMIN BRANCH IS NOW DRIVEN AT TWO LEVELS, and this paragraph used to say it was
 * driven at none. That was true of the slice that landed this module — AT-001.21 and AT-001.22 drive
 * no administrator — and it stopped being true on 2026-08-13, when the slice that ships the
 * platform-admin policy landed AT-001.40 beside it. The branch is now driven as a UNIT by
 * `tests/at/harness/shipped-visibility.selftest.ts`, and THROUGH A SURFACE by AT-001.40 at both
 * tiers: one administrator reads two organisations' dashboards and two projects' workspaces, where a
 * non-administrator repeating one of those reads is refused. The unit oracle is not the acceptance
 * one, and neither stands in for the other.
 */
export function tenantReadAllowed(viewer: TenantViewer, scope: TenantReadScope): TenantReadDecision {
  const accountType = knownAccountType(viewer?.accountType);
  if (accountType === null) {
    return {
      ok: false,
      reason: 'the caller holds no recognised account type, so it reads no non-public data at all',
    };
  }

  // THE ADMINISTRATOR'S REACH IS THE ONE BRANCH THAT DOES NOT READ THE SCOPE. d65: the role spans all
  // accounts, so narrowing it per scope would be building a rule the founder ruled against.
  if (accountType === 'platform_admin') return { ok: true, basis: 'platform-admin' };

  if (scope === 'organization') {
    // THE ROLE IS THE ONE IN THE TARGET ORGANISATION, and `parseOrgRole` is what narrows it — the
    // same shipped narrowing `update-organization` uses, so an unrecognised value cannot widen
    // anything here either. EITHER role reads: `admin` and `member` are both inside the tenant, and
    // the admin-only axis is a different question that `orgAdminActionAllowed` answers.
    const role = parseOrgRole(viewer?.roleInTargetOrganization);
    if (accountType === 'ngo' && role !== null) return { ok: true, basis: 'organisation-member' };
    return {
      ok: false,
      reason:
        'an organisation\'s non-public data is readable by the accounts seated in THAT organisation only — ' +
        'membership is held per organisation, so acting in one organisation grants nothing in another',
    };
  }

  if (scope === 'project') {
    if (accountType === 'volunteer' && viewer?.assignedVolunteerOfTargetProject === true) {
      return { ok: true, basis: 'assigned-volunteer' };
    }
    return {
      ok: false,
      reason:
        "a project's working data is readable by that project's assigned developer only — " +
        'a volunteer who is not assigned to it reads nothing of it',
    };
  }

  // THE SAME FAIL-CLOSED POSTURE `knownAccountType` AND `parseOrgRole` APPLY, on the third argument
  // rather than the first two, and no call site can reach it today because `TenantReadScope` is a
  // union of exactly two strings. Before this branch existed, every OTHER value fell through to the
  // project rule, where an assigned volunteer is allowed — so an unrecognised scope WIDENED access
  // while the header above promised the opposite.
  return {
    ok: false,
    reason: 'the read names no recognised scope, so it reads nothing at all',
  };
}

/* ------------------------------------------------------------------------ what the world may see */

/**
 * WHAT A PROJECT SHOWS THE WORLD — one statement of what "public" is, so the word names a value this
 * repository can point at rather than a habit each surface repeats.
 *
 * THREE FIELDS, AND THE ABSENCES ARE THE SUBSTANCE. `organizationId` and `assignedVolunteerId` are
 * both fields the WORKSPACE projection carries and this one deliberately does not: the first is an
 * internal identifier a stranger has no use for, and the second names a person. AT-001.22's body
 * asserts each absence by name rather than counting fields, because a count passes while the wrong
 * field is present.
 */
export type PublicProjectView = {
  projectId: string;
  projectName: string;
  organizationName: string;
};

/**
 * The public projection of one project — the whole of what `public-project-page` may answer.
 *
 * IT TAKES THE TWO ROWS RATHER THAN A JOINED SHAPE, so the caller cannot pass a workspace projection
 * in and have extra fields survive: this function builds the answer field by field and copies
 * nothing wholesale.
 */
export function publicProjectView(
  project: { id: string; name: string },
  organization: { name: string },
): PublicProjectView {
  return {
    projectId: project.id,
    projectName: project.name,
    organizationName: organization.name,
  };
}
