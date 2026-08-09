/**
 * THE LOCAL PROOF for AI4DEV-58 — the only evidence in this item about the real migration, the real
 * edge function and the real Supabase Auth.
 *
 *   bun loop/items/AI4DEV-58/proof-local.ts
 *
 * Preconditions, and the script refuses rather than guesses if any is missing:
 *   1. `bun run db:start` — the stack is up.
 *   2. `bun run db:reset` — this migration has been replayed. Run it immediately before this script:
 *      the checks below assert row counts, and a clean database makes them mean what they say.
 *   3. `bunx supabase functions serve` — running in another terminal, FROM THIS WORKTREE, WITHOUT
 *      --no-verify-jwt. The directory matters and is not pedantry: the edge runtime container mounts
 *      whichever project directory launched it, and this machine was found serving a worktree that
 *      had since been deleted. A stale mount answers preflights perfectly while running somebody
 *      else's code.
 *
 * IT LIVES IN THE ITEM RECORD AND NOT IN `tests/`, DELIBERATELY, for the reason the predecessor's
 * copy of this file gives: it is evidence-gathering. It runs once, on one machine, by hand, and its
 * transcript is the artifact. Under `tests/` it would look like something that guards the tree, and
 * it guards nothing — nothing runs it again and CI has no database.
 *
 * WHAT THE LOOP-TIER SUITE ALREADY PROVES, so this does not duplicate it: that the shipped decisions
 * in `_shared/accounts.ts` and `_shared/github.ts` behave as the acceptance criteria require. What
 * NOTHING BUT THIS SCRIPT touches: that the migration is correct, that the edge function works, that
 * the database's own backstops fire against a caller who never went through TypeScript, that the
 * constraints refuse the semantically-empty forms, and that Auth is configured.
 *
 * NO KEY IS WRITTEN INTO THIS FILE AND NONE IS PRINTED BY IT. Everything is read from
 * `bunx supabase status -o json` at run time and never echoed — not in a note, not in a failure
 * path, not in a precondition message. GitHub push protection has already refused one push in this
 * item for a transcript that captured that command verbatim, so the redaction is designed in rather
 * than applied afterwards.
 */

import { SQL } from 'bun';
// THE SHIPPED STUB, IMPORTED RATHER THAN MIRRORED. Check (b) compares the row the real database
// holds against the real module's judgement for that handle, so "the profile is populated" is a
// statement about the values the edge function actually computed and not about "something non-empty
// is there".
import { stubGithubStatsFor } from '../../../supabase/functions/_shared/github.ts';

/* ------------------------------------------------------------------------ reporting machinery */

type Outcome = 'pass' | 'fail' | 'skip';
type Check = { id: string; title: string; outcome: Outcome; note: string };

const results: Check[] = [];

function record(id: string, title: string, passed: boolean, note: string): void {
  results.push({ id, title, outcome: passed ? 'pass' : 'fail', note });
  console.log(`${passed ? 'PASS' : 'FAIL'}  (${id}) ${title}\n        ${note}`);
}

/**
 * A check that could not be attempted. Never a pass and never a failure — a skip says the evidence
 * is MISSING, which is a different statement from the claim being false, and both differ from the
 * claim being proved.
 */
function skip(id: string, title: string, why: string): void {
  results.push({ id, title, outcome: 'skip', note: `SKIPPED — ${why}` });
  console.log(`SKIP  (${id}) ${title}\n        ${why}`);
}

function fail(message: string): never {
  console.error(`\nPRECONDITION FAILED: ${message}`);
  process.exit(2);
}

/* --------------------------------------------------------------------------- the environment */

const status = await (async () => {
  const proc = Bun.spawnSync(['bunx', 'supabase', 'status', '-o', 'json'], { stdout: 'pipe', stderr: 'pipe' });
  const text = new TextDecoder().decode(proc.stdout);
  const start = text.indexOf('{');
  // The raw text is NOT included in this message, deliberately: it is the whole status payload and it
  // carries key material. A failure here says what to do, not what it read.
  if (start < 0) fail('could not read `supabase status -o json` — is the stack up? (bun run db:start)');
  return JSON.parse(text.slice(start)) as Record<string, string>;
})();

const API_URL = status.API_URL ?? fail('supabase status reported no API_URL');
const DB_URL = status.DB_URL ?? fail('supabase status reported no DB_URL');
/** The browser's key. Everything a signed-out or signed-in visitor could do uses this and no other. */
const PUBLIC_KEY = status.ANON_KEY ?? status.PUBLISHABLE_KEY ?? fail('supabase status reported no client key');
/** The server's key. Used ONLY where the check is about what a server-side caller may do. */
const SECRET_KEY = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY ?? fail('supabase status reported no service key');

const sql = new SQL(DB_URL);

