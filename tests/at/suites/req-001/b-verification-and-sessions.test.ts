import { expect } from 'vitest';
import { AT_CONFIG } from '../../harness/atconfig.ts';
import { atTest } from './_bind.ts';
import { at00109, at00110, at00112, at00113, at00114, at00138, INTEGRATION_TIMEOUT_MS } from './_integration.ts';
import type { AccountsSut } from './_contract.ts';
import { PUBLIC_SIGNUP_ACCOUNT_TYPES } from '../../../../supabase/functions/_shared/accounts.ts';
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const CLIENT_IP = '203.0.113.7';
const PASSWORD = 'correct horse battery staple';
const SIGNER = {
  signerName: 'Dana Okonkwo',
  signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
} as const;
const ACCESS_TOKEN_LIFETIME_MS = AT_CONFIG.accessTokenLifetimeSeconds.value * 1000;

atTest(
  'AT-001.09',
  'a fresh email/password signup of either account type is unverified until the link is used',
  { surface: 'ui' },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
  
      for (const accountType of PUBLIC_SIGNUP_ACCOUNT_TYPES) {
        const email = w.email(`verify-${accountType}`);
  
        const session = await sut.registerWithEmailPassword(email, PASSWORD);
        expect(
          await sut.emailVerified(session.accountId),
          `a fresh ${accountType} email/password signup must be email-unverified`,
        ).toBe(false);
  
        if (accountType === 'volunteer') {
          await sut.linkGithubIdentity(session, 'riverside-verifier');
        }
  
        const completion = await sut.completeSignup(
          session,
          {
            accountType,
            organizationName: accountType === 'ngo' ? 'Riverside Shelter' : undefined,
            acknowledgmentTextVersion: TEXT_VERSION,
            ...SIGNER,
          },
          CLIENT_IP,
        );
        expect(completion, `the ${accountType} completion was refused`).toMatchObject({ ok: true });
        if (!completion.ok) return;
        expect(await sut.account(completion.accountId)).toEqual({
          id: session.accountId,
          accountType,
          lifecycle: 'active',
        });
  
        expect(
          await sut.emailVerified(session.accountId),
          `completing ${accountType} signup must not verify the email address`,
        ).toBe(false);
  
        const neverIssued = await sut.useVerificationLink('never-issued-link');
        expect(neverIssued.ok, 'a verification link that was never issued must not succeed').toBe(false);
        expect(
          await sut.emailVerified(session.accountId),
          'a verification link that was never issued flipped the account to verified',
        ).toBe(false);
  
        const link = await sut.emailedVerificationLink(email);
        expect(link, `no verification link was emailed to the ${accountType} address`).not.toBeNull();
        const used = await sut.useVerificationLink(link!);
        expect(used.ok, 'the emailed verification link was refused').toBe(true);
        expect(
          await sut.emailVerified(session.accountId),
          'using the emailed verification link did not flip the account to verified',
        ).toBe(true);
  
        expect(await sut.account(completion.accountId)).toEqual({
          id: session.accountId,
          accountType,
          lifecycle: 'active',
        });
      }
    },
    integration: at00109,
  },
);

atTest(
  'AT-001.10',
  'an unverified NGO account is blocked from Discovery messages with verification named as the remedy',
  { surface: 'backend' },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
  
      const email = w.email('unverified-ngo');
      const session = await sut.registerWithEmailPassword(email, PASSWORD);
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
  
      expect(
        await sut.emailVerified(session.accountId),
        'this test is about an UNVERIFIED account; if it is verified, nothing below is about AT-001.10',
      ).toBe(false);
  
      const MESSAGE = 'Hello — we would like to talk about your project.';
  
      const blocked = await sut.sendDiscoveryMessage(session, MESSAGE);
      expect(blocked.ok, 'an unverified account was allowed to send a Discovery message').toBe(false);
      if (blocked.ok) return;
      expect(blocked.reason, 'the refusal does not name verification').toMatch(/verif/i);
      expect(blocked.reason, 'the refusal does not name the email address as what needs verifying').toMatch(/email/i);
  
      expect(
        await sut.discoveryMessagesBy(session.accountId),
        'the blocked Discovery message was recorded anyway',
      ).toEqual([]);
  
      const link = await sut.emailedVerificationLink(email);
      expect(link, 'no verification link was emailed to the NGO address').not.toBeNull();
      expect((await sut.useVerificationLink(link!)).ok, 'the emailed verification link was refused').toBe(true);
      expect(
        await sut.emailVerified(session.accountId),
        'using the emailed verification link did not flip the account to verified',
      ).toBe(true);
  
      const allowed = await sut.sendDiscoveryMessage(session, MESSAGE);
      expect(allowed.ok, 'the SAME Discovery message was still refused after verification').toBe(true);
      expect(
        await sut.discoveryMessagesBy(session.accountId),
        'the allowed Discovery message was not recorded',
      ).toEqual([MESSAGE]);
    },
    integration: at00110,
  },
);

