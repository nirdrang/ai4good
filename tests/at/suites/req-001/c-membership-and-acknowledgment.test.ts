/**
 * AT-REQ-001 section D — two-layer authorization, multi-NGO membership, the single seat, and
 * acknowledgment identity capture.
 *
 * SEVEN OF THIS FILE'S EIGHT IDS ARE NOW WRITTEN, and they arrive from three leaves that meet in
 * one tree. The per-organisation ROLE ids are AT-001.16, AT-001.36 and AT-001.37. The single-seat
 * id is AT-001.17. The acknowledgment-identity ids are AT-001.19, AT-001.39 and AT-001.20.
 * AT-001.18 is the ONE id this file still declares: it belongs to `LEAF.D3_L3`, the cross-surface
 * single-seat integration, and it stays declared here.
 *
 * (This header is the one place the integration of those three leaves had to be written by hand.
 * Each leaf's own header stated a negative about the other leaves' ids — "still not landed",
 * "stay declared" — and the integration makes every such statement false. The count above is the
 * merged truth, checked against this file's own `atTest` call sites.)
 *
 * THE ROLE IDS. The schema had the SHAPE since the first accounts leaf — `org_role`,
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
 * AT-001.17 belongs to the single-seat item that rides this branch rather than to the three above.
 * It is the negative of the same subject: the roles are held per organisation AND there is exactly
 * one seat to hold one in.
 *
 * THE ACKNOWLEDGMENT-IDENTITY IDS. AT-001.19, AT-001.39 and AT-001.20 are written below, by the
 * leaf that lands name, title and the authority attestation on every acknowledgment
 * (`loop/decomp/req-001.md` D4.L1).
 *
 * WHAT THEIR GREEN CLAIMS, AND WHAT IT DOES NOT, said here rather than left to be inferred:
 *   * it claims that every acknowledgment written through the one acknowledgment moment this tree
 *     has — signup completion — records the three fields, that any omission or blank refuses with
 *     the field named and writes NOTHING at all, and that the shipped copy states the
 *     shared-credentials prohibition and the organisation-email recommendation;
 *   * it does NOT claim that any screen displays that copy. AT-001.20's criterion says "when
 *     displayed" and no screen exists in this tree; the copy is graded as CONTENT, by importing the
 *     shipped constant, and the display is later UI work.
 */

import { expect } from 'vitest';
import { atTest } from './_bind.ts';
// The INTEGRATION-tier procedures. Same criterion, same id, one registration; only the procedure
// differs — at that tier the Given is real rows on a real database and the action is the deployed
// function. See _integration.ts.
import { at00116, at00117, at00119, at00136, at00137, at00139, INTEGRATION_TIMEOUT_MS } from './_integration.ts';
import { LEAF, notLanded } from './_pending.ts';
// AT-001.17's source arm, shared with its integration body — see `_source-scan.ts` for what a
// naming oracle does and does not establish.
import { inviteOrAddMemberSurface } from './_source-scan.ts';
// THE SHIPPED COPY, IMPORTED RATHER THAN RESTATED — the same discipline AT-001.05 applies to the
// stub statistics. AT-001.20 grades the words that ship; a literal copied into this file would
// drift from them the first time either changed, and the test would then be grading a copy.
// `validateCompleteSignup` imports the same module, so `authorityStatement` is not a constant only
// a test reads: the deployed validation refuses any attestation that is not this statement.
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

/** The version string of the ToS + Platform Promise text these tests accept on the user's behalf. */
const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
/** The address the acknowledgment records — the gateway chain's reported one, never a verified one. */
const CLIENT_IP = '203.0.113.7';
/** The password every email/password registration in this file uses. */
const PASSWORD = 'correct horse battery staple';
/** AT-001.19's three fields — who signed, and the statement they affirmed. */
const SIGNER = {
  signerName: 'Dana Okonkwo',
  signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
} as const;

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

      // ARM 4 — THE SAME GRANT IN TWO STATEMENTS. The seat the control just took is re-pointed at the
      // volunteer, which changes no row count and so never meets the one-seat rule. Only the NGO-only
      // rule's UPDATE half stands between a volunteer and a per-organisation role on this path.
      const repointed = await sut.repointMembershipAsOperator(organization.id, completion.accountId);
      expect(repointed.ok, 'an operator re-pointed a seated membership at a volunteer account').toBe(false);
      if (repointed.ok) return;
      expect(repointed.kind, 'the re-point was refused for a reason other than the account type').toBe('not-an-ngo-account');

      // AND THE ROW IS UNMOVED: the control still holds it, with the role it was granted.
      expect(await sut.membership(organization.id, controlCompletion.accountId), 'the refused re-point moved the seat anyway').toMatchObject({
        accountId: controlCompletion.accountId,
        role: 'member',
      });
      expect(await sut.membershipsOf(completion.accountId), 'the volunteer holds a per-organisation role after the re-point refused').toEqual(
        [],
      );
    },
    integration: at00137,
  },
);

