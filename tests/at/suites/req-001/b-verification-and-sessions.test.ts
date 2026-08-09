/**
 * AT-REQ-001 sections B and C — email verification, the wrong-password path, sessions and reset.
 *
 * TWO OF THE SIX IDS HERE ARE NOW WRITTEN — AT-001.09 and AT-001.10, the verification leaf's own
 * pair. The other four are section C's and belong to the session-and-reset leaf (D2.L2); they are
 * still declared, not faked, and `LEAF`/`notLanded` stay imported for them.
 *
 * `supabase/config.toml` now carries `[auth.email] enable_confirmations = true`. Turning it on is
 * this leaf's own change, made in the same item as these two bodies. (The sentence this header
 * used to carry said the opposite and reserved the flip for a later leaf; that leaf is this one,
 * so the sentence is replaced rather than left to read as a promise nobody kept.)
 *
 * WHAT THE FLIP DOES AND DOES NOT REACH, said before the first assertion because it is the one
 * thing a reader could get wrong here. The flip is a LIVE-STACK change: with confirmations on, the
 * real GoTrue issues no session at signup and refuses sign-in until the address is confirmed. NONE
 * of that is reachable from this file — the fixture adapter's storage is a Map and its `Session`
 * has always been an identity handle rather than an access token. The live behaviour is measured
 * once, by hand, in `loop/items/AI4DEV-59/proof-local.ts`, checks (a), (c) and (d), and by nothing
 * else in this item.
 *
 * WHICH LEAVES ONE HONEST GAP, and it is stated rather than hidden: at THIS tier a
 * completed-but-unverified account is constructible, and AT-001.10's body constructs one on
 * purpose. On the live stack the public path cannot reach that state. The gate is still the right
 * thing to ship and to test, because decision-8 makes verification the WRITE PATH's own floor —
 * "the floor for any Discovery message" — and not a property borrowed from the session layer.
 * Non-public paths and configuration history both produce exactly this state, and a floor that
 * only holds while the session layer holds is not a floor.
 *
 * NO EXPIRY, SINGLE-USE OR RESEND SEMANTICS ARE ASSERTED ANYWHERE BELOW. AT-001.11 is retired —
 * `.taskmaster/docs/acceptance/at-req-001.md` line 22: "verification-link expiry/single-use/resend
 * semantics are not stated in REQ-001" — so asserting any of them would be reviving a criterion
 * that was deliberately withdrawn.
 *
 * SURFACE MARKS. AT-001.09 is marked `surface: 'ui'` because the verification screen is one of the
 * four auth screens the manifest's wiring leaf names ("signup, sign-in, verification, reset"), so
 * that leaf must find this id to re-run it with `--wired`. AT-001.10 stays `backend`: the Discovery
 * composer is REQ-002/004's surface, it is not one of those four screens, and the wiring leaf has
 * nothing of it to re-run.
 */

import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import { LEAF, notLanded } from './_pending.ts';
// THE TWO EMAIL-CAPABLE PUBLIC TYPES, read from the shipped vocabulary rather than spelled as a
// pair of literals. AT-001.09's own words are "EITHER account type that can register by email (NGO
// and volunteer)", and `PUBLIC_SIGNUP_ACCOUNT_TYPES` is that set as a value: the platform
// administrator is provisioned rather than signed up, so `parseAccountType` refuses it and it is
// outside this criterion by construction. Iterating the constant makes "either account type" a
// fact of the run instead of a claim in a test name.
import { PUBLIC_SIGNUP_ACCOUNT_TYPES } from '../../../../supabase/functions/_shared/accounts.ts';

/** The version string of the ToS + Platform Promise text these tests accept on the user's behalf. */
const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
/** The address the acknowledgment records — the same reported-not-verified value section A uses. */
const CLIENT_IP = '203.0.113.7';
/** The password every email/password registration in this file uses. */
const PASSWORD = 'correct horse battery staple';

atTest(
  'AT-001.09',
  'a fresh email/password signup of either account type is unverified until the link is used',
  { surface: 'ui' },
  async ({ open }) => {
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
);

atTest(
  'AT-001.10',
  'an unverified NGO account is blocked from Discovery messages with verification named as the remedy',
  { surface: 'backend' },
  async ({ open }) => {
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
);

atTest('AT-001.38', 'sign-in with the correct email and a wrong password is rejected and creates no session', notLanded(LEAF.D2_L2));

atTest('AT-001.12', 'an expired or revoked session ends access — the next request re-authenticates', notLanded(LEAF.D2_L2));

atTest('AT-001.13', 'a session in continuous use refreshes without a forced mid-work re-login', notLanded(LEAF.D2_L2));

atTest('AT-001.14', 'after the emailed reset flow the new password works and the old one does not', notLanded(LEAF.D2_L2));
