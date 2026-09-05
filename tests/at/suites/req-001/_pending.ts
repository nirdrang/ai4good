/**
 * THE IDS REQ-001 HAS NOT LANDED YET, and the leaf that will land each one. There are 14 of them
 * once the cross-organisation-denial leaf is in this tree. There were 16 before that, 24 before
 * the three earlier leaves, 28 before that, 30 before that and 33 before that, and the count
 * moves down as leaves land.
 *
 * WHY THEY EXIST AT ALL. `harness/check.ts`'s `bijectionProblems()` refuses a run when any expected
 * id has no registered call site, and `runner.ts` turns any such problem into exit 2 with NOTHING
 * graded. The expected set is every `AT-001.NN (P0)` in `.taskmaster/docs/acceptance/at-req-001.md`
 * — all 37 of them. So the moment `tests/at/suites/req-001/` exists, all 37 need executable call
 * sites; there is no partial suite. Twenty-three are written — AT-001.01 through .07 across the first
 * accounts leaf and the GitHub one, AT-001.09 and .10 with the verification leaf, AT-001.38, .12,
 * .13 and .14 with the session-and-reset one, AT-001.16, .36 and .37 with the per-organisation
 * roles one, AT-001.17 and .32 with the single-seat one, AT-001.19, .39 and .20 with the
 * acknowledgment-identity one, and AT-001.21 and .22 with the cross-organisation-denial one. The
 * other 14 are declared, not faked: each one throws, loudly, stamped with its own id and with the
 * manifest leaf that will make it real.
 *
 * THEY CANNOT SILENTLY GO GREEN. `AtPending` is a thrown error, so the id is RED, and
 * `tests/at/expected/req-001.json` declares that red by SHAPE — `expected.ts` rebuilds the anchored
 * prefix `AtPending: <id> PENDING [sut-missing] — ` from the declaration and compares it from
 * position 0. A red of any other cause fails the declaration instead of hiding inside it, and a red
 * that turns green fails it too, so a later leaf must update the ledger in the same change that
 * lands its id. That file is REQ-001's live progress ledger from this item onward.
 *
 * WHAT THE PREFIX DOES NOT CHECK, said plainly because it is the reason every leaf writes a ledger
 * of its own (`loop/items/AI4DEV-57/pending-ledger.txt`, then
 * `loop/items/AI4DEV-58/pending-ledger.txt`, then `loop/items/AI4DEV-59/pending-ledger.txt`, then
 * `loop/items/AI4DEV-60/pending-ledger.txt`, then `loop/items/AI4DEV-62/pending-ledger.txt`, then
 * `loop/items/AI4DEV-65/pending-ledger.txt`): the
 * tail after the em dash is FREE. `expected.ts`
 * anchors on the prefix only, so a stub whose detail read "todo" would pass every command in this
 * repository. Nothing mechanical holds the detail below to the truth. The check that does is a
 * written one — every leaf named here appears in `loop/decomp/req-001.md`, and the ledger is the
 * artifact a reviewer compares against the manifest.
 */

import { AtPending, type AtContext } from './_bind.ts';

/**
 * The manifest's leaves, in the manifest's own words shortened to a recall hint. The keys are the
 * deliverable-and-leaf labels from `loop/decomp/req-001.md`; the letters there are the MANIFEST's
 * deliverables and are not the plan's decision letters, which use the same alphabet for a different
 * purpose.
 */
export const LEAF = {
  // SIX LABELS ARE GONE FROM THIS MAP rather than kept for symmetry, and the rule is the same for
  // all six: a leaf label sitting here with nothing pointing at it is a claim that something is
  // still pending when nothing is. `tests/at/expected/req-001.json` declares the landed ids green
  // in the same change each time.
  //   D1.L2 — GitHub OAuth signup and the mandatory GitHub link — landed AT-001.02, .04 and .05.
  //   D2.L1 — email verification and the unverified-write gate on Discovery messages — landed
  //           AT-001.09 and .10, its only two ids.
  //   D2.L2 — session expiry and revocation, auto-refresh, password reset, wrong-password
  //           rejection — landed AT-001.38, .12, .13 and .14, its only four ids.
  //   D3.L1 — per-NGO admin/member roles and multi-NGO membership isolation — landed AT-001.16,
  //           .36 and .37, its only three ids.
  //   D3.L2 — the single-seat NGO and the single-dev project invariant — landed AT-001.17 and .32,
  //           its only two ids, so it is removed here by the item that rides beside D3.L1's.
  //   D4.L1 — acknowledgment identity capture, name, title and authority attestation — landed
  //           AT-001.19, .39 and .20, its only three ids.
  //   D5.L1 — cross-organisation denial with no existence oracle — landed AT-001.21 and .22, its
  //           only two ids.
  D3_L3: 'D3.L3 (the cross-surface single-seat integration)',
  D5_L2: 'D5.L2 (assigned-volunteer scope, platform-admin reach, logged-out visibility)',
  D6_L1: 'D6.L1 (contact transfer, lost-access recovery and the escalation contact)',
  D6_L2: 'D6.L2 (the lifecycle gate every write route registers through)',
  D6_L3: 'D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting)',
} as const;

export type LeafLabel = (typeof LEAF)[keyof typeof LEAF];

/**
 * One not-yet-landed id's whole body.
 *
 * `sut-missing` rather than `harness-missing` is the honest phase word: the harness is up — this
 * suite's written ids run against it — and what is absent is the system under test for these
 * criteria. The detail is what makes that word honest, by naming WHICH system under test.
 *
 * (The sentence above used to say "this suite's own four ids", which was true when four were
 * written and false from the next leaf onward. The count lives in this file's header and in the
 * ledger, and stating it a second time here only created somewhere for it to drift.)
 */
export function notLanded(leaf: LeafLabel): (ctx: AtContext) => Promise<void> {
  return async (ctx: AtContext): Promise<void> => {
    throw new AtPending(ctx.atId, 'sut-missing', `REQ-001 ${leaf} has not landed`);
  };
}
