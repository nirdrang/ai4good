/**
 * REQ-001's INTEGRATION-TIER test bodies — one per id, against the slot's own stack.
 *
 * WHY THESE ARE SEPARATE BODIES AND NOT THE LOOP ONES RUN AGAIN. Some criteria are proved by
 * DIFFERENT PROCEDURES at the two tiers, proving the same criterion. AT-001.12's expiry arm commands
 * a controlled clock forward at loop tier; against a real GoTrue there is nothing to command, so the
 * same clause is proved by waiting out a real access token. The criterion never forks — both bodies
 * cite the same acceptance text — and the id is registered once, at one call site, with the tier
 * choosing which procedure runs.
 *
 * THE LIVE PUBLIC ORDER IS FOLLOWED EVERYWHERE. Register, use the emailed verification link, sign
 * in, and only then act. That is the order a real person follows, and it is forced rather than
 * chosen: `_live.ts` returns a handle with NO session from a registration, because the live stack
 * under `enable_confirmations = true` issues none, and every session-taking operation refuses such a
 * handle by name. A loop body written before that flip takes its session from the registration, and
 * that is why these bodies exist at all.
 *
 * FOUR BODIES HERE REFUSE RATHER THAN ASSERT, and each names the capability that is missing. That is
 * not a stub and it is not a skip: the refusal is a `CapabilityPending` carrying an exact name, so
 * the id is RED in a shape the declaration machinery matches from position 0, and a declaration has
 * to state which capability is missing rather than only that something is. The four are the ids
 * whose criteria need something this environment does not hold — a real OAuth consent round trip, a
 * real GitHub statistics import, or a Discovery send route that exists in no requirement yet.
 */

import { expect } from 'vitest';

import { CapabilityPending } from '../../harness/capabilities.ts';
import type { AtContext as HarnessAtContext } from '../../harness/registry.ts';
import type { Session } from './_contract.ts';
// AT-001.21's catalog arm — the declared classification of every table in `public`, and the rule that
// says how a live catalog disagrees with it. Integration tier only: the witness is the live catalog.
import { catalogConformanceProblems } from './_catalog-conformance.ts';
// AT-001.17's source arm, shared with its loop body: the arm runs identically at both tiers, and the
// two bodies live in different files, so the check has one home rather than two copies.
import { inviteOrAddMemberSurface } from './_source-scan.ts';
// The SHIPPED authority statement — the one attestation the deployed validation accepts.
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

/** The integration tier's context: no clock control seam, and a mail catcher instead of a sim. */
type Ctx = HarnessAtContext<'req-001', 'accounts', 'integration'>;

const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const CLIENT_IP = '203.0.113.7';
const PASSWORD = 'correct horse battery staple';
/**
 * AT-001.19's three fields, carried by every completion here that must SUCCEED.
 *
 * The two completions that do NOT carry them are the ones whose refusal is pinned to an EARLIER
 * check — AT-001.01's no-acknowledgment request and AT-001.07's `platform_admin` request. The
 * shared validation runs the identity checks last, so those two keep the reasons their criteria
 * name.
 */
const SIGNER = {
  signerName: 'Dana Okonkwo',
  signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
} as const;

/**
 * THE STANDING SESSION LIFETIME the slot's generated config pins, in milliseconds.
 *
 * It is a NUMBER THIS FILE STATES and the generator's own constant is the source of truth; the two
 * are not imported into each other because a suite reaching into the pool's internals is a coupling
 * nobody wants. What keeps them honest is that a mismatch shows up as a body waiting past its own
 * budget and failing loudly, never as a green.
 */
const SLOT_JWT_EXPIRY_MS = 120_000;

/**
 * THE BUDGET FOR THE TWO BODIES THAT WAIT OUT REAL TIME (gate-2 ruling S2-1).
 *
 * `vitest.config.ts` pins `testTimeout: 30_000`, which is right for every body whose clock can be
 * commanded — and wrong for these two, whose criteria are ABOUT the passage of time: AT-001.12 waits
 * `SLOT_JWT_EXPIRY_MS + 15_000` = 135 seconds for a real access token to expire, and AT-001.13 polls
 * for up to `SLOT_JWT_EXPIRY_MS + 30_000` = 150 seconds for a rotation it must not ask for. Under 30
 * seconds both would time out red however correct they were, so the declared integration green could
 * not occur.
 *
 * FOUR MINUTES, AND IT IS STILL A BOUND. It is the longer of the two waits plus about ninety seconds
 * for the live round trips around it — a sign-up, a mail-catcher read, a confirmation, a sign-in, a
 * completion and several writes. It is a raise, not a removal: a body that hangs still fails here
 * rather than running until somebody notices. The raise is PER TIER, so the loop tier's 30 seconds
 * are untouched.
 */
export const INTEGRATION_TIMEOUT_MS = 240_000;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ the real client, for AT-001.13 */

/**
 * EXACTLY THE CLIENT SURFACE AT-001.13 DEPENDS ON, declared here rather than imported.
 *
 * `@supabase/supabase-js` is a real runtime dependency of that body — the criterion is about a
 * client refreshing itself, and this repository ships none — but its type declarations describe a
 * BROWSER: they reach for `Window`, `CloseEvent`, `PublicKeyCredential` and a dozen other DOM names.
 * `tests/at/tsconfig.json` deliberately holds `lib: ["ES2022"]` with no DOM, and equally
 * deliberately keeps `skipLibCheck` FALSE — its own comment says why, and neither is a knob this
 * suite may turn to make one test body compile.
 *
 * So the module is loaded through a NON-LITERAL specifier, which TypeScript cannot resolve and
 * therefore does not type-check, and the surface this body uses is written out below. That is not a
 * way round the type system: it is a narrower claim than importing the whole library would make,
 * and it is checked at run time by the code failing loudly if the shape is wrong. The same pattern
 * is what `index.ts` uses to load a suite's adapter.
 */
type RealClient = {
  auth: {
    signInWithPassword(credentials: { email: string; password: string }): Promise<{
      data: { session: { access_token: string } | null };
      error: unknown;
    }>;
    getSession(): Promise<{ data: { session: { access_token: string } | null } }>;
    getUser(): Promise<{ data: { user: { id: string } | null } }>;
    stopAutoRefresh(): Promise<void>;
  };
};

async function realClient(url: string, anonKey: string): Promise<RealClient> {
  const specifier = '@supabase/supabase-js';
  const module = (await import(/* @vite-ignore */ specifier)) as {
    createClient?: (url: string, key: string, opts: unknown) => RealClient;
  };
  if (typeof module.createClient !== 'function') {
    throw new Error(`${specifier} exports no createClient() — AT-001.13's whole claim is about a real client`);
  }
  return module.createClient(url, anonKey, {
    auth: { autoRefreshToken: true, persistSession: false, detectSessionInUrl: false },
  });
}

/**
 * Register, confirm through the emailed link, and sign in — the live public order, as one step.
 *
 * IT ASSERTS AS IT GOES, because a helper that swallowed a failure would report the wrong cause for
 * the right red: "no session" three assertions later, rather than "no confirmation email arrived".
 */
async function registerConfirmAndSignIn(
  sut: Awaited<ReturnType<Ctx['open']>>['sut'],
  email: string,
  password = PASSWORD,
): Promise<Session> {
  const registered = await sut.registerWithEmailPassword(email, password);
  expect(registered.sessionId, 'the live registration issued a session, which under confirmations it must not').toBe('');

  const link = await sut.emailedVerificationLink(email);
  expect(link, `no confirmation email reached the slot's mail catcher for ${email}`).not.toBeNull();
  const used = await sut.useVerificationLink(link!);
  expect(used.ok, 'following the emailed confirmation link was refused').toBe(true);

  const signedIn = await sut.signInWithEmailPassword(email, password);
  expect(signedIn, `sign-in after confirmation failed for ${email}`).toMatchObject({ ok: true });
  if (!signedIn.ok) throw new Error('unreachable: the assertion above fails first');
  expect(signedIn.session.accountId, 'sign-in resolved to a different account than the registration created').toBe(
    registered.accountId,
  );
  return signedIn.session;
}

/* ------------------------------------------------------------------------ the ids that go green */

/**
 * AT-001.01 — the FULL-OUTCOME oracle, not the atomicity arm alone.
 *
 * The criterion names five outcomes and a later sign-in, and gate 1 ruled that a green here has to
 * prove all of them: an account of type NGO, an org, an admin membership in it, an acknowledgment
 * carrying timestamp, IP and text version, the pre-project gate discriminating, and a return
 * sign-in. Atomicity is the NEGATIVE arm and is asserted last.
 *
 * WHAT IS LIVE HERE THAT WAS NOT AT LOOP TIER: the act is the DEPLOYED `complete-signup`, so the
 * platform's own token check, `resolveCaller`, the edge function and the database's
 * `complete_signup` all sit on the path; and `hasPlatformAcknowledgment` calls the SHIPPED SQL
 * predicate rather than an adapter query, which is the one thing the loop tier's own fixture says
 * its green cannot establish.
 */
