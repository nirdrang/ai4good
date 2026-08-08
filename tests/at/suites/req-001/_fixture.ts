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
 *   - PROVED: the decisions in `supabase/functions/_shared/accounts.ts` and
 *     `supabase/functions/_shared/github.ts` — the modules the two edge functions import, byte for
 *     byte the code that ships — behave as the seven acceptance criteria this suite lands require.
 *     Every accept and every refusal below comes from those modules, and so does the onboarding
 *     import's content. There is no second copy of the rules in this file, deliberately: the moment
 *     there is one, this suite is grading a puppet and the green is worth nothing.
 *   - NOT PROVED: that the migration is correct, that either edge function works, that row-level
 *     security denies what it should, that Supabase Auth is configured, or that Google sign-in
 *     works. None of that is reachable from here — the storage below is a Map. The evidence for
 *     that half is `loop/items/AI4DEV-57/proof-local.txt`, which was produced against the live
 *     local stack on one machine and EXISTS: 14 checks, 13 passed, 0 failed, one skipped. The skip
 *     is the Google handshake, because no OAuth credential was in the environment — so "Google
 *     sign-in works" is not proved by the live tier either, and no amount of green anywhere in this
 *     item proves it. A reviewer cannot reproduce that transcript; it is one machine's word.
 *
 * WHAT THE STORAGE HALF DOES MIRROR, because a stand-in that mirrors nothing tests nothing: one
 * account row per auth user (so "one account holds exactly one global type" is structural here as it
 * is in the schema, not a rule the adapter remembers), and completion is all-or-nothing (so a body
 * asserting no partial state is asserting the same shape the database's `complete_signup` function
 * guarantees). It mirrors the SHAPE; the database's own guarantee is proved on the live stack.
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
// The IMPORT SOURCE is the shipped stub, not a copy living in this file. AT-001.05 compares the
// profile it reads back against `stubGithubStatsFor`, so if the two were separate implementations
// the test would grade the fixture's copy and say nothing about what the edge function writes.
import { stubGithubStatsFor } from '../../../../supabase/functions/_shared/github.ts';
import type {
  AccountRow,
  AccountsSut,
  AcknowledgmentRow,
  CompleteSignupOutcome,
  CreateOrganizationOutcome,
  MembershipRow,
  OrganizationRow,
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
}

interface StoredAcknowledgment extends AcknowledgmentRow {}

interface State {
  authUsers: Map<string, AuthUser>;
  /** email -> auth user id, because sign-in arrives with an address rather than an id */
  byEmail: Map<string, string>;
  accounts: Map<string, AccountRow>;
  organizations: Map<string, OrganizationRow>;
  /** `${organizationId}:${accountId}` -> row */
  memberships: Map<string, MembershipRow>;
  acknowledgments: StoredAcknowledgment[];
  /** account id -> the imported volunteer profile, mirroring `public.volunteer_profiles`'s primary key */
  volunteerProfiles: Map<string, VolunteerProfileRow>;
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
    accounts: new Map(),
    organizations: new Map(),
    memberships: new Map(),
    acknowledgments: [],
    volunteerProfiles: new Map(),
    nextId: 1,
  };
  const openedWorlds = new Set<AccountsFixtureWorld>();
  let worldSerial = 0;

  const nextId = (prefix: string): string => `${prefix}-${state.nextId++}`;

  const register = (
    email: string,
    password: string | null,
    provider: SessionProvider,
    githubHandle: string | null = null,
  ): Session => {
    // Supabase Auth's own uniqueness, mirrored: a second registration on one address is not a new
    // user. Left out, a body could accidentally create two auth users for one address and then read
    // back "one account per user" from a situation the real system cannot be in.
    const existing = state.byEmail.get(email);
    if (existing) throw new Error(`fixture: ${email} is already registered — Supabase Auth would refuse this`);
    const user: AuthUser = { id: nextId('user'), email, password, provider, githubHandle };
    state.authUsers.set(user.id, user);
    state.byEmail.set(email, user.id);
    return { accountId: user.id, email: user.email, provider: user.provider };
  };

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
    const decision = validateCompleteSignup(request, { githubHandle: authUser.githubHandle });
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

    completeSignup,

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
      const session = register(email, password, 'email');
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
      state.accounts.clear();
      state.organizations.clear();
      state.memberships.clear();
      state.acknowledgments.length = 0;
      state.volunteerProfiles.clear();
      state.nextId = 1;
    },
  };
}
