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