const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const PASSWORD = 'correct horse battery staple';
const CLIENT_IP = '203.0.113.7';
/** Unique per run, so a second run against a database that was not reset still reads honestly. */
const RUN = Date.now().toString(36);
const address = (local: string) => `${local}+${RUN}@example.test`;

/* --------------------------------------------------------------------------------- Auth calls */

type AuthSession = { accessToken: string; userId: string };

async function signUp(email: string): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: PUBLIC_KEY },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = (await response.json()) as { access_token?: string; user?: { id?: string }; msg?: string; error_description?: string };
  if (!response.ok || !body.access_token || !body.user?.id) {
    fail(`sign-up for ${email} failed (${response.status}): ${body.msg ?? body.error_description ?? '<no message>'}`);
  }
  return { accessToken: body.access_token, userId: body.user.id };
}

/**
 * THE POST-LINK AUTH STATE, FABRICATED BY OPERATOR AUTHORITY — and this is the one place where the
 * proof stands in for something it cannot perform.
 *
 * Linking a GitHub identity is an OAuth consent round trip: a human at github.com, an OAuth app that
 * does not exist for this project, and a redirect no script can drive. What linking LEAVES BEHIND is
 * a row in `auth.identities`, and that row is what every piece of code in this item reads. So the
 * row is written directly, as the operator, and the checks that follow are then honest about exactly
 * what they prove: the state AFTER a link behaves correctly. The handshake itself is proved by
 * nothing in this item and no green here may be read as proving it.
 *
 * THE FIVE NOT-NULL COLUMNS WERE MEASURED FIRST, not assumed — `id`, `user_id`, `provider`,
 * `provider_id`, `identity_data` — and the measurement is in this item's `migration-replay.txt`.
 * `identity_data.user_name` is GoTrue's field for the GitHub login, which is what
 * `extractGithubHandle` and `public.complete_signup`'s backstop both read.
 *
 * AND THE SCHEMA'S NOT-NULL SET TURNED OUT NOT TO BE ENOUGH — a measured correction to the note this
 * item's earlier sitting left behind, worth writing down because it fails in a thoroughly misleading
 * way. `created_at`, `updated_at` and `last_sign_in_at` are NULLABLE in the table, so a row without
 * them inserts happily; but GoTrue reads identities into a Go struct with non-pointer timestamps, so
 * `GET /auth/v1/user` then answers **500** for that user. `resolveCaller` correctly reads a non-OK
 * answer as "no caller", the edge function correctly answers **401 authenticate before completing
 * signup**, and the whole thing looks exactly like an expired token rather than like a malformed row
 * three layers away. Measured directly — the same token returned 200 before the insert, 500 after
 * it, and 200 again the moment the three timestamps were filled. So they are filled here.
 */
async function fabricateGithubIdentity(userId: string, handle: string): Promise<void> {
  await sql`
    insert into auth.identities (id, user_id, provider, provider_id, identity_data,
                                 created_at, updated_at, last_sign_in_at)
    values (
      gen_random_uuid(),
      ${userId}::uuid,
      'github',
      ${`gh-${handle}-${RUN}`},
      -- The casts are explicit because jsonb_build_object takes "any", so PostgreSQL has nothing to
      -- infer a parameter's type from and refuses the statement outright rather than guessing.
      jsonb_build_object('sub', ${userId}::text, 'user_name', ${handle}::text, 'provider_id', ${`gh-${handle}-${RUN}`}::text),
      now(), now(), now()
    )`;
}

/* ------------------------------------------------------------------------ the edge function */

type FunctionResponse = { status: number; body: { ok?: boolean; reason?: string; accountId?: string } };

