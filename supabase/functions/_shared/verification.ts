/**
 * THE TWO EMAIL-VERIFICATION JUDGEMENTS REQ-001's D2.L1 leaf ships, in ONE module.
 *
 * The PRD makes email verification "the floor for any Discovery message" and says vetting is
 * "never the Discovery wall" (decision-8, `.taskmaster/docs/prd-new.md` line 787). This module is
 * that floor, written as a decision rather than as a sentence in a document.
 *
 * ============================================================================================
 * THE GATE HAS NO DEPLOYED CALLER YET. IT IS THE HOOK THE DISCOVERY ROUTE MUST CALL.
 * ============================================================================================
 *
 * No Discovery surface exists anywhere in this repository — no table, no edge function, no
 * screen. The Discovery message route belongs to REQ-002/004, and
 * `.taskmaster/docs/migration-nextjs-to-tanstack-VERIFIED.md` maps it to a future
 * `discovery-message` edge function. Building that route here would be another requirement's
 * surface invented early, so this leaf ships the DECISION that route must consult and nothing
 * else. It is the same pattern the suite already ratifies for `hasPlatformAcknowledgment`
 * (`tests/at/suites/req-001/_contract.ts`): enforcement a leaf cannot build is named as the hook
 * the later leaf calls.
 *
 * SO: NO GREEN FROM THIS ITEM MAY BE READ AS "DISCOVERY MESSAGING IS GATED IN PRODUCTION."
 * What a green says is that this module answers as the two criteria require, and that the
 * acceptance suite's stand-in surface consults it. Whether the real route calls it is the real
 * route's leaf to prove, and that leaf does not exist yet.
 *
 * THE GATE IS TYPE-BLIND, AND THAT IS A DECISION RATHER THAN AN OMISSION. Decision-8 makes
 * verification the floor for ANY Discovery message. AT-001.10's unverified-NGO subject is an
 * INSTANCE of that rule, not its scope. A gate that read the account type would ship a
 * distinction no ratified text draws, so `discoveryMessageAllowed` never sees an account type.
 *
 * WHY A NEW MODULE RATHER THAN GROWING `accounts.ts`: that file's header scopes it to the
 * account deliverable's decisions; `github.ts` already set the several-small-modules precedent;
 * and this rule's future caller is the Discovery send route, not signup.
 *
 * TWO CONSTRAINTS THIS FILE IS UNDER, the same two `accounts.ts` and `github.ts` are under, and
 * both are real rather than stylistic:
 *
 *   1. ZERO NON-RELATIVE IMPORTS AND NO DENO GLOBAL. It is compiled by `tests/at/tsconfig.json`
 *      (`strict`, `skipLibCheck: false`, `types: ["node"]`, no DOM library) and it is also run by
 *      Deno inside the edge runtime. A bare `jsr:`/`npm:` specifier or a `Deno` reference would
 *      resolve in neither. The intersection of the two is plain TypeScript over plain data.
 *   2. NO I/O, NO CLOCK, NO RANDOMNESS. Both functions below are pure, so the same judgement can
 *      be replayed by a test with no network and no database.
 *
 * WHICH PROGRAM TYPE-CHECKS IT: the `tests/at` one, and only that one. It reaches that strict
 * program by being imported from `tests/at/suites/req-001/_fixture.ts` and from
 * `tests/at/harness/shipped-verification.selftest.ts`, exactly as `accounts.ts` does, and those
 * imports are the whole of its type coverage.
 *
 * ============================================================================================
 * BOTH FUNCTIONS FAIL CLOSED, AND THAT IS STATED BECAUSE THE EDGE ENTRY POINT HAS NO
 * TYPE-CHECKER.
 * ============================================================================================
 *
 * Measured, not assumed, and the measurement is `accounts.ts`'s: `bun run typecheck` covers the
 * root project (`src/**`) and the `tests/at` program, and neither reaches an edge-function entry
 * point (`supabase/functions/<name>/index.ts`). So a call site that forgets an argument, or that
 * hands over a response body it never checked, is a real possibility rather than a hypothetical
 * one. Every unrecognised shape below therefore reads as UNVERIFIED and every malformed caller is
 * REFUSED. A gate that disappears when a caller is careless is not a gate.
 *
 * The fail-closed promise has a direct oracle rather than only this paragraph:
 * `tests/at/harness/shipped-verification.selftest.ts` drives every malformed shape named here.
 * A promise with no oracle is an untrue stated fact waiting to happen.
 *
 * WHAT THIS MODULE DOES NOT DO: it never sets `email_confirmed_at`, never sends an email, and
 * never follows a link. Verified is Supabase Auth's own fact, written by GoTrue when the emailed
 * link is used. This leaf ships no migration and `public.accounts` gains no column, so there is
 * no second place where "verified" is recorded and no two records to disagree.
 *
 * AND IT ASSERTS NOTHING ABOUT LINK EXPIRY, SINGLE USE, OR RESEND. AT-001.11 is retired —
 * "verification-link expiry/single-use/resend semantics are not stated in REQ-001"
 * (`.taskmaster/docs/acceptance/at-req-001.md` line 22) — so no code here models those semantics.
 */

