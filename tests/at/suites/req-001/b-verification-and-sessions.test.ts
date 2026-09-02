/**
 * AT-REQ-001 sections B and C — email verification, the wrong-password path, sessions and reset.
 *
 * ALL SIX IDS IN THIS FILE ARE NOW WRITTEN. AT-001.09 and AT-001.10 are the verification leaf's
 * pair; AT-001.38, AT-001.12, AT-001.13 and AT-001.14 are the session-and-reset leaf's four, landed
 * with this change. No id in this file is declared-not-written any more, which is why it imports
 * neither `LEAF` nor `notLanded`. The other suite files still declare their own and keep theirs.
 *
 * `supabase/config.toml` carries `[auth.email] enable_confirmations = true`, turned on by the
 * verification leaf. NOTHING IN THIS FILE CHANGES IT, and this leaf ships no configuration change
 * at all: the transient `jwt_expiry` change the live proof needs is made and reverted inside that
 * script, and the final `git diff` proves the file unchanged.
 *
 * WHAT THE FIXTURE REACHES AND WHAT IT DOES NOT, said before the first assertion because it is the
 * one thing a reader could get wrong here. The confirmations flip is a LIVE-STACK behaviour: the
 * real GoTrue issues no session at signup and refuses sign-in until the address is confirmed. The
 * fixture's storage is a Map and its `Session` is a handle, not an access token — nothing here is
 * signed, decoded or parsed. What the fixture DOES now model is the session's LIFETIME: an
 * `auth.sessions` row per session, an expiry one hour out mirroring `jwt_expiry = 3600`, and
 * revocation. Which sessions are live is that mirror; whether a dead session yields a caller is the
 * SHIPPED `callerFromAuthAnswer`, the same judgement both deployed edge functions run. The live
 * behaviour is measured by hand, in `loop/items/AI4DEV-59/proof-local.ts` checks (a), (c) and (d)
 * and in `loop/items/AI4DEV-60/proof-local.ts` checks (a) to (e) and (g).
 *
 * THE ORDER THE FOUR NEW BODIES FOLLOW IS THE LIVE PUBLIC ONE: register, use the emailed
 * verification link, SIGN IN, and only then complete signup or play the session and password games.
 * That order is deliberate and narrows the one divergence this suite carries — the fixture mints a
 * session at registration and the live stack with confirmations on mints none, which `_contract.ts`
 * writes out on `registerWithEmailPassword`. The registration handle plays no part in any assertion
 * the four bodies make.
 *
 * WHICH LEAVES ONE HONEST GAP, and it is stated rather than hidden: at THIS tier a
 * completed-but-unverified account is constructible, and AT-001.10's body constructs one on
 * purpose. On the live stack the public path cannot reach that state. The gate is still the right
 * thing to ship and to test, because decision-8 makes verification the WRITE PATH's own floor —
 * "the floor for any Discovery message" — and not a property borrowed from the session layer.
 * Non-public paths and configuration history both produce exactly this state, and a floor that
 * only holds while the session layer holds is not a floor.
 *
 * NO LINK-LIFETIME SEMANTICS ARE ASSERTED ANYWHERE BELOW — not for a verification link and not for
 * a reset link. AT-001.11 is retired ("verification-link expiry/single-use/resend semantics are not
 * stated in REQ-001", `.taskmaster/docs/acceptance/at-req-001.md` line 22) and AT-001.15 is retired
 * for the reset link on line 30. Both bodies that follow a never-issued link do so to guard their
 * OWN ORACLE — a link-shaped string that worked would make "the emailed link is what does it" mean
 * nothing — and neither makes any claim about how long a real link lasts or how often it may be
 * used. AT-001.14's own note also drops the audit claim, so no audit row is written or read here.
 *
 * SURFACE MARKS, and this leaf's are the more interesting half.
 *   - AT-001.09 (`ui`) and AT-001.14 (`ui`) are two of the four auth screens the manifest's wiring
 *     leaf names — "signup, sign-in, verification, reset" — so that leaf must find them and re-run
 *     them wired. AT-001.38 (`ui`) is the sign-in screen's negative path, the third of the four.
 *   - AT-001.10 stays `backend`: the Discovery composer is REQ-002/004's surface, not one of those
 *     four screens, and the wiring leaf has nothing of it to re-run. AT-001.12 is `backend` for the
 *     same kind of reason — expiry and revocation are the session layer's enforcement and no named
 *     screen carries them.
 *   - AT-001.13 IS `ui`, AND THE REASON IS THE MARK'S MECHANISM RATHER THAN A SCREEN. Its criterion
 *     says the session refreshes AUTOMATICALLY, and the thing that schedules a refresh is the
 *     supabase-js client. No client exists in this tree, so this body proves the mechanism and not
 *     the scheduling. A `backend` mark would orphan the automatic clause — the wiring leaf finds
 *     its work by the `ui` mark, so nothing before the requirement's far-away integration-tier gate
 *     would ever exercise it. The `ui` mark is the handoff: the wired re-run drives this id through
 *     the real client, where automatic refresh is the thing under test.
 */