async function callFunction(name: string, session: AuthSession, body: unknown): Promise<FunctionResponse> {
  const response = await fetch(`${API_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: PUBLIC_KEY,
      Authorization: `Bearer ${session.accessToken}`,
      'x-forwarded-for': CLIENT_IP,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as Record<string, never> };
}

/**
 * `public.complete_signup` called DIRECTLY, with the service role, through PostgREST — the caller
 * that never went through the edge function at all, and therefore never met a line of TypeScript.
 * Every backstop check below uses this, because a backstop tested through the front door is not a
 * backstop.
 */
async function serviceRpc(args: Record<string, unknown>): Promise<{ status: number; text: string }> {
  const response = await fetch(`${API_URL}/rest/v1/rpc/complete_signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}` },
    body: JSON.stringify(args),
  });
  return { status: response.status, text: await response.text() };
}

/** What must be absent after any refusal: the account, its profile, its acknowledgment. */
async function rowsFor(userId: string): Promise<{ accounts: number; profiles: number; acknowledgments: number }> {
  return {
    accounts: (await sql`select 1 from public.accounts where id = ${userId}`).length,
    profiles: (await sql`select 1 from public.volunteer_profiles where account_id = ${userId}`).length,
    acknowledgments: (await sql`select 1 from public.acknowledgments where account_id = ${userId}`).length,
  };
}

/* =============================================================================================
 * (a) A VOLUNTEER COMPLETION WITH NO LINKED GITHUB IDENTITY IS REFUSED BY THE DEPLOYED FUNCTION,
 *     and leaves nothing behind.
 *
 * This is AT-001.04's first half against the real thing. The refusal must also STATE the
 * requirement — a 400 saying "invalid request" would satisfy a weaker reading of the criterion and
 * would tell a volunteer nothing about what to do next.
 * ============================================================================================= */

const VOLUNTEER_HANDLE = 'octocat';
const volunteerEmail = address('volunteer');
const volunteer = await signUp(volunteerEmail);

const blocked = await callFunction('complete-signup', volunteer, {
  accountType: 'volunteer',
  acknowledgmentTextVersion: TEXT_VERSION,
});
const afterBlocked = await rowsFor(volunteer.userId);
const acknowledgedWhileBlocked = (
  await sql`select public.has_platform_acknowledgment(${volunteer.userId}) as held`
)[0].held as boolean;

record(
  'a',
  'the deployed complete-signup refuses a volunteer with no linked GitHub identity, states the link requirement, and writes nothing',
  blocked.status >= 400 &&
    blocked.body.ok !== true &&
    /linked GitHub account/i.test(blocked.body.reason ?? '') &&
    afterBlocked.accounts === 0 &&
    afterBlocked.profiles === 0 &&
    afterBlocked.acknowledgments === 0 &&
    acknowledgedWhileBlocked === false,
  `HTTP ${blocked.status} ${JSON.stringify(blocked.body)} · rows left behind ${JSON.stringify(afterBlocked)} · has_platform_acknowledgment=${acknowledgedWhileBlocked}`,
);

/* =============================================================================================
 * (b) AFTER THE LINK, THE SAME COMPLETION SUCCEEDS AND THE PROFILE LANDS POPULATED.
 *
 * The SAME user and the SAME request body as (a) — that pairing is the criterion. AT-001.04 reads
 * "completion is blocked with the GitHub-link requirement stated; linking completes signup", and
 * changing anything else between the two calls would leave the link unproven as the cause.
 *
 * The pre-completion negative is asserted too (gate-1 ruling F1): after the link and BEFORE the
 * completion there is no profile row, so the population is CAUSED by completion and nothing sits
 * queued.
 *
 * THE VALUES ARE ASSERTED AGAINST THE SHIPPED STUB, not merely against non-emptiness. A row of
 * plausible-looking rubbish would pass "populated"; only equality with `stubGithubStatsFor` shows
 * the numbers travelled from the edge function into the transaction unchanged.
 * ============================================================================================= */

await fabricateGithubIdentity(volunteer.userId, VOLUNTEER_HANDLE);
const profileBeforeCompletion = (await sql`select 1 from public.volunteer_profiles where account_id = ${volunteer.userId}`).length;

const completed = await callFunction('complete-signup', volunteer, {
  accountType: 'volunteer',
  acknowledgmentTextVersion: TEXT_VERSION,
});
const profileRows = await sql`
  select github_handle, top_languages, repository_count, contribution_summary, imported_at
    from public.volunteer_profiles where account_id = ${volunteer.userId}`;
const accountRows = await sql`select account_type from public.accounts where id = ${volunteer.userId}`;
const expected = stubGithubStatsFor(VOLUNTEER_HANDLE);
const profile = profileRows[0] as
  | { github_handle: string; top_languages: string[]; repository_count: number; contribution_summary: string; imported_at: Date }
  | undefined;

record(
  'b',
  'with the GitHub identity linked, the SAME completion succeeds and writes a profile carrying the handle and the shipped stub\'s exact statistics',
  completed.status === 200 &&
    completed.body.ok === true &&
    profileBeforeCompletion === 0 &&
    accountRows.length === 1 &&
    accountRows[0].account_type === 'volunteer' &&
    profileRows.length === 1 &&
    profile?.github_handle === VOLUNTEER_HANDLE &&
    JSON.stringify(profile?.top_languages) === JSON.stringify(expected.topLanguages) &&
    Number(profile?.repository_count) === expected.repositoryCount &&
    profile?.contribution_summary === expected.contributionSummary &&
    profile?.imported_at !== null,
  `HTTP ${completed.status} ${JSON.stringify(completed.body)} · profile rows BEFORE completion: ${profileBeforeCompletion}` +
    ` · account=${JSON.stringify(accountRows)} · stored profile=${JSON.stringify(profileRows)}` +
    ` · the shipped stub's judgement for "${VOLUNTEER_HANDLE}"=${JSON.stringify(expected)}`,
);

