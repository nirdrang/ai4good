import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import { at00116, at00117, at00119, at00136, at00137, at00139, INTEGRATION_TIMEOUT_MS } from './_integration.ts';
import { LEAF, notLanded } from './_pending.ts';
import { inviteOrAddMemberSurface } from './_source-scan.ts';
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const CLIENT_IP = '203.0.113.7';
const PASSWORD = 'correct horse battery staple';
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

      const session = await sut.registerWithEmailPassword(w.email('two-orgs-16'), PASSWORD);
      const completion = await sut.completeSignup(
        session,
        { accountType: 'ngo', organizationName: NAME_A, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(completion, 'the NGO actor could not complete signup, so nothing below is about a seated admin').toMatchObject({ ok: true });
      if (!completion.ok || completion.organizationId === null) return;

      const organizationB = await sut.createOrganizationAsOperator(NAME_B);
      const seated = await sut.grantMembershipAsOperator(organizationB.id, completion.accountId, 'member');
      expect(seated, `the operator could not seat the actor as ${NAME_B}'s single member, so the Given does not exist`).toMatchObject({
        ok: true,
      });
      const organizationC = await sut.createOrganizationAsOperator(NAME_C);

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

      const renamed = await sut.updateOrganization(session, completion.organizationId, RENAMED_A);
      expect(renamed, 'A\'s own admin was refused the admin-only action, so the refusals below prove nothing').toMatchObject({ ok: true });
      expect(await sut.organization(completion.organizationId), 'the rename did not reach the row').toMatchObject({ name: RENAMED_A });

      const refusedInB = await sut.updateOrganization(session, organizationB.id, ATTEMPTED_B);
      expect(refusedInB.ok, 'A\'s admin renamed an organisation where it holds only the member role').toBe(false);
      if (refusedInB.ok) return;
      expect(refusedInB.kind, 'the refusal in B is not the not-an-admin one').toBe('not-an-admin');
      expect(await sut.organization(organizationB.id), 'the refused rename reached B\'s row anyway').toMatchObject({ name: NAME_B });
      expect(await sut.organizationsNamed(ATTEMPTED_B), 'the refused rename created an organisation by the attempted name').toEqual([]);

      const refusedInC = await sut.updateOrganization(session, organizationC.id, ATTEMPTED_C);
      expect(refusedInC.ok, 'the actor renamed an organisation it holds no membership in').toBe(false);
      if (refusedInC.ok) return;
      expect(refusedInC.kind, 'the refusal in C is not the not-a-member one').toBe('not-a-member');
      expect(await sut.organization(organizationC.id), 'the refused rename reached C\'s row anyway').toMatchObject({ name: NAME_C });
      expect(await sut.organizationsNamed(ATTEMPTED_C), 'the refused rename created an organisation by the attempted name').toEqual([]);

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
        { accountType: 'ngo', organizationName: NAME_A, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(completion, 'the actor could not complete signup, so it is nobody\'s admin').toMatchObject({ ok: true });
      if (!completion.ok || completion.organizationId === null) return;

      const organizationB = await sut.createOrganizationAsOperator(NAME_B);
      const seated = await sut.grantMembershipAsOperator(organizationB.id, completion.accountId, 'member');
      expect(seated, 'the member seat could not be provisioned, so this criterion has no Given').toMatchObject({ ok: true });

      expect(await sut.membership(completion.organizationId, completion.accountId), 'the actor is not A\'s admin').toMatchObject({
        accountId: completion.accountId,
        role: 'admin',
      });
      expect(await sut.membership(organizationB.id, completion.accountId), 'the actor is not B\'s member').toMatchObject({
        accountId: completion.accountId,
        role: 'member',
      });

      const inA = await sut.updateOrganization(session, completion.organizationId, RENAMED_A);
      expect(inA, 'the admin-only action failed where the caller IS the admin').toMatchObject({ ok: true });
      expect(await sut.organization(completion.organizationId)).toMatchObject({ name: RENAMED_A });

      const inB = await sut.updateOrganization(session, organizationB.id, ATTEMPTED_B);
      expect(inB.ok, 'the same account performed the admin-only action where it holds the member role').toBe(false);
      if (inB.ok) return;
      expect(inB.kind, 'the refusal is not the not-an-admin one').toBe('not-an-admin');
      expect(
        inB.kind,
        'the refusal came back as not-a-member, which would mean the member row was not found rather than not sufficient',
      ).not.toBe('not-a-member');

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
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(completion, 'the volunteer could not complete signup, so nothing below is about a volunteer account').toMatchObject({
        ok: true,
      });
      if (!completion.ok) return;
      expect(await sut.account(completion.accountId), 'the account under test is not a volunteer').toMatchObject({
        accountType: 'volunteer',
      });

      const ngoOnly = await sut.createOrganization(volunteer, ATTEMPTED_ORG);
      expect(ngoOnly.ok, 'a volunteer performed the NGO-only action and would have been seated as its admin').toBe(false);
      expect(await sut.organizationsNamed(ATTEMPTED_ORG), 'the refused action created an organisation').toEqual([]);

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

      const organization = await sut.createOrganizationAsOperator(OPERATOR_ORG);
      for (const role of ['admin', 'member'] as const) {
        const granted = await sut.grantMembershipAsOperator(organization.id, completion.accountId, role);
        expect(granted.ok, `an operator granted the ${role} role to a volunteer account`).toBe(false);
        if (granted.ok) return;
        expect(granted.kind, `the ${role} grant was refused for a reason other than the account type`).toBe('not-an-ngo-account');
      }

      expect(await sut.membershipsOf(completion.accountId), 'the volunteer holds a per-organisation role after every path refused').toEqual(
        [],
      );
      expect(await sut.membership(organization.id, completion.accountId), 'the refused grant wrote a membership row').toBeNull();

      const control = await sut.registerWithEmailPassword(w.email('ngo-control-37'), PASSWORD);
      const controlCompletion = await sut.completeSignup(
        control,
        { accountType: 'ngo', organizationName: 'Riverside Shelter Control 37', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(controlCompletion, 'the NGO control could not complete signup').toMatchObject({ ok: true });
      if (!controlCompletion.ok) return;
      const controlGrant = await sut.grantMembershipAsOperator(organization.id, controlCompletion.accountId, 'member');
      expect(controlGrant, 'the operator grant refuses an NGO account too, so the refusals above prove nothing').toMatchObject({ ok: true });

      const repointed = await sut.repointMembershipAsOperator(organization.id, completion.accountId);
      expect(repointed.ok, 'an operator re-pointed a seated membership at a volunteer account').toBe(false);
      if (repointed.ok) return;
      expect(repointed.kind, 'the re-point was refused for a reason other than the account type').toBe('not-an-ngo-account');

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

      expect(
        inviteOrAddMemberSurface(),
        'the app carries a route named like an invite or add-member surface, so "UI absent" is no longer true',
      ).toEqual([]);

      const surface = Object.keys(sut).filter((name) => /invite|add[-_]?member|adduser|add[-_]?user/i.test(name));
      expect(surface, 'the accounts surface offers an invite or add-member operation').toEqual([]);

      const owner = await sut.registerWithEmailPassword(w.email('single-seat-owner-17'), PASSWORD);
      const ownerCompletion = await sut.completeSignup(
        owner,
        { accountType: 'ngo', organizationName: 'Riverside Shelter 17', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(ownerCompletion, 'the NGO owner could not complete signup, so there is no seated organisation').toMatchObject({ ok: true });
      if (!ownerCompletion.ok || ownerCompletion.organizationId === null) return;

      const wouldBeSecond = await sut.registerWithEmailPassword(w.email('would-be-second-17'), PASSWORD);
      const secondCompletion = await sut.completeSignup(
        wouldBeSecond,
        { accountType: 'ngo', organizationName: 'Northgate Foodbank 17', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(secondCompletion, 'the second NGO account could not complete signup').toMatchObject({ ok: true });
      if (!secondCompletion.ok) return;

      for (const role of ['admin', 'member'] as const) {
        const seated = await sut.grantMembershipAsOperator(ownerCompletion.organizationId, secondCompletion.accountId, role);
        expect(seated.ok, `a second ${role} was seated in an organisation that already holds its one seat`).toBe(false);
        if (seated.ok) return;
        expect(seated.kind, `the second ${role} was refused for a reason other than the seat being taken`).toBe('org-already-seated');
      }

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

        expect(row.signerName, `the ${label} acknowledgment does not record the name that was submitted`).toBe(
          SIGNER.signerName,
        );
        expect(row.signerTitle, `the ${label} acknowledgment does not record the title that was submitted`).toBe(
          SIGNER.signerTitle,
        );
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
      const blanking = (field: keyof typeof SIGNER): Record<string, unknown> => ({ ...SIGNER, [field]: '   ' });

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

        expect(refused.reason, `the refusal does not name the field at fault (${variant.slug})`).toMatch(variant.names);
        if (variant.mismatch) {
          expect(
            refused.reason,
            'the refusal does not say the attestation is not the shipped authority statement',
          ).toMatch(/does not match the shipped authority statement/i);
        } else {
          expect(
            refused.reason,
            `a missing or blank field was refused by the content check rather than the presence check (${variant.slug})`,
          ).not.toMatch(/does not match/i);
        }

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
    await open();

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

    expect(
      ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement.trim(),
      'the shipped authority statement is blank — there is nothing for a person to affirm',
    ).not.toBe('');
  },
);
