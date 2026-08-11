/**
 * REQ-001's LIVE adapter — the integration tier's system under test.
 *
 * READ THIS BEFORE TRUSTING A GREEN FROM THE INTEGRATION TIER, because what it claims is different
 * from what the loop tier claims, and neither is "REQ-001 works".
 *
 * `_fixture.ts` is storage: its judgements are the shipped modules' and its storage is a Map, so a
 * loop-tier green says the DECISIONS are right and says nothing about the migration, the deployed
 * functions, row-level security or Supabase Auth. This file is the other half. Every operation below
 * goes to the slot's own stack:
 *
 *   - Supabase Auth over HTTP, at the slot's own gateway — signup, the password grant, logout,
 *     refresh, recovery, and the emailed links as the slot's own mail catcher really holds them;
 *   - the DEPLOYED edge functions, served by the slot's own edge-runtime container out of the
 *     `supabase/` this run mirrored into the slot — so `verify_jwt`, the platform's own token check,
 *     `resolveCaller` and the database function all sit on the path;
 *   - the database as the OPERATOR, over the connection string the runner validated and this run
 *     attested, for the read-backs an assertion needs and for the two Givens no public path can
 *     reach.
 *
 * ============================================================================================
 * WHAT IS BACKED, WHAT IS NOT, AND WHY THE DIFFERENCE IS A CLOSED LIST RATHER THAN A COMMENT
 * ============================================================================================
 *
 * `BACKED` below is the enumeration the harness grants `sut.accounts` its `real` verdict over. Every
 * method NOT in it is a callable proxy that throws `CapabilityPending` naming
 * `sut.accounts.<method>` the moment a body touches it — it fakes nothing, answers nothing, and can
 * never produce a green. So an id that leans on one is declarably RED, by name, and an id that does
 * not is graded against the live stack. The list is checked against this module's own surface at
 * construction: a name in it that is not implemented here refuses the whole run.
 *
 * THE FOUR FAMILIES THAT ARE DELIBERATELY NOT BACKED, each with the fact that keeps it that way:
 *
 *   1. `registerWithProvider`, `registerWithGithub`, `signInWithProvider` — the OAuth handshakes.
 *      No GitHub or Google OAuth app or credential exists in this environment: AI4DEV-58's live
 *      proof records its GitHub check SKIPPED for exactly that reason, and the config's own comments
 *      say the provider blocks prove well-formedness and never a round trip. Consent is a person
 *      pressing a button, which no agent performs. A green over a fabricated provider session at the
 *      tier whose meaning is "proved for real" would be the false green this repository exists to
 *      kill.
 *   2. `sendDiscoveryMessage`, `discoveryMessagesBy` — no Discovery send route exists in this
 *      repository at any tier. It is REQ-002/004's, and what this requirement ships is the DECISION
 *      that route must consult. At loop tier a stand-in surface puts that decision on a tested path,
 *      which is honest there; at the live tier there is no route to call, and inventing one would be
 *      building another requirement's surface early.
 *   3. `publicSignupAccountTypes` — a constant exported by a shipped module, with no deployed
 *      surface that reports it. Reading it back here would be this file asking the shipped module
 *      what the shipped module says. AT-001.07's integration body proves the same clause the way a
 *      live tier can: the DEPLOYED completion path refuses `platform_admin`.
 *   4. `emailedPasswordResetLink` is backed and `completePasswordReset` is backed, but note what the
 *      pair does NOT model — expiry, single use and resend. AT-001.15 is retired and those semantics
 *      are unstated in REQ-001, so nothing here asserts them.
 *
 * ============================================================================================
 * THE ONE DIVERGENCE THAT CANNOT BE HIDDEN: REGISTRATION ISSUES NO SESSION
 * ============================================================================================
 *
 * `_contract.ts` says `registerWithEmailPassword` returns "the resulting session", and records that
 * the loop fixture MINTS one although the live stack issues none — it calls that the DECLARED
 * DIVERGENCE, in those words. With `enable_confirmations = true` the live GoTrue creates the user,
 * sends the confirmation email, and answers with no tokens. AI4DEV-59's proof measured exactly that:
 * "signup HTTP 200 … carried a session: false".
 *
 * SO THIS ADAPTER RETURNS A HANDLE THAT NAMES THE ACCOUNT AND HOLDS NO SESSION — `sessionId` is the
 * empty string, and no access token is stored against it. It does NOT fabricate one, and the reason
 * is the whole doctrine: a minted handle would let a body complete signup with a session the live
 * stack never issued, which is a green over a state that does not exist.
 *
 * WHAT HAPPENS WHEN A BODY USES IT ANYWAY: every session-taking operation here looks the token up
 * and REFUSES when there is none, naming this paragraph. The failure direction is a false RED. That
 * is why the integration bodies follow the LIVE PUBLIC ORDER — register, use the emailed link, sign
 * in — and take their session from the sign-in, which is the order a real person follows.
 */

