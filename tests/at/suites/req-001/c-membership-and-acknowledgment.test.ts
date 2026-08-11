/**
 * AT-REQ-001 section D — two-layer authorization, multi-NGO membership, the single seat, and
 * acknowledgment identity capture.
 *
 * THREE OF THIS FILE'S IDS ARE NOW WRITTEN, and they are the per-organisation ROLE ones: AT-001.16,
 * AT-001.36 and AT-001.37. The schema had the SHAPE since the first accounts leaf — `org_role`,
 * `org_memberships` and its composite primary key — and that leaf's own comment said the semantics
 * were "neither … landed here". They are landed now: a BEFORE trigger that refuses a per-NGO role
 * for any account that is not of type `ngo`, and an admin-only NGO-side action whose two refusals
 * are DIFFERENT KINDS.
 *
 * THE TWO KINDS ARE THE ORACLE, and it is worth saying once here rather than three times below.
 * `not-a-member` means the caller holds no membership in the TARGET organisation; `not-an-admin`
 * means it holds one and the role is `member`. AT-001.16 reads the first (authority never crosses
 * organisations), AT-001.36 the second (the role is per organisation). Collapsed into one refusal,
 * an implementation that authorised from the caller's role in SOME organisation would satisfy both.
 *
 * WHERE THE `member` ROW COMES FROM, said openly because it is the honest part of these greens: an
 * OPERATOR provisions it. No product path writes `'member'` and none may — the single-seat
 * invariant (AT-001.17) forbids invites, so there is no invite surface to mint a second member. The
 * `member` half of the enum exists for AT-001.36, and both bodies state the provisioning in their
 * own evidence rather than leaving a reader to find it.
 *
 * AT-001.17 IS STILL DECLARED, not written: it is the single-seat leaf's, which lands beside this
 * one. AT-001.18, .19, .39 and .20 belong to leaves further out.
 */

import { expect } from 'vitest';
import { atTest } from './_bind.ts';
// The INTEGRATION-tier procedures. Same criterion, same id, one registration; only the procedure
// differs — at that tier the Given is real rows on a real database and the action is the deployed
// function. See _integration.ts.
import { at00116, at00136, at00137, INTEGRATION_TIMEOUT_MS } from './_integration.ts';
import { LEAF, notLanded } from './_pending.ts';

/** The version string of the ToS + Platform Promise text these tests accept on the user's behalf. */
const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
/** The address the acknowledgment records — every completion here carries one. */
const CLIENT_IP = '203.0.113.7';
/** The password every email/password registration in this file uses. */
const PASSWORD = 'correct horse battery staple';