/* =============================================================================================
 * (c) THE GATE DOES NOT LEAK ONTO NGOs, and the database refuses github parameters on an NGO.
 *
 * Two halves of one claim. An NGO completes with no GitHub identity anywhere near it — the control
 * without which (a) would only prove that completions are broken. And the mirror of the
 * organisation-name rule holds at the database: github parameters on an NGO completion are a
 * disagreement between caller and server about what is being created, and they raise rather than
 * being silently dropped.
 * ============================================================================================= */

const ngoEmail = address('ngo');
const ngo = await signUp(ngoEmail);
const ngoCompletion = await callFunction('complete-signup', ngo, {
  accountType: 'ngo',
  organizationName: 'Riverside Shelter',
  acknowledgmentTextVersion: TEXT_VERSION,
});
const ngoRows = await sql`
  select a.account_type, o.name, m.role
    from public.accounts a
    left join public.org_memberships m on m.account_id = a.id
    left join public.organizations o on o.id = m.org_id
   where a.id = ${ngo.userId}`;
const ngoProfiles = (await sql`select 1 from public.volunteer_profiles where account_id = ${ngo.userId}`).length;

const ngoWithGithub = await signUp(address('ngo-with-github'));
const ngoGithubCall = await serviceRpc({
  p_account_id: ngoWithGithub.userId,
  p_account_type: 'ngo',
  p_organization_name: 'Should Not Exist',
  p_acknowledgment_text_version: TEXT_VERSION,
  p_ip: CLIENT_IP,
  p_github_handle: VOLUNTEER_HANDLE,
  p_github_top_languages: ['TypeScript'],
  p_github_repository_count: 3,
  p_github_contribution_summary: 'a summary',
});
const ngoGithubRows = await rowsFor(ngoWithGithub.userId);

record(
  'c',
  'an NGO completes with no GitHub identity at all, and the database refuses GitHub import parameters on an NGO completion',
  ngoCompletion.status === 200 &&
    ngoCompletion.body.ok === true &&
    ngoRows.length === 1 &&
    ngoRows[0].account_type === 'ngo' &&
    ngoRows[0].name === 'Riverside Shelter' &&
    ngoRows[0].role === 'admin' &&
    ngoProfiles === 0 &&
    ngoGithubCall.status >= 400 &&
    /GitHub link and its onboarding import belong to volunteer signup/i.test(ngoGithubCall.text) &&
    ngoGithubRows.accounts === 0,
  `ngo completion HTTP ${ngoCompletion.status} ${JSON.stringify(ngoCompletion.body)} · rows=${JSON.stringify(ngoRows)} · volunteer profiles for the NGO: ${ngoProfiles}` +
    ` · github-params-on-an-NGO direct rpc: HTTP ${ngoGithubCall.status} ${ngoGithubCall.text} · rows left behind ${JSON.stringify(ngoGithubRows)}`,
);

/* =============================================================================================
 * (d) THE DEFENCE IN DEPTH — the database refusing a caller that bypassed the edge function
 *     entirely.
 *
 * `service_role` holds EXECUTE on `public.complete_signup`, so a server-side caller reaches it with
 * every TypeScript decision skipped. Four negatives, each isolating one clause:
 *
 *   d-1  a volunteer with github parameters and NO `auth.identities` row      → the identity backstop
 *   d-2  a linked volunteer whose stats parameters are null                    → the populated rule
 *   d-3  a linked volunteer whose languages are `[]`                           → gate-1 ruling F2's
 *                                                                                empirical check: the
 *                                                                                one input the
 *                                                                                `array_length` form
 *                                                                                would have let through
 *   d-4  a linked volunteer whose `p_github_handle` is a DIFFERENT handle      → gate-1 ruling F4: the
 *        from the one the identity carries, with non-empty stats                 binding, not mere
 *                                                                                existence
 *
 * d-4 is the one no test driving the edge function could ever reach: that path derives the handle
 * from the same identity it checks, so the two can never disagree there.
 * ============================================================================================= */

const noIdentity = await signUp(address('no-identity'));
const d1 = await serviceRpc({
  p_account_id: noIdentity.userId,
  p_account_type: 'volunteer',
  p_organization_name: null,
  p_acknowledgment_text_version: TEXT_VERSION,
  p_ip: CLIENT_IP,
  p_github_handle: VOLUNTEER_HANDLE,
  p_github_top_languages: ['TypeScript'],
  p_github_repository_count: 3,
  p_github_contribution_summary: 'a summary',
});
const d1Rows = await rowsFor(noIdentity.userId);

