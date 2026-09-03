/**
 * REQ-001's LIVE adapter — the integration tier's system under test.
 *
 * READ THIS BEFORE TRUSTING A GREEN FROM THE INTEGRATION TIER, because what it claims is different
 * from what the loop tier claims, and neither is "REQ-001 works".
 *
 * `_fixture.ts` is storage: its judgements are the shipped modules' and its storage is a Map, so a
 * loop-tier green says the DECISIONS are right and says nothing about the migration, the deployed
 * functions, row-level security or Supabase Auth. This file is the other half. Every operation below
 * goes to the stack:
 *
 *   - Supabase Auth over HTTP, at the stack's gateway — signup, the password grant, logout,
 *     refresh, recovery, and the emailed links as the stack's mail catcher really holds them;
 *   - the DEPLOYED edge functions, served by the stack's own edge-runtime container out of this
 *     tree's `supabase/` — so `verify_jwt`, the platform's own token check, `resolveCaller` and the
 *     database function all sit on the path;
 *   - the database as the OPERATOR, over the connection string the runner validated, for the
 *     read-backs an assertion needs and for the two Givens no public path can reach.
 *
 * ============================================================================================
 * WHAT IS NOT BACKED, AND WHY
 * ============================================================================================
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
import { AT_CONFIG } from '../../harness/atconfig.ts';
import {
  authPost,
  followLink,
  functionPost,
  mailIdentification,
  sqlClient,
  verifyLinksFor,
  type Stack,
} from '../../harness/live-stack.ts';
import { CapabilityPending } from '../../harness/pending.ts';
import type {
  AccountRow,
  AccountsSut,
  AcknowledgmentRow,
  AssignVolunteerOutcome,
  CompleteSignupOutcome,
  CompleteSignupRequest,
  CreateOrganizationOutcome,
  GrantMembershipOutcome,
  MembershipRow,
  OrganizationRow,
  ProjectRow,
  RefreshSessionOutcome,
  RepointMembershipOutcome,
  Session,
  SignInOutcome,
  UpdateOrganizationOutcome,
  VolunteerProfileRow,
  World,
} from './_contract.ts';

/** THE SELF-DECLARATION the loader checks against the requirement it was asked for. */
export const requirement = 'req-001' as const;

/* ------------------------------------------------------------------------------ the plumbing */

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

/** `exp - iat`, in seconds: the lifetime the issuing Auth service is configured with, in its own words. */
function lifetimeOf(accessToken: string): number {
  const claims = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8')) as { exp?: unknown; iat?: unknown };
  return Number(claims.exp) - Number(claims.iat);
}

/**
 * THE RUNNING STACK MUST ISSUE THE LIFETIME THE TREE PINS, EXACTLY. Auth reads `[auth] jwt_expiry`
 * at container START, so a stack started before the config last changed issues tokens of the old
 * lifetime while the bodies wait out the pinned one: AT-001.12 then waits 135 seconds and reports
 * "an expired access token performed a write", and AT-001.13 reports "the client never rotated its
 * access token" — both blaming the product for a stale stack. `exp` and `iat` come from the same
 * token, so no clock enters the subtraction and there is nothing to tolerate: any number but the
 * pinned one is a stack started under another config. Null when they are the same number.
 */
export function lifetimeProblem(accessToken: string, pinned: number): string | null {
  const issued = lifetimeOf(accessToken);
  if (issued === pinned) return null;
  return (
    `the running stack issues ${issued}-second access tokens, but supabase/config.toml pins jwt_expiry = ${pinned} ` +
    `(the registry entry accessTokenLifetimeSeconds carries the same number). The stack was started before that ` +
    `config last changed: run \`bun run db:stop\` then \`bun run db:start\`, and run this tier again.`
  );
}

