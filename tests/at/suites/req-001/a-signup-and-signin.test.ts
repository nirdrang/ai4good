/**
 * AT-REQ-001 section A — signup and sign-in.
 * Source: .taskmaster/docs/acceptance/at-req-001.md
 *
 * Four of this file's seven ids are the ones AI4DEV-57 lands: AT-001.01, .03, .06 and .07. The
 * other three belong to the GitHub leaf and are declared, not written.
 *
 * EVERY ASSERTION BELOW READS AN OBSERVABLE CONSEQUENCE, never that a function was called. That is
 * the whole discipline of this file: a test that checks "the validator ran" passes against a
 * validator that returns the wrong answer.
 *
 * SURFACE MARKS. AT-001.01, .03 and .07 are marked `surface: 'ui'`; AT-001.06 is not. The three
 * marked ones are the auth SCREENS — signup, Google signup and return sign-in, and which options the
 * public signup surface offers — and the manifest's wiring leaf (D2.LW) re-runs the ui-marked ids
 * with `--wired` rather than adding new ones. `registry.ts` defaults an omitted surface to
 * `backend`, so an unmarked suite would leave that leaf nothing to re-run, and this leaf's whole
 * decision to build no screens rests on that leaf finding these tests. AT-001.06 stays `backend`
 * because it is an authorization boundary, not one of the four auth screens the manifest names.
 */

import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import { LEAF, notLanded } from './_pending.ts';

/** The version string of the ToS + Platform Promise text these tests accept on the user's behalf. */
const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
/** The address the acknowledgment must record — AT-001.01 names IP among the three fields. */
const CLIENT_IP = '203.0.113.7';

