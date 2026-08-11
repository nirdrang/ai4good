/**
 * AT-REQ-001 section A — signup and sign-in.
 * Source: .taskmaster/docs/acceptance/at-req-001.md
 *
 * ALL SEVEN of this file's ids are now written. Four came with the first accounts leaf — AT-001.01,
 * .03, .06 and .07 — and the three GitHub ones, AT-001.02, .04 and .05, come with the leaf that
 * lands GitHub signup and the mandatory GitHub link at volunteer signup. Nothing in this file is a
 * declared stub any more.
 *
 * EVERY ASSERTION BELOW READS AN OBSERVABLE CONSEQUENCE, never that a function was called. That is
 * the whole discipline of this file: a test that checks "the validator ran" passes against a
 * validator that returns the wrong answer.
 *
 * NO HANDSHAKE IS SIMULATED ANYWHERE IN THIS FILE, for Google or for GitHub. `registerWithProvider`,
 * `registerWithGithub`, `linkGithubIdentity` and `signInWithProvider` all record the state Supabase
 * Auth is in AFTER a round trip, and fabricate no authorization code, token exchange or redirect.
 * The round trips themselves need a person pressing a consent button and are named unproved in the
 * item's per-id table. What IS proved here is everything downstream of them, which is where all the
 * shipped code lives.
 *
 * SURFACE MARKS. AT-001.01, .02, .03, .04 and .07 are marked `surface: 'ui'`; AT-001.05 and .06 are
 * not. The marked ones are the auth SCREENS — email signup, GitHub signup, Google signup, the
 * blocked-then-linked volunteer completion, and which options the public signup surface offers — and
 * the manifest's wiring leaf (D2.LW) re-runs the ui-marked ids with `--wired` rather than adding new
 * ones. `registry.ts` defaults an omitted surface to `backend`, so an unmarked suite would leave
 * that leaf nothing to re-run, and this leaf's whole decision to build no screens rests on that leaf
 * finding these tests. AT-001.06 stays `backend` because it is an authorization boundary rather than
 * one of the four auth screens the manifest names, and AT-001.05 stays `backend` because its
 * observable is row contents — provider- and screen-independent, so a wired re-run would drive the
 * same assertions through a screen that contributes nothing to them.
 */

import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
// The INTEGRATION-tier procedures for the ids whose criteria are proved differently against a real
// stack. Same criterion, same id, one registration; only the procedure differs. See _integration.ts.
import { at00101, at00105, at00106, at00107 } from './_integration.ts';
// `LEAF`/`notLanded` are no longer imported here: this file's last declared stub was replaced with a
// real body by the GitHub leaf, and an import kept for a stub that no longer exists is an orphan.
// The other five suite files still declare their leaves' ids and import both.
// THE STUB IMPORT FIXTURE, imported rather than restated. AT-001.05 asserts the profile's stats BY
// VALUE, and the value it compares against has to be the shipped judgement — a literal copied into
// this file would drift from `stubGithubStatsFor` the first time either changed, and the test would
// then be grading a copy. See that test's own comment for why asserting the stub's exact output is
// honest here and what it does and does not claim.
import { stubGithubStatsFor } from '../../../../supabase/functions/_shared/github.ts';
// THE SHIPPED AUTHORITY STATEMENT, imported for the reason the stub stats are: the server accepts
// exactly one statement, and a literal copied into this file would drift from it silently.
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

/** The version string of the ToS + Platform Promise text these tests accept on the user's behalf. */
const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
/**
 * WHO IS SIGNING — AT-001.19's three fields, which every completion that must SUCCEED now carries.
 *
 * A completion whose refusal is pinned to an EARLIER check does NOT carry them, and that is
 * deliberate rather than an oversight: `validateCompleteSignup` runs the identity checks last, so
 * AT-001.01's no-acknowledgment request and AT-001.07's `platform_admin` request keep refusing for
 * the reasons those criteria name. AT-001.19 and AT-001.39 own these fields and test them.
 */