const registerAndConfirm = async (
  sut: AccountsSut,
  email: string,
  password: string,
): Promise<{ email: string; accountId: string }> => {
  const registration = await sut.registerWithEmailPassword(email, password);
  const link = await sut.emailedVerificationLink(email);
  expect(link, `no verification link was emailed to ${email}`).not.toBeNull();
  expect((await sut.useVerificationLink(link!)).ok, 'the emailed verification link was refused').toBe(true);
  return { email, accountId: registration.accountId };
};

atTest(
  'AT-001.38',
  'sign-in with the correct email and a wrong password is rejected and creates no session',
  { surface: 'ui' },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
  
      const { email, accountId } = await registerAndConfirm(sut, w.email('wrong-password'), PASSWORD);
  
      const sessionsBeforeGoodSignIn = await sut.sessionsOf(accountId);
  
      const good = await sut.signInWithEmailPassword(email, PASSWORD);
      expect(good.ok, 'the correct password was refused — nothing below would be about AT-001.38').toBe(true);
      if (!good.ok) return;
  
      const sessionsAfterGoodSignIn = await sut.sessionsOf(good.session.accountId);
      expect(
        sessionsAfterGoodSignIn.length,
        'a successful sign-in must mint exactly one new session, or the second clause below has no oracle',
      ).toBe(sessionsBeforeGoodSignIn.length + 1);
  
      const bad = await sut.signInWithEmailPassword(email, 'not the password');
      expect(bad.ok, 'sign-in with the correct email and a WRONG password was accepted').toBe(false);
  
      if (bad.ok) return;
  
      expect(
        await sut.sessionsOf(good.session.accountId),
        'the rejected sign-in created a session',
      ).toEqual(sessionsAfterGoodSignIn);
    },
    integration: at00138,
  },
);

atTest(
  'AT-001.12',
  'an expired or revoked session ends access — the next request re-authenticates',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { h, w, sut } = await open();
  
      const { email } = await registerAndConfirm(sut, w.email('session-expiry'), PASSWORD);
  
      const first = await sut.signInWithEmailPassword(email, PASSWORD);
      expect(first.ok, 'the confirmed account could not sign in').toBe(true);
      if (!first.ok) return;
  
      const completion = await sut.completeSignup(
        first.session,
        { accountType: 'ngo', organizationName: 'Riverside Shelter', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(completion, 'the NGO completion was refused').toMatchObject({ ok: true });
      if (!completion.ok) return;
  
      const CONTROL_NAME = 'Riverside Shelter Control Programme';
      expect(
        (await sut.createOrganization(first.session, CONTROL_NAME)).ok,
        'a live session could not write — nothing below would be about the session layer',
      ).toBe(true);
  
      await h.clock.advance(ACCESS_TOKEN_LIFETIME_MS);
  
      const EXPIRED_NAME = 'Riverside Shelter Expired Programme';
      const afterExpiry = await sut.createOrganization(first.session, EXPIRED_NAME);
      expect(afterExpiry.ok, 'an EXPIRED session was allowed to write').toBe(false);
      expect(
        await sut.organizationsNamed(EXPIRED_NAME),
        'the refused write of an expired session created the organisation anyway',
      ).toEqual([]);
  
      const second = await sut.signInWithEmailPassword(email, PASSWORD);
      expect(second.ok, 'the account could not sign in again after its session expired').toBe(true);
      if (!second.ok) return;
      expect(second.session.accountId, 're-authentication returned a different account').toBe(first.session.accountId);
  
      expect(
        (await sut.createOrganization(second.session, EXPIRED_NAME)).ok,
        're-authentication did not restore the ability to write',
      ).toBe(true);
      expect(
        (await sut.organizationsNamed(EXPIRED_NAME)).length,
        'the write after re-authentication did not create the organisation',
      ).toBe(1);
  
      await sut.signOut(second.session);
  
      const REVOKED_NAME = 'Riverside Shelter Revoked Programme';
      const afterRevocation = await sut.createOrganization(second.session, REVOKED_NAME);
      expect(afterRevocation.ok, 'a REVOKED session was allowed to write').toBe(false);
      expect(
        await sut.organizationsNamed(REVOKED_NAME),
        'the refused write of a revoked session created the organisation anyway',
      ).toEqual([]);
  
      const third = await sut.signInWithEmailPassword(email, PASSWORD);
      expect(third.ok, 'the account could not sign in again after its session was revoked').toBe(true);
      if (!third.ok) return;
      expect(
        (await sut.createOrganization(third.session, REVOKED_NAME)).ok,
        'signing in again after revocation did not restore the ability to write',
      ).toBe(true);
      expect(
        (await sut.organizationsNamed(REVOKED_NAME)).length,
        'the write after re-authentication did not create the organisation',
      ).toBe(1);
    },
    integration: at00112,
  },
);