import type { Decision } from './accounts.ts';

/* --------------------------------------------------- 1. is this caller's email address verified */

/**
 * GoTrue's field for the instant a user's email address was confirmed.
 *
 * Named as a constant rather than spelled inline for the reason `github.ts` gives about
 * `identity_data.user_name`: it is a VENDOR's field name, so if it ever turns out to be spelled
 * differently, the change is a one-place change and a reader can find every use of it by
 * searching for one identifier.
 */
export const EMAIL_CONFIRMED_AT_FIELD = 'email_confirmed_at';

/**
 * Whether the caller's email address is verified — judged from the GoTrue `/auth/v1/user`
 * response shape and from nothing else.
 *
 * IT TAKES `unknown` ON PURPOSE, exactly as `extractGithubHandle` does. The argument is a JSON
 * body that crossed a network; typing the parameter as a tidy record would be a claim about
 * somebody else's server. So every step down into it is checked here instead.
 *
 * THE ONLY VERIFIED ANSWER is a `email_confirmed_at` that is a string with something in it. A
 * missing field, `null`, an empty or blank string, a number, a boolean, an object, an array, and
 * a user that is not an object at all ALL read as unverified. That list is not defensive
 * decoration — it is the fail-closed direction, and it is the safe one here: the gate below
 * refuses on unverified, so a shape this does not recognise BLOCKS a write loudly instead of
 * waiving the floor quietly.
 *
 * BLANK IS UNVERIFIED, and that is a deliberate reading rather than an accident of using `trim`.
 * A timestamp of three spaces is not an instant, and treating it as one would let the single
 * value most likely to arrive from a broken serialiser mean "verified".
 *
 * WHAT IS NOT PROVED BY ANY LOOP-TIER GREEN over this function: that the shape it reads is the
 * shape GoTrue really sends. The fixture renders the canonical shape, which is a prediction of
 * the vendor. The binding measurement is the live proof — `loop/items/AI4DEV-59/proof-local.ts`
 * check (d) feeds a REAL `/auth/v1/user` response of a confirmed user to this function.
 */
export function emailVerifiedFromUser(user: unknown): boolean {
  if (typeof user !== 'object' || user === null) return false;
  const confirmedAt = (user as Record<string, unknown>)[EMAIL_CONFIRMED_AT_FIELD];
  return typeof confirmedAt === 'string' && confirmedAt.trim() !== '';
}

/* ------------------------------------------------- 2. may this caller send a Discovery message */

/**
 * WHAT IS TRUE OF THE CALLER, as opposed to what the caller SAID — the same distinction
 * `CompleteSignupCaller` in `./accounts.ts` draws, and for the same security reason.
 *
 * `emailVerified` comes from `emailVerifiedFromUser` over the `/auth/v1/user` response for the
 * authenticated user. It is NEVER a field of the request body: a request field is something a
 * client asserts about itself, and a gate built on one gates nothing.
 */
export type DiscoveryMessageCaller = {
  /** whether Supabase Auth reports this user's email address confirmed */
  emailVerified: boolean;
};

/**
 * AT-001.10, as a decision: a Discovery message is permitted to a caller whose email address is
 * verified, and to nobody else.
 *
 * THE ONLY ALLOW IS `caller?.emailVerified === true`. Strict equality against `true`, not a
 * truthiness test: a caller that passed the string `"false"`, or `1`, or any other value a
 * careless JSON round trip produces, must not open the gate. This is the same fail-closed posture
 * `validateCompleteSignup` takes on its caller fact, for the same measured reason — the edge
 * entry point has no type-checker, so a missing or malformed argument is a real possibility.
 *
 * THE REFUSAL NAMES EMAIL VERIFICATION TWICE: as what is missing, and as the remedy. AT-001.10's
 * words are "the attempt is blocked with verification named as the remedy", and a 403 saying
 * "forbidden" would satisfy a weaker reading of that criterion while telling the sender nothing
 * about what to do next. The test body matches the reason against `/verif/i` and `/email/i`.
 *
 * IT IS TYPE-BLIND — see the module header. No account type reaches this function, because
 * decision-8's floor is under EVERY Discovery message and AT-001.10's NGO is one instance of it.
 *
 * IT SAYS NOTHING ABOUT VETTING. Decision-8 also says vetting is "never the Discovery wall", so a
 * vetting state is not a second condition hiding in here — verification is the whole floor, and
 * adding anything beside it would be building a wall the ratified text refuses.
 */
export function discoveryMessageAllowed(caller: DiscoveryMessageCaller): Decision<'verified'> {
  if (caller?.emailVerified === true) {
    return { ok: true, value: 'verified' };
  }
  return {
    ok: false,
    reason:
      'a Discovery message needs a verified email address — this account is email-unverified. ' +
      'Use the verification link sent to the account address, then send the message again',
  };
}
