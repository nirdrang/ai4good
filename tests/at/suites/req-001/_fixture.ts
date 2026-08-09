/**
 * REQ-001's fixture adapter — STORAGE ONLY. Every judgement is the shipped module's.
 *
 * READ THIS BEFORE TRUSTING A GREEN FROM THIS SUITE, because the honest claim is narrower than
 * "REQ-001 works" and wider than what most acceptance adapters can say.
 *
 * `adapterDerivedCapability()` in `tests/at/harness/capabilities.ts` stamps every `sut.<key>` a
 * STAND-IN unconditionally, and the registry refuses a stand-in above the loop tier. So nothing here
 * can reach the integration-tier run that is the evidence gate. What a loop-tier green from this
 * suite means is exactly this:
 *
 *   - PROVED: the decisions in `supabase/functions/_shared/accounts.ts`,
 *     `supabase/functions/_shared/github.ts` and `supabase/functions/_shared/verification.ts`
 *     behave as the nine acceptance criteria this suite lands require. THE THREE MODULES DO NOT
 *     HAVE THE SAME STANDING, and saying they do would be an untrue stated fact: `accounts.ts` and
 *     `github.ts` are imported by the deployed edge functions, byte for byte the code that ships.
 *     `verification.ts` is imported by NO deployed function — it is the module the FUTURE Discovery
 *     send route must import, and today only this suite and
 *     `tests/at/harness/shipped-verification.selftest.ts` import it. That is decision D-D of the
 *     verification leaf's plan and not an oversight; the module's own header says so too.
 *     Every PRODUCT judgement below — every accept and every refusal about account types, the
 *     GitHub precondition, the verified fact and the Discovery floor — comes from those modules,
 *     and so does the onboarding import's content. THE ONE EXCEPTION is the fixture's own
 *     BOOKKEEPING precondition refusals: `sendDiscoveryMessage` and `createOrganization` refuse an
 *     unknown session and an account that never completed signup, which is this storage checking
 *     that the world it was handed exists rather than any shipped rule judging anything. There is
 *     no second copy of the product rules in this file, deliberately: the moment there is one, this
 *     suite is grading a puppet and the green is worth nothing.
 *   - NOT PROVED: that the migration is correct, that either edge function works, that row-level
 *     security denies what it should, that Supabase Auth is configured, or that Google or GitHub
 *     sign-in works. None of that is reachable from here — the storage below is a Map. The evidence
 *     for that half at THIS tree's head is `loop/items/AI4DEV-58/proof-local.txt`, produced against
 *     the live local stack on one machine and EXISTS: 9 checks, 8 passed, 0 failed, 1 skipped. It
 *     covers the migration, the GitHub gate, the imported profile, the database's own backstops
 *     against a caller who never met TypeScript, atomicity, and the provider configuration. THE
 *     SKIP IS THE GITHUB HANDSHAKE: no GitHub OAuth app exists for this project, so "GitHub
 *     sign-in works" is not proved by the live tier either. The GOOGLE HANDSHAKE is unproved for
 *     the same reason and was never re-attempted here — no Google credential was in the
 *     environment when the predecessor measured it and none is now. No amount of green anywhere in
 *     this suite proves either handshake. A reviewer cannot reproduce that transcript; it is one
 *     machine's word.
 *
 *     `loop/items/AI4DEV-57/proof-local.txt` is retained for the ONE thing only it still covers:
 *     `create-organization`, which was exercised there and is untouched by this leaf. Its
 *     completion-path and schema evidence is SUPERSEDED — it predates this migration and called a
 *     `complete_signup` that no longer exists.
 *
 * WHAT THE STORAGE HALF DOES MIRROR, because a stand-in that mirrors nothing tests nothing: one
 * account row per auth user (so "one account holds exactly one global type" is structural here as it
 * is in the schema, not a rule the adapter remembers), and completion is all-or-nothing (so a body
 * asserting no partial state is asserting the same shape the database's `complete_signup` function
 * guarantees). It mirrors the SHAPE; the database's own guarantee is proved on the live stack.
 *
 * ============================================================================================
 * THE VENDOR MIRRORS, EACH WITH WHAT BINDS IT — the verification leaf's four, named one by one.
 * ============================================================================================
 *
 * A MIRROR IS NOT A PRODUCT JUDGEMENT, and keeping the two apart is what this section is for. The
 * two PRODUCT judgements about verification — whether an address is verified, and whether an
 * unverified caller may send a Discovery message — come from the shipped
 * `supabase/functions/_shared/verification.ts` and from nowhere else; there is no second copy of
 * either rule in this file. What is left is a prediction of what Supabase Auth DOES, and a
 * prediction has to say what would prove it wrong.
 *
 *   1. AN EMAIL/PASSWORD REGISTRATION STARTS UNCONFIRMED AND AN EMAIL CARRYING A VERIFICATION
 *      LINK IS SENT.
 *      BOUND — checks (a) and (b) of `loop/items/AI4DEV-59/proof-local.ts` on the live stack: the
 *      signup's own wire response, `auth.users.email_confirmed_at IS NULL` read on the database,
 *      and the confirmation email held by the local mail catcher.
 *   2. A LINK THAT WAS NEVER ISSUED CONFIRMS NOTHING.
 *      BOUND — check (b2) of `loop/items/AI4DEV-59/proof-local.ts`, and by that check alone. It
 *      follows a TAMPERED variant of the real link — the token mutated, so a token GoTrue never
 *      issued — BEFORE the real link is followed, and reads `auth.users.email_confirmed_at` still
 *      NULL afterwards. This entry used to cite checks (a)-(d), which measure only the POSITIVE
 *      half; two blind reviewers found that overstatement independently, so the check that
 *      measures the negative was added rather than the label softened. Note what this is NOT: it
 *      is not a claim about expiry, single use or resend. The token followed was never minted, so
 *      no lifetime and no use count is in play. AT-001.11 is retired and none of those semantics
 *      is modelled here.
 *   3. USING THE EMAILED LINK SETS `email_confirmed_at`.
 *      BOUND — checks (b) and (d): the link is followed by HTTP GET and the column flips to
 *      non-null, after which the real `/auth/v1/user` response is fed to the SHIPPED
 *      `emailVerifiedFromUser`, which answers true.
 *   4. A PROVIDER REGISTRATION (Google, GitHub) STARTS CONFIRMED, because the provider vouched for
 *      the address.
 *      **UNBOUND, AND SAID PLAINLY.** No OAuth app or credential exists in this environment, so no
 *      live provider session is obtainable — the same recorded gap that leaves the OAuth handshake
 *      itself unproved at every tier, stated in this header since the predecessor item. This item
 *      binds it nowhere and claims nothing about it. NO TEST IN THIS SUITE READS A PROVIDER USER'S
 *      VERIFIED STATE: both verification bodies register by email and password. If the prediction
 *      is wrong — a real provider user arriving unconfirmed — the shipped gate FAILS CLOSED: it
 *      refuses that caller, never allows one. The mirror is bound by the first item that ships a
 *      real provider-path consumer, and not before.
 *
 * THE PROVISIONED PLATFORM ADMINISTRATOR STARTS CONFIRMED, and it is a mirror of a RECIPE rather
 * than of a live measurement. `provisionPlatformAdmin` below marks its auth user confirmed and
 * mints no verification link, because creating an administrator sends no email. The recipe it
 * mirrors is the only one this repository records: the predecessor item's live-proof script creates
 * that user through `POST /auth/v1/admin/users` with `email_confirm: true`. The earlier version of
 * this fixture let the administrator start UNCONFIRMED by reusing the public email path, which
 * contradicted that record.
 * WHAT BINDS IT: nothing yet, and that is said plainly. NOTHING READS AN ADMINISTRATOR'S VERIFIED
 * STATE — not AT-001.07, not anything else in this suite. The predecessor's transcript ran with
 * confirmations OFF, so it does not measure the column under this leaf's flip either. So this
 * mirror is labelled by its recipe and is never called live-bound; the first item that reads an
 * administrator's verified state is the one that binds it.
 *
 * AND THE DISCOVERY SEND SURFACE IS NOT A MIRROR AT ALL — it mirrors nothing, because there is
 * nothing to mirror. No Discovery route exists in this repository at either tier; it is
 * REQ-002/004's. `sendDiscoveryMessage` below is a stand-in surface whose whole job is to put the
 * shipped gate on a tested path. No green over it says anything about enforcement anywhere.
 */

