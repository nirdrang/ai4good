import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import { at00101, at00105, at00106, at00107, at00141 } from './_integration.ts';
import { identityPermanenceProblems } from './_policy-scan.ts';
import { stubGithubStatsFor } from '../../../../supabase/functions/_shared/github.ts';
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const SIGNER = {
  signerName: 'Dana Okonkwo',
  signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
} as const;
const CLIENT_IP = '203.0.113.7';
const PASSWORD = 'correct horse battery staple';

describe('AT-REQ-001 A — signup and sign-in', () => {
  atTest(
    'AT-001.01',
    'NGO email/password signup creates the account, org, admin membership and acknowledgment; sign-in returns',
    { surface: 'ui' },
    {
      default: async ({ open }) => {
        const { w, sut } = await open();
        const email = w.email('ngo-signup');
        const password = 'correct horse battery staple';
  
        const session = await sut.registerWithEmailPassword(email, password);
  
        expect(
          await sut.hasPlatformAcknowledgment(session.accountId),
          'a user who has authenticated but not completed signup must NOT hold the platform acknowledgment',
        ).toBe(false);
  
        const completion = await sut.completeSignup(
          session,
          {
            accountType: 'ngo',
            organizationName: 'Riverside Shelter',
            acknowledgmentTextVersion: TEXT_VERSION,
            ...SIGNER,
          },
          CLIENT_IP,
        );
        expect(completion, 'the NGO completion was refused').toMatchObject({ ok: true });
        if (!completion.ok) return;
        expect(completion.organizationId, 'an NGO completion produced no organisation').not.toBeNull();
  
        expect(await sut.account(completion.accountId)).toEqual({
          id: session.accountId,
          accountType: 'ngo',
          lifecycle: 'active',
        });
  
        expect(await sut.organization(completion.organizationId!)).toMatchObject({ name: 'Riverside Shelter' });
  
        expect(await sut.membership(completion.organizationId!, completion.accountId)).toEqual({
          organizationId: completion.organizationId,
          accountId: completion.accountId,
          role: 'admin',
        });
  
        const acknowledgments = await sut.acknowledgments(completion.accountId);
        expect(acknowledgments, 'exactly one platform acknowledgment is recorded by one completion').toHaveLength(1);
        const acknowledgment = acknowledgments[0];
        expect(acknowledgment.textVersion, 'the acknowledgment must say WHICH text was accepted').toBe(TEXT_VERSION);
        expect(acknowledgment.ip, 'the acknowledgment must record the reported address').toBe(CLIENT_IP);
        expect(
          Number.isFinite(Date.parse(acknowledgment.acknowledgedAt)),
          `the acknowledgment timestamp ${JSON.stringify(acknowledgment.acknowledgedAt)} is not a readable instant`,
        ).toBe(true);
  
        expect(
          await sut.hasPlatformAcknowledgment(completion.accountId),
          'the platform acknowledgment must be held once signup has completed',
        ).toBe(true);
  
        const returning = await sut.signInWithEmailPassword(email, password);
        expect(returning, 'the same credentials did not sign in again').toMatchObject({ ok: true });
        if (!returning.ok) return;
        expect(returning.session.accountId).toBe(session.accountId);
  
        const withoutAcknowledgment = await sut.registerWithEmailPassword(w.email('no-acknowledgment'), password);
        const refused = await sut.completeSignup(
          withoutAcknowledgment,
          { accountType: 'ngo', organizationName: 'Riverside Shelter Annexe' },
          CLIENT_IP,
        );
        expect(refused.ok, 'signup completed with no acknowledgment of the ToS and Platform Promise').toBe(false);
        if (refused.ok) return;
        expect(refused.reason, 'the refusal does not say the acknowledgment is what is missing').toMatch(/acknowledgment/i);
        expect(
          await sut.account(withoutAcknowledgment.accountId),
          'the refused completion left an account row behind',
        ).toBeNull();
        expect(
          await sut.hasPlatformAcknowledgment(withoutAcknowledgment.accountId),
          'the refused completion recorded an acknowledgment anyway',
        ).toBe(false);
      },
      integration: at00101,
    },
  );

  atTest(
    'AT-001.02',
    'GitHub OAuth volunteer signup links the identity and returns to the same account',
    { surface: 'ui' },
    async ({ open }) => {
      const { w, sut } = await open();

      const email = w.email('github-volunteer');
      const HANDLE = 'riverside-octocat';

      const session = await sut.registerWithGithub(email, HANDLE);
      expect(
        session.provider,
        'this test is about a github-established session; if it is not github, nothing below is about AT-001.02',
      ).toBe('github');

      const completion = await sut.completeSignup(
        session,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(completion, 'a GitHub volunteer signup was refused at completion').toMatchObject({ ok: true });
      if (!completion.ok) return;

      expect(await sut.account(completion.accountId)).toEqual({
        id: session.accountId,
        accountType: 'volunteer',
        lifecycle: 'active',
      });
      expect(completion.organizationId, 'a volunteer completion must create no organisation').toBeNull();

      const profile = await sut.volunteerProfile(completion.accountId);
      expect(profile, 'the completed GitHub volunteer signup carries no linked handle anywhere').not.toBeNull();
      if (!profile) return;
      expect(profile.githubHandle, 'the recorded handle is not the one that signed up').toBe(HANDLE);

      const returning = await sut.signInWithProvider('github', email);
      expect(returning, 'a later sign-in via GitHub did not succeed').toMatchObject({ ok: true });
      if (!returning.ok) return;
      expect(
        returning.session.accountId,
        'the GitHub return visit resolved to a DIFFERENT account than the one it signed up',
      ).toBe(session.accountId);
      expect(returning.session.provider).toBe('github');

      expect(await sut.account(returning.session.accountId)).toMatchObject({ accountType: 'volunteer' });
    },
  );

  atTest(
    'AT-001.03',
    'a session established by Google completes signup through the same path, with the same result as email',
    { surface: 'ui' },
    async ({ open }) => {
      const { w, sut } = await open();

      const googleSession = await sut.registerWithProvider('google', w.email('google-ngo'));
      expect(
        googleSession.provider,
        'this test compares a google-established session against an email one; if it is not google, it compares nothing',
      ).toBe('google');

      const emailSession = await sut.registerWithEmailPassword(w.email('email-ngo'), 'correct horse battery staple');
      expect(emailSession.provider).toBe('email');

      const request = {
        accountType: 'ngo' as const,
        organizationName: 'Riverside Shelter',
        acknowledgmentTextVersion: TEXT_VERSION,
        ...SIGNER,
      };

      const viaGoogle = await sut.completeSignup(googleSession, request, CLIENT_IP);
      const viaEmail = await sut.completeSignup(emailSession, request, CLIENT_IP);
      expect(viaGoogle, 'a signup whose session came from Google was refused').toMatchObject({ ok: true });
      expect(viaEmail, 'the email control signup was refused, so there is nothing to compare against').toMatchObject({ ok: true });
      if (!viaGoogle.ok || !viaEmail.ok) return;

      const observable = async (accountId: string, organizationId: string | null) => {
        const acknowledgments = await sut.acknowledgments(accountId);
        return {
          accountType: (await sut.account(accountId))?.accountType ?? null,
          organizationName: organizationId ? ((await sut.organization(organizationId))?.name ?? null) : null,
          membershipRole: organizationId ? ((await sut.membership(organizationId, accountId))?.role ?? null) : null,
          acknowledgmentCount: acknowledgments.length,
          acknowledgmentTextVersion: acknowledgments[0]?.textVersion ?? null,
          acknowledgmentIp: acknowledgments[0]?.ip ?? null,
          holdsPlatformAcknowledgment: await sut.hasPlatformAcknowledgment(accountId),
        };
      };

      const googleResult = await observable(viaGoogle.accountId, viaGoogle.organizationId);
      expect(googleResult, 'signup via Google produced a different result from signup via email').toEqual(
        await observable(viaEmail.accountId, viaEmail.organizationId),
      );
      expect(googleResult).toMatchObject({
        accountType: 'ngo',
        membershipRole: 'admin',
        acknowledgmentCount: 1,
        acknowledgmentTextVersion: TEXT_VERSION,
        holdsPlatformAcknowledgment: true,
      });

      const googleVolunteer = await sut.registerWithProvider('google', w.email('google-volunteer'));
      await sut.linkGithubIdentity(googleVolunteer, 'google-volunteer-handle');
      const volunteerCompletion = await sut.completeSignup(
        googleVolunteer,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(volunteerCompletion, 'a volunteer signup whose session came from Google was refused').toMatchObject({ ok: true });
      if (!volunteerCompletion.ok) return;
      expect(await sut.account(volunteerCompletion.accountId)).toMatchObject({ accountType: 'volunteer' });
      expect(volunteerCompletion.organizationId, 'a volunteer completion must create no organisation').toBeNull();
    },
  );

  atTest(
    'AT-001.04',
    'volunteer signup cannot complete without a linked GitHub account',
    { surface: 'ui' },
    async ({ open }) => {
      const { w, sut } = await open();

      const request = { accountType: 'volunteer' as const, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER };

      const byEmail = await sut.registerWithEmailPassword(w.email('email-volunteer'), PASSWORD);
      const byGoogle = await sut.registerWithProvider('google', w.email('google-volunteer'));
      expect(byEmail.provider).toBe('email');
      expect(byGoogle.provider, 'the google half of this criterion is not being driven by a google session').toBe('google');

      for (const session of [byEmail, byGoogle]) {
        const refused = await sut.completeSignup(session, request, CLIENT_IP);
        expect(
          refused.ok,
          `a ${session.provider}-established volunteer completed signup with no linked GitHub account`,
        ).toBe(false);
        if (refused.ok) return;

        expect(refused.reason, 'the refusal does not name GitHub').toMatch(/github/i);
        expect(refused.reason, 'the refusal does not say that LINKING is what is required').toMatch(/link/i);

        expect(await sut.account(session.accountId), 'the blocked completion left an account row behind').toBeNull();
        expect(
          await sut.volunteerProfile(session.accountId),
          'the blocked completion imported a GitHub profile anyway',
        ).toBeNull();
        expect(
          await sut.acknowledgments(session.accountId),
          'the blocked completion recorded an acknowledgment anyway',
        ).toEqual([]);
        expect(
          await sut.hasPlatformAcknowledgment(session.accountId),
          'the blocked completion left the account holding the platform acknowledgment',
        ).toBe(false);
      }

      for (const session of [byEmail, byGoogle]) {
        await sut.linkGithubIdentity(session, `${session.provider}-volunteer-handle`);
        const completion = await sut.completeSignup(session, request, CLIENT_IP);
        expect(
          completion,
          `linking GitHub did not unblock the ${session.provider}-established volunteer's completion`,
        ).toMatchObject({ ok: true });
        if (!completion.ok) return;
        expect(await sut.account(completion.accountId)).toMatchObject({ accountType: 'volunteer' });
        expect(
          await sut.hasPlatformAcknowledgment(completion.accountId),
          'the completion that the link unblocked recorded no acknowledgment',
        ).toBe(true);
      }

      const ngoSession = await sut.registerWithEmailPassword(w.email('ngo-control'), PASSWORD);
      const ngoCompletion = await sut.completeSignup(
        ngoSession,
        { accountType: 'ngo', organizationName: 'Riverside Shelter', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(
        ngoCompletion,
        'the GitHub gate leaked onto NGO signup, which links no GitHub account and is outside this criterion',
      ).toMatchObject({ ok: true });
      if (!ngoCompletion.ok) return;
      expect(
        await sut.volunteerProfile(ngoCompletion.accountId),
        'an NGO completion wrote a volunteer GitHub profile',
      ).toBeNull();
    },
  );

  atTest(
    'AT-001.05',
    'linking GitHub fires volunteer onboarding with the public stats observably imported',
    {
      default: async ({ open }) => {
        const { w, sut } = await open();
  
        const HANDLE = 'riverside-contributor';
        const expected = stubGithubStatsFor(HANDLE);
  
        const session = await sut.registerWithEmailPassword(w.email('volunteer-import'), PASSWORD);
        await sut.linkGithubIdentity(session, HANDLE);
  
        expect(
          await sut.volunteerProfile(session.accountId),
          'a profile existed after linking and BEFORE completion — the import is not caused by completion, or an empty row is queued',
        ).toBeNull();
  
        const completion = await sut.completeSignup(
          session,
          { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
          CLIENT_IP,
        );
        expect(completion, 'the linked volunteer signup was refused, so onboarding had nothing to fire from').toMatchObject({
          ok: true,
        });
        if (!completion.ok) return;
  
        const profile = await sut.volunteerProfile(completion.accountId);
        expect(profile, 'volunteer onboarding did not fire: no profile exists after a linked completion').not.toBeNull();
        if (!profile) return;
  
        expect(profile.githubHandle, 'the profile does not carry the handle that was linked').toBe(HANDLE);
  
        expect(
          profile.topLanguages.length,
          'top languages came back empty — a queued-but-empty import fails this test',
        ).toBeGreaterThan(0);
        expect(profile.topLanguages, 'top languages are not what the declared import source produced for this handle').toEqual(
          expected.topLanguages,
        );
  
        expect(
          Number.isInteger(profile.repositoryCount) && profile.repositoryCount >= 0,
          `repository count ${JSON.stringify(profile.repositoryCount)} is not a non-negative whole number of repositories`,
        ).toBe(true);
        expect(profile.repositoryCount).toBe(expected.repositoryCount);
  
        expect(
          profile.contributionSummary.trim(),
          'the contribution summary is blank — a queued-but-empty import fails this test',
        ).not.toBe('');
        expect(profile.contributionSummary).toBe(expected.contributionSummary);
  
        expect(await sut.account(completion.accountId)).toMatchObject({ accountType: 'volunteer' });
        expect(
          await sut.hasPlatformAcknowledgment(completion.accountId),
          'the completion that fired the import recorded no acknowledgment, so the rows did not land together',
        ).toBe(true);
      },
      integration: at00105,
    },
  );

  atTest(
    'AT-001.06',
    'a volunteer is refused the NGO-only action while an NGO account performs it successfully',
    {
      default: async ({ open }) => {
        const { w, sut } = await open();
  
        const ngoSession = await sut.registerWithEmailPassword(w.email('ngo-actor'), 'correct horse battery staple');
        const ngoCompletion = await sut.completeSignup(
          ngoSession,
          { accountType: 'ngo', organizationName: 'Riverside Shelter', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
          CLIENT_IP,
        );
        expect(ngoCompletion, 'the NGO control could not complete signup').toMatchObject({ ok: true });
        if (!ngoCompletion.ok) return;
  
        const ngoAction = await sut.createOrganization(ngoSession, 'Riverside Shelter Second Programme');
        expect(ngoAction, 'the NGO control was refused the NGO-only action, so the refusal below proves nothing').toMatchObject({
          ok: true,
        });
        if (!ngoAction.ok) return;
        expect(await sut.organization(ngoAction.organizationId)).toMatchObject({
          name: 'Riverside Shelter Second Programme',
        });
        expect(await sut.membership(ngoAction.organizationId, ngoCompletion.accountId)).toMatchObject({ role: 'admin' });
  
        const volunteerSession = await sut.registerWithEmailPassword(w.email('volunteer-actor'), PASSWORD);
        await sut.linkGithubIdentity(volunteerSession, 'volunteer-actor-handle');
        const volunteerCompletion = await sut.completeSignup(
          volunteerSession,
          { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
          CLIENT_IP,
        );
        expect(volunteerCompletion, 'the volunteer could not complete signup, so the refusal below is not the one under test').toMatchObject({
          ok: true,
        });
        if (!volunteerCompletion.ok) return;
  
        const REFUSED_NAME = 'Riverside Shelter Copy';
        const volunteerAction = await sut.createOrganization(volunteerSession, REFUSED_NAME);
        expect(volunteerAction.ok, 'a volunteer account performed an NGO-only action').toBe(false);
        if (volunteerAction.ok) return;
  
        const organizations = await sut.organizationsNamed(REFUSED_NAME);
        expect(organizations, `the refused action created an organisation named ${JSON.stringify(REFUSED_NAME)}`).toEqual([]);
        expect(
          await sut.membershipsOf(volunteerCompletion.accountId),
          'the refused action left the volunteer holding a membership',
        ).toEqual([]);
        expect(volunteerAction.reason).toMatch(/NGO accounts only/i);
        expect(volunteerAction.reason).toMatch(/volunteer/i);
      },
      integration: at00106,
    },
  );

  atTest(
    'AT-001.07',
    'a provisioned platform admin authenticates and carries the type; public signup offers only the two',
    { surface: 'ui' },
    {
      default: async ({ open }) => {
        const { w, sut } = await open();
  
        const adminEmail = w.email('platform-admin');
        const adminPassword = 'correct horse battery staple';
        const provisioned = await sut.provisionPlatformAdmin(adminEmail, adminPassword);
  
        const signedIn = await sut.signInWithEmailPassword(adminEmail, adminPassword);
        expect(signedIn, 'the provisioned platform admin could not sign in').toMatchObject({ ok: true });
        if (!signedIn.ok) return;
        expect(signedIn.session.accountId).toBe(provisioned.accountId);
        expect(
          await sut.account(signedIn.session.accountId),
          'the signed-in administrator does not carry the platform_admin global type',
        ).toMatchObject({ accountType: 'platform_admin' });
  
        expect(await sut.publicSignupAccountTypes()).toEqual(['ngo', 'volunteer']);
  
        const visitor = await sut.registerWithEmailPassword(w.email('would-be-admin'), adminPassword);
        const escalation = await sut.completeSignup(
          visitor,
          { accountType: 'platform_admin', acknowledgmentTextVersion: TEXT_VERSION },
          CLIENT_IP,
        );
        expect(escalation.ok, 'the public signup path minted a platform administrator').toBe(false);
        if (escalation.ok) return;
        expect(escalation.reason).toMatch(/platform_admin/);
        expect(
          await sut.account(visitor.accountId),
          'the refused escalation left an account row behind',
        ).toBeNull();
      },
      integration: at00107,
    },
  );

  atTest(
    'AT-001.41',
    'a volunteer cannot unlink the GitHub identity after signup',
    {
      default: async ({ open }) => {
        expect(identityPermanenceProblems(), 'the identity-permanence scan found a problem').toEqual([]);

        const { w, sut } = await open();

        const volunteer = await sut.registerWithEmailPassword(w.email('permanent-github'), PASSWORD);
        await sut.linkGithubIdentity(volunteer, 'permanent-github-handle');
        const volunteerCompletion = await sut.completeSignup(
          volunteer,
          { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
          CLIENT_IP,
        );
        expect(volunteerCompletion, 'the volunteer could not complete signup').toMatchObject({ ok: true });
        if (!volunteerCompletion.ok) return;

        const before = await sut.linkedIdentities(volunteer.accountId);
        expect(before.map((i) => i.provider), 'the Given is a volunteer holding email and github').toContain('github');
        expect(before.map((i) => i.provider), 'the Given is a volunteer holding email and github').toContain('email');

        await sut.unlinkGithubIdentity(volunteer, 'github');

        expect(
          (await sut.linkedIdentities(volunteer.accountId)).map((i) => i.provider),
          'the mandatory GitHub identity was unlinked',
        ).toContain('github');
        expect(await sut.authUserIsHealthy(volunteer), 'the refusal broke Auth for this user').toBe(true);

        const ngo = await sut.registerWithEmailPassword(w.email('ngo-with-github'), PASSWORD);
        await sut.linkGithubIdentity(ngo, 'ngo-github-handle');
        const ngoCompletion = await sut.completeSignup(
          ngo,
          {
            accountType: 'ngo',
            organizationName: 'Riverside Shelter 41',
            acknowledgmentTextVersion: TEXT_VERSION,
            ...SIGNER,
          },
          CLIENT_IP,
        );
        expect(ngoCompletion, 'the NGO control could not complete signup').toMatchObject({ ok: true });
        if (!ngoCompletion.ok) return;
        await sut.unlinkGithubIdentity(ngo, 'github');
        expect(
          (await sut.linkedIdentities(ngo.accountId)).map((i) => i.provider),
          'the control was refused too, so the refusal is not about volunteers',
        ).not.toContain('github');
      },
      integration: at00141,
    },
  );
});