const SIGNER = {
  signerName: 'Dana Okonkwo',
  signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
} as const;
/** The address the acknowledgment must record — AT-001.01 names IP among the three fields. */
const CLIENT_IP = '203.0.113.7';
/** The password every email/password registration in this file uses. */
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
  
        // THE PREDICATE MUST DISCRIMINATE, and this is the assertion that makes that true rather than
        // stated. AT-001.01 requires the acknowledgment "before any project creation is possible";
        // `has_platform_acknowledgment` is the observable form of that clause, and a constant-true
        // implementation would satisfy every other assertion in this test. Asserting FALSE first, on
        // a user who has authenticated and not completed signup, is what fails such an implementation.
        //
        // WHICH implementation, exactly: at this tier the assertion reaches the fixture adapter's
        // storage query, so what it establishes is the rule and that storage. The shipped SQL
        // predicate `public.has_platform_acknowledgment` is NOT reached from here and could return
        // true unconditionally without turning this red. Step 7(h) of the plan is what proves that
        // one, against the live database, and it is the only thing in this item that does.
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
        // The address as REPORTED, never a verified source address: on the live stack a spoofed
        // header is stored verbatim. What this pins is that the reported value reaches the row intact.
        expect(acknowledgment.ip, 'the acknowledgment must record the reported address').toBe(CLIENT_IP);
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
  
        // THE ACKNOWLEDGMENT IS *REQUIRED*, and the happy path above does not establish that. An
        // implementation that records the acknowledgment when one is offered and completes signup
        // anyway when none is would satisfy every assertion so far — so the criterion's word
        // "required" would be untested, which is the same as unmet. The refusal is asserted here, and
        // with it that nothing was left behind: a completion that refuses AFTER writing the account
        // row has not refused, it has half-succeeded.
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

      // THE CRITERION HAS THREE CLAUSES and each gets its own observable below: an account of global
      // type `volunteer` is created, the GitHub identity is LINKED to it, and a later sign-in via
      // GitHub returns to the SAME account.
      //
      // WHAT IS NOT PROVED, said before the first assertion rather than in a footnote: the OAuth
      // handshake. `registerWithGithub` is the state Auth is in after a consent round trip — no
      // authorization code, no token exchange, no redirect. Consent is a person pressing a button,
      // which no agent performs, and the GitHub OAuth app is a founder-manual step that may not
      // exist yet. Everything downstream of the round trip is this leaf's code and is what runs here.
      const email = w.email('github-volunteer');
      const HANDLE = 'riverside-octocat';

      const session = await sut.registerWithGithub(email, HANDLE);
      // A CONTROL, not decoration: if the session is not github-established, every clause below is
      // being asserted about some other signup path and the test compares nothing.
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

      // Clause one: "an account with global type `volunteer` is created".
      expect(await sut.account(completion.accountId)).toEqual({
        id: session.accountId,
        accountType: 'volunteer',
      });
      expect(completion.organizationId, 'a volunteer completion must create no organisation').toBeNull();

      // Clause two: "the GitHub identity is linked to it". The link lives in Supabase Auth, which
      // this leaf does not own; what it CAN observe — and what makes the link consequential rather
      // than merely asserted — is that the account's own row carries the handle that was linked. A
      // signup that accepted a GitHub session and recorded nothing about the identity would fail
      // here while passing clause one.
      const profile = await sut.volunteerProfile(completion.accountId);
      expect(profile, 'the completed GitHub volunteer signup carries no linked handle anywhere').not.toBeNull();
      if (!profile) return;
      expect(profile.githubHandle, 'the recorded handle is not the one that signed up').toBe(HANDLE);

      // Clause three: "a later sign-in via GitHub returns to the same account". The SAME account is
      // the whole content of the clause — a path that minted a second account on the return visit
      // would satisfy "sign-in succeeds" and fail the criterion.
      const returning = await sut.signInWithProvider('github', email);
      expect(returning, 'a later sign-in via GitHub did not succeed').toMatchObject({ ok: true });
      if (!returning.ok) return;
      expect(
        returning.session.accountId,
        'the GitHub return visit resolved to a DIFFERENT account than the one it signed up',
      ).toBe(session.accountId);
      expect(returning.session.provider).toBe('github');

      // And the returned-to account is still the same one, with the same type — asserted rather than
      // assumed, because "same id" and "same account" come apart if anything re-typed the row.
      expect(await sut.account(returning.session.accountId)).toMatchObject({ accountType: 'volunteer' });
    },
  );

  atTest(
    'AT-001.03',
    'a session established by Google completes signup through the same path, with the same result as email',
    { surface: 'ui' },
    async ({ open }) => {
      const { w, sut } = await open();

      // WHAT THIS TEST ASSERTS, AND WHAT IT REFUSES TO PRETEND.
      //
      // The shipped code in this leaf is the decision module, and it never reads the provider — it
      // is never GIVEN one. `CompleteSignupRequest` has no provider field, and the adapter's
      // `completeSignup` passes the account id together with ONE fact about the caller — whether a
      // GitHub identity is linked — and nothing else, so the comparison below establishes that the
      // shipped path ignores the provider BECAUSE IT NEVER RECEIVES ONE.
      //
      // A LINKED-GITHUB FACT IS NOT THE SESSION PROVIDER, and the distinction is why this paragraph
      // survived the GitHub leaf unchanged in substance. The decision path still cannot tell an
      // email-established session from a Google-established one — that is what makes this test's
      // equivalence claim exactly as narrow now as it was before, no narrower and no wider.
      //
      // WHICH MEANS THIS COMPARISON WOULD NOT CATCH A PROVIDER BRANCH, and an earlier version of
      // this comment claimed it would. A branch treating Google differently would have to live in
      // an edge function or in Auth, and no code this test drives can express one; both halves of
      // the comparison would keep agreeing while the shipped behaviour diverged. What carries the
      // weight here is the PINNED-VALUE block below — two identically wrong results satisfy an
      // equality check, and the pinned expectations are what refuse them.
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
        ...SIGNER,
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
      //
      // THE LINK IS A PRECONDITION HERE, NOT AN ASSERTION. Since the GitHub leaf, a volunteer cannot
      // complete signup without a linked GitHub identity (AT-001.04, which owns that rule and tests
      // it). Adding the link is what keeps THIS test about what it has always been about — that a
      // Google-established session completes through the same path as an email one — instead of
      // silently becoming a second, worse test of the GitHub gate. Nothing below this line changed.
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

      // THE CRITERION NAMES BOTH ESTABLISHING PROVIDERS — "completing volunteer signup by email or
      // Google (no GitHub identity yet)" — so both are driven. That is not redundancy: the gate reads
      // a LINKED identity, and if it had accidentally been written against the SESSION provider
      // instead, an email session and a Google session would behave differently and only running
      // both would show it.
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

        // "BLOCKED WITH THE GITHUB-LINK REQUIREMENT STATED" — the reason is half the criterion. A
        // bare refusal leaves the caller with nothing to do differently, and the screen the wiring
        // leaf builds has nothing to display.
        expect(refused.reason, 'the refusal does not name GitHub').toMatch(/github/i);
        expect(refused.reason, 'the refusal does not say that LINKING is what is required').toMatch(/link/i);

        // NO PARTIAL STATE. The weakest implementation that passes the assertions above writes the
        // account row and then reports a refusal, which is not a refusal — it is a half-completed
        // signup with a rude message. All four observables of a completion must be absent.
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

      // "LINKING COMPLETES SIGNUP" — and the request is byte-identical to the one just refused. That
      // is what makes the link the cause: if anything else about the request had changed, the
      // success would be attributable to that instead.
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

      // THE NGO CONTROL, AND IT IS NOT OPTIONAL. A gate that refused EVERY completion would satisfy
      // both refusals above, and the two successes after linking would not catch it either if the
      // gate had simply been written as "refuse until any identity is linked". The criterion scopes
      // itself to VOLUNTEER signup, so an NGO must still complete with no GitHub identity at all —
      // that is the assertion which makes the gate's shape, and not merely its existence, correct.
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
  
        // WHERE THE STATS COME FROM, STATED BEFORE THEY ARE ASSERTED SO NO GREEN CAN BE MISREAD.
        //
        // `stubGithubStatsFor` is a STUB. It calls nothing, fetches nothing, and reaches no part of
        // GitHub. It is the "stub import fixture until W3" the decomposition manifest's own
        // cross-contract ratifies, and the real import belongs to the volunteer-profile requirement in
        // a later wave. So this test may NEVER be reported as "profile import from GitHub works".
        //
        // ASSERTING THE STUB'S EXACT VALUES IS NEVERTHELESS THE HONEST STRONG ORACLE HERE, because the
        // stub IS the declared source: what the criterion puts under test is that onboarding FIRES and
        // that what it produced arrives POPULATED on the profile, not that any statistic is true of a
        // real person. A weaker "something non-empty is there" would pass against an implementation
        // that wrote a placeholder, which is precisely the "queued-but-empty" state the criterion's
        // last sentence forbids. Both strengths are asserted below: the structural non-emptiness AND
        // the by-value equality.
        const HANDLE = 'riverside-contributor';
        const expected = stubGithubStatsFor(HANDLE);
  
        const session = await sut.registerWithEmailPassword(w.email('volunteer-import'), PASSWORD);
        await sut.linkGithubIdentity(session, HANDLE);
  
        // THE PRE-COMPLETION NEGATIVE. The identity is linked and the signup has NOT completed, and at
        // this instant there must be no profile at all.
        //
        // It is what makes the causal claim testable rather than merely stated. Without it, an
        // implementation that populated the profile at link time — or one that had queued an empty row
        // waiting to be filled — would satisfy every assertion after the completion below, and the
        // criterion's "when the link completes, onboarding fires" would be untested. With it, the
        // population is provably CAUSED by the completion and nothing sits queued in between.
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
  
        // IMMEDIATELY — the very next read after completion returns, with no retry, no polling and no
        // queue to drain. If the import were deferred to a job, this read would find nothing, which is
        // exactly the failure the criterion's last sentence describes.
        const profile = await sut.volunteerProfile(completion.accountId);
        expect(profile, 'volunteer onboarding did not fire: no profile exists after a linked completion').not.toBeNull();
        if (!profile) return;
  
        // "the linked handle AND the imported public stats … are observably populated on the profile"
        // — all four values, each by its own assertion, because a row with three empty fields in it
        // records nothing while looking like a record.
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
  
        // The import landed WITH the account, not merely near it: the account exists, holds the
        // volunteer type, and the acknowledgment of the same completion is recorded. All of it or none
        // of it — which is the shape the database's single-transaction write path guarantees and the
        // reason "queued-but-empty" is unrepresentable here rather than merely untested.
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
  
        // THE CONTROL IS NOT OPTIONAL. A rejection with no working control proves only that the path
        // is broken — an operation that refuses everybody would pass the negative half on its own. So
        // the NGO succeeds FIRST, and the volunteer's refusal is then attributable to the account
        // type and to nothing else.
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
        // The control SUCCEEDED, observably: the organisation exists and the actor is its admin.
        expect(await sut.organization(ngoAction.organizationId)).toMatchObject({
          name: 'Riverside Shelter Second Programme',
        });
        expect(await sut.membership(ngoAction.organizationId, ngoCompletion.accountId)).toMatchObject({ role: 'admin' });
  
        // Now the volunteer, driven through THE SAME BOUNDARY — the `create-organization` operation,
        // not the helper behind it. Calling `ngoOnlyActionAllowed` here would prove a helper behaves
        // and say nothing about whether the application enforces it.
        const volunteerSession = await sut.registerWithEmailPassword(w.email('volunteer-actor'), PASSWORD);
        // A PRECONDITION, not part of what this test asserts: since the GitHub leaf a volunteer cannot
        // complete signup without a linked GitHub identity. The refusal under test below is the
        // NGO-only one, and it must be attributable to the account type — so the volunteer has to
        // reach the state of being a fully signed-up volunteer first. AT-001.04 owns the link rule and
        // tests it; the assertions in this test are unchanged.
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
  
        // "THE ACTION IS REJECTED" INCLUDES ITS WRITES NOT HAPPENING. The weakest implementation that
        // passes the assertion above writes the organisation and its membership and then reports a
        // refusal, which is not a rejection — it is a success with a rude message. So: the volunteer
        // holds no membership anywhere, and no organisation by the attempted name exists.
        const organizations = await sut.organizationsNamed(REFUSED_NAME);
        expect(organizations, `the refused action created an organisation named ${JSON.stringify(REFUSED_NAME)}`).toEqual([]);
        expect(
          await sut.membershipsOf(volunteerCompletion.accountId),
          'the refused action left the volunteer holding a membership',
        ).toEqual([]);
        // The refusal must STATE why. A bare failure leaves the caller unable to act, and the
        // criterion's own wording — "one account holds exactly one global type; the NGO path requires
        // a separate account" — is what the reason has to convey.
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
  
        // Clause one, at the tier this test actually runs at. Two different strengths of evidence sit
        // in this test and the difference is the whole point of the comment:
        //
        //   - that the public completion path REFUSES to mint a `platform_admin` (the third block) is
        //     a real property of the shipped decision module — `validateCompleteSignup` in
        //     `supabase/functions/_shared/accounts.ts`, which this suite imports rather than copies;
        //   - that the type is CARRIED — provisioned with it, reads back with it, and a session
        //     resolves to the same account — is the ADAPTER'S STORAGE answering, not shipped code.
        //     Provisioning and sign-in are fixture stand-ins here, so this half proves the test is
        //     well-formed and says nothing about the real schema or a real Auth.
        //
        // IT IS NOT A CLAIM THAT AN ADMINISTRATOR REALLY AUTHENTICATES, and this comment used to make
        // one: `provisionPlatformAdmin` writes into a Map two lines below. A real administrator, in a
        // real Auth, really signing in against the real schema is step 7(g) of the plan, on the live
        // stack, and the per-id table assigns that clause there and not here.
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
      integration: at00107,
    },
  );
});