import type { FixtureWorld, FixtureWorldStore } from '../../harness/fixtures.ts';
import {
  PLATFORM_ACKNOWLEDGMENT_KIND,
  PUBLIC_SIGNUP_ACCOUNT_TYPES,
  ngoOnlyActionAllowed,
  validateCompleteSignup,
  validateOrganizationName,
  type AccountType,
  type CompleteSignupRequest,
} from '../../../../supabase/functions/_shared/accounts.ts';
// BOTH shipped GitHub judgements, not one. The IMPORT SOURCE is the shipped stub, not a copy living
// in this file — AT-001.05 compares the profile it reads back against `stubGithubStatsFor`, so if the
// two were separate implementations the test would grade the fixture's copy and say nothing about
// what the edge function writes. And `extractGithubHandle` is the OTHER shipped decision on this
// path: `completeSignup` below derives the caller fact through it rather than reading the stored
// handle straight, exactly as `resolveCaller` does in the edge function. Before that, a regression
// in the extractor — returning null for a linked identity — would have rejected every linked
// volunteer at the deployed edge while this suite stayed green.
import { extractGithubHandle, stubGithubStatsFor } from '../../../../supabase/functions/_shared/github.ts';
// BOTH shipped verification judgements, for the same reason both GitHub ones are imported above.
// `emailVerifiedFromUser` is how the verified fact is DERIVED from the rendered GoTrue user shape
// on every read — never read straight off storage — and `discoveryMessageAllowed` is the ONLY thing
// that decides whether a Discovery send is refused. Between them there is no rule about
// verification left in this file to drift.
import {
  discoveryMessageAllowed,
  emailVerifiedFromUser,
} from '../../../../supabase/functions/_shared/verification.ts';
import type {
  AccountRow,
  AccountsSut,
  AcknowledgmentRow,
  CompleteSignupOutcome,
  CreateOrganizationOutcome,
  MembershipRow,
  OrganizationRow,
  SendDiscoveryMessageOutcome,
  Session,
  SessionProvider,
  SignInOutcome,
  VolunteerProfileRow,
  World,
} from './_contract.ts';