atTest(
  'AT-001.16',
  'membership and role are held per-NGO — acting in one never grants access to the other',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const NAME_A = 'Riverside Shelter 16A';
      const NAME_B = 'Northgate Foodbank 16B';
      const NAME_C = 'Eastside Legal Aid 16C';
      const RENAMED_A = 'Riverside Shelter and Kitchen 16A';
      const ATTEMPTED_B = 'Northgate Foodbank Renamed By An Outsider 16B';
      const ATTEMPTED_C = 'Eastside Legal Aid Renamed By An Outsider 16C';

      // ORGANISATION A COMES FROM THE PRODUCT PATH. The completion writes the organisation and seats
      // the caller as its admin in one step, which is what makes A's admin row a product fact rather
      // than something this test arranged.
      const session = await sut.registerWithEmailPassword(w.email('two-orgs-16'), PASSWORD);
      const completion = await sut.completeSignup(
        session,
        { accountType: 'ngo', organizationName: NAME_A, acknowledgmentTextVersion: TEXT_VERSION },
        CLIENT_IP,
      );
      expect(completion, 'the NGO actor could not complete signup, so nothing below is about a seated admin').toMatchObject({ ok: true });
      if (!completion.ok || completion.organizationId === null) return;

      // ORGANISATIONS B AND C COME FROM THE OPERATOR, UNSEATED — and B's single seat is then given
      // to the same actor as `member`. Every product path seats its own creator as admin and the
      // one-seat index refuses a second row, so this Given is unreachable through product paths
      // alone. That is the invariant working, not a gap: see this file's header.
      const organizationB = await sut.createOrganizationAsOperator(NAME_B);
      const seated = await sut.grantMembershipAsOperator(organizationB.id, completion.accountId, 'member');
      expect(seated, `the operator could not seat the actor as ${NAME_B}'s single member, so the Given does not exist`).toMatchObject({
        ok: true,
      });
      const organizationC = await sut.createOrganizationAsOperator(NAME_C);

      // (1) ROLE IS HELD PER ORGANISATION — two independent rows carrying two different roles, and
      // NO row at all in C.
      expect(await sut.membership(completion.organizationId, completion.accountId), 'the actor is not A\'s admin').toMatchObject({
        role: 'admin',
      });
      expect(await sut.membership(organizationB.id, completion.accountId), 'the actor is not B\'s member').toMatchObject({
        role: 'member',
      });
      expect(
        await sut.membership(organizationC.id, completion.accountId),
        'the actor holds a membership in C, which the Given denies',
      ).toBeNull();
      const held = await sut.membershipsOf(completion.accountId);
      expect(held, 'the actor does not hold exactly two memberships').toHaveLength(2);
      expect(
        held.map((row) => row.role).sort(),
        'the two memberships do not carry two different roles, so the role is not being held per organisation',
      ).toEqual(['admin', 'member']);

      // (2) THE ADMIN ACTS IN A. The positive is not optional: an action that refused everybody
      // would satisfy both refusals below on its own.
      const renamed = await sut.updateOrganization(session, completion.organizationId, RENAMED_A);
      expect(renamed, 'A\'s own admin was refused the admin-only action, so the refusals below prove nothing').toMatchObject({ ok: true });
      expect(await sut.organization(completion.organizationId), 'the rename did not reach the row').toMatchObject({ name: RENAMED_A });

      // (3) ADMIN STANDING IN A DOES NOT CARRY INTO B, where the same account holds `member`.
      const refusedInB = await sut.updateOrganization(session, organizationB.id, ATTEMPTED_B);
      expect(refusedInB.ok, 'A\'s admin renamed an organisation where it holds only the member role').toBe(false);
      if (refusedInB.ok) return;
      expect(refusedInB.kind, 'the refusal in B is not the not-an-admin one').toBe('not-an-admin');
      expect(await sut.organization(organizationB.id), 'the refused rename reached B\'s row anyway').toMatchObject({ name: NAME_B });
      expect(await sut.organizationsNamed(ATTEMPTED_B), 'the refused rename created an organisation by the attempted name').toEqual([]);

      // (4) NO AMBIENT AUTHORITY — C, where the actor holds no membership at all, refuses with the
      // OTHER kind. Two different refusals from one caller is what makes this an isolation oracle
      // rather than a blanket denial.
      const refusedInC = await sut.updateOrganization(session, organizationC.id, ATTEMPTED_C);
      expect(refusedInC.ok, 'the actor renamed an organisation it holds no membership in').toBe(false);
      if (refusedInC.ok) return;
      expect(refusedInC.kind, 'the refusal in C is not the not-a-member one').toBe('not-a-member');
      expect(await sut.organization(organizationC.id), 'the refused rename reached C\'s row anyway').toMatchObject({ name: NAME_C });
      expect(await sut.organizationsNamed(ATTEMPTED_C), 'the refused rename created an organisation by the attempted name').toEqual([]);

      // (5) AND NEITHER REFUSAL WROTE A MEMBERSHIP. A refusal that quietly enrolled the caller would
      // pass every assertion above and hand it the authority next time.
      expect(await sut.membershipsOf(completion.accountId), 'a refused action changed what the actor is a member of').toHaveLength(2);
    },
    integration: at00116,
  },
);