import { expect } from 'vitest';
import { atTest } from './_bind.ts';
// The INTEGRATION-tier procedures for the ids whose criteria are proved differently against a real
// stack. Same criterion, same id, one registration; only the procedure differs. See _integration.ts.
import { ACCESS_TOKEN_LIFETIME_MS, at00109, at00110, at00112, at00113, at00114, at00138, INTEGRATION_TIMEOUT_MS } from './_integration.ts';
import type { AccountsSut } from './_contract.ts';
// THE TWO EMAIL-CAPABLE PUBLIC TYPES, read from the shipped vocabulary rather than spelled as a
// pair of literals. AT-001.09's own words are "EITHER account type that can register by email (NGO
// and volunteer)", and `PUBLIC_SIGNUP_ACCOUNT_TYPES` is that set as a value: the platform
// administrator is provisioned rather than signed up, so `parseAccountType` refuses it and it is
// outside this criterion by construction. Iterating the constant makes "either account type" a
// fact of the run instead of a claim in a test name.
import { PUBLIC_SIGNUP_ACCOUNT_TYPES } from '../../../../supabase/functions/_shared/accounts.ts';
// The SHIPPED authority statement. Every completion in this file must SUCCEED, so every one of
// them carries AT-001.19's three fields, and the statement is imported rather than copied.
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