atTest(
  'AT-001.17',
  'no capability exists to invite or add a second member to an org',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();

      // ARM 1 — THE SOURCE. The criterion's parenthetical is "(UI absent; API rejects)", and this is
      // the only arm that looks at the app at all. Its residual — it is a NAMING oracle, so a
      // deliberately renamed invite screen escapes it — is stated in `_source-scan.ts` and carried
      // in the merge ruling. It runs identically at both tiers.
      expect(
        inviteOrAddMemberSurface(),
        'the app carries a route named like an invite or add-member surface, so "UI absent" is no longer true',
      ).toEqual([]);

      // ARM 2 — THE CAPABILITY. There is no invite or add-member operation on the system under test
      // to call, which at this tier is a fact about the whole modelled surface: the fixture
      // implements every member of the contract, so its own keys ARE the surface.
      const surface = Object.keys(sut).filter((name) => /invite|add[-_]?member|adduser|add[-_]?user/i.test(name));
      expect(surface, 'the accounts surface offers an invite or add-member operation').toEqual([]);

      // ARM 3 — THE SEAT. The operator, whose authority exceeds anything the product holds, tries to
      // seat a second member in an organisation that already holds its one seat. Nothing about the
      // product is consulted: the one-seat rule is what refuses.
      const owner = await sut.registerWithEmailPassword(w.email('single-seat-owner-17'), PASSWORD);
      const ownerCompletion = await sut.completeSignup(
        owner,
        { accountType: 'ngo', organizationName: 'Riverside Shelter 17', acknowledgmentTextVersion: TEXT_VERSION },
        CLIENT_IP,
      );
      expect(ownerCompletion, 'the NGO owner could not complete signup, so there is no seated organisation').toMatchObject({ ok: true });
      if (!ownerCompletion.ok || ownerCompletion.organizationId === null) return;

      const wouldBeSecond = await sut.registerWithEmailPassword(w.email('would-be-second-17'), PASSWORD);
      const secondCompletion = await sut.completeSignup(
        wouldBeSecond,
        { accountType: 'ngo', organizationName: 'Northgate Foodbank 17', acknowledgmentTextVersion: TEXT_VERSION },
        CLIENT_IP,
      );
      expect(secondCompletion, 'the second NGO account could not complete signup').toMatchObject({ ok: true });
      if (!secondCompletion.ok) return;

      // BOTH ROLES ARE ATTEMPTED: "a second member" is not a claim about which role the second
      // account would have held.
      for (const role of ['admin', 'member'] as const) {
        const seated = await sut.grantMembershipAsOperator(ownerCompletion.organizationId, secondCompletion.accountId, role);
        expect(seated.ok, `a second ${role} was seated in an organisation that already holds its one seat`).toBe(false);
        if (seated.ok) return;
        expect(seated.kind, `the second ${role} was refused for a reason other than the seat being taken`).toBe('org-already-seated');
      }

      // AND THE ORGANISATION STILL HOLDS EXACTLY ONE SEAT, its owner's. A refusal that seated the
      // caller anyway would pass every assertion above.
      expect(
        (await sut.membershipsOf(secondCompletion.accountId)).map((row) => row.organizationId),
        'the refused grant seated the second account in the first organisation anyway',
      ).not.toContain(ownerCompletion.organizationId);
      expect(
        await sut.membership(ownerCompletion.organizationId, ownerCompletion.accountId),
        'the owner lost its own seat',
      ).toMatchObject({ role: 'admin' });
    },
    integration: at00117,
  },
);

atTest('AT-001.18', 'every NGO-side action succeeds under the one account with its own preconditions met', notLanded(LEAF.D3_L3));