atTest(
  'AT-001.36',
  'an admin in one NGO and a member in another succeeds only where it is the admin',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const NAME_A = 'Riverside Shelter 36A';
      const NAME_B = 'Northgate Foodbank 36B';
      const RENAMED_A = 'Riverside Shelter Second Programme 36A';
      const ATTEMPTED_B = 'Northgate Foodbank Renamed By A Member 36B';

      const session = await sut.registerWithEmailPassword(w.email('admin-and-member-36'), PASSWORD);
      const completion = await sut.completeSignup(
        session,
        { accountType: 'ngo', organizationName: NAME_A, acknowledgmentTextVersion: TEXT_VERSION },
        CLIENT_IP,
      );
      expect(completion, 'the actor could not complete signup, so it is nobody\'s admin').toMatchObject({ ok: true });
      if (!completion.ok || completion.organizationId === null) return;

      // THE `member` SEAT IS OPERATOR-PROVISIONED, on an organisation the operator created unseated.
      // No product path writes this role — see this file's header — and the enum's member half
      // exists for exactly this criterion.
      const organizationB = await sut.createOrganizationAsOperator(NAME_B);
      const seated = await sut.grantMembershipAsOperator(organizationB.id, completion.accountId, 'member');
      expect(seated, 'the member seat could not be provisioned, so this criterion has no Given').toMatchObject({ ok: true });

      // THE GIVEN, ASSERTED: one account, admin in A and member in B.
      expect(await sut.membership(completion.organizationId, completion.accountId), 'the actor is not A\'s admin').toMatchObject({
        accountId: completion.accountId,
        role: 'admin',
      });
      expect(await sut.membership(organizationB.id, completion.accountId), 'the actor is not B\'s member').toMatchObject({
        accountId: completion.accountId,
        role: 'member',
      });

      // IT SUCCEEDS IN A.
      const inA = await sut.updateOrganization(session, completion.organizationId, RENAMED_A);
      expect(inA, 'the admin-only action failed where the caller IS the admin').toMatchObject({ ok: true });
      expect(await sut.organization(completion.organizationId)).toMatchObject({ name: RENAMED_A });

      // AND IS REJECTED IN B — on the ROLE, not on absence. The membership row asserted above is
      // what makes those two different findings rather than one.
      const inB = await sut.updateOrganization(session, organizationB.id, ATTEMPTED_B);
      expect(inB.ok, 'the same account performed the admin-only action where it holds the member role').toBe(false);
      if (inB.ok) return;
      expect(inB.kind, 'the refusal is not the not-an-admin one').toBe('not-an-admin');
      expect(
        inB.kind,
        'the refusal came back as not-a-member, which would mean the member row was not found rather than not sufficient',
      ).not.toBe('not-a-member');

      // AND IT WROTE NOTHING — not the name, and not the role it was refused under.
      expect(await sut.organization(organizationB.id), 'the refused action renamed B anyway').toMatchObject({ name: NAME_B });
      expect(await sut.organizationsNamed(ATTEMPTED_B), 'the refused action created an organisation by the attempted name').toEqual([]);
      expect(await sut.membership(organizationB.id, completion.accountId), 'the refused action changed the actor\'s role in B').toMatchObject(
        { role: 'member' },
      );
    },
    integration: at00136,
  },
);