const nullStats = await signUp(address('null-stats'));
await fabricateGithubIdentity(nullStats.userId, 'nullstats');
const d2 = await serviceRpc({
  p_account_id: nullStats.userId,
  p_account_type: 'volunteer',
  p_organization_name: null,
  p_acknowledgment_text_version: TEXT_VERSION,
  p_ip: CLIENT_IP,
  p_github_handle: 'nullstats',
  p_github_top_languages: null,
  p_github_repository_count: null,
  p_github_contribution_summary: null,
});
const d2Rows = await rowsFor(nullStats.userId);

const emptyArray = await signUp(address('empty-array'));
await fabricateGithubIdentity(emptyArray.userId, 'emptyarray');
const d3 = await serviceRpc({
  p_account_id: emptyArray.userId,
  p_account_type: 'volunteer',
  p_organization_name: null,
  p_acknowledgment_text_version: TEXT_VERSION,
  p_ip: CLIENT_IP,
  p_github_handle: 'emptyarray',
  p_github_top_languages: [],
  p_github_repository_count: 3,
  p_github_contribution_summary: 'a summary',
});
const d3Rows = await rowsFor(emptyArray.userId);

const mismatched = await signUp(address('mismatched-handle'));
await fabricateGithubIdentity(mismatched.userId, 'the-real-handle');
const d4 = await serviceRpc({
  p_account_id: mismatched.userId,
  p_account_type: 'volunteer',
  p_organization_name: null,
  p_acknowledgment_text_version: TEXT_VERSION,
  p_ip: CLIENT_IP,
  p_github_handle: 'a-handle-this-account-never-linked',
  p_github_top_languages: ['TypeScript'],
  p_github_repository_count: 3,
  p_github_contribution_summary: 'a summary',
});
const d4Rows = await rowsFor(mismatched.userId);

record(
  'd',
  'the database refuses a service-role caller four ways: no linked identity, null stats, an empty language array, and a handle the account never linked',
  d1.status >= 400 && /no GitHub identity with handle/i.test(d1.text) && d1Rows.accounts === 0 &&
    d2.status >= 400 && /top languages are missing or empty/i.test(d2.text) && d2Rows.accounts === 0 &&
    d3.status >= 400 && /top languages are missing or empty/i.test(d3.text) && d3Rows.accounts === 0 &&
    d4.status >= 400 && /no GitHub identity with handle/i.test(d4.text) && d4Rows.accounts === 0,
  `d-1 no identity: HTTP ${d1.status} ${d1.text} rows=${JSON.stringify(d1Rows)}\n        ` +
    `d-2 null stats: HTTP ${d2.status} ${d2.text} rows=${JSON.stringify(d2Rows)}\n        ` +
    `d-3 empty '{}' languages: HTTP ${d3.status} ${d3.text} rows=${JSON.stringify(d3Rows)}\n        ` +
    `d-4 mismatched handle: HTTP ${d4.status} ${d4.text} rows=${JSON.stringify(d4Rows)}`,
);

/* =============================================================================================
 * (d2) THE SEMANTICALLY-EMPTY FORMS ARE REFUSED — gate-2 rulings R1 and R6.
 *
 * The gap these close: `cardinality(ARRAY[NULL])` is 1 and `cardinality(ARRAY[''])` is 1, so slot
 * counting accepted a language list with no language in it; and `btrim`'s default character set is
 * the SPACE CHARACTER ONLY, so a tab-only handle or summary survived trimming and compared unequal
 * to the empty string. The migration's own comment claimed these forms "cannot be stored at all, by
 * any caller, through any path" while all three could be.
 *
 * BOTH LOCATIONS ARE EXERCISED, because the fix has two halves and a green over one of them proves
 * half a claim:
 *   * THROUGH THE FUNCTION, as a linked volunteer, so a caller gets a STATED REASON — a tab-only
 *     summary, and a language array of `[null]`.
 *   * AS OPERATOR, direct INSERTs into `public.volunteer_profiles`, so the refusal is the table's own
 *     and no code path can route around it. Each must be refused BY THE NAMED CONSTRAINT: "something
 *     failed" would not distinguish a working CHECK from a typo in the insert.
 * ============================================================================================= */

const TAB_ONLY_SUMMARY = '\t\t';
const blankSummaryUser = await signUp(address('tab-summary'));
await fabricateGithubIdentity(blankSummaryUser.userId, 'tabsummary');
const tabSummary = await serviceRpc({
  p_account_id: blankSummaryUser.userId,
  p_account_type: 'volunteer',
  p_organization_name: null,
  p_acknowledgment_text_version: TEXT_VERSION,
  p_ip: CLIENT_IP,
  p_github_handle: 'tabsummary',
  p_github_top_languages: ['TypeScript'],
  p_github_repository_count: 3,
  p_github_contribution_summary: TAB_ONLY_SUMMARY,
});
const tabSummaryRows = await rowsFor(blankSummaryUser.userId);

