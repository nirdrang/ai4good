/**
 * THE ORACLE FOR `visibility.ts`'s FAIL-CLOSED PROMISE.
 *
 * `supabase/functions/_shared/visibility.ts` promises that `tenantReadAllowed` fails closed on every
 * value it does not recognise — an unknown account type, an unknown role, an unknown scope,
 * `undefined`, a number and a missing field all reach the same refusal, and no value widens
 * authority. Gate 2 found that sentence was NOT true of the scope argument: every value other than
 * `'organization'` fell through to the project rule, where an assigned volunteer is allowed. The fix
 * added a fail-closed branch, and a defensive branch nothing drives is the thing this repository has
 * already learned to distrust. This file is the oracle for the whole promise, that branch included.
 *
 * WHY A SHIPPED MODULE'S SHAPE TEST RIDES THE SELFTEST LANE, which is the same reason
 * `shipped-caller.selftest.ts` and `shipped-verification.selftest.ts` give for their own existence.
 * The acceptance fixture builds WELL-FORMED viewers and passes one of the two declared scopes, so no
 * acceptance body can hand this module a number, a missing field or a scope that does not exist
 * without first making the fixture lie about what a surface reads. Driving the module DIRECTLY is
 * the only way to reach those inputs, and a direct call from an acceptance body would be the thing
 * the suite forbids — a test of a helper rather than of an application boundary.
 *
 * IT NEEDS NO SCRIPT OR CI CHANGE: `tests/at/vitest.config.ts` includes `harness/**\/*.selftest.ts`
 * and the `at:selftest` script filters to `harness/`, so this file is discovered by glob and never
 * joins an acceptance run. It cannot affect any acceptance id's colour.
 *
 * WHAT A GREEN HERE CLAIMS: that the shipped rule answers as its header says, for every shape named
 * below. WHAT IT DOES NOT CLAIM: that any surface consults it correctly, and that the row-level
 * security policy set agrees with it. The surfaces are graded by AT-001.21 and AT-001.22; the
 * database is graded by the integration tier, which has not run at this head.
 *
 * `publicProjectView` DELIBERATELY GETS NO CHECK HERE. AT-001.22 already asserts its three fields and
 * both of its absences by name, so a selftest would be a second copy of a live assertion.
 */

import { describe, expect, it } from 'vitest';

import {
  tenantReadAllowed,
  type TenantReadScope,
  type TenantViewer,
} from '../../../supabase/functions/_shared/visibility.ts';

/**
 * Every call below is a shape the type-checker would reject at a checked call site. The edge entry
 * points are NOT type-checked — `edge.ts`'s header measures and states that — so these are the
 * mistakes a real caller can make, and the casts are how this file reaches them.
 */
const call = (viewer: unknown, scope: unknown) =>
  tenantReadAllowed(viewer as TenantViewer, scope as TenantReadScope);