/**
 * WHAT A POSTGRES REFUSAL CARRIES — the SQLSTATE and the sentence, and WHERE THE SQLSTATE REALLY
 * LIVES WAS MEASURED RATHER THAN ASSUMED.
 *
 * The operator methods below drive SQL directly, so a refused write arrives as a thrown error rather
 * than as a status and a body. The obvious field is wrong on this client: `loop/items/AI4DEV-62`'s
 * verify-first probe, answer (d), dumped a real refusal's own properties on the slot stack and found
 *
 *   name `PostgresError`, code `ERR_POSTGRES_SERVER_ERROR`, **errno `42501`**, severity `ERROR`,
 *   where `PL/pgSQL function public.org_membership_grantee_must_be_ngo() line 24 at RAISE`
 *
 * — so `code` is the client's own error CLASS and `errno` is the SQLSTATE the migration raised. A
 * classification written against `code === '42501'` would have matched nothing, every refusal would
 * have fallen through to `refused`, and two acceptance criteria would have gone red for a reason
 * that had nothing to do with the product.
 *
 * SO EVERY CANDIDATE FIELD IS READ AND THE ONE THAT LOOKS LIKE A SQLSTATE WINS — five characters,
 * digits and capitals, which is the format's own shape. A client that reports it somewhere else
 * again simply yields no code, and the call sites below fall back on the sentence.
 */
function databaseRefusal(error: unknown): { code: string; message: string } {
  const carrier = error as Record<string, unknown> | null;
  let code = '';
  for (const field of ['errno', 'errcode', 'code'] as const) {
    const value = carrier?.[field];
    if (typeof value === 'string' && /^[0-9A-Z]{5}$/.test(value)) {
      code = value;
      break;
    }
  }
  const message = typeof carrier?.message === 'string' ? carrier.message : String(error);
  return { code, message };
}

/* -------------------------------------------------------------------------------- the factory */