const nullElementUser = await signUp(address('null-element'));
await fabricateGithubIdentity(nullElementUser.userId, 'nullelement');
const nullElement = await serviceRpc({
  p_account_id: nullElementUser.userId,
  p_account_type: 'volunteer',
  p_organization_name: null,
  p_acknowledgment_text_version: TEXT_VERSION,
  p_ip: CLIENT_IP,
  p_github_handle: 'nullelement',
  p_github_top_languages: [null],
  p_github_repository_count: 3,
  p_github_contribution_summary: 'a summary',
});
const nullElementRows = await rowsFor(nullElementUser.userId);

// An account the operator inserts directly, so the direct profile INSERTs below have a legal foreign
// key to point at and are refused by the CHECK they are testing rather than by the reference.
const constraintTarget = await signUp(address('constraint-target'));
await sql`insert into public.accounts (id, account_type) values (${constraintTarget.userId}::uuid, 'volunteer')`;

// The tab is written as `chr(9)` rather than as an escape, because these statements are built in
// JavaScript template literals — where `\s` is not an escape and the backslash is silently dropped.
// That exact mistake produced a confidently wrong measurement earlier in this item's capture work.
const operatorCases: { label: string; expected: string; values: string }[] = [
  {
    label: "ARRAY[NULL]::text[] languages",
    expected: 'volunteer_profiles_top_languages_present',
    values: `array[null]::text[], 3, 'a summary'`,
  },
  {
    label: "ARRAY[''] languages",
    expected: 'volunteer_profiles_top_languages_present',
    values: `array['']::text[], 3, 'a summary'`,
  },
  {
    label: "ARRAY['  '] languages",
    expected: 'volunteer_profiles_top_languages_present',
    values: `array['  ']::text[], 3, 'a summary'`,
  },
  {
    label: 'a tab-only contribution summary',
    expected: 'volunteer_profiles_contribution_summary_present',
    values: `array['TypeScript']::text[], 3, chr(9) || chr(9)`,
  },
];

const operatorOutcomes: string[] = [];
let everyOperatorCaseRefused = true;
for (const testCase of operatorCases) {
  let raised = '';
  try {
    await sql.unsafe(
      `insert into public.volunteer_profiles (account_id, github_handle, top_languages, repository_count, contribution_summary)
       values ('${constraintTarget.userId}'::uuid, 'octocat', ${testCase.values})`,
    );
  } catch (error) {
    raised = error instanceof Error ? error.message : String(error);
  }
  const refusedByTheRightConstraint = raised.includes(testCase.expected);
  everyOperatorCaseRefused &&= refusedByTheRightConstraint;
  operatorOutcomes.push(`${testCase.label} → ${raised || '<NOT REFUSED — the row was accepted>'}`);
}

// The tab-only HANDLE case is separate only because the handle sits in a different column position.
let tabHandleRaised = '';
try {
  await sql.unsafe(
    `insert into public.volunteer_profiles (account_id, github_handle, top_languages, repository_count, contribution_summary)
     values ('${constraintTarget.userId}'::uuid, chr(9) || chr(9), array['TypeScript']::text[], 3, 'a summary')`,
  );
} catch (error) {
  tabHandleRaised = error instanceof Error ? error.message : String(error);
}
const tabHandleRefused = tabHandleRaised.includes('volunteer_profiles_github_handle_present');
const nothingLandedForTheTarget = (
  await sql`select 1 from public.volunteer_profiles where account_id = ${constraintTarget.userId}`
).length;

record(
  'd2',
  'the semantically-empty forms are refused — through the function with a stated reason, and by the table\'s named constraints against the operator',
  tabSummary.status >= 400 &&
    /contribution summary is missing, empty or whitespace-only/i.test(tabSummary.text) &&
    tabSummaryRows.accounts === 0 &&
    nullElement.status >= 400 &&
    /null or blank entry/i.test(nullElement.text) &&
    nullElementRows.accounts === 0 &&
    everyOperatorCaseRefused &&
    tabHandleRefused &&
    nothingLandedForTheTarget === 0,
  `through the function — tab-only summary: HTTP ${tabSummary.status} ${tabSummary.text} rows=${JSON.stringify(tabSummaryRows)}\n        ` +
    `through the function — [null] languages: HTTP ${nullElement.status} ${nullElement.text} rows=${JSON.stringify(nullElementRows)}\n        ` +
    operatorOutcomes.map((line) => `as operator — ${line}`).join('\n        ') +
    `\n        as operator — a tab-only handle → ${tabHandleRaised || '<NOT REFUSED — the row was accepted>'}` +
    `\n        profile rows left for the probe account: ${nothingLandedForTheTarget}`,
);