/**
 * WHICH REQUIREMENT THIS ADAPTER IS, declared by the adapter itself.
 *
 * `harness/suite-adapters.ts` constrains its map entry to match this literal, and `loadAdapter()` in
 * `harness/index.ts` re-checks it against the requirement it was asked for. Without it the
 * type-check could describe one suite while the run drove another.
 */
export const requirement = 'req-001' as const;

interface AdapterOptions {
  worlds: FixtureWorldStore;
}

/** An auth user as Supabase Auth holds one: credentials and the provider that established them. */
interface AuthUser {
  id: string;
  email: string;
  password: string | null;
  provider: SessionProvider;
  /**
   * The handle of a LINKED GitHub identity, or null — Auth's `identities[]` narrowed to the one
   * field anything here reads.
   *
   * It is stored on the auth user and NOT on the session, which is the whole reason the gate is a
   * caller fact: linking happens after a session exists, changes nothing about how that session was
   * established, and is a property of the user Auth answers for.
   */
  githubHandle: string | null;
  /**
   * GoTrue's `email_confirmed_at`, or null while the address is unconfirmed — vendor mirror 1 and
   * 4 in this file's header.
   *
   * IT IS STORED AS THE VENDOR'S OWN FIELD VALUE, a nullable instant, and never as a boolean. The
   * shipped `emailVerifiedFromUser` is what turns it into an answer, and it does so from the
   * rendered `/auth/v1/user` shape rather than from this field directly. Storing a boolean here
   * would put the judgement in storage, which is the one thing this file's opening paragraph
   * promises it does not do.
   */
  emailConfirmedAt: string | null;
  /**
   * The verification link Auth emailed for this address, or null when no confirmation email was
   * sent — the fixture's stand-in for the message the local mail catcher holds on the live stack.
   *
   * IT IS NOT CLEARED WHEN IT IS USED, deliberately. Clearing it would model SINGLE USE, and
   * single-use semantics are retired AT-001.11's — "not stated in REQ-001". The fixture models
   * what the criterion states and no more.
   */
  verificationLink: string | null;
}

interface StoredAcknowledgment extends AcknowledgmentRow {}