export async function createLiveAdapter(opts: { stack: Stack }): Promise<{
  sut: { accounts: AccountsSut };
  fixtures: { world(name: string): Promise<World> };
  teardown(): Promise<void>;
}> {
  const { stack } = opts;
  const api = stack.apiUrl.replace(/\/$/, '');
  await mailIdentification(stack);
  const sql = sqlClient(stack);

  const sessions = new Map<string, LiveSession>();

  /**
   * `lifetimeProblem`, asked once, on the first access token this adapter obtains, and refused with
   * the true cause. The runner cannot read a token without a sign-in, which is why the check lives
   * here rather than in `prepareLocalStack`.
   */
  let lifetimeChecked = false;
  const checkLifetime = (accessToken: string): void => {
    if (lifetimeChecked) return;
    const problem = lifetimeProblem(accessToken, AT_CONFIG.accessTokenLifetimeSeconds.value);
    if (problem) throw new Error(problem);
    lifetimeChecked = true;
  };

  const rows = async <T>(query: Promise<unknown>): Promise<T[]> => (await query) as T[];

  const accounts: AccountsSut = {
    /* ------------------------------------------------- Supabase Auth, over the stack's own gateway */

    registerWithEmailPassword: async (email, password) => {
      const { status, json } = await authPost(stack, '/auth/v1/signup', { email, password });
      if (status >= 400) throw new Error(`the live signup for a fresh address answered ${status}`);
      // NO SESSION IS MINTED HERE. See this file's header: with confirmations on the live stack
      // issues none, and a fabricated handle would let a body act as a user that cannot act.
      const accountId = String((json.id as string | undefined) ?? (json.user as { id?: string } | undefined)?.id ?? '');
      if (!accountId) throw new Error('the live signup answered 200 but named no user id');
      return { accountId, email, provider: 'email', sessionId: '' };
    },

    signInWithEmailPassword: async (email, password) => {
      const { status, json } = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
      if (status >= 400) {
        // ONE REASON FOR BOTH BRANCHES, which is the shape `_contract.ts` requires: an answer that
        // differed would tell an anonymous caller which addresses hold accounts.
        return { ok: false, reason: String(json.msg ?? json.error_description ?? 'sign-in was refused') };
      }
      const accessToken = String(json.access_token ?? '');
      const refreshToken = String(json.refresh_token ?? '');
      if (!accessToken) return { ok: false, reason: 'sign-in answered 200 with no access token' };
      checkLifetime(accessToken);
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
      // THE HANDLE MUST NAME A SESSION THIS PROCESS REALLY OBTAINED — R-D3's divergence handle. A
      // registration under confirmations holds none, and it is refused BY NAME here rather than
      // reaching the write below. That write is operator-level SQL and carries no token, so the
      // VALIDATION is the point and the returned tokens are deliberately unused. Same posture as
      // the sim fixture and as this method's own doc in `_contract.ts`.
      tokensOf(sessions, session, 'link a GitHub identity');
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
        headers: { apikey: stack.anonKey, Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (response.status >= 400) throw new Error(`the live logout answered ${response.status}`);
    },

    refreshSession: async (session): Promise<RefreshSessionOutcome> => {
      const tokens = tokensOf(sessions, session, 'refresh a session');
      // NO CREDENTIALS IN THIS CALL, which is the whole content of AT-001.13's mechanism: a refresh
      // token, and no password anywhere.
      const { status, json } = await authPost(stack, '/auth/v1/token?grant_type=refresh_token', { refresh_token: tokens.refreshToken });
      if (status >= 400) return { ok: false, reason: String(json.msg ?? 'the refresh was refused') };
      const accessToken = String(json.access_token ?? '');
      if (!accessToken) return { ok: false, reason: 'the refresh answered 200 with no access token' };
      checkLifetime(accessToken);
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
      await authPost(stack, '/auth/v1/recover', { email });
      return { ok: true };
    },

    emailedPasswordResetLink: async (email) => (await verifyLinksFor(stack, email, 'recovery'))[0] ?? null,

    completePasswordReset: async (link, newPassword) => {
      // THE FLOW SHAPE IS MEASURED RATHER THAN REMEMBERED. AI4DEV-60's proof found the implicit
      // fragment on this CLI version and recorded that a PKCE code appears on others; following the
      // link and reading what comes back is what keeps this working across either.
      const { location } = await followLink(link);
      const fragment = location.includes('#') ? location.slice(location.indexOf('#') + 1) : '';
      const accessToken = new URLSearchParams(fragment).get('access_token') ?? '';
      if (!accessToken) return { ok: false };
      const update = await fetch(`${api}/auth/v1/user`, {
        method: 'PUT',
        headers: { apikey: stack.anonKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
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
      const found = await rows<{ email_confirmed_at: string | Date | null; email: string }>(
        sql`select email, email_confirmed_at from auth.users where id = ${accountId}::uuid`,
      );
      if (found.length !== 1) return false;
      // THE ROW IS RENDERED AS GoTrue RENDERS IT, and the rendering is the load-bearing part rather
      // than a formality. The driver hands back a `timestamptz` as a Date OBJECT, and the shipped
      // extractor's only verified answer is a non-blank STRING — deliberately, because it judges a
      // JSON body that crossed a network. Handing it the Date made `emailVerified` answer false for
      // a confirmed account, so AT-001.09 reported "using the emailed link did not flip the account
      // to verified" while GoTrue had confirmed it. The other reads here already convert
      // (`acknowledgments`, `volunteerProfile`); this one did not.
      const confirmedAt = found[0].email_confirmed_at;
      return emailVerifiedFromUser({
        id: accountId,
        email: found[0].email,
        email_confirmed_at: confirmedAt === null ? null : new Date(confirmedAt).toISOString(),
      });
    },

    emailedVerificationLink: async (email) => (await verifyLinksFor(stack, email, 'signup'))[0] ?? null,

    useVerificationLink: async (link) => {
      const { status } = await followLink(link);
      // GoTrue answers a 303 to the site URL for a token it issued AND for one it never issued — the
      // tampered probe in AI4DEV-59's proof measured that. So the STATUS is not the oracle; the
      // column is, and the body that cares reads `emailVerified` afterwards.
      return { ok: status < 400 };
    },

    /* ------------------------------------------------ the DEPLOYED functions, over the stack's kong */

    completeSignup: async (session, request: CompleteSignupRequest, ip): Promise<CompleteSignupOutcome> => {
      const tokens = tokensOf(sessions, session, 'call the deployed complete-signup');
      const { status, json } = await functionPost(stack, 'complete-signup', request, tokens.accessToken, ip);
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
      const tokens = tokensOf(sessions, session, 'call the deployed create-organization');
      const { status, json } = await functionPost(stack, 'create-organization', { name: organizationName }, tokens.accessToken, '203.0.113.7');
      if (status >= 400 || json.ok === false) {
        return { ok: false, reason: String(json.reason ?? json.msg ?? `the deployed create-organization answered ${status}`) };
      }
      return { ok: true, organizationId: String(json.organizationId ?? '') };
    },

    /**
     * THE DEPLOYED `update-organization`, called exactly as a browser client would.
     *
     * THE `kind` IS READ OFF THE WIRE AND VALIDATED AGAINST THE THREE THE FUNCTION CAN SEND. An
     * unrecognised value becomes `refused` rather than being trusted, which is the direction that
     * matters: AT-001.16 asserts the not-a-member kind and AT-001.36 the not-an-admin one, so a
     * gateway error page or a future field rename must not be able to arrive wearing either label.
     */
    updateOrganization: async (session, organizationId, name): Promise<UpdateOrganizationOutcome> => {
      const tokens = tokensOf(sessions, session, 'call the deployed update-organization');
      const { status, json } = await functionPost(stack, 'update-organization', { organizationId, name }, tokens.accessToken, '203.0.113.7');
      if (status < 400 && json.ok !== false) {
        return {
          ok: true,
          organizationId: String(json.organizationId ?? organizationId),
          name: String(json.name ?? ''),
        };
      }
      const reason = String(json.reason ?? json.msg ?? `the deployed update-organization answered ${status}`);
      const kind = json.kind;
      const known = kind === 'not-a-member' || kind === 'not-an-admin' || kind === 'invalid-name';
      return { ok: false, kind: known ? kind : 'refused', reason };
    },

    /* ------------------------------- the operator's surface, over SQL, as the operator ---------- */

    /**
     * AN ORGANISATION WITH NO MEMBERSHIP ROW — one insert, and the absence of the second insert is
     * the whole content of this method.
     *
     * Both product paths write the organisation AND its admin membership inside one definer
     * function, so neither can produce this state. See `_contract.ts` for why the Given AT-001.16
     * and AT-001.36 need is unreachable without it.
     */
    createOrganizationAsOperator: async (name): Promise<OrganizationRow> => {
      const created = await rows<{ id: string; name: string }>(
        sql`insert into public.organizations (name) values (${name}) returning id, name`,
      );
      if (created.length !== 1) throw new Error(`the operator insert of organisation ${JSON.stringify(name)} returned no row`);
      return { id: String(created[0].id), name: created[0].name };
    },

    /**
     * THE OPERATOR'S DIRECT MEMBERSHIP GRANT — a plain insert, with the database's own refusals
     * classified rather than swallowed.
     *
     * WHY THIS PATH IS THE ONE AT-001.37 NEEDS: it carries no edge function, no shared module and no
     * TypeScript at all. "Any path attempts to grant it a per-NGO role" is a claim about paths
     * nobody has written yet, and the only object that can hold on all of them is the trigger this
     * leaf's migration lands. This method is how a test reaches that trigger directly.
     *
     * THE CLASSIFICATION IS SENTENCE-PRIMARY, WITH THE SQLSTATE AS AGREEMENT (gate-2 ruling R3).
     * The sentence must match, AND the SQLSTATE must either be absent or be the one this leaf's
     * migration raises — `42501` for the trigger refusing a non-NGO grantee, `23505` for the
     * one-seat unique index refusing a second membership row, both measured on the slot stack
     * (verify-first answer (d)). A SQLSTATE alone no longer mints a meaningful kind: an unrelated
     * `42501` from some future policy, or an unrelated unique violation, would otherwise arrive
     * wearing a label two acceptance criteria read as their refusal. A client that reports no
     * SQLSTATE still classifies on the sentence; anything else is `refused`, never a meaningful kind.
     */
    grantMembershipAsOperator: async (organizationId, accountId, role): Promise<GrantMembershipOutcome> => {
      try {
        const inserted = await rows<{ organization_id: string; account_id: string; role: MembershipRow['role'] }>(
          sql`insert into public.org_memberships (org_id, account_id, role)
              values (${organizationId}::uuid, ${accountId}::uuid, ${role}::public.org_role)
              returning org_id as organization_id, account_id, role`,
        );
        if (inserted.length !== 1) throw new Error('the operator membership insert returned no row');
        return {
          ok: true,
          membership: {
            organizationId: String(inserted[0].organization_id),
            accountId: String(inserted[0].account_id),
            role: inserted[0].role,
          },
        };
      } catch (error) {
        const { code, message } = databaseRefusal(error);
        if (/NGO accounts only/i.test(message) && (code === '' || code === '42501')) {
          return { ok: false, kind: 'not-an-ngo-account', reason: message };
        }
        // THE INDEX'S OWN NAME, not the generic `duplicate key value` half it used to carry: an
        // unrelated unique violation on this statement must land in `refused` rather than in the kind
        // AT-001.17 reads as its structural refusal.
        if (/org_memberships_one_seat_per_org_idx/i.test(message) && (code === '' || code === '23505')) {
          return { ok: false, kind: 'org-already-seated', reason: message };
        }
        return { ok: false, kind: 'refused', reason: message };
      }
    },

    /**
     * THE SAME GRANT REACHED IN TWO STATEMENTS — one update, aimed at the organisation's single
     * membership row, with the trigger's UPDATE half as the only thing that can refuse it.
     *
     * WHY IT IS A SEPARATE PATH: re-pointing changes no row COUNT, so the one-seat unique index
     * never sees this write. The migration's own prose names the attack — a row inserted for an NGO
     * account and then re-pointed at a volunteer — and gate-2 ruling R5 added this method because no
     * test drove the binding that stops it.
     *
     * THE UPDATE IS AIMED BY ORGANISATION AND RETURNS THE ROW, so an update that matched nothing is
     * `refused` with its own reason rather than reading as a silent success. The classification is
     * sentence-primary with the SQLSTATE as agreement, the same rule the grant above follows
     * (gate-2 ruling R3); a new account that never completed signup meets the trigger's OTHER branch
     * — SQLSTATE `23503`, its own sentence — and lands in `refused`, which is the fixture's answer
     * for it too.
     */
    repointMembershipAsOperator: async (organizationId, accountId): Promise<RepointMembershipOutcome> => {
      try {
        const updated = await rows<{ organization_id: string; account_id: string; role: MembershipRow['role'] }>(
          sql`update public.org_memberships set account_id = ${accountId}::uuid
               where org_id = ${organizationId}::uuid
           returning org_id as organization_id, account_id, role`,
        );
        if (updated.length !== 1) {
          return { ok: false, kind: 'refused', reason: `no membership row exists in organisation ${organizationId} to re-point` };
        }
        return {
          ok: true,
          membership: {
            organizationId: String(updated[0].organization_id),
            accountId: String(updated[0].account_id),
            role: updated[0].role,
          },
        };
      } catch (error) {
        const { code, message } = databaseRefusal(error);
        if (/NGO accounts only/i.test(message) && (code === '' || code === '42501')) {
          return { ok: false, kind: 'not-an-ngo-account', reason: message };
        }
        return { ok: false, kind: 'refused', reason: message };
      }
    },

    /**
     * A PROJECT, PROVISIONED BY THE OPERATOR — one insert, with its seat free.
     *
     * There is no product project-creation path in this repository at either tier, so this is the
     * only way AT-001.32's Given is reached. `public.projects` reaches no Data API role at all
     * (measured after reset — verify-first answer (f): zero catalog rows for `anon`, `authenticated`
     * and `service_role`), so this is a direct database write and could not be anything else.
     */
    createProjectAsOperator: async (organizationId, name): Promise<ProjectRow> => {
      const created = await rows<{ id: string; org_id: string; name: string; assigned_volunteer_id: string | null }>(
        sql`insert into public.projects (org_id, name) values (${organizationId}::uuid, ${name})
            returning id, org_id, name, assigned_volunteer_id`,
      );
      if (created.length !== 1) throw new Error(`the operator insert of project ${JSON.stringify(name)} returned no row`);
      return {
        id: String(created[0].id),
        organizationId: String(created[0].org_id),
        name: created[0].name,
        assignedVolunteerId: created[0].assigned_volunteer_id === null ? null : String(created[0].assigned_volunteer_id),
      };
    },

    /**
     * ATTACH A VOLUNTEER, AS THE OPERATOR — and the guard trigger's refusal is classified rather
     * than swallowed.
     *
     * The sentence and the SQLSTATE were measured on the slot stack (verify-first answer (d)):
     * `projects refuses a second volunteer on project …: its single developer seat is held by
     * account …`, SQLSTATE `42501`. The same probe recorded that releasing the seat to null is
     * ALLOWED and that the seat still held the FIRST volunteer after the refusal — both of which the
     * loop fixture mirrors.
     *
     * THE UPDATE IS AIMED BY PRIMARY KEY AND RETURNS THE ROW, so an update that matched nothing is
     * `refused` with its own reason rather than reading as a silent success.
     */
    assignVolunteerAsOperator: async (projectId, accountId): Promise<AssignVolunteerOutcome> => {
      try {
        const updated = await rows<{ id: string; org_id: string; name: string; assigned_volunteer_id: string | null }>(
          sql`update public.projects set assigned_volunteer_id = ${accountId}::uuid
               where id = ${projectId}::uuid
           returning id, org_id, name, assigned_volunteer_id`,
        );
        if (updated.length !== 1) return { ok: false, kind: 'refused', reason: `no project ${projectId} exists` };
        return {
          ok: true,
          project: {
            id: String(updated[0].id),
            organizationId: String(updated[0].org_id),
            name: updated[0].name,
            assignedVolunteerId: updated[0].assigned_volunteer_id === null ? null : String(updated[0].assigned_volunteer_id),
          },
        };
      } catch (error) {
        const { code, message } = databaseRefusal(error);
        // SENTENCE-PRIMARY, SQLSTATE AS AGREEMENT — gate-2 ruling R3, the same rule the membership
        // grant above follows and for the same reason.
        if (/single developer seat/i.test(message) && (code === '' || code === '42501')) {
          return { ok: false, kind: 'seat-occupied', reason: message };
        }
        return { ok: false, kind: 'refused', reason: message };
      }
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

    // THE COLUMN IS `org_id`, not `organization_id` — the migration's own name, and the reason this
    // read used to throw `column "organization_id" does not exist` on every id that asserts a
    // membership. The CONTRACT's field is `organizationId`, so the two are aliased here rather than
    // renamed anywhere: one name in the database, one name in the contract, and this is the seam.
    membership: async (organizationId, accountId): Promise<MembershipRow | null> => {
      const found = await rows<{ organization_id: string; account_id: string; role: MembershipRow['role'] }>(
        sql`select org_id as organization_id, account_id, role from public.org_memberships
            where org_id = ${organizationId}::uuid and account_id = ${accountId}::uuid`,
      );
      return found.length === 1
        ? { organizationId: String(found[0].organization_id), accountId: String(found[0].account_id), role: found[0].role }
        : null;
    },

    projectAssignment: async (projectId): Promise<ProjectRow | null> => {
      const found = await rows<{ id: string; org_id: string; name: string; assigned_volunteer_id: string | null }>(
        sql`select id, org_id, name, assigned_volunteer_id from public.projects where id = ${projectId}::uuid`,
      );
      if (found.length !== 1) return null;
      return {
        id: String(found[0].id),
        organizationId: String(found[0].org_id),
        name: found[0].name,
        assignedVolunteerId: found[0].assigned_volunteer_id === null ? null : String(found[0].assigned_volunteer_id),
      };
    },

    acknowledgments: async (accountId): Promise<AcknowledgmentRow[]> => {
      const found = await rows<{
        kind: string;
        acknowledged_at: string | Date;
        ip: string | null;
        text_version: string;
        signer_name: string;
        signer_title: string;
        authority_attestation: string;
      }>(
        sql`select kind, acknowledged_at, ip::text as ip, text_version,
                   signer_name, signer_title, authority_attestation
              from public.acknowledgments
             where account_id = ${accountId}::uuid order by acknowledged_at`,
      );
      return found.map((row) => ({
        accountId,
        kind: row.kind,
        acknowledgedAt: new Date(row.acknowledged_at).toISOString(),
        ip: String(row.ip ?? ''),
        textVersion: row.text_version,
        // AT-001.19's three, read back as the operator. They are `not null` in the schema, so a
        // missing value is not a case this read has to model — it is a case the write refused.
        signerName: row.signer_name,
        signerTitle: row.signer_title,
        authorityAttestation: row.authority_attestation,
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
        sql`select org_id as organization_id, account_id, role from public.org_memberships where account_id = ${accountId}::uuid`,
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
          apikey: stack.serviceRoleKey,
          Authorization: `Bearer ${stack.serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
      if (created.status >= 400) throw new Error(`provisioning a platform administrator answered ${created.status}`);
      const user = (await created.json()) as { id?: string };
      const accountId = String(user.id ?? '');
      if (!accountId) throw new Error('the admin user API answered 200 but named no user id');
      await sql`insert into public.accounts (id, account_type) values (${accountId}::uuid, 'platform_admin')`;

      const signedIn = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
      const accessToken = String(signedIn.json.access_token ?? '');
      if (!accessToken) throw new Error('a provisioned platform administrator could not sign in');
      checkLifetime(accessToken);
      const sessionId = sessionIdOf(accessToken);
      sessions.set(sessionId, { accessToken, refreshToken: String(signedIn.json.refresh_token ?? '') });
      return { accountId, email, provider: 'email', sessionId };
    },

    // Written out because the integration manifest names each one, and `AccountsSut` makes an
    // omitted method a compile error.
    registerWithProvider: () => { throw new CapabilityPending(['sut.accounts.registerWithProvider']); },
    registerWithGithub: () => { throw new CapabilityPending(['sut.accounts.registerWithGithub']); },
    signInWithProvider: () => { throw new CapabilityPending(['sut.accounts.signInWithProvider']); },
    sendDiscoveryMessage: () => { throw new CapabilityPending(['sut.accounts.sendDiscoveryMessage']); },
    discoveryMessagesBy: () => { throw new CapabilityPending(['sut.accounts.discoveryMessagesBy']); },
    publicSignupAccountTypes: () => { throw new CapabilityPending(['sut.accounts.publicSignupAccountTypes']); },
  };

  /**
   * A FIXTURE WORLD, against a database this run rebuilt from empty.
   *
   * There is nothing to tear down per world: `prepareLocalStack()` resets the stack before the run, so a world
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
