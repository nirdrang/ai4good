/**
 * THE PER-ORGANISATION ROLE DECISION — the one rule that says whether this caller may perform an
 * admin-only action IN THIS ORGANISATION.
 *
 * It is a separate module from `./accounts.ts` because the two answer different questions about
 * different axes. `accounts.ts` judges the GLOBAL account type: one row per auth user, one type,
 * and `ngoOnlyActionAllowed` reads it. This module judges the PER-ORGANISATION role: one row per
 * (organisation, account) pair, and an account can hold `admin` in one organisation and `member` in
 * another at the same time. AT-001.36 is exactly that state, and its whole point is that "NGO
 * admin" names the admin role IN THAT NGO rather than a property of the account.
 *
 * IT IS UNDER THE SAME TWO CONSTRAINTS `accounts.ts` states, for the same two reasons:
 *   1. ZERO NON-RELATIVE IMPORTS AND NO DENO GLOBAL. It is compiled by `tests/at/tsconfig.json`,
 *      which is `strict` with `skipLibCheck: false` and no DOM library, and it is also run by Deno
 *      inside the edge runtime. The intersection is plain TypeScript over plain data.
 *   2. NO I/O, NO CLOCK, NO RANDOMNESS. The membership row is READ by the caller and handed here;
 *      this module never asks a database anything.
 *
 * THE ORGANISATION NAME RULE IS NOT HERE. `validateOrganizationName` lives in `./accounts.ts` and
 * the rename path imports it from there. A second copy of a rule is the defect this whole
 * arrangement exists to delete, and it does not get an exception for being three lines long.
 */

/* ------------------------------------------------------------------- the closed role vocabulary */

/**
 * The per-organisation roles, mirroring the `public.org_role` enum in the first migration.
 *
 * Two statements of one fact, and the database is the one that wins — the same posture
 * `ACCOUNT_TYPES` is under, and for the same reason: `public.update_organization` re-reads the row
 * itself rather than trusting the TypeScript above it.
 */
export const ORG_ROLES = ['admin', 'member'] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

/**
 * The role a membership row carries, or `null` when there is no such row — AND `null` IS THE
 * ANSWER FOR EVERY VALUE THIS FUNCTION DOES NOT RECOGNISE.
 *
 * WHY IT EXISTS AT ALL. The role arrives at the edge from a Data API read, as `unknown`, in a file
 * NO TYPE-CHECKER COVERS (`edge.ts` says so of itself). Narrowing it there would put the rule in
 * the one place nothing checks it; narrowing it here keeps it inside the strict acceptance program
 * and on the path the acceptance suite drives.
 *
 * IT FAILS CLOSED. An unknown string, a number, `undefined` and a missing row all answer `null`,
 * and `orgAdminActionAllowed(null)` refuses. There is no value that widens authority.
 */
export function parseOrgRole(raw: unknown): OrgRole | null {
  if (typeof raw !== 'string') return null;
  const candidate = raw.trim();
  return (ORG_ROLES as readonly string[]).includes(candidate) ? (candidate as OrgRole) : null;
}

/* ------------------------------------------------------------- the two refusals, kept distinct */

/**
 * WHY THERE ARE TWO REFUSAL KINDS AND NOT ONE BOOLEAN — this is the oracle's teeth.
 *
 * AT-001.16 and AT-001.36 both refuse an admin-only action, and they refuse it for DIFFERENT
 * reasons that the criteria distinguish:
 *
 *   * `not-a-member` — the caller holds no membership in the target organisation at all. AT-001.16's
 *     clause is that acting in NGO A never grants anything in NGO B, so the refusal that proves it
 *     must be the one that says "you are not in this organisation" rather than "your role here is
 *     too low". An implementation with ambient authority would produce no refusal here.
 *   * `not-an-admin` — the caller IS a member of the target organisation and holds `member`.
 *     AT-001.36's clause is that the same account succeeds in A and is rejected in B, on a REAL
 *     `member` row, so this refusal is the one that proves the role is per-organisation.
 *
 * Collapsed into one kind, an implementation that authorised from the caller's role in SOME
 * organisation would satisfy both tests. The kinds are what make the two criteria different tests.
 */
export type OrgAdminRefusalKind = 'not-a-member' | 'not-an-admin';

/**
 * A per-organisation decision, and its refusal carries BOTH a kind and a sentence.
 *
 * The kind is what a test and a caller branch on; the reason is what a person reads. `accounts.ts`'s
 * `Decision<T>` carries a reason only, which is right for the judgements there — every one of them
 * has a single refusal shape. Here the shape is the substance, so it is a field rather than a
 * sentence a caller would have to pattern-match.
 */
export type OrgAdminDecision =
  | { ok: true; role: 'admin' }
  | { ok: false; kind: OrgAdminRefusalKind; reason: string };

/**
 * AT-001.16 and AT-001.36, as one decision: an admin-only NGO-side action is permitted to the
 * `admin` OF THE TARGET ORGANISATION and to nobody else.
 *
 * THE ARGUMENT IS THE ROLE IN THE TARGET ORGANISATION, never the caller's role somewhere else and
 * never the caller's global account type. That is not a convention the caller has to remember: the
 * function takes one role and has nowhere to put a second, so an implementation that authorised
 * from the wrong organisation cannot express itself through this signature at all.
 */
export function orgAdminActionAllowed(role: OrgRole | null): OrgAdminDecision {
  if (role === 'admin') return { ok: true, role: 'admin' };
  if (role === 'member') {
    return {
      ok: false,
      kind: 'not-an-admin',
      reason:
        'this action is available to the admin of this organisation only — the caller holds the member role here, ' +
        'and a role is held per organisation, so admin standing in another organisation does not carry into this one',
    };
  }
  return {
    ok: false,
    kind: 'not-a-member',
    reason:
      'this action is available to members of this organisation only — the caller holds no membership in it, ' +
      'and membership is held per organisation, so acting in one organisation grants nothing in another',
  };
}