atTest(
  'AT-001.37',
  'granting a per-NGO role to a volunteer account is rejected on every path',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const ATTEMPTED_ORG = 'Volunteer Attempted Organisation 37';
      const ATTEMPTED_ON_SIGNUP = 'Volunteer Owned Organisation 37';
      const OPERATOR_ORG = 'Operator Created Organisation 37';

      const volunteer = await sut.registerWithEmailPassword(w.email('volunteer-37'), PASSWORD);
      await sut.linkGithubIdentity(volunteer, 'volunteer-37-handle');
      const completion = await sut.completeSignup(
        volunteer,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION },
        CLIENT_IP,
      );
      expect(completion, 'the volunteer could not complete signup, so nothing below is about a volunteer account').toMatchObject({
        ok: true,
      });
      if (!completion.ok) return;
      expect(await sut.account(completion.accountId), 'the account under test is not a volunteer').toMatchObject({
        accountType: 'volunteer',
      });

      // ARM 1 — the product's NGO-only action. A volunteer cannot create the organisation that
      // would have seated it as an admin.
      const ngoOnly = await sut.createOrganization(volunteer, ATTEMPTED_ORG);
      expect(ngoOnly.ok, 'a volunteer performed the NGO-only action and would have been seated as its admin').toBe(false);
      expect(await sut.organizationsNamed(ATTEMPTED_ORG), 'the refused action created an organisation').toEqual([]);

      // ARM 2 — the product's signup path. A volunteer completion carrying an organisation name is
      // refused outright, so the seat is never reached through signup either.
      const second = await sut.registerWithEmailPassword(w.email('volunteer-with-org-37'), PASSWORD);
      await sut.linkGithubIdentity(second, 'volunteer-with-org-37-handle');
      const withOrganization = await sut.completeSignup(
        second,
        { accountType: 'volunteer', organizationName: ATTEMPTED_ON_SIGNUP, acknowledgmentTextVersion: TEXT_VERSION },
        CLIENT_IP,
      );
      expect(withOrganization.ok, 'a volunteer completion carrying an organisation name was accepted').toBe(false);
      expect(await sut.account(second.accountId), 'the refused completion left an account row behind').toBeNull();
      expect(await sut.organizationsNamed(ATTEMPTED_ON_SIGNUP), 'the refused completion created an organisation').toEqual([]);

      // ARM 3 — THE OPERATOR'S DIRECT GRANT, into an organisation whose single seat is FREE, so the
      // refusal cannot be the one-seat rule answering instead of the NGO-only one. Both roles are
      // attempted: the criterion is about a per-NGO role, not about the admin role.
      const organization = await sut.createOrganizationAsOperator(OPERATOR_ORG);
      for (const role of ['admin', 'member'] as const) {
        const granted = await sut.grantMembershipAsOperator(organization.id, completion.accountId, role);
        expect(granted.ok, `an operator granted the ${role} role to a volunteer account`).toBe(false);
        if (granted.ok) return;
        expect(granted.kind, `the ${role} grant was refused for a reason other than the account type`).toBe('not-an-ngo-account');
      }

      // THE READ-BACK: zero membership rows anywhere for this account.
      expect(await sut.membershipsOf(completion.accountId), 'the volunteer holds a per-organisation role after every path refused').toEqual(
        [],
      );
      expect(await sut.membership(organization.id, completion.accountId), 'the refused grant wrote a membership row').toBeNull();

      // THE CONTROL — the same seat, the same method, an NGO account: it succeeds. So the refusals
      // above are about the account TYPE and not about the path being closed to everybody.
      const control = await sut.registerWithEmailPassword(w.email('ngo-control-37'), PASSWORD);
      const controlCompletion = await sut.completeSignup(
        control,
        { accountType: 'ngo', organizationName: 'Riverside Shelter Control 37', acknowledgmentTextVersion: TEXT_VERSION },
        CLIENT_IP,
      );
      expect(controlCompletion, 'the NGO control could not complete signup').toMatchObject({ ok: true });
      if (!controlCompletion.ok) return;
      const controlGrant = await sut.grantMembershipAsOperator(organization.id, controlCompletion.accountId, 'member');
      expect(controlGrant, 'the operator grant refuses an NGO account too, so the refusals above prove nothing').toMatchObject({ ok: true });
    },
    integration: at00137,
  },
);

atTest('AT-001.17', 'no capability exists to invite or add a second member to an org', notLanded(LEAF.D3_L2));

atTest('AT-001.18', 'every NGO-side action succeeds under the one account with its own preconditions met', notLanded(LEAF.D3_L3));

atTest('AT-001.19', 'every acknowledgment records the acting person name, title and authority attestation', notLanded(LEAF.D4_L1));

atTest('AT-001.39', 'an acknowledgment missing any of name, title or attestation is rejected and records nothing', notLanded(LEAF.D4_L1));

atTest('AT-001.20', 'acknowledgment copy prohibits shared credentials and recommends an org email', notLanded(LEAF.D4_L1));
