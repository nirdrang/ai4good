/**
 * THE CRASH SWITCH both bindings read immediately before the one write that can crash.
 *
 * The core never sees it. A fault is an adapter that misbehaves, so the switch is the adapter's,
 * and the two bindings differ only in what a reach looks like from where they stand. In memory the
 * binding IS the code path, so the reach it counts is the only witness there can be. Over the stack
 * the product records the reach itself, on a sequence the rollback cannot undo, and the binding
 * separately records the refusal it received on the wire; the count is refused when those two
 * disagree, because a count only one side can vouch for is a count the other side never confirmed.
 *
 * So each arming opens a LEDGER of the binding's choosing, the binding writes its witnesses into it
 * at the moment of the reach, and the binding supplies the judgement that turns a ledger into a
 * trigger count. Arming itself writes nothing into the ledger: `tests/at/harness/guards.ts` says
 * why a handle that counted "armed" as "fired" would green every atomicity test in the tree.
 */

import type { ArmedFault, FaultKind } from '../../harness/faults.ts';

export type CrashSwitch<Ledger> = {
  /** the live arming's ledger, or null when nothing is armed */
  armed(): Ledger | null;
  arm(kind: FaultKind): ArmedFault;
};

export function createCrashSwitch<Ledger>(
  point: string,
  openLedger: () => Ledger,
  triggerCount: (ledger: Ledger) => number,
): CrashSwitch<Ledger> {
  let live: Ledger | null = null;
  return {
    armed: () => live,
    arm: (kind) => {
      // A point that silently accepted a kind it does not implement would arm nothing while
      // reporting a trigger, and the atomicity oracle would read the result as proof.
      if (kind !== 'crash') {
        throw new Error(`fault point ${JSON.stringify(point)} implements no ${JSON.stringify(kind)} fault. It implements: crash`);
      }
      const ledger = openLedger();
      live = ledger;
      return {
        triggerCount: () => triggerCount(ledger),
        disarm: () => {
          if (live === ledger) live = null;
        },
      };
    },
  };
}