atTest(
  'AT-001.13',
  'a session in continuous use refreshes without a forced mid-work re-login',
  { surface: 'ui', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { h, w, sut } = await open();
  
      const { email } = await registerAndConfirm(sut, w.email('continuous-work'), PASSWORD);
  
      const refreshedSignIn = await sut.signInWithEmailPassword(email, PASSWORD);
      const controlSignIn = await sut.signInWithEmailPassword(email, PASSWORD);
      expect(refreshedSignIn.ok && controlSignIn.ok, 'the confirmed account could not open two sessions').toBe(true);
      if (!refreshedSignIn.ok || !controlSignIn.ok) return;
  
      const refreshed = refreshedSignIn.session;
      const control = controlSignIn.session;
      expect(refreshed.sessionId, 'two sign-ins returned ONE session — the pair below would prove nothing').not.toBe(control.sessionId);
      expect(control.accountId, 'the two sessions belong to different accounts').toBe(refreshed.accountId);
  
      const completion = await sut.completeSignup(
        refreshed,
        { accountType: 'ngo', organizationName: 'Riverside Shelter', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(completion, 'the NGO completion was refused').toMatchObject({ ok: true });
      if (!completion.ok) return;
  
      expect((await sut.createOrganization(refreshed, 'Riverside Programme One')).ok, 'the refreshed session could not write at the start').toBe(true);
      expect((await sut.createOrganization(control, 'Riverside Programme Two')).ok, 'the control session could not write at the start').toBe(true);
  
      await h.clock.advance(ACCESS_TOKEN_LIFETIME_MS - 1000);
      expect((await sut.createOrganization(refreshed, 'Riverside Programme Three')).ok, 'the refreshed session died before its expiry').toBe(true);
      expect((await sut.createOrganization(control, 'Riverside Programme Four')).ok, 'the control session died before its expiry').toBe(true);
  
      const refreshOutcome = await sut.refreshSession(refreshed);
      expect(refreshOutcome.ok, 'refreshing a live session was refused').toBe(true);
      if (!refreshOutcome.ok) return;
      expect(
        refreshOutcome.session.sessionId,
        'the refresh opened a NEW session instead of extending the one it was given',
      ).toBe(refreshed.sessionId);
      expect(refreshOutcome.session.accountId, 'the refresh returned a different account').toBe(refreshed.accountId);
  
      await h.clock.advance(2 * 1000);
  
      const AFTER_NAME = 'Riverside Programme Five';
      const refreshedWrite = await sut.createOrganization(refreshOutcome.session, AFTER_NAME);
      expect(refreshedWrite.ok, 'the REFRESHED session was refused after its original expiry — refresh did nothing').toBe(true);
  
      const CONTROL_NAME = 'Riverside Programme Six';
      const controlWrite = await sut.createOrganization(control, CONTROL_NAME);
      expect(
        controlWrite.ok,
        'the UNREFRESHED sibling still worked past its expiry — nothing above is attributable to the refresh',
      ).toBe(false);
      expect(
        await sut.organizationsNamed(CONTROL_NAME),
        'the refused write of the unrefreshed session created the organisation anyway',
      ).toEqual([]);
      expect(
        (await sut.organizationsNamed(AFTER_NAME)).length,
        'the refreshed session said it wrote and did not',
      ).toBe(1);
    },
    integration: at00113,
  },
);

atTest(
  'AT-001.14',
  'after the emailed reset flow the new password works and the old one does not',
  { surface: 'ui' },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
  
      const OLD_PASSWORD = PASSWORD;
      const NEW_PASSWORD = 'a different correct horse battery staple';
  
      const { email } = await registerAndConfirm(sut, w.email('password-reset'), OLD_PASSWORD);
  
      const before = await sut.signInWithEmailPassword(email, OLD_PASSWORD);
      expect(before.ok, 'the old password did not work before the reset').toBe(true);
      if (!before.ok) return;
      const accountId = before.session.accountId;
  
      expect((await sut.requestPasswordReset(email)).ok, 'requesting a password reset was refused').toBe(true);
  
      const neverIssued = await sut.completePasswordReset('never-issued-link', NEW_PASSWORD);
      expect(neverIssued.ok, 'a reset link that was never issued was accepted').toBe(false);
      expect(
        (await sut.signInWithEmailPassword(email, OLD_PASSWORD)).ok,
        'a reset link that was never issued changed the password anyway',
      ).toBe(true);
  
      const link = await sut.emailedPasswordResetLink(email);
      expect(link, 'no reset link was emailed to the address that asked for one').not.toBeNull();
      expect((await sut.completePasswordReset(link!, NEW_PASSWORD)).ok, 'the emailed reset link was refused').toBe(true);
  
      const withNew = await sut.signInWithEmailPassword(email, NEW_PASSWORD);
      expect(withNew.ok, 'the new password does not work after the reset').toBe(true);
      if (!withNew.ok) return;
      expect(withNew.session.accountId, 'the reset produced a different account').toBe(accountId);
  
      const sessionsBeforeOldAttempt = await sut.sessionsOf(accountId);
      const withOld = await sut.signInWithEmailPassword(email, OLD_PASSWORD);
      expect(withOld.ok, 'the OLD password still works after the reset').toBe(false);
      expect(
        await sut.sessionsOf(accountId),
        'the rejected old-password sign-in created a session',
      ).toEqual(sessionsBeforeOldAttempt);
    },
    integration: at00114,
  },
);