atTest(
  'AT-001.19',
  'every acknowledgment records the acting person name, title and authority attestation',
  {
    default: async ({ open }) => {
      const { w, sut } = await open();

      // BOTH ACCOUNT TYPES, because the criterion's words are "any acknowledgment moment" and the
      // two types reach the one moment by different routes: an NGO completes with an organisation,
      // a volunteer completes with a linked GitHub identity. A rule that captured the fields on one
      // route and not the other would satisfy a single-type test and fail the criterion.
      const ngoSession = await sut.registerWithEmailPassword(w.email('ngo-signer'), PASSWORD);
      const ngoCompletion = await sut.completeSignup(
        ngoSession,
        {
          accountType: 'ngo',
          organizationName: 'Riverside Shelter Who Signed',
          acknowledgmentTextVersion: TEXT_VERSION,
          ...SIGNER,
        },
        CLIENT_IP,
      );
      expect(ngoCompletion, 'the NGO completion carrying all three identity fields was refused').toMatchObject({ ok: true });
      if (!ngoCompletion.ok) return;

      // The volunteer arrives through a github-established session, which is the state Auth is in
      // after a consent round trip and carries the linked identity the volunteer gate requires. No
      // handshake is simulated; see AT-001.02's own note.
      const volunteerSession = await sut.registerWithGithub(w.email('volunteer-signer'), 'riverside-signer');
      const volunteerCompletion = await sut.completeSignup(
        volunteerSession,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(volunteerCompletion, 'the volunteer completion carrying all three identity fields was refused').toMatchObject({
        ok: true,
      });
      if (!volunteerCompletion.ok) return;

      for (const [label, accountId] of [
        ['ngo', ngoCompletion.accountId],
        ['volunteer', volunteerCompletion.accountId],
      ] as const) {
        const acknowledgments = await sut.acknowledgments(accountId);
        expect(acknowledgments, `exactly one platform acknowledgment is recorded by one ${label} completion`).toHaveLength(1);
        const row = acknowledgments[0];

        // EACH FIELD BY ITS VALUE, because a row holding three empty strings records nothing while
        // looking like a record — the discipline AT-001.01 applies to its own three fields.
        expect(row.signerName, `the ${label} acknowledgment does not record the name that was submitted`).toBe(
          SIGNER.signerName,
        );
        expect(row.signerTitle, `the ${label} acknowledgment does not record the title that was submitted`).toBe(
          SIGNER.signerTitle,
        );
        // THE STATEMENT, NOT A FLAG. What is stored is WHAT was attested, so it is compared against
        // the shipped statement rather than merely being non-empty.
        expect(
          row.authorityAttestation,
          `the ${label} acknowledgment does not record the authority statement that was affirmed`,
        ).toBe(ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement);
      }
    },
    integration: at00119,
  },
);

atTest(
  'AT-001.39',
  'an acknowledgment missing any of name, title or attestation is rejected and records nothing',
  {
    default: async ({ open }) => {
      const { w, sut } = await open();

      const omitting = (field: keyof typeof SIGNER): Record<string, unknown> => {
        const identity: Record<string, unknown> = { ...SIGNER };
        delete identity[field];
        return identity;
      };
      // WHITESPACE IS NOT A VALUE. A blank field passes any "was it sent?" check and records
      // nobody, so the criterion's "omitted" has to cover it or the guard is one `'   '` wide.
      const blanking = (field: keyof typeof SIGNER): Record<string, unknown> => ({ ...SIGNER, [field]: '   ' });

      // SEVEN VARIANTS. Three omissions and three blanks are the criterion's own negative path. The
      // seventh is the one a presence check cannot catch: an attestation that is present, non-blank
      // and says the opposite of what it must attest. A rule that only asked "is it non-empty?"
      // would store `'I am not authorized'` AS an attestation of authority.
      const variants = [
        { slug: 'omitted-name', identity: omitting('signerName'), names: /signer name/i, mismatch: false },
        { slug: 'omitted-title', identity: omitting('signerTitle'), names: /signer title/i, mismatch: false },
        {
          slug: 'omitted-attestation',
          identity: omitting('authorityAttestation'),
          names: /authority attestation/i,
          mismatch: false,
        },
        { slug: 'blank-name', identity: blanking('signerName'), names: /signer name/i, mismatch: false },
        { slug: 'blank-title', identity: blanking('signerTitle'), names: /signer title/i, mismatch: false },
        {
          slug: 'blank-attestation',
          identity: blanking('authorityAttestation'),
          names: /authority attestation/i,
          mismatch: false,
        },
        {
          slug: 'wrong-attestation',
          identity: { ...SIGNER, authorityAttestation: 'I am not authorized' },
          names: /authority attestation/i,
          mismatch: true,
        },
      ];

      for (const variant of variants) {
        const session = await sut.registerWithEmailPassword(w.email(variant.slug), PASSWORD);
        const organizationName = `Riverside Shelter ${variant.slug}`;
        const refused = await sut.completeSignup(
          session,
          { accountType: 'ngo', organizationName, acknowledgmentTextVersion: TEXT_VERSION, ...variant.identity },
          CLIENT_IP,
        );

        expect(refused.ok, `signup completed with ${variant.slug}`).toBe(false);
        if (refused.ok) return;

        // THE REFUSAL NAMES ITS FIELD. A caller told only that "something is missing" has nothing to
        // correct, and the screen a later leaf builds would have nothing to display.
        expect(refused.reason, `the refusal does not name the field at fault (${variant.slug})`).toMatch(variant.names);
        if (variant.mismatch) {
          expect(
            refused.reason,
            'the refusal does not say the attestation is not the shipped authority statement',
          ).toMatch(/does not match the shipped authority statement/i);
        } else {
          // WHICH CHECK REFUSED, pinned. A missing or blank field must be refused for BEING missing,
          // not by the content comparison further down — otherwise the two checks are one and a
          // future reordering could not be noticed.
          expect(
            refused.reason,
            `a missing or blank field was refused by the content check rather than the presence check (${variant.slug})`,
          ).not.toMatch(/does not match/i);
        }

        // "NO ACKNOWLEDGMENT RECORD IS CREATED" INCLUDES EVERY OTHER WRITE THE COMPLETION MAKES. The
        // weakest implementation that passes the assertions above writes the account, the
        // organisation and the membership and then reports a refusal, which is not a rejection — it
        // is a half-completed signup with a rude message. The organisation is looked for BY THE NAME
        // that was attempted, and the memberships by the account, because a refusal hands back no
        // identifier to look either of them up by.
        expect(await sut.account(session.accountId), `the refused completion left an account row behind (${variant.slug})`).toBeNull();
        expect(
          await sut.acknowledgments(session.accountId),
          `the refused completion recorded an acknowledgment anyway (${variant.slug})`,
        ).toEqual([]);
        expect(
          await sut.hasPlatformAcknowledgment(session.accountId),
          `the refused completion left the account holding the platform acknowledgment (${variant.slug})`,
        ).toBe(false);
        expect(
          await sut.organizationsNamed(organizationName),
          `the refused completion created the organisation anyway (${variant.slug})`,
        ).toEqual([]);
        expect(
          await sut.membershipsOf(session.accountId),
          `the refused completion left a membership behind (${variant.slug})`,
        ).toEqual([]);
      }

      // THE CONTROL, AND IT IS NOT OPTIONAL. A completion path that refused everything would satisfy
      // all seven refusals above. A request differing ONLY in that it carries all three fields, as
      // shipped, must succeed — which is what makes each refusal attributable to its own field.
      const control = await sut.registerWithEmailPassword(w.email('all-three'), PASSWORD);
      const completed = await sut.completeSignup(
        control,
        {
          accountType: 'ngo',
          organizationName: 'Riverside Shelter All Three',
          acknowledgmentTextVersion: TEXT_VERSION,
          ...SIGNER,
        },
        CLIENT_IP,
      );
      expect(completed, 'the control completion carrying all three fields was refused, so the refusals prove nothing').toMatchObject(
        { ok: true },
      );
      if (!completed.ok) return;
      expect(
        await sut.acknowledgments(completed.accountId),
        'the control completion recorded no acknowledgment',
      ).toHaveLength(1);
    },
    integration: at00139,
  },
);

atTest(
  'AT-001.20',
  'acknowledgment copy prohibits shared credentials and recommends an org email',
  async ({ open }) => {
    // ONE BODY, BOTH TIERS. The article under test is the CONTENT of the shipped copy, and content
    // does not change with the tier: no deployed surface reports copy, so an integration procedure
    // would read the same constant through a longer path and prove the same thing.
    //
    // THE WORLD IS OPENED because every id in this suite runs against a real harness handshake, and
    // an id that opened nothing would be a test the harness never saw.
    await open();

    // MEANING, NOT MERE EXISTENCE. A non-empty string satisfies "copy exists"; the criterion says
    // shared credentials are STATED AS PROHIBITED and an org email is RECOMMENDED, so each clause
    // is asserted by its subject and by its verb.
    expect(
      ACKNOWLEDGMENT_IDENTITY_COPY.sharedCredentialsProhibition,
      'the copy does not mention shared credentials',
    ).toMatch(/shared credential/i);
    expect(
      ACKNOWLEDGMENT_IDENTITY_COPY.sharedCredentialsProhibition,
      'the copy mentions shared credentials without prohibiting them',
    ).toMatch(/prohibit/i);

    expect(
      ACKNOWLEDGMENT_IDENTITY_COPY.orgEmailRecommendation,
      'the copy does not mention an organisation email address',
    ).toMatch(/organi[sz]ation email/i);
    expect(
      ACKNOWLEDGMENT_IDENTITY_COPY.orgEmailRecommendation,
      'the copy mentions an organisation email without recommending one',
    ).toMatch(/recommend/i);

    // The third string is the statement AT-001.19 submits and the deployed validation enforces, so
    // it is asserted here only for being a statement at all.
    expect(
      ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement.trim(),
      'the shipped authority statement is blank — there is nothing for a person to affirm',
    ).not.toBe('');
  },
);