import { emailVerifiedFromUser } from '../../../../supabase/functions/_shared/verification.ts';
import type { LiveVendors } from '../../harness/live-email.ts';
import type {
  AccountRow,
  AccountsSut,
  AcknowledgmentRow,
  CompleteSignupOutcome,
  CompleteSignupRequest,
  CreateOrganizationOutcome,
  MembershipRow,
  OrganizationRow,
  RefreshSessionOutcome,
  Session,
  SignInOutcome,
  VolunteerProfileRow,
  World,
} from './_contract.ts';

/** THE SELF-DECLARATION the loader checks against the requirement it was asked for. */
export const requirement = 'req-001' as const;

/**
 * THE CLOSED ENUMERATION. Every name here must exist below as a callable member, and every name NOT
 * here refuses at use. This list IS the integration tier's claim about this suite.
 */
export const backedSutMethods = {
  accounts: [
    'registerWithEmailPassword',
    'signInWithEmailPassword',
    'linkGithubIdentity',
    'signOut',
    'refreshSession',
    'sessionsOf',
    'requestPasswordReset',
    'emailedPasswordResetLink',
    'completePasswordReset',
    'emailVerified',
    'emailedVerificationLink',
    'useVerificationLink',
    'completeSignup',
    'createOrganization',
    'account',
    'organization',
    'membership',
    'acknowledgments',
    'volunteerProfile',
    'organizationsNamed',
    'membershipsOf',
    'hasPlatformAcknowledgment',
    'provisionPlatformAdmin',
  ],
} as const satisfies Record<string, readonly string[]>;

/* ------------------------------------------------------------------------------ the plumbing */

interface BunSqlClient {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  close(): Promise<void>;
}
type BunSqlCtor = new (url: string) => BunSqlClient;

interface Slot {
  apiUrl: string;
  dbUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  mailUrl: string;
}

/** What this adapter holds for a session it really obtained. A handle with no entry holds nothing. */
interface LiveSession {
  accessToken: string;
  refreshToken: string;
}

/** The one place a handle is turned into a token, and the one place the divergence is enforced. */
function tokensOf(store: Map<string, LiveSession>, session: Session, act: string): LiveSession {
  const held = session.sessionId ? store.get(session.sessionId) : undefined;
  if (!held) {
    throw new Error(
      `refusing to ${act}: this handle names account ${session.accountId} and holds NO session. On the live stack a ` +
        `registration under enable_confirmations = true issues no tokens, so the handle it returns cannot act. Follow ` +
        `the live public order — register, use the emailed verification link, sign in — and act with the sign-in's ` +
        `session. Nothing was fabricated to make this call work.`,
    );
  }
  return held;
}

/** The `session_id` claim, which is the identity of the `auth.sessions` row GoTrue minted. */
function sessionIdOf(accessToken: string): string {
  const claims = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8')) as {
    session_id?: unknown;
    sub?: unknown;
  };
  return String(claims.session_id ?? '');
}

function accountIdOf(accessToken: string): string {
  const claims = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8')) as { sub?: unknown };
  return String(claims.sub ?? '');
}

/* -------------------------------------------------------------------------------- the factory */

