/**
 * The ids REQ-001 has not landed yet, and the leaf that will land each one: there is one of them.
 *
 * WHY THEY EXIST AT ALL. `harness/check.ts`'s `bijectionProblems()` refuses a run when any expected
 * id has no registered call site, and `runner.ts` turns any such problem into exit 2 with NOTHING
 * graded. The expected set is every `AT-001.NN (P0)` in `.taskmaster/docs/acceptance/at-req-001.md`
 * — all 37 of them. So the moment `tests/at/suites/req-001/` exists, all 37 need executable call
 * sites; there is no partial suite. The one not yet written is declared, not faked: it throws,
 * loudly, stamped with its own id and with the manifest leaf that will make it real.
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
  D3_L3: 'D3.L3 (the cross-surface single-seat integration)',
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