export async function at00101(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const email = w.email('ngo-signup');
  const session = await registerConfirmAndSignIn(sut, email);

  expect(
    await sut.hasPlatformAcknowledgment(session.accountId),
    'a user who has authenticated but not completed signup must NOT hold the platform acknowledgment',
  ).toBe(false);

  const completion = await sut.completeSignup(
    session,
    { accountType: 'ngo', organizationName: 'Riverside Shelter', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, 'the deployed complete-signup refused the NGO completion').toMatchObject({ ok: true });
  if (!completion.ok) return;
  expect(completion.organizationId, 'an NGO completion produced no organisation').not.toBeNull();

  expect(await sut.account(completion.accountId)).toEqual({ id: session.accountId, accountType: 'ngo' });
  expect(await sut.organization(completion.organizationId!)).toMatchObject({ name: 'Riverside Shelter' });
  expect(await sut.membership(completion.organizationId!, completion.accountId)).toEqual({
    organizationId: completion.organizationId,
    accountId: completion.accountId,
    role: 'admin',
  });

  const acknowledgments = await sut.acknowledgments(completion.accountId);
  expect(acknowledgments, 'exactly one platform acknowledgment is recorded by one completion').toHaveLength(1);
  expect(acknowledgments[0].textVersion, 'the acknowledgment must say WHICH text was accepted').toBe(TEXT_VERSION);
  // The address the gateway chain REPORTED, never a verified source address — the header travels
  // through kong and the edge runtime and must arrive in the row intact.
  expect(acknowledgments[0].ip, 'the reported address did not reach the acknowledgment row').toContain(CLIENT_IP);
  expect(
    Number.isFinite(Date.parse(acknowledgments[0].acknowledgedAt)),
    `the acknowledgment timestamp ${JSON.stringify(acknowledgments[0].acknowledgedAt)} is not a readable instant`,
  ).toBe(true);

  expect(
    await sut.hasPlatformAcknowledgment(completion.accountId),
    'the SHIPPED has_platform_acknowledgment does not hold once signup has completed',
  ).toBe(true);

  const returning = await sut.signInWithEmailPassword(email, PASSWORD);
  expect(returning, 'the same credentials did not sign in again').toMatchObject({ ok: true });
  if (!returning.ok) return;
  expect(returning.session.accountId).toBe(session.accountId);

  /*
   * THE NEGATIVE ARM, AND EXACTLY WHAT IT PROVES — narrowed by gate-2 ruling S2-3, which asked
   * whether it proves more than this and had the question measured rather than argued.
   *
   * WHAT IT PROVES: the DEPLOYED completion path refuses a completion that carries no
   * acknowledgment, states the acknowledgment as the reason, and leaves NO account row and NO
   * acknowledgment behind. That is the criterion's clause — the acknowledgment is required — proved
   * against the deployed function rather than against a fixture.
   *
   * WHAT IT DOES NOT PROVE, said plainly because an earlier version of this comment implied it: it
   * is NOT a demonstration of mid-transaction rollback. The refusal here comes from
   * `validateCompleteSignup` BEFORE the database is called, so "zero rows left" is true because
   * nothing was ever written, not because something was written and undone.
   *
   * AND THAT IS NOT A GAP LEFT UNEXAMINED. `verify-first.md` Part C records the inspection: the only
   * write inside `public.complete_signup` that can fail after an earlier one has succeeded is the
   * acknowledgment insert, whose lever is an empty `text_version` — and JavaScript's `trim()` strips
   * a superset of what Postgres's `btrim()` strips, so every value the constraint would refuse the
   * validator refuses first. Measured on both instruments; the intersection is empty by
   * construction. In-transaction rollback is therefore NOT externally drivable on the deployed
   * surface, and no fault-injection seam was added to shipped code to manufacture one. The green
   * rests on the full-outcome positive oracle above plus this refusal.
   */
  const other = await registerConfirmAndSignIn(sut, w.email('no-acknowledgment'));
  const refused = await sut.completeSignup(other, { accountType: 'ngo', organizationName: 'Riverside Shelter Annexe' }, CLIENT_IP);
  expect(refused.ok, 'signup completed with no acknowledgment of the ToS and Platform Promise').toBe(false);
  if (refused.ok) return;
  expect(refused.reason, 'the refusal does not say the acknowledgment is what is missing').toMatch(/acknowledgment/i);
  expect(await sut.account(other.accountId), 'the refused completion left an account row behind').toBeNull();
  expect(
    await sut.hasPlatformAcknowledgment(other.accountId),
    'the refused completion recorded an acknowledgment anyway',
  ).toBe(false);
}

/**
 * AT-001.06 — a volunteer is refused the NGO-only action while an NGO performs it.
 *
 * THE CONTROL IS NOT OPTIONAL: an operation that refuses everybody would satisfy the negative half
 * on its own, so the NGO succeeds FIRST and the volunteer's refusal is then attributable to the
 * account type.
 *
 * THE LINKED IDENTITY IS A GIVEN HERE, and it is written by the operator. Since the GitHub leaf a
 * volunteer cannot complete signup without one; the refusal under test is the NGO-only one, so the
 * volunteer has to reach the state of being a signed-up volunteer first. AT-001.04 owns the link
 * rule and is declared red at this tier for exactly the reason that rule cannot be proved live.
 */
export async function at00106(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  const ngo = await registerConfirmAndSignIn(sut, w.email('ngo-actor'));
  const ngoCompletion = await sut.completeSignup(
    ngo,
    { accountType: 'ngo', organizationName: 'Riverside Shelter', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(ngoCompletion, 'the NGO control could not complete signup').toMatchObject({ ok: true });
  if (!ngoCompletion.ok) return;

  const ngoAction = await sut.createOrganization(ngo, 'Riverside Shelter Second Programme');
  expect(ngoAction, 'the NGO control was refused the NGO-only action, so the refusal below proves nothing').toMatchObject({
    ok: true,
  });
  if (!ngoAction.ok) return;
  expect(await sut.organization(ngoAction.organizationId)).toMatchObject({ name: 'Riverside Shelter Second Programme' });
  expect(await sut.membership(ngoAction.organizationId, ngoCompletion.accountId)).toMatchObject({ role: 'admin' });

  const volunteer = await registerConfirmAndSignIn(sut, w.email('volunteer-actor'));
  await sut.linkGithubIdentity(volunteer, 'volunteer-actor-handle');
  const volunteerCompletion = await sut.completeSignup(
    volunteer,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(volunteerCompletion, 'the volunteer could not complete signup, so the refusal below is not the one under test').toMatchObject(
    { ok: true },
  );
  if (!volunteerCompletion.ok) return;

  const REFUSED_NAME = 'Riverside Shelter Copy';
  const volunteerAction = await sut.createOrganization(volunteer, REFUSED_NAME);
  expect(volunteerAction.ok, 'a volunteer account performed an NGO-only action').toBe(false);
  if (volunteerAction.ok) return;

  // A REJECTION INCLUDES ITS WRITES NOT HAPPENING, and on the live stack that is row-level truth
  // rather than a mirror: no organisation by the attempted name, and no membership anywhere.
  expect(await sut.organizationsNamed(REFUSED_NAME), `the refused action created an organisation named ${REFUSED_NAME}`).toEqual([]);
  expect(await sut.membershipsOf(volunteerCompletion.accountId), 'the refused action left the volunteer holding a membership').toEqual(
    [],
  );
  expect(volunteerAction.reason).toMatch(/NGO accounts only/i);
  expect(volunteerAction.reason).toMatch(/volunteer/i);
}

/**
 * AT-001.07 — a provisioned platform administrator authenticates and carries the type; the public
 * signup surface offers only the two.
 *
 * THE SECOND CLAUSE IS PROVED DIFFERENTLY HERE, and that difference is the reason this body exists.
 * At loop tier it reads `publicSignupAccountTypes()`, which is a constant a shipped module exports —
 * a list is a claim. At this tier the live oracle is a REFUSAL, which is a fact: the DEPLOYED
 * completion path is asked for a `platform_admin` and must refuse it and leave no row behind. That
 * is a strictly stronger oracle, and it is why the constant is not among the methods the live
 * adapter backs.
 */
export async function at00107(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  const adminEmail = w.email('platform-admin');
  const provisioned = await sut.provisionPlatformAdmin(adminEmail, PASSWORD);

  const signedIn = await sut.signInWithEmailPassword(adminEmail, PASSWORD);
  expect(signedIn, 'the provisioned platform admin could not sign in').toMatchObject({ ok: true });
  if (!signedIn.ok) return;
  expect(signedIn.session.accountId).toBe(provisioned.accountId);
  expect(
    await sut.account(signedIn.session.accountId),
    'the signed-in administrator does not carry the platform_admin global type',
  ).toMatchObject({ accountType: 'platform_admin' });

  const visitor = await registerConfirmAndSignIn(sut, w.email('would-be-admin'));
  const escalation = await sut.completeSignup(
    visitor,
    { accountType: 'platform_admin', acknowledgmentTextVersion: TEXT_VERSION },
    CLIENT_IP,
  );
  expect(escalation.ok, 'the DEPLOYED public signup path minted a platform administrator').toBe(false);
  if (escalation.ok) return;
  expect(escalation.reason).toMatch(/platform_admin/);
  expect(await sut.account(visitor.accountId), 'the refused escalation left an account row behind').toBeNull();
}

/**
 * AT-001.09 — email verification, PARAMETERIZED OVER BOTH email-capable account types.
 *
 * Gate 1's finding 8 is what makes this body cover two types rather than one: the criterion says
 * "EITHER account type … (NGO and volunteer)" and carries the acceptance file's own
 * "parameterized over account types" note, and the migrated NGO-only set proved half of it.
 *
 * AND EACH ITERATION REALLY IS ITS TYPE (gate-2 ruling S2-4). The first version of this body labelled
 * the two iterations `ngo` and `volunteer` and differed only in the email address it used — neither
 * one ever created an account of either type, so the parameterization was nominal and a
 * type-specific verification regression would have gone unnoticed by both halves. Each iteration now
 * COMPLETES SIGNUP as its type after verification — the NGO with an organisation, the volunteer with
 * a linked GitHub identity, both with the acknowledgment — and asserts the account row carries that
 * global type.
 *
 * WHAT IS LIVE HERE: the message is the one GoTrue really sent, held by the slot's own mail catcher;
 * the link is followed by HTTP; and the verified fact is judged by the SHIPPED extractor over the
 * real row rather than read as a boolean.
 */
export async function at00109(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  for (const kind of ['ngo', 'volunteer'] as const) {
    const email = w.email(`${kind}-verify`);
    const registered = await sut.registerWithEmailPassword(email, PASSWORD);
    expect(registered.sessionId, 'the live registration issued a session, which under confirmations it must not').toBe('');

    // UNVERIFIED FIRST, and it must DISCRIMINATE: an extractor that answered true unconditionally
    // would satisfy every assertion after the link is used.
    expect(
      await sut.emailVerified(registered.accountId),
      `a fresh ${kind} registration is already reported verified — nothing below would then mean anything`,
    ).toBe(false);

    // Auth itself refuses sign-in before confirmation, which is the state the criterion describes.
    const early = await sut.signInWithEmailPassword(email, PASSWORD);
    expect(early.ok, `an unconfirmed ${kind} account signed in`).toBe(false);

    const link = await sut.emailedVerificationLink(email);
    expect(link, `no confirmation email reached the slot's mail catcher for the ${kind} address`).not.toBeNull();

    const used = await sut.useVerificationLink(link!);
    expect(used.ok, `following the emailed ${kind} confirmation link was refused`).toBe(true);
    expect(
      await sut.emailVerified(registered.accountId),
      `using the emailed link did not flip the ${kind} account to verified`,
    ).toBe(true);

    const after = await sut.signInWithEmailPassword(email, PASSWORD);
    expect(after, `a confirmed ${kind} account could not sign in`).toMatchObject({ ok: true });
    if (!after.ok) return;

    // THE COMPLETION AS THIS TYPE, which is what makes the two iterations two different runs of the
    // criterion rather than the same run under two labels. The volunteer's linked GitHub identity is
    // a GIVEN written by the operator — AT-001.04 owns the link rule and is red at this tier — and
    // without it the deployed path refuses a volunteer completion, correctly.
    const request =
      kind === 'ngo'
        ? {
            accountType: 'ngo' as const,
            organizationName: `Riverside Shelter ${kind}-verify`,
            acknowledgmentTextVersion: TEXT_VERSION,
            ...SIGNER,
          }
        : { accountType: 'volunteer' as const, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER };
    if (kind === 'volunteer') await sut.linkGithubIdentity(after.session, `verify-${registered.accountId.slice(0, 8)}`);

    const completion = await sut.completeSignup(after.session, request, CLIENT_IP);
    expect(completion, `the verified ${kind} could not complete signup as a ${kind}`).toMatchObject({ ok: true });
    if (!completion.ok) return;
    expect(
      await sut.account(completion.accountId),
      `the completed ${kind} account does not carry the ${kind} global type`,
    ).toEqual({ id: registered.accountId, accountType: kind });
  }
}

/**
 * AT-001.12 — access ends when a session expires OR is revoked, and re-authentication is the remedy.
 *
 * TWO ARMS, BOTH AGAINST REAL TIME AND A REAL AUTH.
 *
 *   REVOCATION — a scoped logout ends THIS session while a SIBLING session of the same account keeps
 *   working. The sibling is the control that separates "this session ended" from "the account's
 *   access ended", and without it the criterion's remedy clause is untested.
 *
 *   EXPIRY — the body WAITS OUT a real access token. There is nothing to command: the slot's config
 *   pins a standing low `jwt_expiry` precisely so this wait is two minutes rather than an hour, and
 *   no test edits configuration or restarts anything. The loop body advances a controlled clock,
 *   which is a different procedure proving the same clause.
 */
export async function at00112(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const email = w.email('sessions');
  const session = await registerConfirmAndSignIn(sut, email);

  const completion = await sut.completeSignup(
    session,
    { accountType: 'ngo', organizationName: 'Riverside Shelter', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, 'the session under test could not complete signup, so nothing below is about a working session').toMatchObject({
    ok: true,
  });

  // A SIBLING SESSION, opened before the logout, standing as the control.
  const sibling = await sut.signInWithEmailPassword(email, PASSWORD);
  expect(sibling, 'a second sign-in for the same account failed').toMatchObject({ ok: true });
  if (!sibling.ok) return;
  const before = await sut.sessionsOf(session.accountId);
  expect(before.length, 'the account does not hold the two sessions this arm needs').toBeGreaterThanOrEqual(2);

  await sut.signOut(session);
  const after = await sut.sessionsOf(session.accountId);
  expect(after.map((row) => row.sessionId), 'the signed-out session row is still there').not.toContain(session.sessionId);
  expect(after.map((row) => row.sessionId), 'the scoped logout took the sibling session with it').toContain(sibling.session.sessionId);

  // THE REVOKED SESSION CANNOT WRITE. `create-organization` is the write, because no verification
  // gate sits on it — so a refusal here is unambiguously the session layer's.
  const revokedWrite = await sut.createOrganization(session, 'Riverside Shelter After Logout');
  expect(revokedWrite.ok, 'a revoked session performed a write').toBe(false);
  expect(await sut.organizationsNamed('Riverside Shelter After Logout'), 'the revoked write happened anyway').toEqual([]);

  // RE-AUTHENTICATION IS THE REMEDY, not a wall: a fresh sign-in works at once.
  const again = await sut.signInWithEmailPassword(email, PASSWORD);
  expect(again, 're-authentication after revocation was refused, so revocation ended the account rather than the session').toMatchObject(
    { ok: true },
  );
  if (!again.ok) return;

  // THE EXPIRY ARM. Wait past the slot's standing token lifetime and assert the same write is
  // refused — with the margin on the far side, so a token that is merely close to expiry is not
  // mistaken for one that has passed it.
  await wait(SLOT_JWT_EXPIRY_MS + 15_000);
  const expiredWrite = await sut.createOrganization(again.session, 'Riverside Shelter After Expiry');
  expect(expiredWrite.ok, 'an expired access token performed a write').toBe(false);
  expect(await sut.organizationsNamed('Riverside Shelter After Expiry'), 'the expired write happened anyway').toEqual([]);

  // And the refresh token re-establishes access with NO credentials — which is what makes expiry a
  // pause rather than a logout, and is the mechanism AT-001.13 builds its own claim on.
  const refreshed = await sut.refreshSession(again.session);
  expect(refreshed, 'the same session could not be refreshed after its access token expired').toMatchObject({ ok: true });
  if (!refreshed.ok) return;
  const afterRefresh = await sut.createOrganization(refreshed.session, 'Riverside Shelter After Refresh');
  expect(afterRefresh, 'a refreshed session still could not write').toMatchObject({ ok: true });
}

/**
 * AT-001.13 — the session refreshes AUTOMATICALLY, with no forced re-login mid-work.
 *
 * GATE 1'S FINDING 7 IS WHY THIS BODY LOOKS DIFFERENT FROM EVERY OTHER ONE HERE. The criterion's
 * word is "automatically", and every existing piece of evidence proves the MECHANISM: the loop body
 * calls `refreshSession` explicitly, and the live proof transcript says in its own words that it
 * establishes nothing about scheduling. A mechanism-only green at the tier whose meaning is "proved
 * for real" would be a new overclaim.
 *
 * SO THE THING UNDER TEST IS A REAL CLIENT — supabase-js with `autoRefreshToken: true` — and the
 * observable is a rotation NOBODY ASKED FOR: the access token the client holds changes while the
 * body only waits, and access continues afterwards. No `refreshSession` call appears below.
 *
 * WHY THE COORDINATES COME FROM THE ENVIRONMENT rather than through the system under test: the thing
 * under test is a CLIENT LIBRARY, not a product surface, and this repository ships no client. The
 * runner validated those coordinates, attested them, and put them in this child's environment; a
 * system-under-test method wrapping the client would be this suite building the very thing it is
 * supposed to be observing.
 */
export async function at00113(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const email = w.email('auto-refresh');
  const session = await registerConfirmAndSignIn(sut, email);

  // SIGNUP IS COMPLETED FIRST, so there is an account row for the rotated session to resolve TO.
  // Without it the same-account assertion below could only ever compare two nulls, which is how the
  // vacuous version of it came to be written (gate-2 ruling S2-5).
  const completion = await sut.completeSignup(
    session,
    { accountType: 'ngo', organizationName: 'Riverside Shelter Auto Refresh', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, 'the account under test could not complete signup, so it holds no account row').toMatchObject({ ok: true });

  const url = process.env.AT_SUPABASE_URL ?? '';
  const anonKey = process.env.AT_SUPABASE_ANON_KEY ?? '';
  expect(url && anonKey, 'this child holds no slot coordinates, so no real client can be built').toBeTruthy();

  const client = await realClient(url, anonKey);
  try {
    const signedIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
    expect(signedIn.error, 'the real client could not sign in against the slot').toBeNull();
    const first = signedIn.data.session?.access_token ?? '';
    expect(first, 'the real client signed in with no access token').not.toBe('');

    // WHOSE SESSION THIS IS, captured AT SIGN-IN and from the client's own answer — so the assertion
    // after the rotation compares the rotated identity with a value that was read before any
    // rotation happened, rather than with itself.
    const signedInAs = (await client.auth.getUser()).data.user?.id ?? '';
    expect(signedInAs, 'the real client signed in and named no user').not.toBe('');
    expect(signedInAs, 'the real client signed in as a different account than the harness registered').toBe(
      session.accountId,
    );

    // WAIT, AND ONLY WAIT. The client's own scheduler is the thing under test, so the body issues no
    // refresh of any kind. The budget is the token's whole lifetime plus a margin: the client
    // rotates about one tick in, well before expiry, and a body that waited less than the lifetime
    // could pass by luck.
    const deadline = Date.now() + SLOT_JWT_EXPIRY_MS + 30_000;
    let rotated = '';
    while (Date.now() < deadline && !rotated) {
      await wait(5_000);
      const current = (await client.auth.getSession()).data.session?.access_token ?? '';
      if (current && current !== first) rotated = current;
    }
    expect(rotated, 'the client never rotated its access token on its own — automatic refresh is unproved').not.toBe('');

    // "WITHOUT FORCED RE-LOGIN MID-WORK": the work continues, with no credentials supplied anywhere.
    const me = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${rotated}` },
    });
    expect(me.status, 'the automatically rotated token does not carry access').toBe(200);

    // AND IT IS THE SAME USER'S WORK THAT CONTINUED, which is the clause the previous version of
    // this assertion did not reach: `account === null || account.id.length > 0` is satisfied by
    // every possible value, so it passed whoever the rotated token belonged to. Two independent
    // reads now say the same name — the client's own `getUser()` over the rotated token, and the
    // account row read out of the database with operator authority.
    const rotatedUser = (await client.auth.getUser()).data.user?.id ?? '';
    expect(rotatedUser, 'the automatically rotated token names a different user than the one that signed in').toBe(
      signedInAs,
    );
    const account = await sut.account(rotatedUser);
    expect(account, 'the rotated session resolved to no readable account row').not.toBeNull();
    expect(account?.id, 'the account row the rotated session resolves to is somebody else\'s').toBe(signedInAs);
  } finally {
    await client.auth.stopAutoRefresh().catch(() => undefined);
  }
}

/**
 * AT-001.14 — the emailed reset flow changes the password: the new one works and the old one does
 * not.
 *
 * The link is the one GoTrue really sent, held by the slot's own catcher, and its flow shape is read
 * from what the link answers rather than remembered — the shape differs across CLI versions and
 * AI4DEV-60's proof measured it before using it.
 */
export async function at00114(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const email = w.email('password-reset');
  await registerConfirmAndSignIn(sut, email);

  await sut.requestPasswordReset(email);
  const link = await sut.emailedPasswordResetLink(email);
  expect(link, "no recovery email reached the slot's mail catcher").not.toBeNull();

  const NEW_PASSWORD = 'a completely different passphrase 42';
  const completed = await sut.completePasswordReset(link!, NEW_PASSWORD);
  expect(completed.ok, 'completing the emailed reset flow failed').toBe(true);

  const withNew = await sut.signInWithEmailPassword(email, NEW_PASSWORD);
  expect(withNew, 'the new password does not work').toMatchObject({ ok: true });

  const withOld = await sut.signInWithEmailPassword(email, PASSWORD);
  expect(withOld.ok, 'the OLD password still works after the reset').toBe(false);
}

/**
 * AT-001.38 — the wrong password is rejected and NO authenticated session is created.
 *
 * The second clause is the one a refusal's own return value cannot show, so it is measured as an
 * UNCHANGED set of `auth.sessions` rows across the refused attempt — read with operator authority,
 * which is the only place the fact lives.
 */
export async function at00138(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const email = w.email('wrong-password');
  const session = await registerConfirmAndSignIn(sut, email);

  const before = (await sut.sessionsOf(session.accountId)).map((row) => row.sessionId).sort();

  const refused = await sut.signInWithEmailPassword(email, 'not the password at all');
  expect(refused.ok, 'the wrong password signed in').toBe(false);

  const after = (await sut.sessionsOf(session.accountId)).map((row) => row.sessionId).sort();
  expect(after, 'the refused sign-in created an authenticated session').toEqual(before);

  // THE CONTROL: the CORRECT password does add exactly one row, so the assertion above is measuring
  // a real observable rather than a table nothing ever writes to.
  const accepted = await sut.signInWithEmailPassword(email, PASSWORD);
  expect(accepted, 'the correct password was refused, so the negative above proves nothing').toMatchObject({ ok: true });
  expect((await sut.sessionsOf(session.accountId)).length, 'the accepted sign-in added no session row').toBe(after.length + 1);
}

/* ------------------------------------------------- the per-organisation role ids (D3.L1) -------- */

/**
 * THE TWO-MEMBERSHIP GIVEN, provisioned once for AT-001.16 and AT-001.36 — and HOW it is reached is
 * part of what those greens claim, so it is written down here rather than buried in a helper name.
 *
 * ONE ACCOUNT, THREE ORGANISATIONS, TWO MEMBERSHIP ROWS:
 *   * A — created by the PRODUCT path. `complete_signup` writes the organisation and seats the
 *     caller as its `admin`, inside one transaction, exactly as an NGO signup does.
 *   * B — created by the OPERATOR with NO membership row, and the actor is then granted B's single
 *     seat as `member`.
 *   * C — created by the OPERATOR and left unseated, so the actor holds no membership in it at all.
 *
 * WHY B AND C NEED AN OPERATOR AT ALL, said plainly because it is the honest part. No product path
 * writes `'member'`: the single-seat invariant (AT-001.17) forbids invites, so there is no invite
 * surface to mint a second member and no second seat for one to occupy. The `member` half of the
 * `org_role` enum exists for AT-001.36 and this is how that criterion's Given is reached — the same
 * posture the merged integration-verification item recorded for its own operator-provisioned Givens.
 * The Given is provisioned; the BEHAVIOUR under test is entirely the product's.
 */
async function twoMembershipGiven(
  sut: Awaited<ReturnType<Ctx['open']>>['sut'],
  w: Awaited<ReturnType<Ctx['open']>>['w'],
  label: string,
  names: { a: string; b: string; c: string },
): Promise<{ session: Session; accountId: string; organizationA: string; organizationB: string; organizationC: string }> {
  const session = await registerConfirmAndSignIn(sut, w.email(label));
  const completion = await sut.completeSignup(
    session,
    { accountType: 'ngo', organizationName: names.a, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, 'the NGO actor could not complete signup, so nothing below is about a seated admin').toMatchObject({ ok: true });
  if (!completion.ok || completion.organizationId === null) throw new Error('unreachable: the assertion above fails first');

  const organizationB = await sut.createOrganizationAsOperator(names.b);
  const seated = await sut.grantMembershipAsOperator(organizationB.id, completion.accountId, 'member');
  expect(seated, `the operator could not seat the actor as ${names.b}'s single member, so the Given does not exist`).toMatchObject({
    ok: true,
  });
  const organizationC = await sut.createOrganizationAsOperator(names.c);

  return {
    session,
    accountId: completion.accountId,
    organizationA: completion.organizationId,
    organizationB: organizationB.id,
    organizationC: organizationC.id,
  };
}

/**
 * AT-001.16 — membership and role are held per NGO, and acting in one grants nothing in another.
 *
 * WHAT IS LIVE HERE THAT WAS NOT AT LOOP TIER: the two membership rows are rows in
 * `public.org_memberships` read back with operator authority, the rename is the DEPLOYED
 * `update-organization` — so the platform's token check, `resolveCaller`, the service-role
 * membership read and the definer function all sit on the path — and the refusals are the ones the
 * deployed function really sent.
 *
 * WHAT THIS GREEN CLAIMS, AND WHAT IT DOES NOT (gate-1 ruling 1). It claims OPERATION-SURFACE
 * isolation: the same account's authority does not cross organisations on this action, proved by
 * three different answers to one caller. It does NOT claim READ isolation — that is a different
 * claim, made by different ids.
 *
 * (This paragraph used to close by saying the tree had no read surface to leak through, because
 * row-level security was on with zero policies and `org_memberships` reached no client role. All
 * three clauses stopped being true on 2026-08-12 and 2026-08-13, when the tenant-isolation
 * deliverable this leaf unblocked landed its two migrations: `authenticated` now holds `select` on
 * the four tenant tables and each one carries policies. The read claim did not move here — it is
 * AT-001.21, .22, .23, .40 and .24's, in `d-tenant-isolation.test.ts` — so what changed is only that
 * this note may no longer rest on an absence.)
 */
export async function at00116(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const NAMES = {
    a: 'Riverside Shelter 16A',
    b: 'Northgate Foodbank 16B',
    c: 'Eastside Legal Aid 16C',
  };
  const RENAMED_A = 'Riverside Shelter and Kitchen 16A';
  const ATTEMPTED_B = 'Northgate Foodbank Renamed By An Outsider 16B';
  const ATTEMPTED_C = 'Eastside Legal Aid Renamed By An Outsider 16C';

  const given = await twoMembershipGiven(sut, w, 'two-orgs-16', NAMES);

  // (1) ROLE IS HELD PER ORGANISATION — two independent rows, different roles, and NO row in C.
  expect(await sut.membership(given.organizationA, given.accountId), 'the actor is not A\'s admin').toMatchObject({ role: 'admin' });
  expect(await sut.membership(given.organizationB, given.accountId), 'the actor is not B\'s member').toMatchObject({ role: 'member' });
  expect(await sut.membership(given.organizationC, given.accountId), 'the actor holds a membership in C, which the Given denies').toBeNull();
  const held = await sut.membershipsOf(given.accountId);
  expect(held, 'the actor does not hold exactly two memberships').toHaveLength(2);
  expect(
    held.map((row) => row.role).sort(),
    'the two memberships do not carry two different roles, so the role is not being held per organisation',
  ).toEqual(['admin', 'member']);

  // (2) THE ADMIN ACTS IN A. The positive is not optional: an action that refused everybody would
  // satisfy both refusals below on its own.
  const renamed = await sut.updateOrganization(given.session, given.organizationA, RENAMED_A);
  expect(renamed, 'A\'s own admin was refused the admin-only action, so the refusals below prove nothing').toMatchObject({ ok: true });
  expect(await sut.organization(given.organizationA), 'the rename did not reach the row').toMatchObject({ name: RENAMED_A });

  // (3) ADMIN STANDING IN A DOES NOT CARRY INTO B, where the same account holds `member`.
  const refusedInB = await sut.updateOrganization(given.session, given.organizationB, ATTEMPTED_B);
  expect(refusedInB.ok, 'A\'s admin renamed an organisation where it holds only the member role').toBe(false);
  if (refusedInB.ok) return;
  expect(refusedInB.kind, 'the refusal in B is not the not-an-admin one').toBe('not-an-admin');
  expect(await sut.organization(given.organizationB), 'the refused rename reached B\'s row anyway').toMatchObject({ name: NAMES.b });
  expect(await sut.organizationsNamed(ATTEMPTED_B), 'the refused rename created an organisation by the attempted name').toEqual([]);

  // (4) NO AMBIENT AUTHORITY — C, where the actor holds no membership at all, refuses with the
  // OTHER kind. Two different refusals from one caller is what makes this an isolation oracle
  // rather than a blanket denial.
  const refusedInC = await sut.updateOrganization(given.session, given.organizationC, ATTEMPTED_C);
  expect(refusedInC.ok, 'the actor renamed an organisation it holds no membership in').toBe(false);
  if (refusedInC.ok) return;
  expect(refusedInC.kind, 'the refusal in C is not the not-a-member one').toBe('not-a-member');
  expect(await sut.organization(given.organizationC), 'the refused rename reached C\'s row anyway').toMatchObject({ name: NAMES.c });
  expect(await sut.organizationsNamed(ATTEMPTED_C), 'the refused rename created an organisation by the attempted name').toEqual([]);

  // (5) AND NEITHER REFUSAL WROTE A MEMBERSHIP. A refusal that quietly enrolled the caller would
  // pass every assertion above and hand it the authority next time.
  expect(await sut.membershipsOf(given.accountId), 'a refused action changed what the actor is a member of').toHaveLength(2);
}

/**
 * AT-001.36 — an admin in NGO A and a member in NGO B succeeds only where it is the admin.
 *
 * THE DISCRIMINATOR IS THE `member` ROW, and it is asserted before the action is attempted. The
 * refusal under test is `not-an-admin` — the caller IS in this organisation and its role here is too
 * low — which is a DIFFERENT refusal from AT-001.16's `not-a-member`. Without the row assertion the
 * body could not tell "rejected because the role is member" from "rejected because nothing was
 * found", and the criterion's whole point is that "NGO admin" names the admin role IN THAT NGO.
 */
export async function at00136(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const NAMES = {
    a: 'Riverside Shelter 36A',
    b: 'Northgate Foodbank 36B',
    c: 'Eastside Legal Aid 36C',
  };
  const RENAMED_A = 'Riverside Shelter Second Programme 36A';
  const ATTEMPTED_B = 'Northgate Foodbank Renamed By A Member 36B';

  const given = await twoMembershipGiven(sut, w, 'admin-and-member-36', NAMES);

  // THE GIVEN, ASSERTED: admin in A, member in B, one account.
  expect(await sut.membership(given.organizationA, given.accountId), 'the actor is not A\'s admin').toMatchObject({
    accountId: given.accountId,
    role: 'admin',
  });
  expect(await sut.membership(given.organizationB, given.accountId), 'the actor is not B\'s member').toMatchObject({
    accountId: given.accountId,
    role: 'member',
  });

  // IT SUCCEEDS IN A.
  const inA = await sut.updateOrganization(given.session, given.organizationA, RENAMED_A);
  expect(inA, 'the admin-only action failed where the caller IS the admin').toMatchObject({ ok: true });
  expect(await sut.organization(given.organizationA)).toMatchObject({ name: RENAMED_A });

  // AND IS REJECTED IN B, on the role rather than on absence.
  const inB = await sut.updateOrganization(given.session, given.organizationB, ATTEMPTED_B);
  expect(inB.ok, 'the same account performed the admin-only action where it holds the member role').toBe(false);
  if (inB.ok) return;
  expect(inB.kind, 'the refusal is not the not-an-admin one').toBe('not-an-admin');
  expect(
    inB.kind,
    'the refusal came back as not-a-member, which would mean the member row was not found rather than not sufficient',
  ).not.toBe('not-a-member');

  // AND IT WROTE NOTHING.
  expect(await sut.organization(given.organizationB), 'the refused action renamed B anyway').toMatchObject({ name: NAMES.b });
  expect(await sut.organizationsNamed(ATTEMPTED_B), 'the refused action created an organisation by the attempted name').toEqual([]);
  expect(await sut.membership(given.organizationB, given.accountId), 'the refused action changed the actor\'s role in B').toMatchObject({
    role: 'member',
  });
}

/**
 * AT-001.37 — granting a per-NGO role to a volunteer account is rejected on EVERY path.
 *
 * "EVERY PATH" IS WHY THIS BODY HAS FOUR ARMS AND A CONTROL. Two product paths already refuse, and
 * they refuse for product reasons a future change could move; the third arm is the one that closes
 * the criterion, because it carries no edge function, no shared module and no TypeScript at all —
 * an operator's direct insert, which is the shape every path nobody has written yet will have. The
 * fourth arm is the same grant reached in TWO statements: the seat is taken by an NGO account and
 * then re-pointed at the volunteer, which changes no row count and so meets only the NGO-only rule's
 * UPDATE half (gate-2 ruling R5).
 *
 * THE CONTROL IS NOT OPTIONAL: an insert that refused everybody would satisfy the negative on its
 * own, so an NGO account is granted the same seat afterwards and must succeed. It also SEATS the row
 * the fourth arm re-points, which is why it runs before that arm rather than last.
 */
export async function at00137(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const ATTEMPTED_ORG = 'Volunteer Attempted Organisation 37';
  const ATTEMPTED_ON_SIGNUP = 'Volunteer Owned Organisation 37';
  const OPERATOR_ORG = 'Operator Created Organisation 37';

  const volunteer = await registerConfirmAndSignIn(sut, w.email('volunteer-37'));
  await sut.linkGithubIdentity(volunteer, `volunteer-37-${volunteer.accountId.slice(0, 8)}`);
  const completion = await sut.completeSignup(
    volunteer,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, 'the volunteer could not complete signup, so nothing below is about a volunteer account').toMatchObject({ ok: true });
  if (!completion.ok) return;
  expect(await sut.account(completion.accountId), 'the account under test is not a volunteer').toMatchObject({ accountType: 'volunteer' });

  // ARM 1 — the product's NGO-only action. A volunteer cannot create the organisation that would
  // have seated it as an admin.
  const ngoOnly = await sut.createOrganization(volunteer, ATTEMPTED_ORG);
  expect(ngoOnly.ok, 'a volunteer performed the NGO-only action and would have been seated as its admin').toBe(false);
  expect(await sut.organizationsNamed(ATTEMPTED_ORG), 'the refused action created an organisation').toEqual([]);

  // ARM 2 — the product's signup path. A volunteer completion carrying an organisation name is
  // refused outright, so the seat is never reached through signup either.
  const second = await registerConfirmAndSignIn(sut, w.email('volunteer-with-org-37'));
  await sut.linkGithubIdentity(second, `volunteer-org-37-${second.accountId.slice(0, 8)}`);
  const withOrganization = await sut.completeSignup(
    second,
    { accountType: 'volunteer', organizationName: ATTEMPTED_ON_SIGNUP, acknowledgmentTextVersion: TEXT_VERSION },
    CLIENT_IP,
  );
  expect(withOrganization.ok, 'a volunteer completion carrying an organisation name was accepted').toBe(false);
  expect(await sut.account(second.accountId), 'the refused completion left an account row behind').toBeNull();
  expect(await sut.organizationsNamed(ATTEMPTED_ON_SIGNUP), 'the refused completion created an organisation').toEqual([]);

  // ARM 3 — THE OPERATOR'S DIRECT GRANT, into an organisation whose single seat is free, so the
  // refusal cannot be the one-seat index answering instead of the NGO-only rule. Both roles are
  // attempted: the criterion is about a per-NGO role, not about the admin role.
  const organization = await sut.createOrganizationAsOperator(OPERATOR_ORG);
  for (const role of ['admin', 'member'] as const) {
    const granted = await sut.grantMembershipAsOperator(organization.id, completion.accountId, role);
    expect(granted.ok, `an operator granted the ${role} role to a volunteer account`).toBe(false);
    if (granted.ok) return;
    expect(granted.kind, `the ${role} grant was refused for a reason other than the account type`).toBe('not-an-ngo-account');
  }

  // THE READ-BACK: zero membership rows anywhere for this account.
  expect(await sut.membershipsOf(completion.accountId), 'the volunteer holds a per-organisation role after every path refused').toEqual([]);
  expect(await sut.membership(organization.id, completion.accountId), 'the refused grant wrote a membership row').toBeNull();

  // THE CONTROL — the same seat, the same method, an NGO account: it succeeds. So the three
  // refusals above are about the account TYPE and not about the path being closed to everybody.
  const control = await registerConfirmAndSignIn(sut, w.email('ngo-control-37'));
  const controlCompletion = await sut.completeSignup(
    control,
    { accountType: 'ngo', organizationName: 'Riverside Shelter Control 37', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(controlCompletion, 'the NGO control could not complete signup').toMatchObject({ ok: true });
  if (!controlCompletion.ok) return;
  const seated = await sut.grantMembershipAsOperator(organization.id, controlCompletion.accountId, 'member');
  expect(seated, 'the operator grant refuses an NGO account too, so the refusals above prove nothing').toMatchObject({ ok: true });

  // ARM 4 — THE SAME GRANT IN TWO STATEMENTS. The seat the control just took is re-pointed at the
  // volunteer. The row count does not change, so the one-seat index never sees this write and the
  // NGO-only trigger's UPDATE half is the only guard on it — the attack the migration names in its
  // own prose, driven here for the first time (gate-2 ruling R5).
  const repointed = await sut.repointMembershipAsOperator(organization.id, completion.accountId);
  expect(repointed.ok, 'an operator re-pointed a seated membership at a volunteer account').toBe(false);
  if (repointed.ok) return;
  expect(repointed.kind, 'the re-point was refused for a reason other than the account type').toBe('not-an-ngo-account');

  // AND THE ROW IS UNMOVED: the control still holds it, with the role it was granted.
  expect(await sut.membership(organization.id, controlCompletion.accountId), 'the refused re-point moved the seat anyway').toMatchObject({
    accountId: controlCompletion.accountId,
    role: 'member',
  });
  expect(await sut.membershipsOf(completion.accountId), 'the volunteer holds a per-organisation role after the re-point refused').toEqual([]);
}

/* ------------------------------------------------- the single-seat and single-dev ids (D3.L2) --- */

/**
 * AT-001.17 — no capability exists to invite or add a second member to an org.
 *
 * A NEGATIVE CRITERION NEEDS MORE THAN ONE WITNESS, because "no capability exists" is a claim about
 * every path rather than about one. Four arms, each closing a different way in:
 *
 *   1. NO DEPLOYED FUNCTION. The functions router is asked for an invite endpoint by name and
 *      answers 404 `Function not found` — with a DEPLOYED function on the same stack as the control,
 *      because a router that answered 404 to everything would make the first answer meaningless.
 *      Both shapes were measured before this body was written (verify-first answer (e)).
 *   2. NO REACH FOR THE PUBLISHABLE KEY. `public.org_memberships` is asked for through the Data API
 *      with the publishable key and refuses — the privilege layer, not a policy, because `anon`
 *      holds no `select` grant on it. (This arm used to be described as the table being granted to
 *      no client role at all. That stopped being true on 2026-08-12: the tenant-isolation migration
 *      grants `select` on this table to `authenticated`, which IS a client role, and deliberately
 *      grants `anon` nothing. What this arm measures is the narrower fact, and it is unchanged.)
 *   3. NO ROOM IN THE DATABASE. The operator, whose authority exceeds anything the product holds,
 *      tries to seat a second member in an organisation that already holds its one seat, and the
 *      unique index refuses.
 *   4. NO SURFACE IN THE APP. `src/routes/` and the generated route tree carry no invite or
 *      add-member naming — the source arm, shared with the loop body, with its residual stated in
 *      `_source-scan.ts`.
 */
export async function at00117(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  // ARM 4 first, because it needs no state and a failure in it is the cheapest to read.
  expect(
    inviteOrAddMemberSurface(),
    'the app carries a route named like an invite or add-member surface, so "UI absent" is no longer true',
  ).toEqual([]);

  const url = (process.env.AT_SUPABASE_URL ?? '').replace(/\/$/, '');
  const anonKey = process.env.AT_SUPABASE_ANON_KEY ?? '';
  expect(url && anonKey, 'this child holds no slot coordinates, so the absence probes below cannot run').toBeTruthy();

  // ARM 1 — the deployed-function absence probe, with its control.
  const absent = await fetch(`${url}/functions/v1/invite-member`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const absentBody = await absent.text();
  expect(absent.status, 'an invite-member function answered on the deployed stack').toBe(404);
  expect(absentBody, 'the router did not answer with its not-found shape').toContain('Function not found');

  const present = await fetch(`${url}/functions/v1/create-organization`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  // THE CONTROL ASSERTS THE MEASURED ANSWER, not merely a non-404 (gate-2 ruling R6). Verify-first
  // answer (e) measured this exact call answering 401 with its own refusal body, so pinning it costs
  // nothing and makes the control prove two things instead of one: the router resolves names AND the
  // function it resolved really ran. A 500, a 502 or a misroute passed the old assertion.
  expect(
    present.status,
    'the deployed control did not answer its measured 401, so the router may not be resolving names and the probe above proves nothing',
  ).toBe(401);

  // ARM 2 — the membership table through the Data API, with the publishable key.
  const clientRead = await fetch(`${url}/rest/v1/org_memberships?select=role`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' },
  });
  const clientReadBody = await clientRead.text();
  // THE STATUS AND THE BODY ARE BOTH PINNED TO WHAT WAS MEASURED (gate-2 ruling R7). The plan's claim
  // is that the table is unreachable BECAUSE no privilege reaches a client role, and `status >= 400`
  // does not prove the because: a missing table route (404) or a down PostgREST (5xx) passed it. The
  // measurement is in `loop/items/AI4DEV-62/artifacts/gate2-verify-answers.md`, v2 — HTTP 401 with
  // SQLSTATE 42501 and `permission denied for table org_memberships`. The status is 401 rather than
  // the 403 the service role receives (verify-first answer (c)) because the anon key carries no
  // authenticated user; the privilege layer is the same one either way, which is what the body says.
  expect(clientRead.status, 'the membership table did not answer the measured privilege refusal to a client key').toBe(401);
  expect(clientReadBody, 'the refusal does not name a permission denial, so it is not the privilege layer answering').toMatch(
    /permission denied/i,
  );

  // ARM 3 — the operator's own attempt at a second seat, on an organisation the PRODUCT path
  // created and seated. The one-seat index is what refuses; nothing about the product is consulted.
  const owner = await registerConfirmAndSignIn(sut, w.email('single-seat-owner-17'));
  const ownerCompletion = await sut.completeSignup(
    owner,
    { accountType: 'ngo', organizationName: 'Riverside Shelter 17', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(ownerCompletion, 'the NGO owner could not complete signup, so there is no seated organisation').toMatchObject({ ok: true });
  if (!ownerCompletion.ok || ownerCompletion.organizationId === null) return;

  const wouldBeSecond = await registerConfirmAndSignIn(sut, w.email('would-be-second-17'));
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

  // AND THE ORGANISATION STILL HOLDS EXACTLY ONE SEAT, its owner's.
  const seats = await sut.membershipsOf(secondCompletion.accountId);
  expect(
    seats.map((row) => row.organizationId),
    'the refused grant seated the second account in the first organisation anyway',
  ).not.toContain(ownerCompletion.organizationId);
  expect(
    await sut.membership(ownerCompletion.organizationId, ownerCompletion.accountId),
    'the owner lost its own seat',
  ).toMatchObject({ role: 'admin' });
}

/**
 * AT-001.32 — attaching a second volunteer to a project is rejected.
 *
 * THE GIVEN IS OPERATOR-PROVISIONED AND SAYS SO. No product path creates a project or attaches a
 * volunteer in this tree, at either tier; building one to reach this criterion's Given would be
 * landing another requirement's surface early. What is under test is the REFUSAL, and the path this
 * body drives is the one with nothing on it but the database — which is what makes the invariant a
 * property of the table rather than of a writer somebody could change.
 *
 * THE CONTROL IS THE IDEMPOTENT RE-WRITE: attaching the SAME volunteer again is not refused. Without
 * it, a guard that refused every update at all would satisfy the negative, and the criterion's word
 * is "a SECOND volunteer".
 */
export async function at00132(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  const ngo = await registerConfirmAndSignIn(sut, w.email('project-owner-32'));
  const ngoCompletion = await sut.completeSignup(
    ngo,
    { accountType: 'ngo', organizationName: 'Riverside Shelter 32', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(ngoCompletion, 'the NGO could not complete signup, so there is no organisation to hold a project').toMatchObject({ ok: true });
  if (!ngoCompletion.ok || ngoCompletion.organizationId === null) return;

  const first = await registerConfirmAndSignIn(sut, w.email('first-volunteer-32'));
  await sut.linkGithubIdentity(first, `first-32-${first.accountId.slice(0, 8)}`);
  const firstCompletion = await sut.completeSignup(
    first,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(firstCompletion, 'the first volunteer could not complete signup').toMatchObject({ ok: true });
  if (!firstCompletion.ok) return;

  const second = await registerConfirmAndSignIn(sut, w.email('second-volunteer-32'));
  await sut.linkGithubIdentity(second, `second-32-${second.accountId.slice(0, 8)}`);
  const secondCompletion = await sut.completeSignup(
    second,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(secondCompletion, 'the second volunteer could not complete signup').toMatchObject({ ok: true });
  if (!secondCompletion.ok) return;

  // THE GIVEN: a project with an assigned volunteer.
  const project = await sut.createProjectAsOperator(ngoCompletion.organizationId, 'Riverside Shelter Website 32');
  expect(project.assignedVolunteerId, 'a freshly created project already carries a developer').toBeNull();
  const assigned = await sut.assignVolunteerAsOperator(project.id, firstCompletion.accountId);
  expect(assigned, 'the first volunteer could not be attached, so this criterion has no Given').toMatchObject({ ok: true });
  expect(await sut.projectAssignment(project.id), 'the seat does not hold the first volunteer').toMatchObject({
    assignedVolunteerId: firstCompletion.accountId,
  });

  // THE ACT UNDER TEST.
  const secondAttach = await sut.assignVolunteerAsOperator(project.id, secondCompletion.accountId);
  expect(secondAttach.ok, 'a second volunteer was attached to a project that already has one').toBe(false);
  if (secondAttach.ok) return;
  expect(secondAttach.kind, 'the second attach was refused for a reason other than the seat being taken').toBe('seat-occupied');

  // AND IT WROTE NOTHING: the seat still holds the FIRST volunteer.
  expect(await sut.projectAssignment(project.id), 'the refused attach changed the project seat').toMatchObject({
    id: project.id,
    assignedVolunteerId: firstCompletion.accountId,
  });

  // THE CONTROL — the same call with the SAME volunteer is not refused, so the guard is about a
  // second developer rather than about writing to the column at all.
  const again = await sut.assignVolunteerAsOperator(project.id, firstCompletion.accountId);
  expect(again, 'attaching the volunteer that already holds the seat was refused, so the refusal above is not about a SECOND one').toMatchObject(
    { ok: true },
  );
  expect(await sut.projectAssignment(project.id)).toMatchObject({ assignedVolunteerId: firstCompletion.accountId });
}

/**
 * AT-001.19 — the acknowledgment records who made it: name, title and the authority attestation.
 *
 * WHAT IS LIVE HERE: the act is the DEPLOYED `complete-signup`, so the three values cross the wire,
 * pass the shared validation inside the edge runtime, travel as named arguments into
 * `public.complete_signup`, and are read back out of the real `public.acknowledgments` row by an
 * operator query. Nothing here is a mirror.
 *
 * THE GITHUB-ESTABLISHED PATH IS NOT DRIVEN AT THIS TIER, and that narrowing is stated here rather
 * than left to be noticed. A github-established session needs a real consent round trip, which is
 * why AT-001.02, .04 and .05 are all capability-pending at this tier. The loop body drives a
 * GitHub-linked volunteer completion through the same shared validation and the same adapter write,
 * so the volunteer half of "every acknowledgment" is loop-proved and said to be loop-proved.
 */
export async function at00119(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const session = await registerConfirmAndSignIn(sut, w.email('who-signed'));

  const completion = await sut.completeSignup(
    session,
    {
      accountType: 'ngo',
      organizationName: 'Riverside Shelter Who Signed',
      acknowledgmentTextVersion: TEXT_VERSION,
      ...SIGNER,
    },
    CLIENT_IP,
  );
  expect(completion, 'the deployed complete-signup refused a completion carrying all three identity fields').toMatchObject({
    ok: true,
  });
  if (!completion.ok) return;

  const acknowledgments = await sut.acknowledgments(completion.accountId);
  expect(acknowledgments, 'exactly one platform acknowledgment is recorded by one completion').toHaveLength(1);
  const row = acknowledgments[0];

  // EACH VALUE BY ITSELF, AND VERBATIM. A row carrying three empty strings records nothing while
  // looking like a record, which is the same discipline AT-001.01 applies to its own three fields.
  expect(row.signerName, 'the acknowledgment does not record the name that was submitted').toBe(SIGNER.signerName);
  expect(row.signerTitle, 'the acknowledgment does not record the title that was submitted').toBe(SIGNER.signerTitle);
  expect(
    row.authorityAttestation,
    'the acknowledgment does not record the authority statement that was affirmed',
  ).toBe(ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement);
}

/**
 * AT-001.39 — an acknowledgment missing any one of the three is rejected and records nothing.
 *
 * THREE VARIANTS AT THIS TIER, one per omitted field, against the deployed function. The loop body
 * runs seven — the three omissions, the three whitespace-only forms, and an attestation whose
 * content contradicts the authority it claims — because those are refusals of the shared validation
 * and the loop tier drives that module directly.
 *
 * "RECORDS NOTHING" MEANS EVERY WRITE THE COMPLETION COULD HAVE MADE. A refusal that left an
 * organisation or a membership behind would satisfy an account-and-acknowledgment check while
 * having half-completed the signup, so the organisation is looked for BY THE NAME that was
 * attempted and the account's memberships are listed — the two reads the contract keeps for exactly
 * this question, because a refusal hands back no identifier to look anything up by.
 */
export async function at00139(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  const omissions = [
    { slug: 'name', field: 'signerName', names: /signer name/i },
    { slug: 'title', field: 'signerTitle', names: /signer title/i },
    { slug: 'attestation', field: 'authorityAttestation', names: /authority attestation/i },
  ] as const;

  for (const omission of omissions) {
    const session = await registerConfirmAndSignIn(sut, w.email(`no-${omission.slug}`));
    const organizationName = `Riverside Shelter No ${omission.slug}`;

    const identity: Record<string, unknown> = { ...SIGNER };
    delete identity[omission.field];
    const refused = await sut.completeSignup(
      session,
      { accountType: 'ngo', organizationName, acknowledgmentTextVersion: TEXT_VERSION, ...identity },
      CLIENT_IP,
    );

    expect(refused.ok, `the deployed path completed a signup with no ${omission.slug}`).toBe(false);
    if (refused.ok) return;
    expect(refused.reason, `the refusal does not name the ${omission.slug} as what is missing`).toMatch(omission.names);

    expect(await sut.account(session.accountId), `the refused completion left an account row behind (${omission.slug})`).toBeNull();
    expect(
      await sut.acknowledgments(session.accountId),
      `the refused completion recorded an acknowledgment anyway (${omission.slug})`,
    ).toEqual([]);
    expect(
      await sut.hasPlatformAcknowledgment(session.accountId),
      `the refused completion left the account holding the platform acknowledgment (${omission.slug})`,
    ).toBe(false);
    expect(
      await sut.organizationsNamed(organizationName),
      `the refused completion created the organisation anyway (${omission.slug})`,
    ).toEqual([]);
    expect(
      await sut.membershipsOf(session.accountId),
      `the refused completion left a membership behind (${omission.slug})`,
    ).toEqual([]);
  }

  // THE CONTROL, AND IT IS NOT OPTIONAL. A deployed path that refused every completion would satisfy
  // all three refusals above, so a request differing ONLY in that it carries all three fields must
  // succeed — which is what makes each refusal attributable to the missing field and nothing else.
  const control = await registerConfirmAndSignIn(sut, w.email('all-three'));
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
  expect(completed, 'the control completion carrying all three fields was refused, so the refusals prove nothing').toMatchObject({
    ok: true,
  });
}

/* ------------------------------------------------- the tenant-isolation ids (D5.L1) ------------- */

/**
 * A WELL-FORMED IDENTIFIER THAT NAMES NOTHING — the other half of the no-existence-oracle test.
 *
 * WELL-FORMED IS THE LOAD-BEARING WORD at this tier more than at the other one. The deployed
 * functions put the value straight into a PostgREST filter and PostgREST casts it to `uuid`; a
 * malformed value would be refused by that cast, and the two answers would then differ for a reason
 * that has nothing at all to do with the criterion. This is a valid uuid that no row carries.
 */
const ABSENT_ID = '00000000-0000-4000-8000-000000000021';

/**
 * AT-001.21 — one NGO cannot reach another NGO's non-public data, by the read surface or by probing
 * identifiers directly, and the denial does not say whether the thing is there.
 *
 * WHAT IS LIVE HERE THAT WAS NOT AT LOOP TIER, which is the whole reason this body exists. The two
 * organisations are rows on a real database; the dashboard read is the DEPLOYED
 * `organization-dashboard`, so `verify_jwt`, the platform's own token check, `resolveCaller` and the
 * service-role reads all sit on the path; and the Data API probes are real `GET /rest/v1/…` requests
 * carrying the caller's OWN access token, so what answers them is the row-level-security policy set
 * this leaf's migration lands, evaluated for that user.
 *
 * THE TWO REFUSALS ARE COMPARED AS RAW RESPONSE TEXT (gate-1 ruling 5). `callFunction` parses the
 * body and returns `{ status, json }`, so two differently serialised bodies would compare equal
 * through it. The tenant-read members use a sibling helper that keeps the bytes, and this body
 * asserts the bytes are the same string as well as the statuses being the same number.
 */
export async function at00121(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const NAME_A = 'Riverside Shelter 21A';
  const NAME_B = 'Northgate Foodbank 21B';

  // NGO A AND NGO B BOTH COME FROM THE PRODUCT PATH, in the live public order: register, use the
  // emailed confirmation link, sign in, complete. Each completion writes its organisation and seats
  // its own caller as that organisation's admin.
  const sessionA = await registerConfirmAndSignIn(sut, w.email('ngo-a-21'));
  const a = await sut.completeSignup(
    sessionA,
    { accountType: 'ngo', organizationName: NAME_A, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(a, 'NGO A could not complete signup, so there is no tenant for B to be denied').toMatchObject({ ok: true });
  // THE `expect` ABOVE THROWS ON `ok: false`, SO THE NARROWING RETURN BELOW IS REACHED ONLY BY A
  // COMPLETION THAT SUCCEEDED WITH NO ORGANISATION — and on that path the body used to return as a
  // PASS with zero arms run (gate-2 ruling 4). THIS TIER IS WHERE THE SEAM IS LIVE: the loop fixture
  // always sets the identifier, so the value a real database and a deployed function hand back is
  // the one that could be null. The return itself stays exactly as it is.
  expect(
    a.ok ? a.organizationId : null,
    'NGO A completed signup with no organisation, so there is no tenant for B to be denied and this id would go green at the tier where the deployed function is the thing under test',
  ).not.toBeNull();
  if (!a.ok || a.organizationId === null) return;

  const sessionB = await registerConfirmAndSignIn(sut, w.email('ngo-b-21'));
  const b = await sut.completeSignup(
    sessionB,
    { accountType: 'ngo', organizationName: NAME_B, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(b, 'NGO B could not complete signup, so there is no second tenant to do the probing').toMatchObject({ ok: true });
  expect(
    b.ok ? b.organizationId : null,
    'NGO B completed signup with no organisation, so the policy set has no second tenant to be evaluated against and every probe below would be skipped',
  ).not.toBeNull();
  if (!b.ok || b.organizationId === null) return;

  // A PROJECT IN A. No product path creates one at either tier, so the operator provisions it.
  const project = await sut.createProjectAsOperator(a.organizationId, 'Riverside Shelter Website 21');

  // A'S ROWS REALLY EXIST, read back with operator authority. Without this the empty Data API
  // answers below would be indistinguishable from four empty tables.
  expect(await sut.membership(a.organizationId, a.accountId), 'A holds no seat in its own organisation').toMatchObject({
    role: 'admin',
  });
  expect(await sut.projectAssignment(project.id), 'A\'s project is not there').toMatchObject({ organizationId: a.organizationId });
  expect((await sut.acknowledgments(a.accountId)).length, 'A\'s completion recorded no acknowledgment').toBeGreaterThan(0);

  // (1) THE CONTROL — A reads its own dashboard through the deployed function.
  const own = await sut.organizationDashboard(sessionA, a.organizationId);
  expect(own.ok, 'A was refused its OWN dashboard, so the refusals below are not about the tenant boundary').toBe(true);
  if (!own.ok) return;
  expect(own.status, 'A\'s own dashboard did not answer 200').toBe(200);
  expect(own.value.organizationId, 'A\'s dashboard names a different organisation').toBe(a.organizationId);
  expect(own.value.seat, 'A\'s dashboard does not show A\'s own seat').toMatchObject({ accountId: a.accountId, role: 'admin' });
  expect(
    own.value.projects.map((row) => row.projectId),
    'A\'s dashboard does not show A\'s project, so the projection carries no tenant data to leak',
  ).toEqual([project.id]);

  // (2) B IS REFUSED A'S DASHBOARD.
  const foreign = await sut.organizationDashboard(sessionB, a.organizationId);
  expect(foreign.ok, 'NGO B read NGO A\'s dashboard').toBe(false);
  if (foreign.ok) return;

  // (3) AND THE IDENTIFIER THAT NAMES NOTHING ANSWERS IDENTICALLY. The comparison is on the RAW
  // response text and the status, so a body that was re-serialised on one path and not the other
  // cannot pass as equal.
  const absent = await sut.organizationDashboard(sessionB, ABSENT_ID);
  expect(absent.ok, 'an organisation that does not exist answered with a projection').toBe(false);
  if (absent.ok) return;
  expect(
    typeof foreign.body,
    'the refusal did not carry the RAW response text, so the comparison below would be about a re-serialisation',
  ).toBe('string');
  expect(absent.status, 'the two refusals carry different statuses, which tells B which identifier is real').toBe(foreign.status);
  expect(absent.body, 'the two refusals differ byte for byte, so the answer says whether the organisation is there').toBe(
    foreign.body,
  );

  // (4) THE SAME PAIR THROUGH THE DATA API, on every table that holds tenant data. These are real
  // `GET /rest/v1/…` requests carrying B's own access token, so the answer is the policy set
  // evaluated for B rather than anything the product chose to permit.
  const probes = [
    { table: 'organizations' as const, keyedBy: 'id' as const, real: a.organizationId },
    { table: 'org_memberships' as const, keyedBy: 'org_id' as const, real: a.organizationId },
    { table: 'projects' as const, keyedBy: 'org_id' as const, real: a.organizationId },
    { table: 'acknowledgments' as const, keyedBy: 'account_id' as const, real: a.accountId },
  ];
  for (const probe of probes) {
    const keyed = await sut.dataApiRead(sessionB, { table: probe.table, keyedBy: probe.keyedBy, value: probe.real });
    expect(keyed.rows, `B's keyed probe of ${probe.table} was refused before any row was considered`).not.toBeNull();
    expect(keyed.rows ?? [], `B read A's rows out of ${probe.table} by identifier`).toEqual([]);

    const nothing = await sut.dataApiRead(sessionB, { table: probe.table, keyedBy: probe.keyedBy, value: ABSENT_ID });
    expect(nothing, `on ${probe.table} a real foreign identifier and one that names nothing answered differently`).toEqual(keyed);
  }

  // (5) THE POSITIVE CONTROL AT THE DATA API, and gate-1 ruling 9 names it as the settlement: an
  // empty array from a denied read could otherwise be a gateway refusal, or a missing table
  // privilege, wearing the policy's clothes. A's own keyed read returning exactly its own row is
  // what proves row-level security ran and admitted the right tenant.
  //
  // IT COVERS ALL FOUR TABLES, not the one it used to (gate-2 ruling 3). Arm (4) asserts a DENIAL on
  // each of the four, and a `using (false)` policy — or one keyed on the wrong column — answers `[]`
  // to A and to B alike, so three of those four denials had nothing standing behind them. Each table
  // below is read by its OWN owner, keyed the way arm (4) keys it.
  const ownRow = await sut.dataApiRead(sessionA, { table: 'organizations', keyedBy: 'id', value: a.organizationId });
  expect(ownRow.rows, 'A\'s own keyed read was refused before any row was considered').not.toBeNull();
  expect(ownRow.rows ?? [], 'A\'s own keyed read did not return exactly one row').toHaveLength(1);
  expect((ownRow.rows ?? [])[0], 'A\'s own keyed read returned a different organisation').toMatchObject({ id: a.organizationId });

  // AND "AT LEAST ONE ROW, AND EVERY ROW IS A'S" ON THE OTHER THREE, rather than an exact count. THE
  // DATABASE IS SHARED BY THE WHOLE RUN — the unfiltered listing below says so for its own reason —
  // and one completion records more than one kind of acknowledgment, so an exact count would be a
  // brittle assertion about the suite instead of a statement about the policy.
  const ownSeats = await sut.dataApiRead(sessionA, { table: 'org_memberships', keyedBy: 'org_id', value: a.organizationId });
  expect(ownSeats.rows, 'A\'s own keyed read of org_memberships was refused before any row was considered').not.toBeNull();
  expect((ownSeats.rows ?? []).length, 'A cannot read the seats of its OWN organisation, so that denial proves nothing').toBeGreaterThan(0);
  expect(
    (ownSeats.rows ?? []).map((row) => String(row.org_id)),
    'A\'s keyed read of org_memberships returned a seat in another organisation',
  ).toEqual((ownSeats.rows ?? []).map(() => a.organizationId));

  const ownProjects = await sut.dataApiRead(sessionA, { table: 'projects', keyedBy: 'org_id', value: a.organizationId });
  expect(ownProjects.rows, 'A\'s own keyed read of projects was refused before any row was considered').not.toBeNull();
  expect((ownProjects.rows ?? []).length, 'A cannot read the projects of its OWN organisation, so that denial proves nothing').toBeGreaterThan(0);
  expect(
    (ownProjects.rows ?? []).map((row) => String(row.org_id)),
    'A\'s keyed read of projects returned a project of another organisation',
  ).toEqual((ownProjects.rows ?? []).map(() => a.organizationId));
  expect(
    (ownProjects.rows ?? []).map((row) => String(row.id)),
    'A\'s keyed read of projects does not hold the project the operator created in A',
  ).toContain(project.id);

  const ownAcknowledgments = await sut.dataApiRead(sessionA, { table: 'acknowledgments', keyedBy: 'account_id', value: a.accountId });
  expect(ownAcknowledgments.rows, 'A\'s own keyed read of acknowledgments was refused before any row was considered').not.toBeNull();
  expect((ownAcknowledgments.rows ?? []).length, 'A cannot read its OWN acknowledgments, so that denial proves nothing').toBeGreaterThan(0);
  expect(
    (ownAcknowledgments.rows ?? []).map((row) => String(row.account_id)),
    'A\'s keyed read of acknowledgments returned another account\'s row',
  ).toEqual((ownAcknowledgments.rows ?? []).map(() => a.accountId));

  // (6) AND THE UNFILTERED LISTING — a different attack from a keyed probe, and the one a leaking
  // policy shows up in first. THE DATABASE IS SHARED BY THE WHOLE RUN, so this is asserted as "B's
  // own row and nothing else" rather than as a count of the table.
  const organizations = await sut.dataApiRead(sessionB, { table: 'organizations', keyedBy: null, value: null });
  expect(organizations.rows, 'B\'s unfiltered listing of organisations was refused before any row was considered').not.toBeNull();
  expect(
    (organizations.rows ?? []).map((row) => String(row.id)),
    'B\'s unfiltered listing is not exactly its own organisation',
  ).toEqual([b.organizationId]);
  const projects = await sut.dataApiRead(sessionB, { table: 'projects', keyedBy: null, value: null });
  expect(projects.rows, 'B\'s unfiltered listing of projects was refused before any row was considered').not.toBeNull();
  expect((projects.rows ?? []).map((row) => String(row.id)), 'B\'s unfiltered listing shows a project B does not own').toEqual([]);

  // (7) AND THE SET OF TENANT DATA KINDS IS THE DECLARED SET — the arm that makes every claim above
  // self-correcting, and the one that belongs to THIS id rather than to another.
  //
  // WHY IT SITS IN AT-001.21. This body's green claims isolation "over every kind of tenant data that
  // exists", and that sentence is only true while the set of kinds that exist is the set this suite
  // declares. The criteria enumerate drafts, a ledger, files and a thread, and none of those tables is
  // in this tree; the decomposition manifest gives each acceptance id to exactly one leaf, so no later
  // leaf re-checks isolation of a table that lands later. This is what fails the build when one does.
  //
  // IT IS AN INTEGRATION-TIER ARM AND HAS NO LOOP HALF. The witness is the LIVE catalog, read out of
  // band over the operator connection, and `publicSchemaCatalog` deliberately throws at the loop tier
  // rather than answering with an invented one.
  const problems = catalogConformanceProblems(await sut.publicSchemaCatalog());
  expect(
    problems,
    'the live catalog disagrees with the declaration in tests/at/suites/req-001/_catalog-conformance.ts, so this id can no longer claim isolation over every kind of tenant data that exists',
  ).toEqual([]);
}

/**
 * AT-001.22 — a volunteer who is not assigned to a project is denied that project's non-public data,
 * and the public project surface stays visible.
 *
 * WHAT IS LIVE HERE THAT WAS NOT AT LOOP TIER: the project and its developer seat are rows on a real
 * database, the workspace read is the DEPLOYED `project-workspace`, and the public read is the
 * DEPLOYED `public-project-page` — the first and only `verify_jwt = false` block in this repository,
 * so the anonymous call really does cross a gateway that was told to let it through.
 *
 * THERE IS NO FAULT ARM HERE, AND THE ABSENCE IS DELIBERATE. Gate-1 ruling 4's read-ordering proof
 * is a loop-tier arm: `_live.ts` does not back `failNextReadOf`, so an integration body reaching for
 * it would refuse by name rather than fault a real database. This tier proves the ordinary pair.
 */
export async function at00122(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const ORGANIZATION_NAME = 'Riverside Shelter 22';
  const PROJECT_NAME = 'Riverside Shelter Website 22';

  const ngo = await registerConfirmAndSignIn(sut, w.email('project-owner-22'));
  const owner = await sut.completeSignup(
    ngo,
    { accountType: 'ngo', organizationName: ORGANIZATION_NAME, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(owner, 'the NGO could not complete signup, so there is no organisation to hold a project').toMatchObject({ ok: true });
  expect(
    owner.ok ? owner.organizationId : null,
    'the owning NGO completed signup with no organisation, so no project can be created and the deployed workspace and public surfaces would never be called at all',
  ).not.toBeNull();
  if (!owner.ok || owner.organizationId === null) return;

  // TWO VOLUNTEERS, and the difference between them is the ONE fact the criterion turns on: which of
  // them holds the project's developer seat.
  const assignedSession = await registerConfirmAndSignIn(sut, w.email('assigned-volunteer-22'));
  await sut.linkGithubIdentity(assignedSession, `assigned-22-${assignedSession.accountId.slice(0, 8)}`);
  const assigned = await sut.completeSignup(
    assignedSession,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(assigned, 'the assigned volunteer could not complete signup, so there is no control').toMatchObject({ ok: true });
  if (!assigned.ok) return;

  const unassigned = await registerConfirmAndSignIn(sut, w.email('unassigned-volunteer-22'));
  await sut.linkGithubIdentity(unassigned, `unassigned-22-${unassigned.accountId.slice(0, 8)}`);
  const outsider = await sut.completeSignup(
    unassigned,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(outsider, 'the unassigned volunteer could not complete signup, so there is nobody to be denied').toMatchObject({ ok: true });
  if (!outsider.ok) return;

  const project = await sut.createProjectAsOperator(owner.organizationId, PROJECT_NAME);
  const seated = await sut.assignVolunteerAsOperator(project.id, assigned.accountId);
  expect(seated, 'the volunteer could not be attached, so this criterion has no Given').toMatchObject({ ok: true });
  expect(await sut.projectAssignment(project.id), 'the seat does not hold the assigned volunteer').toMatchObject({
    assignedVolunteerId: assigned.accountId,
  });

  // (1) THE CONTROL COMES FIRST — the ASSIGNED volunteer reads the workspace through the deployed
  // function. A surface that refused everybody would satisfy every denial below while proving
  // nothing.
  const allowed = await sut.projectWorkspace(assignedSession, project.id);
  expect(allowed.ok, 'the ASSIGNED volunteer was refused its own project workspace').toBe(true);
  if (!allowed.ok) return;
  expect(allowed.status, 'the allowed workspace read did not answer 200').toBe(200);
  expect(allowed.value, 'the workspace does not hold the project working data it is supposed to').toEqual({
    projectId: project.id,
    projectName: PROJECT_NAME,
    organizationId: owner.organizationId,
    assignedVolunteerId: assigned.accountId,
  });

  // (2) THE UNASSIGNED VOLUNTEER IS REFUSED THE SAME WORKSPACE.
  const refused = await sut.projectWorkspace(unassigned, project.id);
  expect(refused.ok, 'a volunteer who holds no seat on the project read its workspace').toBe(false);
  if (refused.ok) return;

  // (3) AND THE IDENTIFIER THAT NAMES NOTHING ANSWERS IDENTICALLY — compared as RAW response text
  // and status, gate-1 ruling 5.
  const absent = await sut.projectWorkspace(unassigned, ABSENT_ID);
  expect(absent.ok, 'a project that does not exist answered with a projection').toBe(false);
  if (absent.ok) return;
  expect(
    typeof refused.body,
    'the refusal did not carry the RAW response text, so the comparison below would be about a re-serialisation',
  ).toBe('string');
  expect(absent.status, 'the two refusals carry different statuses, which says which project is real').toBe(refused.status);
  expect(absent.body, 'the two refusals differ byte for byte, so the answer says whether the project is there').toBe(refused.body);

  // (4) THE SAME DENIAL THROUGH THE DATA API, with the volunteer's own access token on it. Slice 1
  // ships no policy branch that admits a volunteer, so this answers `[]` for the seat-holder too;
  // what is asserted here is the UNASSIGNED one, which is this criterion's clause.
  const keyed = await sut.dataApiRead(unassigned, { table: 'projects', keyedBy: 'id', value: project.id });
  expect(keyed.rows, 'the volunteer\'s keyed probe was refused before any row was considered').not.toBeNull();
  expect(keyed.rows ?? [], 'an unassigned volunteer read the project row by identifier').toEqual([]);
  const keyedAbsent = await sut.dataApiRead(unassigned, { table: 'projects', keyedBy: 'id', value: ABSENT_ID });
  expect(keyedAbsent, 'a real foreign project and one that names nothing answered differently at the Data API').toEqual(keyed);

  // (5) AND THE PUBLIC PAGE STAYS VISIBLE — to that same refused volunteer AND to a caller with no
  // session at all, which is the half that makes it PUBLIC rather than merely wider.
  const toVolunteer = await sut.publicProjectPage(project.id, unassigned);
  expect(toVolunteer.ok, 'the public project page was hidden from the volunteer the workspace refused').toBe(true);
  if (!toVolunteer.ok) return;
  const toAnyone = await sut.publicProjectPage(project.id, null);
  expect(toAnyone.ok, 'the public project page was hidden from a caller holding no session').toBe(true);
  if (!toAnyone.ok) return;
  expect(toAnyone, 'the public page answered a signed-in caller and an anonymous one differently').toEqual(toVolunteer);

  // (6) AND THE PUBLIC PROJECTION CARRIES NEITHER FIELD THE WORKSPACE HOLDS, each named rather than
  // counted. The live adapter hands back the WIRE object with only `ok` removed, so this is an
  // assertion about what the deployed function really sent and not about a shape this suite rebuilt.
  const publicFields = Object.keys(toAnyone.value);
  expect(publicFields, 'the public project page leaks the owning organisation identifier').not.toContain('organizationId');
  expect(publicFields, 'the public project page names the assigned developer').not.toContain('assignedVolunteerId');
  expect(toAnyone.value, 'the public projection is not the three fields the shipped module builds').toEqual({
    projectId: project.id,
    projectName: PROJECT_NAME,
    organizationName: ORGANIZATION_NAME,
  });
}

/* ------------------------------------------- the tenant-visibility ids (D5.L2) ------------------ */

/**
 * AT-001.23 — the assigned volunteer reaches that project's working data, scoped to that project
 * only.
 *
 * IT IS THE OTHER HALF OF AT-001.22'S RULE. That criterion denies the volunteer who holds no seat;
 * this one grants the volunteer who does, and then says what the grant does NOT reach. The scoping is
 * the substance: a grant that opened the whole organisation would satisfy "access succeeds" while
 * breaking the tenant boundary the previous criterion just established.
 *
 * THE TWO PROJECTS SIT IN ONE ORGANISATION, DELIBERATELY. A second project in another organisation
 * would be refused by the organisation branch and would prove nothing about per-project scoping. Both
 * projects belonging to the same owner is what makes the refusal attributable to the developer seat.
 *
 * WHAT IS LIVE HERE THAT WAS NOT AT LOOP TIER: the seat is a row on a real database, the workspace
 * read is the DEPLOYED `project-workspace`, and the unfiltered listing is a real `GET /rest/v1/…`
 * carrying the volunteer's own access token — so what answers it is the assigned-volunteer policy
 * this slice's migration lands, evaluated for that user.
 */
export async function at00123(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const ORGANIZATION_NAME = 'Riverside Shelter 23';
  const ASSIGNED_PROJECT_NAME = 'Riverside Shelter Website 23';
  const OTHER_PROJECT_NAME = 'Riverside Shelter Newsletter 23';

  const ngo = await registerConfirmAndSignIn(sut, w.email('project-owner-23'));
  const owner = await sut.completeSignup(
    ngo,
    { accountType: 'ngo', organizationName: ORGANIZATION_NAME, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(owner, 'the NGO could not complete signup, so there is no organisation to hold either project').toMatchObject({ ok: true });
  expect(
    owner.ok ? owner.organizationId : null,
    'the owning NGO completed signup with no organisation, so neither project can be created and the deployed workspace would never be called at all',
  ).not.toBeNull();
  if (!owner.ok || owner.organizationId === null) return;

  const volunteerSession = await registerConfirmAndSignIn(sut, w.email('assigned-volunteer-23'));
  await sut.linkGithubIdentity(volunteerSession, `assigned-23-${volunteerSession.accountId.slice(0, 8)}`);
  const volunteer = await sut.completeSignup(
    volunteerSession,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(volunteer, 'the volunteer could not complete signup, so there is nobody to hold the seat').toMatchObject({ ok: true });
  if (!volunteer.ok) return;

  const assignedProject = await sut.createProjectAsOperator(owner.organizationId, ASSIGNED_PROJECT_NAME);
  const otherProject = await sut.createProjectAsOperator(owner.organizationId, OTHER_PROJECT_NAME);
  const seated = await sut.assignVolunteerAsOperator(assignedProject.id, volunteer.accountId);
  expect(seated, 'the volunteer could not be attached, so this criterion has no Given').toMatchObject({ ok: true });
  expect(await sut.projectAssignment(assignedProject.id), 'the seat does not hold the assigned volunteer').toMatchObject({
    assignedVolunteerId: volunteer.accountId,
  });

  // (1) THE GRANT — the assigned volunteer reads its own project's working data.
  const workspace = await sut.projectWorkspace(volunteerSession, assignedProject.id);
  expect(workspace.ok, 'the ASSIGNED volunteer was refused its own project workspace').toBe(true);
  if (!workspace.ok) return;
  expect(workspace.status, 'the allowed workspace read did not answer 200').toBe(200);
  expect(workspace.value, 'the workspace does not hold the project working data it is supposed to').toEqual({
    projectId: assignedProject.id,
    projectName: ASSIGNED_PROJECT_NAME,
    organizationId: owner.organizationId,
    assignedVolunteerId: volunteer.accountId,
  });

  // (2) AND THE OTHER PROJECT OF THE SAME ORGANISATION IS REFUSED — this is "scoped to that project
  // only". The answer is the shared not-found constant, and it is compared against the answer for an
  // identifier that names nothing, as raw response text and status.
  const other = await sut.projectWorkspace(volunteerSession, otherProject.id);
  expect(other.ok, 'the volunteer read a project it holds no seat on, so the grant is not scoped to its own project').toBe(false);
  if (other.ok) return;
  expect(other.status, 'the refusal for another project did not answer as the shared not-found constant').toBe(404);
  const absent = await sut.projectWorkspace(volunteerSession, ABSENT_ID);
  expect(absent.ok, 'a project that does not exist answered with a projection').toBe(false);
  if (absent.ok) return;
  expect(
    typeof other.body,
    'the refusal did not carry the RAW response text, so the comparison below would be about a re-serialisation',
  ).toBe('string');
  expect(absent.status, 'the two refusals carry different statuses, which says which project is real').toBe(other.status);
  expect(absent.body, 'the two refusals differ byte for byte, so the answer says whether the other project is there').toBe(
    other.body,
  );

  // (3) AND THE OWNING ORGANISATION'S DASHBOARD IS REFUSED. This is the arm that proves the scope is
  // the PROJECT and not the tenant: a volunteer seated on a project is inside that organisation's
  // work and holds no membership row in it, so the organisation's own data stays closed.
  const dashboard = await sut.organizationDashboard(volunteerSession, owner.organizationId);
  expect(dashboard.ok, "the assigned volunteer read the owning organisation's dashboard, so its scope is the tenant rather than the project").toBe(
    false,
  );
  if (dashboard.ok) return;
  expect(dashboard.status, 'the dashboard refusal did not answer as the shared not-found constant').toBe(404);

  // (4) AND THE UNFILTERED DATA API LISTING HOLDS EXACTLY THE ASSIGNED PROJECT — the criterion's
  // other path, with the volunteer's own access token on it. Both projects belong to one
  // organisation, so a policy scoped to the tenant rather than to the seat would return both here.
  const listing = await sut.dataApiRead(volunteerSession, { table: 'projects', keyedBy: null, value: null });
  expect(listing.rows, "the volunteer's unfiltered listing was refused before any row was considered").not.toBeNull();
  expect(
    (listing.rows ?? []).map((row) => String(row.id)),
    "the volunteer's unfiltered listing of projects is not exactly the one project it is assigned to",
  ).toEqual([assignedProject.id]);
}

/**
 * AT-001.40 — a platform administrator reaches any NGO's or project's data, because the role spans
 * all accounts (founder d65).
 *
 * TWO TENANTS, NEVER ONE, and that is the criterion rather than thoroughness. One administrator
 * reading one organisation proves nothing an ordinary member could not prove; the claim is REACH, and
 * reach is only visible across a boundary that stops somebody else.
 *
 * THE REACH IS MADE ATTRIBUTABLE BY THE NON-ADMIN CONTROL, not by anything the answer carries. The
 * shipped decision carries a `TenantReadBasis` saying WHY it granted, and the acceptance surface
 * deliberately does not: `TenantReadOutcome` is a status and a value or a status and a body, because
 * the claim AT-001.21 makes is that two whole answers are identical and an outcome carrying more
 * fields would invite a weaker assertion. So the last arm is what separates "the administrator
 * reached across accounts" from "these reads happen to be open to everybody".
 *
 * WHAT IS LIVE HERE THAT WAS NOT AT LOOP TIER: the administrator is created through
 * `POST /auth/v1/admin/users` and really signs in, the two dashboards and two workspaces are the
 * DEPLOYED functions, and the four unfiltered listings are answered by the four platform-admin
 * policies this slice's migration lands — one listing per policy, because those four listings are the
 * only layer at which those four policies act at all.
 */
export async function at00140(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const NAME_A = 'Riverside Shelter 40A';
  const NAME_B = 'Northgate Foodbank 40B';

  const sessionA = await registerConfirmAndSignIn(sut, w.email('ngo-a-40'));
  const a = await sut.completeSignup(
    sessionA,
    { accountType: 'ngo', organizationName: NAME_A, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(a, 'NGO A could not complete signup, so there is no first tenant to reach across').toMatchObject({ ok: true });
  expect(
    a.ok ? a.organizationId : null,
    'NGO A completed signup with no organisation, so the administrator has only one tenant to read and its reach would be indistinguishable from an ordinary one',
  ).not.toBeNull();
  if (!a.ok || a.organizationId === null) return;

  const sessionB = await registerConfirmAndSignIn(sut, w.email('ngo-b-40'));
  const b = await sut.completeSignup(
    sessionB,
    { accountType: 'ngo', organizationName: NAME_B, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(b, 'NGO B could not complete signup, so there is no second tenant and no boundary to cross').toMatchObject({ ok: true });
  expect(
    b.ok ? b.organizationId : null,
    'NGO B completed signup with no organisation, so there is no second tenant and every arm below would be skipped',
  ).not.toBeNull();
  if (!b.ok || b.organizationId === null) return;

  const projectA = await sut.createProjectAsOperator(a.organizationId, 'Riverside Shelter Website 40');
  const projectB = await sut.createProjectAsOperator(b.organizationId, 'Northgate Foodbank Website 40');

  // THE ADMINISTRATOR, PROVISIONED AND THEN SIGNED IN. The public path refuses this account type by
  // name, so provisioning is the only way one exists, and the sign-in is what turns it into a caller.
  const adminEmail = w.email('platform-admin-40');
  await sut.provisionPlatformAdmin(adminEmail, PASSWORD);
  const adminSignIn = await sut.signInWithEmailPassword(adminEmail, PASSWORD);
  expect(adminSignIn, 'the provisioned platform administrator could not sign in, so there is no administrator to act').toMatchObject({
    ok: true,
  });
  if (!adminSignIn.ok) return;
  const admin = adminSignIn.session;

  // (1) BOTH ORGANISATIONS' DASHBOARDS, read by one administrator.
  const dashboardA = await sut.organizationDashboard(admin, a.organizationId);
  expect(dashboardA.ok, "the platform administrator was refused NGO A's dashboard").toBe(true);
  if (!dashboardA.ok) return;
  expect(dashboardA.value.organizationName, "the administrator's read of NGO A named a different organisation").toBe(NAME_A);

  const dashboardB = await sut.organizationDashboard(admin, b.organizationId);
  expect(dashboardB.ok, "the platform administrator was refused NGO B's dashboard").toBe(true);
  if (!dashboardB.ok) return;
  expect(dashboardB.value.organizationName, "the administrator's read of NGO B named a different organisation").toBe(NAME_B);

  // (2) AND BOTH PROJECTS' WORKSPACES, which is the other scope the criterion names. The
  // administrator holds neither developer seat.
  const workspaceA = await sut.projectWorkspace(admin, projectA.id);
  expect(workspaceA.ok, "the platform administrator was refused NGO A's project workspace").toBe(true);
  if (!workspaceA.ok) return;
  expect(workspaceA.value.projectId, "the administrator's workspace read named a different project").toBe(projectA.id);

  const workspaceB = await sut.projectWorkspace(admin, projectB.id);
  expect(workspaceB.ok, "the platform administrator was refused NGO B's project workspace").toBe(true);
  if (!workspaceB.ok) return;
  expect(workspaceB.value.projectId, "the administrator's workspace read named a different project").toBe(projectB.id);

  // (3) AND THE UNFILTERED DATA API LISTING HOLDS BOTH TENANTS' ROWS — the criterion's other path,
  // with the administrator's own access token on it. THE DATABASE IS SHARED BY THE WHOLE RUN, so this
  // asserts that both are present rather than that nothing else is.
  //
  // ALL FOUR TABLES, AND AT THIS TIER THAT IS THE ONLY LAYER WHERE THE FOUR POLICIES ACT AT ALL
  // (gate-2 slice-2 ruling 5). The dashboards and workspaces above are edge functions, and
  // `readRows` sends the SERVICE ROLE key — so row-level security is never consulted on that path and
  // those four successes say nothing about `org_memberships_select_platform_admin`,
  // `projects_select_platform_admin` or `acknowledgments_select_platform_admin`. Only these listings
  // reach them.
  const listing = await sut.dataApiRead(admin, { table: 'organizations', keyedBy: null, value: null });
  expect(listing.rows, "the administrator's unfiltered listing was refused before any row was considered").not.toBeNull();
  const listed = (listing.rows ?? []).map((row) => String(row.id));
  expect(listed, "the administrator's unfiltered listing does not hold NGO A").toContain(a.organizationId);
  expect(listed, "the administrator's unfiltered listing does not hold NGO B").toContain(b.organizationId);

  const seatListing = await sut.dataApiRead(admin, { table: 'org_memberships', keyedBy: null, value: null });
  expect(
    seatListing.rows,
    "the administrator's unfiltered listing of org_memberships was refused before any row was considered",
  ).not.toBeNull();
  const listedSeats = (seatListing.rows ?? []).map((row) => String(row.org_id));
  expect(listedSeats, "the administrator cannot read NGO A's seats, so org_memberships_select_platform_admin admits nobody").toContain(
    a.organizationId,
  );
  expect(listedSeats, "the administrator cannot read NGO B's seats, so its reach over that table stops at one tenant").toContain(
    b.organizationId,
  );

  const projectListing = await sut.dataApiRead(admin, { table: 'projects', keyedBy: null, value: null });
  expect(projectListing.rows, "the administrator's unfiltered listing of projects was refused before any row was considered").not.toBeNull();
  const listedProjects = (projectListing.rows ?? []).map((row) => String(row.id));
  expect(listedProjects, "the administrator cannot read NGO A's project, so projects_select_platform_admin admits nobody").toContain(
    projectA.id,
  );
  expect(listedProjects, "the administrator cannot read NGO B's project, so its reach over that table stops at one tenant").toContain(
    projectB.id,
  );

  const acknowledgmentListing = await sut.dataApiRead(admin, { table: 'acknowledgments', keyedBy: null, value: null });
  expect(
    acknowledgmentListing.rows,
    "the administrator's unfiltered listing of acknowledgments was refused before any row was considered",
  ).not.toBeNull();
  const listedAcknowledgments = (acknowledgmentListing.rows ?? []).map((row) => String(row.account_id));
  expect(
    listedAcknowledgments,
    "the administrator cannot read NGO A's acknowledgment, so acknowledgments_select_platform_admin admits nobody",
  ).toContain(a.accountId);
  expect(
    listedAcknowledgments,
    "the administrator cannot read NGO B's acknowledgment, so its reach over that table stops at one account",
  ).toContain(b.accountId);

  // (4) AND A NON-ADMIN REPEATING THOSE READS IS REFUSED. Without this arm the body would show
  // only that somebody read something: it is the contrast that attributes the reach to the account
  // type rather than to the surfaces being open. It covers the SAME four tables, because a control on
  // one of them would leave the other three admitting an ordinary caller with nothing to notice.
  const nonAdminDashboard = await sut.organizationDashboard(sessionB, a.organizationId);
  expect(nonAdminDashboard.ok, "NGO B read NGO A's dashboard, so the administrator's reach is not attributable to its role").toBe(
    false,
  );
  // EACH CONTROL ASSERTS BOTH DIRECTIONS, and the positive half is not thoroughness. A control that
  // said only "NGO A is absent" passes on an EMPTY result, so a policy set that denied every row would
  // satisfy it while proving nothing: the contrast this arm rests on needs the ordinary caller to have
  // READ something of its own and still not reached the other tenant. THE DATABASE IS SHARED BY THE
  // WHOLE RUN, so each positive half asserts that NGO B's own row is present rather than that the
  // listing is exactly that row.
  const nonAdminListing = await sut.dataApiRead(sessionB, { table: 'organizations', keyedBy: null, value: null });
  expect(nonAdminListing.rows, "NGO B's unfiltered listing was refused before any row was considered").not.toBeNull();
  const nonAdminListed = (nonAdminListing.rows ?? []).map((row) => String(row.id));
  expect(
    nonAdminListed,
    "NGO B's unfiltered listing does not hold NGO B, so the control read nothing at all and its denial of NGO A proves nothing",
  ).toContain(b.organizationId);
  expect(
    nonAdminListed,
    "NGO B's unfiltered listing holds NGO A, so the administrator's listing proves nothing about reach",
  ).not.toContain(a.organizationId);

  const nonAdminSeats = await sut.dataApiRead(sessionB, { table: 'org_memberships', keyedBy: null, value: null });
  expect(nonAdminSeats.rows, "NGO B's unfiltered listing of org_memberships was refused before any row was considered").not.toBeNull();
  const nonAdminListedSeats = (nonAdminSeats.rows ?? []).map((row) => String(row.org_id));
  expect(
    nonAdminListedSeats,
    "NGO B cannot read its OWN seats, so the control read nothing at all and its denial of NGO A's seats proves nothing",
  ).toContain(b.organizationId);
  expect(
    nonAdminListedSeats,
    "NGO B reads NGO A's seats, so the administrator's reach over org_memberships is not attributable to its account type",
  ).not.toContain(a.organizationId);

  const nonAdminProjects = await sut.dataApiRead(sessionB, { table: 'projects', keyedBy: null, value: null });
  expect(nonAdminProjects.rows, "NGO B's unfiltered listing of projects was refused before any row was considered").not.toBeNull();
  const nonAdminListedProjects = (nonAdminProjects.rows ?? []).map((row) => String(row.id));
  expect(
    nonAdminListedProjects,
    "NGO B cannot read its OWN project, so the control read nothing at all and its denial of NGO A's project proves nothing",
  ).toContain(projectB.id);
  expect(
    nonAdminListedProjects,
    "NGO B reads NGO A's project, so the administrator's reach over projects is not attributable to its account type",
  ).not.toContain(projectA.id);

  const nonAdminAcknowledgments = await sut.dataApiRead(sessionB, { table: 'acknowledgments', keyedBy: null, value: null });
  expect(
    nonAdminAcknowledgments.rows,
    "NGO B's unfiltered listing of acknowledgments was refused before any row was considered",
  ).not.toBeNull();
  const nonAdminListedAcknowledgments = (nonAdminAcknowledgments.rows ?? []).map((row) => String(row.account_id));
  expect(
    nonAdminListedAcknowledgments,
    "NGO B cannot read its OWN acknowledgment, so the control read nothing at all and its denial of NGO A's proves nothing",
  ).toContain(b.accountId);
  expect(
    nonAdminListedAcknowledgments,
    "NGO B reads NGO A's acknowledgment, so the administrator's reach over acknowledgments is not attributable to its account type",
  ).not.toContain(a.accountId);
}

/* -------------------------------------------------------- the ids that refuse, and what they name */

/**
 * A refusal body: it opens a world — so the run is real and the id is genuinely exercised — and then
 * refuses with the capability this environment does not hold.
 *
 * IT IS NOT A SKIP AND IT IS NOT A STUB. `CapabilityPending` carrying an exact name is the same
 * shape `pendingMethodProxy` throws and the same shape a `capability-pending` declaration rebuilds,
 * so the id is red in a form the machinery matches from position 0 — and the declaration has to say
 * WHICH capability is missing. A body that instead asserted the half of the criterion it CAN reach
 * would be reporting a green for a criterion it does not prove, which is the whole failure mode this
 * tier exists to remove.
 */
function refusesWith(capability: string): (ctx: Ctx) => Promise<void> {
  return async (ctx: Ctx): Promise<void> => {
    await ctx.open();
    throw new CapabilityPending([capability]);
  };
}

/**
 * AT-001.05 — the imported GitHub statistics.
 *
 * WHY THIS REFUSES RATHER THAN GOING GREEN, when the live path would in fact populate the row. The
 * criterion's words are "the imported PUBLIC STATS (top languages, repository count, contribution
 * summary) are observably populated". What the deployed completion imports is
 * `stubGithubStatsFor` — a shipped stub whose own output says "no GitHub API was called to produce
 * this". The row really is populated, and the statistics in it are fabricated, so a green at the
 * tier whose meaning is "proved for real" would be claiming the one thing that is not true.
 *
 * The stub is RATIFIED by the decomposition manifest's cross-contract ("stub import fixture until
 * W3"), and the loop tier's green over it is honest for that reason. This tier is the one that
 * cannot say it.
 */
export const at00105 = refusesWith('vendors.github-public-statistics');

/**
 * AT-001.10 — the Discovery send is blocked with verification named as the remedy.
 *
 * NO DISCOVERY SEND ROUTE EXISTS IN THIS REPOSITORY, at any tier. The route is REQ-002/004's; what
 * this requirement ships is the DECISION that route must consult, and the loop tier puts that
 * decision on a tested path through a stand-in surface. At this tier there is no route to call and
 * nothing to enforce anything, so there is nothing a live green could be about.
 */
export const at00110 = refusesWith('sut.accounts.sendDiscoveryMessage');

/**
 * AT-001.24 — a logged-out visitor renders public surfaces only, and every authenticated surface
 * redirects to sign-in.
 *
 * WHY THIS REFUSES RATHER THAN GOING GREEN, when the loop tier asserts three real things about the
 * same criterion. THE CRITERION'S OUTCOME IS A RENDERING. "Only public surfaces render" and "every
 * authenticated surface redirects to sign-in" are statements about what a browser shows a visitor,
 * and there is no browser here and no screen to render. A router DOES exist — `src/router.tsx` builds
 * one over the generated route tree — and it obeys no visibility rule, because nothing in it consults
 * `ROUTE_VISIBILITY`; and there is no sign-in screen to redirect a visitor to. `src/routes/` holds
 * one page and the app shell, and continuous integration fails any pull request whose file list
 * matches both `^src/` and this change's territory, so this leaf is forbidden to build one.
 *
 * THAT IS THE LINE GATE-1 RULING 1 DREW, and it is the reason AT-001.21 and AT-001.22 are green at
 * this tier while this id is not. If a criterion's outcome can be OBSERVED without a screen, the id
 * goes green and carries the `ui` tag so a wiring leaf's `--wired` re-run selects it later. If the
 * outcome IS the screen, the id refuses with a capability. "Access is denied and nothing leaks" is
 * observable at an API; a rendering is not.
 *
 * WHAT THE LOOP TIER DOES ASSERT, so this refusal is not read as the whole criterion being absent:
 * every non-public API surface refuses a caller who never signed in and a caller who signed out, the
 * public surface answers both identically, and every route in the tree is declared public or
 * authenticated in the shipped registry. That is the DECISION this leaf lands. A green here would
 * claim the rendering nobody observed.
 */
export const at00124 = refusesWith('ui.logged-out-surface-rendering');