/* =============================================================================================
 * (d3) THE DEPLOYMENT BRIDGE HOLDS — gate-2 ruling R4.
 *
 * The migration DROPS the five-argument `complete_signup` and creates a nine-argument one. Source
 * co-location is not deployment atomicity: the database plane and the edge-function plane roll
 * separately, so an edge function that has not been redeployed will still be sending the ORIGINAL
 * FIVE named arguments while the new schema is live.
 *
 * The four new parameters carry `default null`, so that call must still resolve. THIS IS THE HALF OF
 * THE STAGING MATRIX THAT IS REAL TODAY — the other half (new caller, old schema) has no deployable
 * artifact to stage, because no hosted deployment of this system exists. What is proved here is that
 * NGO signup survives a mixed-plane window in the migration-first order.
 * ============================================================================================= */

const bridgeUser = await signUp(address('bridge-five-args'));
const bridge = await serviceRpc({
  p_account_id: bridgeUser.userId,
  p_account_type: 'ngo',
  p_organization_name: 'Old Caller Shelter',
  p_acknowledgment_text_version: TEXT_VERSION,
  p_ip: CLIENT_IP,
});
const bridgeRows = await sql`
  select a.account_type, o.name, m.role
    from public.accounts a
    left join public.org_memberships m on m.account_id = a.id
    left join public.organizations o on o.id = m.org_id
   where a.id = ${bridgeUser.userId}`;
const bridgeAcknowledgments = (await sql`select 1 from public.acknowledgments where account_id = ${bridgeUser.userId}`).length;

record(
  'd3',
  'an old-shape caller passing ONLY the original five named arguments still resolves against the migrated function, and completes an NGO signup',
  bridge.status >= 200 &&
    bridge.status < 300 &&
    bridgeRows.length === 1 &&
    bridgeRows[0].account_type === 'ngo' &&
    bridgeRows[0].name === 'Old Caller Shelter' &&
    bridgeRows[0].role === 'admin' &&
    bridgeAcknowledgments === 1,
  `HTTP ${bridge.status} ${bridge.text} · rows=${JSON.stringify(bridgeRows)} · acknowledgments=${bridgeAcknowledgments}`,
);

/* =============================================================================================
 * (e) ATOMICITY IS DEMONSTRATED, NOT ASSERTED — and the volunteer profile is part of what must
 *     disappear.
 *
 * `complete_signup` is forced to fail on its LAST write, after the account and the profile have both
 * been inserted. The lever is the non-empty CHECK on `acknowledgments.text_version`: an empty version
 * passes every argument check the function makes, so the account lands, the profile lands, and then
 * the acknowledgment insert violates the constraint. A failure at the FIRST write would prove nothing
 * — there would be nothing to roll back.
 *
 * This is what makes AT-001.05's "a queued-but-empty import fails this test" structural rather than
 * conventional: there is no moment at which a volunteer account exists without its profile.
 * ============================================================================================= */

const atomicity = await signUp(address('atomicity'));
await fabricateGithubIdentity(atomicity.userId, 'atomicity');
let atomicityRaised = '';
try {
  await sql`
    select public.complete_signup(
      ${atomicity.userId}::uuid, 'volunteer', null, '', ${CLIENT_IP}::inet,
      'atomicity', array['TypeScript']::text[], 7, 'a summary'
    )`;
} catch (error) {
  atomicityRaised = error instanceof Error ? error.message : String(error);
}
const leftBehind = await rowsFor(atomicity.userId);

record(
  'e',
  'a volunteer completion that fails on its LAST write leaves no account, no profile and no acknowledgment',
  atomicityRaised !== '' &&
    leftBehind.accounts === 0 &&
    leftBehind.profiles === 0 &&
    leftBehind.acknowledgments === 0,
  `the database raised: ${atomicityRaised || '<nothing — the failure was not induced, so this proves nothing>'} · rows left behind: ${JSON.stringify(leftBehind)}`,
);

/* =============================================================================================
 * (f) AUTH REPORTS THE GITHUB PROVIDER ENABLED.
 *
 * What this proves: the `[auth.external.github]` block is well-formed, the stack starts with it, and
 * Auth advertises the provider. What it does NOT prove: any handshake. Unset `env(...)` values pass
 * through as literal strings without stopping the stack, so a provider can report enabled with no
 * real credential behind it at all — which is exactly this machine's situation.
 * ============================================================================================= */

const settings = (await (await fetch(`${API_URL}/auth/v1/settings`, { headers: { apikey: PUBLIC_KEY } })).json()) as {
  external?: Record<string, boolean>;
};
record(
  'f',
  'Auth reports the GitHub provider enabled, Google still enabled, and apple untouched',
  settings.external?.github === true && settings.external?.google === true && settings.external?.apple === false,
  `external.github=${String(settings.external?.github)} external.google=${String(settings.external?.google)} external.apple=${String(settings.external?.apple)}` +
    ' — this is configuration well-formedness and provider advertisement, NOT a handshake',
);