export async function createLiveAdapter(opts: {
  slot: Slot;
  vendors: LiveVendors;
  config: unknown;
  worlds: unknown;
}): Promise<{
  sut: { accounts: AccountsSut };
  fixtures: { world(name: string): Promise<World> };
  teardown(): Promise<void>;
}> {
  const { slot, vendors } = opts;
  const api = slot.apiUrl.replace(/\/$/, '');

  const SQL = (globalThis as { Bun?: { SQL?: BunSqlCtor } }).Bun?.SQL;
  if (!SQL) throw new Error('this runtime has no SQL client (expected bun) — the live adapter reads the slot database directly');
  const sql = new SQL(slot.dbUrl);

  const sessions = new Map<string, LiveSession>();

  const authPost = async (path: string, body: unknown, bearer?: string): Promise<{ status: number; json: Record<string, unknown> }> => {
    const response = await fetch(`${api}${path}`, {
      method: 'POST',
      headers: {
        apikey: slot.anonKey,
        Authorization: `Bearer ${bearer ?? slot.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      json = { raw: text };
    }
    return { status: response.status, json };
  };

  /** A deployed edge function, called exactly as a browser client would — bearer, JSON, no shortcut. */
  const callFunction = async (name: string, body: unknown, session: Session, ip: string): Promise<{ status: number; json: Record<string, unknown> }> => {
    const tokens = tokensOf(sessions, session, `call the deployed ${name}`);
    const response = await fetch(`${api}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        apikey: slot.anonKey,
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
        // AT-001.01 records the address the gateway chain REPORTED. `_contract.ts` says exactly what
        // that is and is not: a spoofed header is stored verbatim and no source address is verified.
        'x-forwarded-for': ip,
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      json = { raw: text };
    }
    return { status: response.status, json };
  };

  /**
   * The links a message carries, in the order they appear.
   *
   * The RAW message is searched rather than a rendered body, so a token survives verbatim. Both the
   * confirmation and the recovery mail carry `/auth/v1/verify?...`, and they are told apart by the
   * `type` parameter — which is what AI4DEV-60's proof had to do too, because one address can hold
   * both kinds at once.
   */
  const linksIn = async (address: string, wanted: 'signup' | 'recovery'): Promise<string[]> => {
    const messages = await vendors.email.messagesFor(address);
    const links: string[] = [];
    for (const message of messages) {
      /*
       * QUOTED-PRINTABLE IS DECODED IN FULL, not merely unwrapped — measured on the slot's own
       * catcher, because the first integration run said "no confirmation email reached the mail
       * catcher" while the message was sitting in it.
       *
       * The message this stack sends carries `Content-Transfer-Encoding: quoted-printable`, and that
       * encoding does TWO things to a long URL: it wraps it with soft line breaks (`=` then a
       * newline), and it escapes every literal `=` as `=3D`. Unwrapping alone leaves
       * `?token=3D…&type=3Dsignup`, so the `type=signup` test below was false for every message and
       * the link that WAS found would have been unfollowable anyway. Both steps are the same
       * decoding and neither is optional.
       *
       * The order is load-bearing: the soft breaks go first, because a break can sit in the middle
       * of an escape sequence.
       */
      const body = message.body
        .replace(/=\r?\n/g, '')
        .replace(/=([0-9A-Fa-f]{2})/g, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
        .replace(/&amp;/g, '&');
      for (const match of body.matchAll(/https?:\/\/[^\s"'<>)\]]+/g)) {
        const url = match[0].replace(/[.,;]+$/, '');
        if (!url.includes('/auth/v1/verify')) continue;
        if (!url.includes(`type=${wanted}`)) continue;
        links.push(url);
      }
    }
    return links;
  };

  /**
   * THE SAME READ, WAITED FOR — because sending mail is not synchronous with the request that
   * causes it. GoTrue answers `POST /auth/v1/signup` and hands the message to the SMTP transport
   * afterwards, so a body that reads the catcher on the next line can read it before the message
   * has landed.
   *
   * WHAT WAS MEASURED, said exactly, because this wait is NOT what fixed the first integration run
   * and a comment that implied otherwise would be evidence of the wrong thing. On this stack a
   * confirmation message reached the catcher 4 ms after the signup answered. The decoding above is
   * what the run needed. Four milliseconds is a measurement of one delivery, not a guarantee about
   * every delivery, so the read waits rather than assuming.
   *
   * A BOUNDED POLL, AND THE BOUND IS THE POINT. It costs nothing when the message is already there.
   * When no message ever arrives the read still returns nothing and the assertion still fails —
   * this waits for a message, it does not invent one, and the failure direction is unchanged.
   */
  const linksFor = async (address: string, wanted: 'signup' | 'recovery'): Promise<string[]> => {
    const deadline = Date.now() + 20_000;
    for (;;) {
      const links = await linksIn(address, wanted);
      if (links.length > 0 || Date.now() >= deadline) return links;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  };

  const rows = async <T>(query: Promise<unknown>): Promise<T[]> => (await query) as T[];

  const accounts: AccountsSut = {
    /* ------------------------------------------------- Supabase Auth, over the slot's own gateway */

    registerWithEmailPassword: async (email, password) => {
      const { status, json } = await authPost('/auth/v1/signup', { email, password });
      if (status >= 400) throw new Error(`the live signup for a fresh address answered ${status}`);
      // NO SESSION IS MINTED HERE. See this file's header: with confirmations on the live stack
      // issues none, and a fabricated handle would let a body act as a user that cannot act.
      const accountId = String((json.id as string | undefined) ?? (json.user as { id?: string } | undefined)?.id ?? '');
      if (!accountId) throw new Error('the live signup answered 200 but named no user id');
      return { accountId, email, provider: 'email', sessionId: '' };
    },

    signInWithEmailPassword: async (email, password) => {
      const { status, json } = await authPost('/auth/v1/token?grant_type=password', { email, password });
      if (status >= 400) {
        // ONE REASON FOR BOTH BRANCHES, which is the shape `_contract.ts` requires: an answer that
        // differed would tell an anonymous caller which addresses hold accounts.
        return { ok: false, reason: String(json.msg ?? json.error_description ?? 'sign-in was refused') };
      }
      const accessToken = String(json.access_token ?? '');
      const refreshToken = String(json.refresh_token ?? '');
      if (!accessToken) return { ok: false, reason: 'sign-in answered 200 with no access token' };
      const sessionId = sessionIdOf(accessToken);
      sessions.set(sessionId, { accessToken, refreshToken });
      return { ok: true, session: { accountId: accountIdOf(accessToken), email, provider: 'email', sessionId } };
    },

    /**
     * THE LINKED GITHUB IDENTITY, WRITTEN BY THE OPERATOR — and it is a GIVEN, never an act under
     * test.
     *
     * The real act is a browser consent round trip that no agent performs, and this repository holds
     * no OAuth credential for it. What is written here is the STATE Auth would be in afterwards: one
     * `auth.identities` row. Two ids read this state — AT-001.06 needs a fully signed-up volunteer
     * before it can test an NGO-only refusal, and AT-001.03's volunteer half needs the same
     * precondition — and for both of them the link is scenery.
     *
     * AT-001.04 AND AT-001.05 DO NOT GET TO USE IT, because for them the link IS the act: "linking
     * completes signup", and "when the link completes, onboarding fires". Their integration bodies
     * refuse with the missing capability named rather than reaching this method, and the manifest
     * declares them red on exactly that. The distinction is the criterion's, not this file's.
     */
    /*
     * `::text::jsonb`, AND THE DOUBLE CAST IS THE WHOLE DIFFERENCE — measured, because the single
     * cast wrote a row that broke Supabase Auth for that user.
     *
     * A bound string parameter cast straight to `jsonb` arrives as a JSON STRING SCALAR: the column
     * then holds `"{\"sub\":…}"` rather than `{"sub":…}`, so `identity_data->>'user_name'` is null
     * and GoTrue's own `/auth/v1/user` answers 500 for the account. The completion that follows is
     * then refused 401 "authenticate before completing signup" — a refusal that reads like an auth
     * rule and is really a malformed fixture row. Measured on slot 1:
     *   `${text}::jsonb`        -> "{\"sub\":\"h\",…}"  ->>'user_name' = null
     *   `${text}::text::jsonb`  -> {"sub":"h",…}        ->>'user_name' = "h"
     * The text cast makes Postgres PARSE the value rather than wrap it, which is what the column
     * means. The database's own backstop reads the same field, so a wrapped value fails there too.
     */
    linkGithubIdentity: async (session, githubHandle) => {
      const identityId = crypto.randomUUID();
      await sql`
        insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        values (
          ${identityId}::uuid,
          ${githubHandle},
          ${session.accountId}::uuid,
          ${JSON.stringify({ sub: githubHandle, user_name: githubHandle, provider_id: githubHandle })}::text::jsonb,
          'github',
          now(), now(), now()
        )
      `;
    },

    /**
     * THE CACHED TOKENS SURVIVE THE LOGOUT, DELIBERATELY (gate-2 ruling S2-2).
     *
     * This method used to end with `sessions.delete(session.sessionId)`, and that one line made the
     * revocation clause untestable: the next call with the same handle threw client-side in
     * `tokensOf` before any request left this process, so the assertion "a revoked session cannot
     * write" was measuring THIS FILE'S bookkeeping rather than the live stack's judgement. A test
     * that passes because the client refused to try has proved nothing about the server.
     *
     * So the handle keeps its tokens and the post-logout write really goes out, carrying a token
     * that is revoked and not yet expired. Whatever the live stack answers is the measured fact.
     *
     * THE DIVERGENCE HANDLE IS UNTOUCHED. `tokensOf` still refuses a handle that never held a
     * session — a registration under confirmations — which is a different case from a session that
     * existed and was revoked, and is the one the file header describes.
     */
    signOut: async (session) => {
      const tokens = tokensOf(sessions, session, 'sign out');
      // `?scope=local` ends THIS session. The vendor's default is `global`, which ends every session
      // the account holds — measured in AI4DEV-60's proof — and `_contract.ts` models the local one.
      const response = await fetch(`${api}/auth/v1/logout?scope=local`, {
        method: 'POST',
        headers: { apikey: slot.anonKey, Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (response.status >= 400) throw new Error(`the live logout answered ${response.status}`);
    },

    refreshSession: async (session): Promise<RefreshSessionOutcome> => {
      const tokens = tokensOf(sessions, session, 'refresh a session');
      // NO CREDENTIALS IN THIS CALL, which is the whole content of AT-001.13's mechanism: a refresh
      // token, and no password anywhere.
      const { status, json } = await authPost('/auth/v1/token?grant_type=refresh_token', { refresh_token: tokens.refreshToken });
      if (status >= 400) return { ok: false, reason: String(json.msg ?? 'the refresh was refused') };
      const accessToken = String(json.access_token ?? '');
      if (!accessToken) return { ok: false, reason: 'the refresh answered 200 with no access token' };
      const sessionId = sessionIdOf(accessToken);
      sessions.set(sessionId, { accessToken, refreshToken: String(json.refresh_token ?? tokens.refreshToken) });
      return { ok: true, session: { ...session, sessionId } };
    },

    sessionsOf: async (accountId) => {
      const found = await rows<{ id: string }>(sql`select id from auth.sessions where user_id = ${accountId}::uuid order by created_at`);
      return found.map((row) => ({ sessionId: String(row.id) }));
    },

    requestPasswordReset: async (email) => {
      // IT ALWAYS SUCCEEDS, including for an address nobody registered — a security shape, measured
      // on the live stack in AI4DEV-60's proof, not a convenience.
      await authPost('/auth/v1/recover', { email });
      return { ok: true };
    },

    emailedPasswordResetLink: async (email) => (await linksFor(email, 'recovery'))[0] ?? null,

    completePasswordReset: async (link, newPassword) => {
      // THE FLOW SHAPE IS MEASURED RATHER THAN REMEMBERED. AI4DEV-60's proof found the implicit
      // fragment on this CLI version and recorded that a PKCE code appears on others; following the
      // link and reading what comes back is what keeps this working across either.
      const response = await fetch(link, { redirect: 'manual' });
      const location = response.headers.get('location') ?? '';
      const fragment = location.includes('#') ? location.slice(location.indexOf('#') + 1) : '';
      const accessToken = new URLSearchParams(fragment).get('access_token') ?? '';
      if (!accessToken) return { ok: false };
      const update = await fetch(`${api}/auth/v1/user`, {
        method: 'PUT',
        headers: { apikey: slot.anonKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      return { ok: update.status < 400 };
    },

    /**
     * THE VERIFIED FACT, DERIVED BY THE SHIPPED EXTRACTOR — never read as a boolean off a column.
     *
     * The row is read with operator authority and rendered as the canonical `/auth/v1/user` shape,
     * and the SHIPPED `emailVerifiedFromUser` judges it. That is the same pattern the loop fixture
     * uses and it exists for the same reason: the extractor the future Discovery route will call
     * sits on the tested path rather than being a function no test ever runs. AI4DEV-59's proof is
     * what binds the RENDERED shape to the real one — it fed a real response to the same function.
     */
    emailVerified: async (accountId) => {
      const found = await rows<{ email_confirmed_at: string | null; email: string }>(
        sql`select email, email_confirmed_at from auth.users where id = ${accountId}::uuid`,
      );
      if (found.length !== 1) return false;
      return emailVerifiedFromUser({
        id: accountId,
        email: found[0].email,
        email_confirmed_at: found[0].email_confirmed_at,
      });
    },

    emailedVerificationLink: async (email) => (await linksFor(email, 'signup'))[0] ?? null,

    useVerificationLink: async (link) => {
      const response = await fetch(link, { redirect: 'manual' });
      // GoTrue answers a 303 to the site URL for a token it issued AND for one it never issued — the
      // tampered probe in AI4DEV-59's proof measured that. So the STATUS is not the oracle; the
      // column is, and the body that cares reads `emailVerified` afterwards.
      return { ok: response.status < 400 };
    },

    /* ------------------------------------------------ the DEPLOYED functions, over the slot's kong */

    completeSignup: async (session, request: CompleteSignupRequest, ip): Promise<CompleteSignupOutcome> => {
      const { status, json } = await callFunction('complete-signup', request, session, ip);
      if (status >= 400 || json.ok === false) {
        return { ok: false, reason: String(json.reason ?? json.msg ?? `the deployed complete-signup answered ${status}`) };
      }
      return {
        ok: true,
        accountId: String(json.accountId ?? ''),
        organizationId: (json.organizationId as string | null) ?? null,
      };
    },

    createOrganization: async (session, organizationName): Promise<CreateOrganizationOutcome> => {
      // THE FIELD THE DEPLOYED FUNCTION READS IS `name`, and it is measured rather than assumed:
      // `create-organization/index.ts` calls `validateOrganizationName(body.value.name)`. A body
      // keyed `organizationName` was refused 400 "an organisation needs a non-empty name" — a
      // refusal that reads like a product rule and is really a wire mismatch, which would have made
      // AT-001.06's NGO CONTROL fail and every refusal after it prove nothing.
      const { status, json } = await callFunction('create-organization', { name: organizationName }, session, '203.0.113.7');
      if (status >= 400 || json.ok === false) {
        return { ok: false, reason: String(json.reason ?? json.msg ?? `the deployed create-organization answered ${status}`) };
      }
      return { ok: true, organizationId: String(json.organizationId ?? '') };
    },

    /* -------------------------------------------------------- read-back, as the operator, over SQL */

    account: async (accountId): Promise<AccountRow | null> => {
      const found = await rows<{ id: string; account_type: AccountRow['accountType'] }>(
        sql`select id, account_type from public.accounts where id = ${accountId}::uuid`,
      );
      return found.length === 1 ? { id: String(found[0].id), accountType: found[0].account_type } : null;
    },

    organization: async (organizationId): Promise<OrganizationRow | null> => {
      const found = await rows<{ id: string; name: string }>(
        sql`select id, name from public.organizations where id = ${organizationId}::uuid`,
      );
      return found.length === 1 ? { id: String(found[0].id), name: found[0].name } : null;
    },

    membership: async (organizationId, accountId): Promise<MembershipRow | null> => {
      const found = await rows<{ organization_id: string; account_id: string; role: MembershipRow['role'] }>(
        sql`select organization_id, account_id, role from public.org_memberships
            where organization_id = ${organizationId}::uuid and account_id = ${accountId}::uuid`,
      );
      return found.length === 1
        ? { organizationId: String(found[0].organization_id), accountId: String(found[0].account_id), role: found[0].role }
        : null;
    },

    acknowledgments: async (accountId): Promise<AcknowledgmentRow[]> => {
      const found = await rows<{ kind: string; acknowledged_at: string | Date; ip: string | null; text_version: string }>(
        sql`select kind, acknowledged_at, ip::text as ip, text_version from public.acknowledgments
            where account_id = ${accountId}::uuid order by acknowledged_at`,
      );
      return found.map((row) => ({
        accountId,
        kind: row.kind,
        acknowledgedAt: new Date(row.acknowledged_at).toISOString(),
        ip: String(row.ip ?? ''),
        textVersion: row.text_version,
      }));
    },

    volunteerProfile: async (accountId): Promise<VolunteerProfileRow | null> => {
      const found = await rows<{
        github_handle: string;
        top_languages: string[];
        repository_count: number;
        contribution_summary: string;
        imported_at: string | Date;
      }>(
        sql`select github_handle, top_languages, repository_count, contribution_summary, imported_at
            from public.volunteer_profiles where account_id = ${accountId}::uuid`,
      );
      if (found.length !== 1) return null;
      return {
        accountId,
        githubHandle: found[0].github_handle,
        topLanguages: found[0].top_languages,
        repositoryCount: Number(found[0].repository_count),
        contributionSummary: found[0].contribution_summary,
        importedAt: new Date(found[0].imported_at).toISOString(),
      };
    },

    organizationsNamed: async (name): Promise<OrganizationRow[]> => {
      const found = await rows<{ id: string; name: string }>(sql`select id, name from public.organizations where name = ${name}`);
      return found.map((row) => ({ id: String(row.id), name: row.name }));
    },

    membershipsOf: async (accountId): Promise<MembershipRow[]> => {
      const found = await rows<{ organization_id: string; account_id: string; role: MembershipRow['role'] }>(
        sql`select organization_id, account_id, role from public.org_memberships where account_id = ${accountId}::uuid`,
      );
      return found.map((row) => ({
        organizationId: String(row.organization_id),
        accountId: String(row.account_id),
        role: row.role,
      }));
    },

    /**
     * THE SHIPPED SQL PREDICATE, called as the predicate rather than reproduced as a query.
     *
     * `_fixture.ts`'s own comment says what a loop-tier green over this does NOT establish: it
     * reaches the adapter's storage query, so `public.has_platform_acknowledgment` could return true
     * unconditionally and the loop tier would not notice. This call is what notices.
     */
    hasPlatformAcknowledgment: async (accountId) => {
      const found = await rows<{ held: boolean }>(
        sql`select public.has_platform_acknowledgment(${accountId}::uuid) as held`,
      );
      return found[0]?.held === true;
    },

    /**
     * THE PROVISIONED ADMINISTRATOR — the only legal way one exists, because the public path refuses
     * the type.
     *
     * TWO AUTHORITIES, AND THEY ARE DIFFERENT ONES. The auth user is created through
     * `POST /auth/v1/admin/users` with `email_confirm: true`, which is the recipe this repository
     * records and which sends no email. The `public.accounts` row is written as the OPERATOR, over
     * the database connection — NOT as the service role, which holds no INSERT on that table by
     * measurement and by decision (migration 20260808120000 grants it `select` only). Provisioning
     * is a narrower authority than the service role, not a wider one, and no running service holds
     * it.
     *
     * IT RETURNS A REAL SESSION, unlike registration: the administrator is created confirmed, so the
     * password grant works immediately and the handle this returns is one the live stack issued.
     */
    provisionPlatformAdmin: async (email, password): Promise<Session> => {
      const created = await fetch(`${api}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          apikey: slot.serviceRoleKey,
          Authorization: `Bearer ${slot.serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
      if (created.status >= 400) throw new Error(`provisioning a platform administrator answered ${created.status}`);
      const user = (await created.json()) as { id?: string };
      const accountId = String(user.id ?? '');
      if (!accountId) throw new Error('the admin user API answered 200 but named no user id');
      await sql`insert into public.accounts (id, account_type) values (${accountId}::uuid, 'platform_admin')`;

      const signedIn = await authPost('/auth/v1/token?grant_type=password', { email, password });
      const accessToken = String(signedIn.json.access_token ?? '');
      if (!accessToken) throw new Error('a provisioned platform administrator could not sign in');
      const sessionId = sessionIdOf(accessToken);
      sessions.set(sessionId, { accessToken, refreshToken: String(signedIn.json.refresh_token ?? '') });
      return { accountId, email, provider: 'email', sessionId };
    },

    /* ------------------------------- the members this adapter does NOT back are absent on purpose */
    //
    // They are not written here as throwing stubs, and that is structural rather than stylistic: the
    // harness's `pendingMethodProxy` supplies them, so the refusal text, the capability name and the
    // declaration shape all come from ONE place. A hand-written stub here would be a second copy of
    // a rule, which is how two copies come to disagree.
  } as AccountsSut;

  /**
   * A FIXTURE WORLD, against a database this run rebuilt from empty.
   *
   * There is nothing to tear down per world: `prepare()` resets the slot before the run, so a world
   * is a namespace for addresses rather than a container of state. The namespace still matters —
   * two ids that happened to register the same address would interfere in a way that looks exactly
   * like a product defect.
   */
  const world = async (name: string): Promise<World> => {
    const namespace = `${name.replace(/[^a-z0-9]+/gi, '-')}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      email: (local: string) => `${local}+${namespace}@example.test`,
      teardown: async () => undefined,
    };
  };

  return {
    sut: { accounts },
    fixtures: { world },
    teardown: async () => {
      await sql.close().catch(() => undefined);
    },
  };
}