/** The version string of the ToS + Platform Promise text these tests accept on the user's behalf. */
const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
/** The address the acknowledgment records — the same reported-not-verified value section A uses. */
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
  'AT-001.09',
  'a fresh email/password signup of either account type is unverified until the link is used',
  { surface: 'ui' },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
  
      // THE ORDERING IS DELIBERATE AND IS STATED SO IT CAN BE ATTACKED RATHER THAN DISCOVERED. This
      // body completes signup BEFORE verifying, so that the TYPED account is observably unverified —
      // the criterion says "the account ... is email-unverified until the emailed verification link
      // is used", and "account" read as the typed account is what makes clause 2 below meaningful.
      // On the live stack with confirmations on, the public order is the other one: verify, then
      // sign in, then complete. The live proof drives THAT order against the real stack, check (e).
      // The two orders together cover both readings of "account", and neither contradicts any
      // criterion.
      for (const accountType of PUBLIC_SIGNUP_ACCOUNT_TYPES) {
        const email = w.email(`verify-${accountType}`);
  
        // (1) A FRESH SIGNUP IS UNVERIFIED. This is the half that fails against an implementation
        // which confirms addresses at registration, and it has to be read BEFORE anything else
        // happens to the account.
        const session = await sut.registerWithEmailPassword(email, PASSWORD);
        expect(
          await sut.emailVerified(session.accountId),
          `a fresh ${accountType} email/password signup must be email-unverified`,
        ).toBe(false);
  
        // The volunteer branch needs a linked GitHub identity before completion — that is AT-001.04's
        // requirement, not this one's, and it is satisfied here rather than tested.
        if (accountType === 'volunteer') {
          await sut.linkGithubIdentity(session, 'riverside-verifier');
        }
  
        // (2) THE ACCOUNT IS TYPED, and the row says which type. Without this the loop would prove
        // the same thing twice about two indistinguishable accounts, and "either account type" would
        // be a claim in the test's name rather than a fact of the run.
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
        });
  
        // (3) COMPLETING SIGNUP DOES NOT VERIFY THE ADDRESS. An implementation that flipped the flag
        // as a side effect of completion would satisfy the final assertion of this test while making
        // the emailed link decorative.
        expect(
          await sut.emailVerified(session.accountId),
          `completing ${accountType} signup must not verify the email address`,
        ).toBe(false);
  
        // (4) A LINK THAT WAS NEVER ISSUED FLIPS NOTHING. This is not a claim about link lifetime —
        // retired AT-001.11's ground, deliberately untouched. It guards THIS TEST'S OWN ORACLE: if a
        // link-shaped string verified an account it never belonged to, then "using the emailed link
        // is what flips it" would mean nothing, because any string would flip anything.
        const neverIssued = await sut.useVerificationLink('never-issued-link');
        expect(neverIssued.ok, 'a verification link that was never issued must not succeed').toBe(false);
        expect(
          await sut.emailVerified(session.accountId),
          'a verification link that was never issued flipped the account to verified',
        ).toBe(false);
  
        // (5) USING THE EMAILED LINK IS WHAT FLIPS IT — the criterion's second clause, and the
        // discriminating change. Everything else about the account is identical across this line.
        const link = await sut.emailedVerificationLink(email);
        expect(link, `no verification link was emailed to the ${accountType} address`).not.toBeNull();
        const used = await sut.useVerificationLink(link!);
        expect(used.ok, 'the emailed verification link was refused').toBe(true);
        expect(
          await sut.emailVerified(session.accountId),
          'using the emailed verification link did not flip the account to verified',
        ).toBe(true);
  
        // (6) VERIFICATION RE-TYPES NOTHING. The account is the same account, of the same type, and
        // the only thing that changed is the one thing the criterion is about.
        expect(await sut.account(completion.accountId)).toEqual({
          id: session.accountId,
          accountType,
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
  
      // WHAT THIS TEST GRADES, said plainly: the SHIPPED decision
      // `discoveryMessageAllowed` in `supabase/functions/_shared/verification.ts`. There is NO
      // Discovery route in this repository — it is REQ-002/004's — so `sendDiscoveryMessage` is a
      // stand-in surface that exists to put that decision on a tested path. No green here says
      // Discovery messaging is gated anywhere; it says the gate answers correctly and that a refusal
      // writes nothing.
      //
      // AND THE STATE THIS BODY BUILDS IS NOT REACHABLE BY THE LIVE PUBLIC PATH. With confirmations
      // on, GoTrue issues no session at signup, so a completed-but-unverified account cannot be
      // produced by a visitor. The gate exists anyway, and the reason is decision-8: verification is
      // "the floor for any Discovery message" — the write path's own rule, not one borrowed from the
      // session layer. Non-public paths and configuration history reach this state, and the live
      // auth-layer block is measured separately in the item's proof script, check (c).
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
  
      // The control that makes the refusal below attributable. If the account were already verified,
      // a refusal would be evidence of a broken gate rather than of a working one.
      expect(
        await sut.emailVerified(session.accountId),
        'this test is about an UNVERIFIED account; if it is verified, nothing below is about AT-001.10',
      ).toBe(false);
  
      const MESSAGE = 'Hello — we would like to talk about your project.';
  
      // (1) THE BLOCK, AND THE REMEDY IT NAMES. "the attempt is blocked with verification named as
      // the remedy": a refusal saying only "forbidden" would satisfy a weaker reading of the
      // criterion and would tell the sender nothing about what to do next.
      const blocked = await sut.sendDiscoveryMessage(session, MESSAGE);
      expect(blocked.ok, 'an unverified account was allowed to send a Discovery message').toBe(false);
      if (blocked.ok) return;
      expect(blocked.reason, 'the refusal does not name verification').toMatch(/verif/i);
      expect(blocked.reason, 'the refusal does not name the email address as what needs verifying').toMatch(/email/i);
  
      // (2) THE BLOCKED ATTEMPT WROTE NOTHING. A block whose write happened anyway is not a block,
      // and the refusal's own return value cannot show this — only a read-back can.
      expect(
        await sut.discoveryMessagesBy(session.accountId),
        'the blocked Discovery message was recorded anyway',
      ).toEqual([]);
  
      // (3) THE DISCRIMINATING CONTROL. Verification is proved to be THE REMEDY by being the exact
      // change that unblocks the exact same send. Without this half, a gate that refused everybody
      // unconditionally would pass every assertion above.
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

/**
 * The registered address these four bodies start from, brought to the state the live public path
 * leaves it in: created, and confirmed through the emailed link.
 *
 * IT EXISTS SO THE ORDER IS WRITTEN ONCE. Every one of the four opens the same way, and an order
 * repeated four times is an order three of them can drift out of.
 *
 * IT RETURNS THE ADDRESS AND THE ACCOUNT ID, AND STILL NEVER THE REGISTRATION HANDLE. Withholding
 * the handle is the point: the live stack with confirmations on issues no session at signup, so no
 * body below may take one from here. The account id is a different kind of fact and is
 * LIVE-FAITHFUL — a registered, unconfirmed user exists on the real stack and has an id there, and
 * an operator reading `auth.sessions` needs exactly that id to read anything at all. AT-001.38 uses
 * it to count sessions BEFORE the first sign-in, which is what turns "a sign-in mints a session"
 * from a count above zero into a count that grew by one.
 */
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
  
      // (1) THE CONTROL, AND IT COMES FIRST. Without it, a refusal below would be evidence of an
      // account that cannot sign in at all rather than of a password being checked.
      //
      // THE COUNT IS READ ON BOTH SIDES OF THIS SIGN-IN, and the pair is what makes the control a
      // control. A count above zero would prove nothing here: the fixture mints a session at
      // registration — the divergence this file's header names — so a `signInWithEmailPassword` that
      // minted nothing at all would still leave sessions behind. Exactly one more than before is the
      // assertion, and only a sign-in that mints satisfies it. The after-reading is also what the
      // failed attempt below is compared with.
      const sessionsBeforeGoodSignIn = await sut.sessionsOf(accountId);
  
      const good = await sut.signInWithEmailPassword(email, PASSWORD);
      expect(good.ok, 'the correct password was refused — nothing below would be about AT-001.38').toBe(true);
      if (!good.ok) return;
  
      const sessionsAfterGoodSignIn = await sut.sessionsOf(good.session.accountId);
      expect(
        sessionsAfterGoodSignIn.length,
        'a successful sign-in must mint exactly one new session, or the second clause below has no oracle',
      ).toBe(sessionsBeforeGoodSignIn.length + 1);
  
      // (2) THE CRITERION'S FIRST CLAUSE: correct email, incorrect password, rejected.
      const bad = await sut.signInWithEmailPassword(email, 'not the password');
      expect(bad.ok, 'sign-in with the correct email and a WRONG password was accepted').toBe(false);
  
      // THE REFUSAL CARRIES NO EXISTENCE ORACLE, AND THAT IS THE FIXTURE'S STATED FACT RATHER THAN
      // THIS BODY'S ASSERTION. `_fixture.ts`'s `signInWithEmailPassword` answers both branches — no
      // such account, and wrong password — from ONE reason, deliberately and with the reason written
      // beside the code. The criterion that owns no-existence-oracle behaviour is AT-001.21, another
      // leaf's, so no line here compares one refusal's text with another's: an implementation that
      // satisfied both of THIS id's clauses must not fail this body on response-text policy.
      if (bad.ok) return;
  
      // (3) THE CRITERION'S SECOND CLAUSE: "no authenticated session is created". The refusal's own
      // return value cannot show this — it hands back no handle — so it is read as a count across the
      // failed attempt. Compared against the reading taken after the SUCCESSFUL sign-in, so a fixture
      // that minted nothing at all would fail (1) instead of passing here by accident.
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
  // THE INTEGRATION BODY WAITS OUT A REAL ACCESS TOKEN, so it gets a bounded raise at that tier and
  // at no other; the loop body advances a controlled clock and keeps vitest's own 30 seconds.
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { h, w, sut } = await open();
  
      // THE WRITE THIS BODY USES IS `createOrganization`, and the choice is load-bearing: no
      // verification gate sits on it, so every refusal below is unambiguously the session layer's
      // rather than the Discovery floor's. Each attempt uses a FRESH name, so `organizationsNamed`
      // can say whether that particular attempt wrote anything.
      const { email } = await registerAndConfirm(sut, w.email('session-expiry'), PASSWORD);
  
      // SIGN-IN PRECEDES COMPLETION — the live public order. The registration handle is not used for
      // anything, here or below: on the real stack with confirmations on it does not exist.
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
  
      // (1) THE CONTROL. A live session writes. Without it every refusal below could be a write path
      // that never worked at all.
      const CONTROL_NAME = 'Riverside Shelter Control Programme';
      expect(
        (await sut.createOrganization(first.session, CONTROL_NAME)).ok,
        'a live session could not write — nothing below would be about the session layer',
      ).toBe(true);
  
      // (2) EXPIRY. The clock is the only thing that changes across this line: the same session, the
      // same account, the same shape of write.
      //
      // THE ADVANCE IS EXACTLY THE TTL, AND EXACTLY IS THE WHOLE POINT. The lifetime is
      // `[auth] jwt_expiry` in `supabase/config.toml`, read through the one registry entry the
      // fixture mirrors, and this lands the clock ON the expiry instant rather than past it. The
      // fixture's `sessionIsLive` compares with a strict `<`, so at this instant the session is
      // already dead and the write below is refused; an inclusive `<=` would admit it and this body
      // would fail. That boundary was a promise with no oracle until this line pinned it. AT-001.13
      // keeps its just-under/just-past pair, which discriminates the refresh rather than the boundary.
      await h.clock.advance(ACCESS_TOKEN_LIFETIME_MS);
  
      const EXPIRED_NAME = 'Riverside Shelter Expired Programme';
      const afterExpiry = await sut.createOrganization(first.session, EXPIRED_NAME);
      expect(afterExpiry.ok, 'an EXPIRED session was allowed to write').toBe(false);
      // A STALE-SESSION WRITE THAT HAPPENED ANYWAY IS NOT A BLOCK. The refusal hands back no
      // identifier, so the row that must not exist is looked for by the name that was attempted.
      expect(
        await sut.organizationsNamed(EXPIRED_NAME),
        'the refused write of an expired session created the organisation anyway',
      ).toEqual([]);
  
      // (3) RE-AUTHENTICATION IS THE REMEDY, proved by being the exact change that unblocks. The same
      // write, the same name, under a session obtained by signing in again.
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
  
      // (4) REVOCATION, the criterion's other half, on a session that is live at the moment it is
      // revoked — so the clock plays no part in this half and the two causes stay distinguishable.
      await sut.signOut(second.session);
  
      const REVOKED_NAME = 'Riverside Shelter Revoked Programme';
      const afterRevocation = await sut.createOrganization(second.session, REVOKED_NAME);
      expect(afterRevocation.ok, 'a REVOKED session was allowed to write').toBe(false);
      expect(
        await sut.organizationsNamed(REVOKED_NAME),
        'the refused write of a revoked session created the organisation anyway',
      ).toEqual([]);
  
      // (5) AND RE-AUTHENTICATION IS THE REMEDY FOR REVOCATION TOO. Revoking one session must not end
      // the account's access — that difference is what makes "the next request re-authenticates" a
      // remedy rather than a wall.
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
  // Same reason as the id above: the integration body polls a real client for a rotation it must not
  // ask for, which takes minutes rather than seconds. The loop body is unaffected.
  { surface: 'ui', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { h, w, sut } = await open();
  
      /**
       * WHICH HALF OF THIS CRITERION THIS TIER PROVES, said before the first assertion.
       *
       * PROVED HERE: a refresh takes NO credentials, extends the session it was given, and keeps work
       * going past the instant the session would otherwise have died — while an unrefreshed sibling
       * opened at the same instant dies exactly then. That pair is the discriminator: without the
       * sibling, a fixture that never expired anything would pass every assertion below.
       *
       * NOT PROVED HERE: the word "automatically". Scheduling a refresh is the supabase-js client's
       * job and no client exists in this tree; a fixture that scheduled its own would be grading
       * itself. That half is handed to the manifest's wiring leaf by this id's `ui` mark, and the
       * requirement's integration-tier gate binds it above that.
       */
      const { email } = await registerAndConfirm(sut, w.email('continuous-work'), PASSWORD);
  
      // TWO SESSIONS OPENED AT THE SAME INSTANT. The clock does not move between them, so they share
      // an expiry — which is what makes the divergence later attributable to the refresh and to
      // nothing else.
      const refreshedSignIn = await sut.signInWithEmailPassword(email, PASSWORD);
      const controlSignIn = await sut.signInWithEmailPassword(email, PASSWORD);
      expect(refreshedSignIn.ok && controlSignIn.ok, 'the confirmed account could not open two sessions').toBe(true);
      if (!refreshedSignIn.ok || !controlSignIn.ok) return;
  
      const refreshed = refreshedSignIn.session;
      const control = controlSignIn.session;
      expect(refreshed.sessionId, 'two sign-ins returned ONE session — the pair below would prove nothing').not.toBe(control.sessionId);
      expect(control.accountId, 'the two sessions belong to different accounts').toBe(refreshed.accountId);
  
      // Sign-in precedes completion, the live public order. The account is completed once and serves
      // both sessions, which is what the paired writes need.
      const completion = await sut.completeSignup(
        refreshed,
        { accountType: 'ngo', organizationName: 'Riverside Shelter', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(completion, 'the NGO completion was refused').toMatchObject({ ok: true });
      if (!completion.ok) return;
  
      // (1) BOTH SESSIONS WORK. One write each, so neither is assumed to work from the other's
      // success.
      expect((await sut.createOrganization(refreshed, 'Riverside Programme One')).ok, 'the refreshed session could not write at the start').toBe(true);
      expect((await sut.createOrganization(control, 'Riverside Programme Two')).ok, 'the control session could not write at the start').toBe(true);
  
      // (2) WORK CONTINUES, and the clock moves to just inside the expiry both sessions share. Both
      // still work, so the divergence in (4) cannot be blamed on this advance.
      await h.clock.advance(ACCESS_TOKEN_LIFETIME_MS - 1000);
      expect((await sut.createOrganization(refreshed, 'Riverside Programme Three')).ok, 'the refreshed session died before its expiry').toBe(true);
      expect((await sut.createOrganization(control, 'Riverside Programme Four')).ok, 'the control session died before its expiry').toBe(true);
  
      // (3) THE REFRESH. NO CREDENTIALS PASS THROUGH THIS CALL — there is no parameter for one, so
      // this body could not sign in here even by mistake. That is the criterion's "without forced
      // re-login", written as a fact of the interface rather than as a claim in a test name.
      const refreshOutcome = await sut.refreshSession(refreshed);
      expect(refreshOutcome.ok, 'refreshing a live session was refused').toBe(true);
      if (!refreshOutcome.ok) return;
      expect(
        refreshOutcome.session.sessionId,
        'the refresh opened a NEW session instead of extending the one it was given',
      ).toBe(refreshed.sessionId);
      expect(refreshOutcome.session.accountId, 'the refresh returned a different account').toBe(refreshed.accountId);
  
      // (4) PAST THE INSTANT BOTH SESSIONS WOULD HAVE DIED. The refreshed one keeps working; the
      // sibling that was not refreshed is refused, and its attempted write left nothing behind.
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
  
      // (1) THE CONTROL. The old password works before the reset, so "the old one does not" below is
      // a change this flow caused rather than a password that never worked.
      const before = await sut.signInWithEmailPassword(email, OLD_PASSWORD);
      expect(before.ok, 'the old password did not work before the reset').toBe(true);
      if (!before.ok) return;
      const accountId = before.session.accountId;
  
      expect((await sut.requestPasswordReset(email)).ok, 'requesting a password reset was refused').toBe(true);
  
      // (2) A LINK THAT WAS NEVER ISSUED CHANGES NOTHING — read FIRST, before the real link is
      // followed, so it is answered on an account whose password has not moved yet.
      //
      // THIS IS NOT A CLAIM ABOUT LINK LIFETIME. Retired AT-001.15's ground is deliberately
      // untouched. It guards THIS TEST'S OWN ORACLE: if a link-shaped string reset an account it
      // never belonged to, then "completing the emailed flow is what changes the password" would mean
      // nothing, because any string would change anything.
      const neverIssued = await sut.completePasswordReset('never-issued-link', NEW_PASSWORD);
      expect(neverIssued.ok, 'a reset link that was never issued was accepted').toBe(false);
      expect(
        (await sut.signInWithEmailPassword(email, OLD_PASSWORD)).ok,
        'a reset link that was never issued changed the password anyway',
      ).toBe(true);
  
      // (3) THE EMAILED LINK IS WHAT DOES IT.
      const link = await sut.emailedPasswordResetLink(email);
      expect(link, 'no reset link was emailed to the address that asked for one').not.toBeNull();
      expect((await sut.completePasswordReset(link!, NEW_PASSWORD)).ok, 'the emailed reset link was refused').toBe(true);
  
      // (4) THE CRITERION'S BOTH HALVES. The new password works.
      const withNew = await sut.signInWithEmailPassword(email, NEW_PASSWORD);
      expect(withNew.ok, 'the new password does not work after the reset').toBe(true);
      if (!withNew.ok) return;
      expect(withNew.session.accountId, 'the reset produced a different account').toBe(accountId);
  
      // And the old one does not. The session count is read across the refused attempt for the same
      // reason AT-001.38 reads it: a refusal hands back no handle, so only a count can show that the
      // rejected sign-in minted nothing.
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