/* =============================================================================================
 * (f2) THE HANDSHAKE WIRING — and ONLY if a REAL credential is in the environment.
 *
 * THREE STATES, NOT TWO, exactly as the predecessor item's Google check settled it. The local Auth
 * server builds its authorize URL out of whatever is configured WITHOUT EVER CONTACTING GITHUB, so a
 * placeholder would appear in the redirect, match itself, and pass — a proof of nothing wearing the
 * costume of the one proof this item cannot otherwise get.
 *
 *   absent      → SKIP. The expected case: creating the OAuth app is a founder-manual step.
 *   placeholder → SKIP, said in those words.
 *   credential  → the check is performed.
 *
 * THE RULE TELLING THEM APART is weaker for GitHub than it was for Google, and that is stated rather
 * than papered over. Every Google client id ends in `.apps.googleusercontent.com`; GitHub's OAuth
 * client ids have NO such suffix — they are opaque strings, historically 20 hex characters and more
 * recently `Iv1.`/`Iv23li` prefixed for GitHub Apps. So the shape test below can only reject the
 * obviously-not-a-credential; a well-formed invented value would pass it. It is not asked to
 * establish validity, only to stop a placeholder being counted as evidence.
 * ============================================================================================= */

const configuredClientId = process.env.SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID?.trim();
const looksLikeARealClientId =
  configuredClientId !== undefined &&
  (/^[0-9a-f]{20}$/i.test(configuredClientId) || /^Iv1\./.test(configuredClientId) || /^Iv23li/.test(configuredClientId));

if (!configuredClientId) {
  skip(
    'f2',
    'the configured GitHub client id reaches the provider handshake',
    'SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID is ABSENT from the environment this stack was started with. Creating the GitHub OAuth app is a founder-manual step, so this is the EXPECTED case and not a failure — the same posture the predecessor item took for Google. (f) above still holds: the block is well-formed and Auth reports GitHub enabled. This check stays unperformed rather than being faked.',
  );
} else if (!looksLikeARealClientId) {
  skip(
    'f2',
    'the configured GitHub client id reaches the provider handshake',
    `SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID is set to a value that does not have the shape of any GitHub OAuth client id (20 hex characters, or an "Iv1."/"Iv23li" prefix), so it is treated as a PLACEHOLDER. The local Auth server would put it in its authorize URL without ever contacting GitHub, so performing the check would compare the placeholder with itself and report a pass. It is skipped instead. The value itself is not printed here.`,
  );
} else {
  const authorize = await fetch(`${API_URL}/auth/v1/authorize?provider=github`, {
    redirect: 'manual',
    headers: { apikey: PUBLIC_KEY },
  });
  const location = authorize.headers.get('location') ?? '';
  let carriesClientId = false;
  let carriesCallback = false;
  let host = '';
  try {
    const target = new URL(location);
    host = target.host;
    carriesClientId = target.searchParams.get('client_id') === configuredClientId;
    carriesCallback = target.searchParams.get('redirect_uri') === 'http://127.0.0.1:54321/auth/v1/callback';
  } catch {
    // A Location that is not a URL is a failure, reported by the assertion below.
  }
  record(
    'f2',
    'the configured GitHub client id reaches the provider handshake, with the local callback',
    authorize.status >= 300 && authorize.status < 400 && /github\.com$/.test(host) && carriesClientId && carriesCallback,
    `HTTP ${authorize.status} · redirect host ${host || '<unparseable>'} · client_id matches the configured value: ${carriesClientId} · redirect_uri is the local Auth callback: ${carriesCallback}`,
  );
}

/* ----------------------------------------------------------------------------------- verdict */

await sql.end();

const passed = results.filter((check) => check.outcome === 'pass');
const failed = results.filter((check) => check.outcome === 'fail');
const skipped = results.filter((check) => check.outcome === 'skip');

console.log(`\n${results.length} checks · ${passed.length} passed · ${failed.length} failed · ${skipped.length} skipped`);
if (skipped.length) console.log(`SKIPPED: ${skipped.map((check) => `(${check.id})`).join(' ')}`);
if (failed.length) {
  console.log(`FAILED: ${failed.map((check) => `(${check.id})`).join(' ')}`);
  process.exit(1);
}
if (skipped.length) {
  // NOT `ALL CHECKS PASSED`, deliberately: a verdict that says "all passed" over a check nobody
  // performed is the false certificate this wording exists to prevent.
  console.log(`EVERY CHECK THAT RAN PASSED — ${skipped.length} DID NOT RUN, so this run does not certify them`);
  process.exit(0);
}
console.log('ALL CHECKS PASSED');