describe('AT-REQ-001 A — signup and sign-in', () => {
  atTest(
    'AT-001.01',
    'NGO email/password signup creates the account, org, admin membership and acknowledgment; sign-in returns',
    { surface: 'ui' },
    async ({ open }) => {
      const { w, sut } = await open();
      const email = w.email('ngo-signup');
      const password = 'correct horse battery staple';

      const session = await sut.registerWithEmailPassword(email, password);

      // THE PREDICATE MUST DISCRIMINATE, and this is the assertion that makes that true rather than
      // stated. AT-001.01 requires the acknowledgment "before any project creation is possible";
      // `has_platform_acknowledgment` is the observable form of that clause, and a `return true`
      // implementation would satisfy every other assertion in this test. Asserting FALSE first, on
      // a user who has authenticated and not completed signup, is what fails such an implementation
      // here instead of letting it through to the leaf that lands project creation.
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
        },
        CLIENT_IP,
      );
      expect(completion, 'the NGO completion was refused').toMatchObject({ ok: true });
      if (!completion.ok) return;
      expect(completion.organizationId, 'an NGO completion produced no organisation').not.toBeNull();

      // (1) the global account type
      expect(await sut.account(completion.accountId)).toEqual({
        id: session.accountId,
        accountType: 'ngo',
      });

      // (2) the organisation, by the name that was asked for — not merely that one exists
      expect(await sut.organization(completion.organizationId!)).toMatchObject({ name: 'Riverside Shelter' });

      // (3) the membership, AND ITS ROLE. "an org membership with the admin role is created" is one
      // clause with two halves, and a membership at the wrong role satisfies neither.
      expect(await sut.membership(completion.organizationId!, completion.accountId)).toEqual({
        organizationId: completion.organizationId,
        accountId: completion.accountId,
        role: 'admin',
      });

      // (4) the acknowledgment, carrying ALL THREE fields the criterion names. Each is asserted for
      // its value, because a row with three empty strings in it records nothing while looking like
      // a record.
      const acknowledgments = await sut.acknowledgments(completion.accountId);
      expect(acknowledgments, 'exactly one platform acknowledgment is recorded by one completion').toHaveLength(1);
      const acknowledgment = acknowledgments[0];
      expect(acknowledgment.textVersion, 'the acknowledgment must say WHICH text was accepted').toBe(TEXT_VERSION);
      expect(acknowledgment.ip, 'the acknowledgment must record the source address').toBe(CLIENT_IP);
      expect(
        Number.isFinite(Date.parse(acknowledgment.acknowledgedAt)),
        `the acknowledgment timestamp ${JSON.stringify(acknowledgment.acknowledgedAt)} is not a readable instant`,
      ).toBe(true);

      // The other half of the discriminating pair.
      expect(
        await sut.hasPlatformAcknowledgment(completion.accountId),
        'the platform acknowledgment must be held once signup has completed',
      ).toBe(true);

      // "a later sign-in with the same email/password succeeds" — and returns to the SAME account,
      // which is the part that would not hold if signup had minted a second identity.
      const returning = await sut.signInWithEmailPassword(email, password);
      expect(returning, 'the same credentials did not sign in again').toMatchObject({ ok: true });
      if (!returning.ok) return;
      expect(returning.session.accountId).toBe(session.accountId);
    },
  );

  atTest('AT-001.02', 'GitHub OAuth volunteer signup links the identity and returns to the same account', notLanded(LEAF.D1_L2));

  atTest(
    'AT-001.03',
    'a session established by Google completes signup through the same path, with the same result as email',
    { surface: 'ui' },
    async ({ open }) => {
      const { w, sut } = await open();

      // WHAT THIS TEST ASSERTS, AND WHAT IT REFUSES TO PRETEND.
      //
      // The shipped code in this leaf is the decision module. It never reads the provider, and the
      // claim being tested is exactly that: a session Auth recorded as `google` completes signup
      // through the SAME path with the SAME result as one it recorded as `email`. That is a real,
      // falsifiable property — if the shipped code ever grew a provider branch, these two results
      // would differ and this test would go red.
      //
      // IT SIMULATES NO HANDSHAKE. There is no fabricated authorization code, no token exchange and
      // no fake redirect anywhere in the adapter; `registerWithProvider` produces the state Auth is
      // in AFTER a consent round trip, which is the only part of the story reachable without a
      // person. AT-001.03's other clause — "sign-in via Google succeeds on return visits" — is a
      // real consent round trip, is NOT proved by this test or anywhere in this item, and is named
      // unproved in the plan's per-id table and in the merge ruling.
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
      };

      const viaGoogle = await sut.completeSignup(googleSession, request, CLIENT_IP);
      const viaEmail = await sut.completeSignup(emailSession, request, CLIENT_IP);
      expect(viaGoogle, 'a signup whose session came from Google was refused').toMatchObject({ ok: true });
      expect(viaEmail, 'the email control signup was refused, so there is nothing to compare against').toMatchObject({ ok: true });
      if (!viaGoogle.ok || !viaEmail.ok) return;

      // EVERY OBSERVABLE, COMPARED — not just "both succeeded". Identifiers differ by construction
      // and are excluded on purpose; everything the criterion cares about must match.
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
      // Pinned rather than left to the comparison alone: two identically WRONG results would satisfy
      // an equality check on its own.
      expect(googleResult).toMatchObject({
        accountType: 'ngo',
        membershipRole: 'admin',
        acknowledgmentCount: 1,
        acknowledgmentTextVersion: TEXT_VERSION,
        holdsPlatformAcknowledgment: true,
      });

      // "as either account type" — the volunteer half of the criterion, through the same path.
      const googleVolunteer = await sut.registerWithProvider('google', w.email('google-volunteer'));
      const volunteerCompletion = await sut.completeSignup(
        googleVolunteer,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION },
        CLIENT_IP,
      );
      expect(volunteerCompletion, 'a volunteer signup whose session came from Google was refused').toMatchObject({ ok: true });
      if (!volunteerCompletion.ok) return;
      expect(await sut.account(volunteerCompletion.accountId)).toMatchObject({ accountType: 'volunteer' });
      expect(volunteerCompletion.organizationId, 'a volunteer completion must create no organisation').toBeNull();
    },
  );

  atTest('AT-001.04', 'volunteer signup cannot complete without a linked GitHub account', notLanded(LEAF.D1_L2));

  atTest('AT-001.05', 'linking GitHub fires volunteer onboarding with the public stats observably imported', notLanded(LEAF.D1_L2));

  atTest(
    'AT-001.06',
    'a volunteer is refused the NGO-only action while an NGO account performs it successfully',
    async ({ open }) => {
      const { w, sut } = await open();

      // THE CONTROL IS NOT OPTIONAL. A rejection with no working control proves only that the path
      // is broken — an operation that refuses everybody would pass the negative half on its own. So
      // the NGO succeeds FIRST, and the volunteer's refusal is then attributable to the account
      // type and to nothing else.
      const ngoSession = await sut.registerWithEmailPassword(w.email('ngo-actor'), 'correct horse battery staple');
      const ngoCompletion = await sut.completeSignup(
        ngoSession,
        { accountType: 'ngo', organizationName: 'Riverside Shelter', acknowledgmentTextVersion: TEXT_VERSION },
        CLIENT_IP,
      );
      expect(ngoCompletion, 'the NGO control could not complete signup').toMatchObject({ ok: true });
      if (!ngoCompletion.ok) return;

      const ngoAction = await sut.createOrganization(ngoSession, 'Riverside Shelter Second Programme');
      expect(ngoAction, 'the NGO control was refused the NGO-only action, so the refusal below proves nothing').toMatchObject({
        ok: true,
      });
      if (!ngoAction.ok) return;
      // The control SUCCEEDED, observably: the organisation exists and the actor is its admin.
      expect(await sut.organization(ngoAction.organizationId)).toMatchObject({
        name: 'Riverside Shelter Second Programme',
      });
      expect(await sut.membership(ngoAction.organizationId, ngoCompletion.accountId)).toMatchObject({ role: 'admin' });

      // Now the volunteer, driven through THE SAME BOUNDARY — the `create-organization` operation,
      // not the helper behind it. Calling `ngoOnlyActionAllowed` here would prove a helper behaves
      // and say nothing about whether the application enforces it.
      const volunteerSession = await sut.registerWithEmailPassword(w.email('volunteer-actor'), 'correct horse battery staple');
      const volunteerCompletion = await sut.completeSignup(
        volunteerSession,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION },
        CLIENT_IP,
      );
      expect(volunteerCompletion, 'the volunteer could not complete signup, so the refusal below is not the one under test').toMatchObject({
        ok: true,
      });
      if (!volunteerCompletion.ok) return;

      const volunteerAction = await sut.createOrganization(volunteerSession, 'Riverside Shelter Copy');
      expect(volunteerAction.ok, 'a volunteer account performed an NGO-only action').toBe(false);
      if (volunteerAction.ok) return;
      // The refusal must STATE why. A bare failure leaves the caller unable to act, and the
      // criterion's own wording — "one account holds exactly one global type; the NGO path requires
      // a separate account" — is what the reason has to convey.
      expect(volunteerAction.reason).toMatch(/NGO accounts only/i);
      expect(volunteerAction.reason).toMatch(/volunteer/i);
    },
  );

  atTest(
    'AT-001.07',
    'a provisioned platform admin authenticates and carries the type; public signup offers only the two',
    { surface: 'ui' },
    async ({ open }) => {
      const { w, sut } = await open();

      // Clause one: a provisioned administrator really exists and really authenticates. Provisioned
      // the only legal way — an authority the public never holds — because the public path refuses
      // the type outright, which the third block below proves rather than assumes.
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

      // Clause two: "the public signup surfaces offer only NGO/volunteer". Exact equality, not
      // containment — a third option added later must fail this.
      expect(await sut.publicSignupAccountTypes()).toEqual(['ngo', 'volunteer']);

      // Clause two, in its behavioural form, because a list is a claim and a refusal is a fact. The
      // public completion path must REFUSE the administrator type and leave no account behind.
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
  );
});