describe('the shipped tenant-read rule fails closed', () => {
  it('grants the platform admin BOTH scopes, and names the basis', () => {
    // d65: the administrator role spans all accounts, so this branch does not read the scope at all.
    // The basis is what makes AT-001.40's reach attributable — an `ok: true` alone could not tell the
    // admin's reach from an ordinary read of the caller's own organisation.
    const viewer = { accountType: 'platform_admin', roleInTargetOrganization: null, assignedVolunteerOfTargetProject: false };
    expect(call(viewer, 'organization'), 'a platform admin must read an organisation').toEqual({
      ok: true,
      basis: 'platform-admin',
    });
    expect(call(viewer, 'project'), 'a platform admin must read a project').toEqual({
      ok: true,
      basis: 'platform-admin',
    });
  });

  it('grants an NGO account seated in the TARGET organisation, in either role', () => {
    // EITHER role reads: `admin` and `member` are both inside the tenant, and the admin-only axis is
    // a different question that `orgAdminActionAllowed` answers.
    //
    // THE ACCOUNT TYPE IS TRIMMED BEFORE IT IS JUDGED, and `'ngo '` is therefore RECOGNISED. That is
    // `knownAccountType`'s own `raw.trim()`, and it is asserted here rather than left to be
    // rediscovered — it was the one shape this file first predicted wrongly.
    expect(
      call({ accountType: 'ngo ', roleInTargetOrganization: 'admin', assignedVolunteerOfTargetProject: false }, 'organization'),
      'the shipped module trims the account type before judging it',
    ).toEqual({ ok: true, basis: 'organisation-member' });
    for (const role of ['admin', 'member']) {
      expect(
        call({ accountType: 'ngo', roleInTargetOrganization: role, assignedVolunteerOfTargetProject: false }, 'organization'),
        `an NGO holding the ${role} seat in the target organisation must read it`,
      ).toEqual({ ok: true, basis: 'organisation-member' });
    }
  });

  it('grants the ASSIGNED volunteer the project scope', () => {
    expect(
      call({ accountType: 'volunteer', roleInTargetOrganization: null, assignedVolunteerOfTargetProject: true }, 'project'),
      "the project's assigned developer must read its working data",
    ).toEqual({ ok: true, basis: 'assigned-volunteer' });
  });

  it('refuses every account type it does not recognise, on both scopes', () => {
    // The refusal is the same whatever the rest of the viewer says: an unrecognised account type is
    // judged BEFORE any seat or assignment is consulted, so a value that widened authority here
    // would widen it for a caller carrying every other field filled in.
    const seated = { roleInTargetOrganization: 'admin', assignedVolunteerOfTargetProject: true };
    for (const accountType of [
      null,
      undefined,
      '',
      '   ',
      'NGO',
      'admin',
      'platform-admin',
      'volunteer_profile',
      42,
      true,
      {},
      [],
      { value: 'ngo' },
    ]) {
      for (const scope of ['organization', 'project'] as const) {
        expect(
          call({ accountType, ...seated }, scope).ok,
          `an account type of ${JSON.stringify(accountType)} must not read the ${scope} scope`,
        ).toBe(false);
      }
    }
  });

  it('refuses an NGO account whose role in the TARGET organisation is not recognised', () => {
    // `parseOrgRole` is what narrows the role. A near-miss, a blank and a non-string are what a
    // caller that read the wrong column, or read nothing at all, actually hands over.
    for (const role of [null, undefined, '', '   ', 'Admin', 'owner', 'members', 0, 1, true, {}, [], { role: 'admin' }]) {
      expect(
        call({ accountType: 'ngo', roleInTargetOrganization: role, assignedVolunteerOfTargetProject: false }, 'organization').ok,
        `a role of ${JSON.stringify(role)} in the target organisation must not open the organisation scope`,
      ).toBe(false);
    }
  });

  it('refuses a volunteer who is not the assigned developer, and refuses a truthy near-miss', () => {
    // The assignment is compared to `true` rather than tested for truthiness, so the four truthy
    // non-`true` values below must all be refused — each of them is what a boolean becomes after a
    // careless serialisation.
    for (const assigned of [false, null, undefined, 'true', 'yes', 1, {}]) {
      expect(
        call({ accountType: 'volunteer', roleInTargetOrganization: null, assignedVolunteerOfTargetProject: assigned }, 'project').ok,
        `an assignment of ${JSON.stringify(assigned)} must not open the project scope`,
      ).toBe(false);
    }
    // AND AN NGO NEVER READS A PROJECT THROUGH THIS CLAUSE, however seated it is elsewhere: the
    // project rule names the assigned developer and nobody else.
    expect(
      call({ accountType: 'ngo', roleInTargetOrganization: 'admin', assignedVolunteerOfTargetProject: true }, 'project').ok,
      'an NGO account must not reach a project through the assigned-developer clause',
    ).toBe(false);
  });

  it('refuses every SCOPE it does not recognise, rather than falling through to the project rule', () => {
    /**
     * THIS IS THE BRANCH GATE 2 ADDED, and it is the whole reason this file exists. Before the fix,
     * every value that was not `'organization'` reached the project rule, so an assigned volunteer
     * was ALLOWED by an unknown scope — an unrecognised value widening authority, which is the exact
     * opposite of what the module header promises. The viewer below is the one that used to be
     * granted, so a regression that restored the fall-through fails here.
     */
    const wouldHaveBeenGranted = {
      accountType: 'volunteer',
      roleInTargetOrganization: null,
      assignedVolunteerOfTargetProject: true,
    };
    for (const scope of [
      undefined,
      null,
      '',
      '   ',
      'Project',
      'projects',
      'organisation',
      'org',
      42,
      true,
      {},
      [],
      ['project'],
    ]) {
      expect(
        call(wouldHaveBeenGranted, scope).ok,
        `a scope of ${JSON.stringify(scope)} must read nothing, not fall through to the project rule`,
      ).toBe(false);
    }
    // And an administrator still reads under an unknown scope, because its clause never reads the
    // scope at all. Asserted so the fix is understood as fail-closed on the SCOPE, not as a new gate
    // in front of d65's reach.
    expect(
      call({ accountType: 'platform_admin', roleInTargetOrganization: null, assignedVolunteerOfTargetProject: false }, 'anything'),
      'the administrator clause does not read the scope, so an unknown scope must not close it',
    ).toEqual({ ok: true, basis: 'platform-admin' });
  });

  it('refuses a viewer that is missing, or is not an object at all', () => {
    // `null` is the one that matters most: `typeof null === 'object'`, so a field read that forgot it
    // would THROW here instead of answering, and a throw is not a refusal — `edgeHandler` turns it
    // into a 502 carrying a message, which is a different answer on one of the two paths the
    // no-existence-oracle property needs to be identical.
    for (const viewer of [null, undefined, 42, 'ngo', true, [], {}, { accountTypes: 'ngo' }]) {
      for (const scope of ['organization', 'project'] as const) {
        expect(
          call(viewer, scope).ok,
          `a viewer of ${JSON.stringify(viewer)} must read nothing on the ${scope} scope, and must not throw`,
        ).toBe(false);
      }
    }
  });

  it('carries a reason on every refusal, so no refusal is a bare false', () => {
    // The refusal reason NEVER travels to the caller — `TENANT_NOT_FOUND` is what travels — but it is
    // what a reader of the decision gets, and a refusal with an empty reason would be the same defect
    // as a bare status.
    for (const [viewer, scope] of [
      [{ accountType: 'nonsense', roleInTargetOrganization: null, assignedVolunteerOfTargetProject: false }, 'organization'],
      [{ accountType: 'ngo', roleInTargetOrganization: null, assignedVolunteerOfTargetProject: false }, 'organization'],
      [{ accountType: 'volunteer', roleInTargetOrganization: null, assignedVolunteerOfTargetProject: false }, 'project'],
      [{ accountType: 'volunteer', roleInTargetOrganization: null, assignedVolunteerOfTargetProject: true }, 'nonsense'],
    ] as const) {
      const decision = call(viewer, scope);
      expect(decision.ok, `${JSON.stringify(viewer)} on ${String(scope)} must be refused`).toBe(false);
      expect(
        decision.ok ? '' : decision.reason.trim(),
        `the refusal for ${JSON.stringify(viewer)} on ${String(scope)} carries no sentence a reader can act on`,
      ).not.toBe('');
    }
  });
});