interface State {
  authUsers: Map<string, AuthUser>;
  /** email -> auth user id, because sign-in arrives with an address rather than an id */
  byEmail: Map<string, string>;
  /**
   * verification link -> auth user id, because a link arrives on its own with no address beside it
   * — which is exactly the situation on the live stack, where the link is followed from an inbox.
   *
   * A link this map does not hold was never issued, and confirms nothing.
   */
  byVerificationLink: Map<string, string>;
  accounts: Map<string, AccountRow>;
  organizations: Map<string, OrganizationRow>;
  /** `${organizationId}:${accountId}` -> row */
  memberships: Map<string, MembershipRow>;
  acknowledgments: StoredAcknowledgment[];
  /** account id -> the imported volunteer profile, mirroring `public.volunteer_profiles`'s primary key */
  volunteerProfiles: Map<string, VolunteerProfileRow>;
  /**
   * account id -> the Discovery message bodies that account has sent.
   *
   * There is NO table behind this and no route that writes one; see the header's closing paragraph.
   * It exists so AT-001.10 can assert that a refused send wrote NOTHING, which the refusal's own
   * return value cannot show.
   */
  discoveryMessages: Map<string, string[]>;
  nextId: number;
}

function membershipKey(organizationId: string, accountId: string): string {
  return `${organizationId}:${accountId}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

class AccountsFixtureWorld implements World {
  constructor(
    private readonly base: FixtureWorld,
    private readonly serial: number,
  ) {}

  email(local: string): string {
    return `${local}+w${this.serial}@example.test`;
  }

  async teardown(): Promise<void> {
    await this.base.teardown();
  }
}

export function createFixtureAdapter({ worlds }: AdapterOptions) {
  const state: State = {
    authUsers: new Map(),
    byEmail: new Map(),
    byVerificationLink: new Map(),
    accounts: new Map(),
    organizations: new Map(),
    memberships: new Map(),
    acknowledgments: [],
    volunteerProfiles: new Map(),
    discoveryMessages: new Map(),
    nextId: 1,
  };
  const openedWorlds = new Set<AccountsFixtureWorld>();
  let worldSerial = 0;

  const nextId = (prefix: string): string => `${prefix}-${state.nextId++}`;

  /**
   * The instant a confirmation is recorded at.
   *
   * Fixed rather than read from a clock, for the same reason the acknowledgment's instant is: no
   * criterion here depends on WHICH instant, only on whether one is present, and a real timestamp
   * would make the capture non-deterministic for no gain. The shipped `emailVerifiedFromUser`
   * judges presence and never parses the value, so this is the whole of what the field has to be.
   */
  const CONFIRMED_AT = '2026-01-01T00:00:00.000Z';

  const register = (
    email: string,
    password: string | null,
    provider: SessionProvider,
    githubHandle: string | null = null,
    /**
     * Whether the CREATOR already confirmed the address, which only an operator can do.
     *
     * It exists for `provisionPlatformAdmin` and for nothing else. See the header: the recipe this
     * repository records creates an administrator through `POST /auth/v1/admin/users` with
     * `email_confirm: true`, so that user never receives a confirmation email and never has a link.
     */
    confirmedByTheCreator = false,
  ): Session => {
    // Supabase Auth's own uniqueness, mirrored: a second registration on one address is not a new
    // user. Left out, a body could accidentally create two auth users for one address and then read
    // back "one account per user" from a situation the real system cannot be in.
    const existing = state.byEmail.get(email);
    if (existing) throw new Error(`fixture: ${email} is already registered — Supabase Auth would refuse this`);

    // VENDOR MIRRORS 1 AND 4, and the header names what binds each. A public email/password
    // registration starts UNCONFIRMED and Auth emails a confirmation link. A registration a
    // provider vouched for, and one an operator created with the address already confirmed, both
    // start CONFIRMED and receive no confirmation email, so neither has a link. The provider half
    // is declared UNBOUND in the header — no OAuth credential exists here — and nothing in this
    // suite reads a provider user's verified state.
    const id = nextId('user');
    const confirmedAtCreation = provider !== 'email' || confirmedByTheCreator;
    const emailConfirmedAt = confirmedAtCreation ? CONFIRMED_AT : null;
    // Derived from the user id rather than from a second counter, so the link is unique by
    // construction and a link read in a failure message says which user it belongs to.
    const verificationLink = confirmedAtCreation ? null : `verify-${id}`;

    const user: AuthUser = { id, email, password, provider, githubHandle, emailConfirmedAt, verificationLink };
    state.authUsers.set(user.id, user);
    state.byEmail.set(email, user.id);
    if (verificationLink !== null) state.byVerificationLink.set(verificationLink, user.id);
    return { accountId: user.id, email: user.email, provider: user.provider };
  };

  /**
   * The stored auth state rendered as the canonical GoTrue `/auth/v1/user` response shape.
   *
   * ONE RENDERER FOR BOTH SHIPPED EXTRACTORS. `extractGithubHandle` reads `identities[]` and
   * `emailVerifiedFromUser` reads `email_confirmed_at`, and both read them off the SAME object here
   * — which is the point: on the live stack they read one response body, so rendering two different
   * shapes for them would be a divergence this suite could never notice.
   *
   * WHAT IS STILL NOT PROVED by anything that calls this: that this shape is the shape GoTrue really
   * sends. That is a prediction of the vendor. The live proof is what binds it.
   */
  const renderAuthUser = (user: AuthUser): Record<string, unknown> => ({
    id: user.id,
    email: user.email,
    email_confirmed_at: user.emailConfirmedAt,
    identities:
      user.githubHandle === null
        ? []
        : [{ provider: 'github', identity_data: { user_name: user.githubHandle } }],
  });

  /**
   * Which providers can sign this user back in — Auth's `identities[]`, reduced to what AT-001.02
   * asks about.
   *
   * A GitHub signup and a later GitHub LINK produce the same answer here, deliberately: after either,
   * the account carries a GitHub identity, and "a later sign-in via GitHub returns to the same
   * account" is a statement about the identity, not about which provider happened to create the user.
   */
  const reachableThroughProvider = (user: AuthUser, provider: SessionProvider): boolean =>
    provider === 'github' ? user.githubHandle !== null : user.provider === provider;

  /**
   * The `complete-signup` operation, at the loop tier.
   *
   * EVERY DECISION ON THIS PATH COMES FROM THE SHIPPED MODULE. What is left here is the four writes,
   * performed together or not at all — which is the shape `public.complete_signup` guarantees inside
   * one transaction on the real database, and which step 7 of the plan proves there.
   */
  const completeSignup = async (
    session: Session,
    request: CompleteSignupRequest,
    ip: string,
  ): Promise<CompleteSignupOutcome> => {
    const authUser = state.authUsers.get(session.accountId);
    if (!authUser) {
      return { ok: false, reason: 'no authenticated user — sign in before completing signup' };
    }

    // THE CALLER FACT COMES FROM THE STORED AUTH USER, never from the request. That is the same
    // shape the edge function has, where it comes from `/auth/v1/user` — a client cannot assert it
    // in either place, which is the whole security property of the volunteer gate.
    //
    // AND IT IS DERIVED, NOT READ. The stored state is rendered as the canonical GoTrue
    // `/auth/v1/user` shape — an `identities[]` array, empty when nothing is linked — and the handle
    // is then judged out of it by the SHIPPED `extractGithubHandle`, which is precisely what
    // `resolveCaller` does with the real response. Passing `authUser.githubHandle` in directly, as
    // this used to, pre-narrowed the fact and left the extractor unexecuted by any test: storage
    // would have been doing a judgement's job, which is the one thing this file's opening paragraph
    // promises it does not do. What is still NOT proved here is GoTrue's real serialisation — that
    // this shape is the shape Auth sends. Only the live proof touches that.
    //
    // The rendering itself is `renderAuthUser` above, shared with the verified-fact read, because
    // on the live stack both facts come out of ONE response body and two renderings here could
    // diverge with nothing able to notice.
    const callerUser = renderAuthUser(authUser);
    const decision = validateCompleteSignup(request, { githubHandle: extractGithubHandle(callerUser) });
    if (!decision.ok) return { ok: false, reason: decision.reason };
    const { accountType, organizationName, acknowledgmentTextVersion, githubHandle } = decision.value;

    // ONE ROW PER AUTH USER is what makes "one account holds exactly one global type" structural
    // rather than remembered — the schema states it as a primary key, and this states it as a
    // refusal at the same point.
    if (state.accounts.has(session.accountId)) {
      return { ok: false, reason: 'this account has already completed signup — one account holds exactly one global type' };
    }

    const account: AccountRow = { id: session.accountId, accountType };
    let organization: OrganizationRow | null = null;
    let membership: MembershipRow | null = null;

    if (organizationName !== null) {
      organization = { id: nextId('org'), name: organizationName };
      membership = { organizationId: organization.id, accountId: account.id, role: 'admin' };
    }

    // THE ONBOARDING IMPORT, COMPUTED HERE AND WRITTEN BELOW WITH EVERYTHING ELSE — which is the
    // shape `public.complete_signup` guarantees inside one transaction on the real database. There
    // is no queue and no deferred job: a volunteer completion either lands the account AND the
    // populated profile, or lands nothing. AT-001.05's "a queued-but-empty import fails this test"
    // is unrepresentable rather than merely untested.
    let volunteerProfile: VolunteerProfileRow | null = null;
    if (githubHandle !== null) {
      const stats = stubGithubStatsFor(githubHandle);
      volunteerProfile = {
        accountId: session.accountId,
        githubHandle,
        topLanguages: stats.topLanguages,
        repositoryCount: stats.repositoryCount,
        contributionSummary: stats.contributionSummary,
        // Fixed rather than read from a clock, for the same reason the acknowledgment's instant is:
        // nothing in these criteria depends on WHICH instant, and the live-stack proof reads the
        // database's own `now()`.
        importedAt: '2026-01-01T00:00:00.000Z',
      };
    }

    const acknowledgment: StoredAcknowledgment = {
      accountId: account.id,
      kind: PLATFORM_ACKNOWLEDGMENT_KIND,
      // Fixed rather than read from a clock: nothing in this leaf's four criteria depends on WHICH
      // instant it is, only that one is recorded, and a real timestamp would make the capture
      // non-deterministic for no gain. The live-stack proof reads `now()` from the database.
      acknowledgedAt: '2026-01-01T00:00:00.000Z',
      ip,
      textVersion: acknowledgmentTextVersion,
    };

    // All of them, together. Nothing above this line has mutated `state`.
    state.accounts.set(account.id, account);
    if (organization) state.organizations.set(organization.id, organization);
    if (membership) state.memberships.set(membershipKey(membership.organizationId, membership.accountId), membership);
    if (volunteerProfile) state.volunteerProfiles.set(volunteerProfile.accountId, volunteerProfile);
    state.acknowledgments.push(acknowledgment);

    return { ok: true, accountId: account.id, organizationId: organization?.id ?? null };
  };

  const sut: AccountsSut = {
    // Read straight off the shipped constant. A literal here would be a second statement of the same
    // fact, and AT-001.07 would then be asserting what this file says rather than what ships.
    publicSignupAccountTypes: async () => [...PUBLIC_SIGNUP_ACCOUNT_TYPES],

    registerWithEmailPassword: async (email, password) => register(email, password, 'email'),
    registerWithProvider: async (provider, email) => register(email, null, provider),
    // A GitHub signup links the GitHub identity it signed up with — that is what makes it a GitHub
    // signup rather than a session that merely says 'github'. Both halves are recorded here in one
    // step because Auth performs them in one round trip.
    registerWithGithub: async (email, githubHandle) => register(email, null, 'github', githubHandle),

    linkGithubIdentity: async (session, githubHandle) => {
      const user = state.authUsers.get(session.accountId);
      // A throw, not a refusal: a body that links an identity onto a user Auth never registered has
      // a bug in the TEST, and returning a polite outcome would let that bug read as a product
      // refusal further down.
      if (!user) throw new Error(`fixture: no auth user ${session.accountId} to link a GitHub identity to`);
      user.githubHandle = githubHandle;
    },

    signInWithEmailPassword: async (email, password): Promise<SignInOutcome> => {
      const userId = state.byEmail.get(email);
      const user = userId ? state.authUsers.get(userId) : undefined;
      // One reason for both branches: telling "no such account" apart from "wrong password" is an
      // existence oracle, and REQ-001 spends AT-001.21 forbidding exactly that shape elsewhere.
      if (!user || user.password === null || user.password !== password) {
        return { ok: false, reason: 'the email or password is incorrect' };
      }
      return { ok: true, session: { accountId: user.id, email: user.email, provider: user.provider } };
    },

    signInWithProvider: async (provider, email): Promise<SignInOutcome> => {
      const userId = state.byEmail.get(email);
      const user = userId ? state.authUsers.get(userId) : undefined;
      // One reason again, for the AT-001.21 reason above: "no such account" and "that provider is
      // not linked to it" must not be distinguishable to a caller.
      if (!user || !reachableThroughProvider(user, provider)) {
        return { ok: false, reason: `no account of this address is reachable through ${provider}` };
      }
      // THE SAME ACCOUNT, which is the clause under test. The id comes from the stored user, so a
      // second identity minted per sign-in would show up as a different `accountId` rather than
      // being invisible.
      return { ok: true, session: { accountId: user.id, email: user.email, provider } };
    },

    // DERIVED THROUGH THE SHIPPED EXTRACTOR, never read off storage. `user.emailConfirmedAt` is
    // rendered into the canonical `/auth/v1/user` shape and `emailVerifiedFromUser` judges it —
    // the same R3 pattern `completeSignup` uses for the GitHub handle, and for the same reason:
    // the extractor is what the future Discovery route will run, so it has to sit on the tested
    // path rather than being a function no test ever executes.
    emailVerified: async (accountId) => {
      const user = state.authUsers.get(accountId);
      // A throw, not `false`. `false` is the answer for an unverified user, so returning it here
      // would make a body that read a user Auth never registered look like a correct negative —
      // and the whole discriminating pair in AT-001.09 turns on telling those two apart.
      if (!user) throw new Error(`fixture: no auth user ${accountId} whose verified state could be read`);
      return emailVerifiedFromUser(renderAuthUser(user));
    },

    emailedVerificationLink: async (email) => {
      const userId = state.byEmail.get(email);
      const user = userId ? state.authUsers.get(userId) : undefined;
      return user?.verificationLink ?? null;
    },

    // VENDOR MIRRORS 2 AND 3 — the header names what binds each. Using the link Auth emailed
    // confirms that address; a link that was never issued flips nothing and says so.
    //
    // NOTHING HERE MODELS EXPIRY, SINGLE USE OR RESEND. The link is NOT removed from the map after
    // it is used, because removing it would be single-use semantics, and AT-001.11 — which is
    // where those semantics lived — is retired as unstated in REQ-001.
    useVerificationLink: async (link) => {
      const userId = state.byVerificationLink.get(link);
      const user = userId ? state.authUsers.get(userId) : undefined;
      if (!user) return { ok: false };
      user.emailConfirmedAt = CONFIRMED_AT;
      return { ok: true };
    },

    completeSignup,

    // THE STAND-IN SURFACE FOR A ROUTE THAT DOES NOT EXIST — see the header's closing paragraph
    // and `AccountsSut`'s fourth kind. Every judgement below is the shipped module's; what is left
    // here is one refusal about bookkeeping and one write.
    sendDiscoveryMessage: async (session, body): Promise<SendDiscoveryMessageOutcome> => {
      const authUser = state.authUsers.get(session.accountId);
      if (!authUser) return { ok: false, reason: 'no authenticated user — sign in before sending a Discovery message' };
      // The same bookkeeping refusal `createOrganization` gives, and it is THIS FILE'S, not a
      // product rule: an account that has not completed signup has no sender to record against.
      // It is checked FIRST so that AT-001.10's refusal is unambiguously the gate's own — the
      // account there has completed signup, so this branch cannot be what answers.
      if (!state.accounts.has(session.accountId)) {
        return { ok: false, reason: 'complete signup before sending a Discovery message' };
      }

      // THE VERIFIED FACT IS A CALLER FACT, derived exactly as `emailVerified` derives it: from the
      // rendered response shape, through the shipped extractor. It is never a request field —
      // a request field is something a client asserts about itself, and a floor built on one is no
      // floor at all.
      const emailVerified = emailVerifiedFromUser(renderAuthUser(authUser));

      // THE ONLY DECISION ON THIS PATH, and it is the shipped one. The refusal text is the GATE's,
      // carried through unchanged — AT-001.10 matches the reason, so restating it here would make
      // the test grade this file instead of the module that ships.
      const allowed = discoveryMessageAllowed({ emailVerified });
      if (!allowed.ok) return { ok: false, reason: allowed.reason };

      // ONLY REACHED ON ALLOW, so a refusal writes nothing — which is what `discoveryMessagesBy`
      // is read for. The body is stored opaquely: recipients, threads and message state are
      // REQ-002/004's semantics and none of them is invented here.
      const sent = state.discoveryMessages.get(session.accountId) ?? [];
      sent.push(body);
      state.discoveryMessages.set(session.accountId, sent);
      return { ok: true };
    },

    discoveryMessagesBy: async (accountId) => clone(state.discoveryMessages.get(accountId) ?? []),

    createOrganization: async (session, organizationName): Promise<CreateOrganizationOutcome> => {
      const account = state.accounts.get(session.accountId);
      if (!account) return { ok: false, reason: 'complete signup before creating an organisation' };

      // THE REFUSAL IS THE SHIPPED MODULE'S, not this file's. That is what makes AT-001.06 a test of
      // an application boundary rather than of a helper called directly from a test body.
      const allowed = ngoOnlyActionAllowed(account.accountType);
      if (!allowed.ok) return { ok: false, reason: allowed.reason };

      // The name rule is the shipped module's too. It used to be spelled out here, which made this
      // file hold a second copy of a rule — the one thing its opening paragraph promises it does
      // not do.
      const name = validateOrganizationName(organizationName);
      if (!name.ok) return { ok: false, reason: name.reason };

      const organization: OrganizationRow = { id: nextId('org'), name: name.value };
      const membership: MembershipRow = { organizationId: organization.id, accountId: account.id, role: 'admin' };
      state.organizations.set(organization.id, organization);
      state.memberships.set(membershipKey(organization.id, account.id), membership);
      return { ok: true, organizationId: organization.id };
    },

    account: async (accountId) => clone(state.accounts.get(accountId) ?? null),
    organization: async (organizationId) => clone(state.organizations.get(organizationId) ?? null),
    membership: async (organizationId, accountId) => clone(state.memberships.get(membershipKey(organizationId, accountId)) ?? null),
    acknowledgments: async (accountId) => clone(state.acknowledgments.filter((row) => row.accountId === accountId)),
    volunteerProfile: async (accountId) => clone(state.volunteerProfiles.get(accountId) ?? null),

    // The two searches a refused action needs: it hands back no identifier, so the rows it must NOT
    // have written can only be looked for by the name that was attempted and by who holds what.
    organizationsNamed: async (name) => clone([...state.organizations.values()].filter((row) => row.name === name.trim())),
    membershipsOf: async (accountId) => clone([...state.memberships.values()].filter((row) => row.accountId === accountId)),

    // DISCRIMINATING — and WHICH predicate that green grades is worth being exact about, because
    // this one is not the shipped one. `public.has_platform_acknowledgment` is SQL, and a
    // TypeScript module cannot supply a SQL predicate; the one judgement inside it — which
    // acknowledgment kind counts — is shared, which is why the constant below is imported rather
    // than spelled. So AT-001.01's loop-tier green proves THE RULE and THIS storage: a completion
    // writes the row, and the answer is false before and true after. The shipped SQL predicate
    // could still return true unconditionally and this would stay green. What proves that one is
    // step 7(h) of the plan, against the live database, and nothing else in this item.
    hasPlatformAcknowledgment: async (accountId) =>
      state.acknowledgments.some((row) => row.accountId === accountId && row.kind === PLATFORM_ACKNOWLEDGMENT_KIND),

    provisionPlatformAdmin: async (email, password) => {
      // CONFIRMED AT PROVISIONING, AND NO VERIFICATION LINK — the header's administrator paragraph
      // says why: the only provisioning recipe this repository records creates the user with
      // `email_confirm: true`, and creating an administrator sends no email.
      const session = register(email, password, 'email', null, true);
      // Written directly, bypassing `completeSignup` — which is not a shortcut but the point:
      // `parseAccountType` refuses this type, so the public path CANNOT produce it, and the only way
      // an administrator exists is an authority the public never holds. The type is still taken from
      // the shipped vocabulary rather than spelled as a literal.
      const accountType: AccountType = 'platform_admin';
      state.accounts.set(session.accountId, { id: session.accountId, accountType });
      return session;
    },
  };

  return {
    sut: { accounts: sut },
    fixtures: {
      world: async (name: string) => {
        const base = await worlds.world(name);
        const world = new AccountsFixtureWorld(base, ++worldSerial);
        openedWorlds.add(world);
        return world;
      },
    },
    teardown: async () => {
      await Promise.all([...openedWorlds].map((world) => world.teardown()));
      openedWorlds.clear();
      state.authUsers.clear();
      state.byEmail.clear();
      state.byVerificationLink.clear();
      state.accounts.clear();
      state.organizations.clear();
      state.memberships.clear();
      state.acknowledgments.length = 0;
      state.volunteerProfiles.clear();
      state.discoveryMessages.clear();
      state.nextId = 1;
    },
  };
}
