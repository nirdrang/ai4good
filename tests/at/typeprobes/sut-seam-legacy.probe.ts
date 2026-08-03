/**
 * THE DEFECT AI4DEV-31 CLOSES, WRITTEN IN THE API THAT ALLOWED IT — and kept for ever.
 *
 * Every statement below is an attack in the form a suite could write on the PRE-FIX tree, where
 * `bindSuite<Sut, W>` and `defineEvidenceCapture<T, Sut, W>` took the suite's OWN type arguments and
 * `open()` relabelled the harness's `unknown` sut and its `WorldSeam` world with them. Nothing
 * checked that the adapter supplied either shape, so all four attacks below compiled clean and read
 * members that do not exist at run time.
 *
 * THAT IS WHY THIS FILE IS HERE RATHER THAN IN THE COMMIT MESSAGE. At the pre-fix commit it compiles
 * with EXIT 0 under its own config (`tsconfig.sut-seam-legacy.json`), and that transcript — the hole
 * executed rather than described — is `loop/items/AI4DEV-31/proof-red.txt`. After the fix the same
 * file, compiled by the same command, must FAIL. A claim of "it fails now" without a recorded "it
 * passed before" is not evidence, and this item is entirely about evidence.
 *
 * It is compiled ALONE, by a child config listing only this file, for two reasons the whole-program
 * probe cannot serve: `typeprobes/tsconfig.json` is expected to fail as a whole, so its exit code
 * can never isolate one attack; and `harness-invention.probe.ts`'s `declare module` blocks are
 * program-wide, so anything sharing a program with them inherits diagnostics that have nothing to do
 * with this seam.
 *
 * `type-invention.selftest.ts` asserts each attack below by name, per file, so a regression names
 * itself instead of hiding inside a combined exit code.
 */

import { defineEvidenceCapture, bindSuite } from '../harness/registry.ts';
import type { NotificationsSut, World } from '../suites/req-016/_contract.ts';

/**
 * A world shape the REQ-016 adapter does not produce. It satisfies `W extends WorldLike` because it
 * carries `teardown()` — the constraint only ever asked for that much, so ANY superset passed.
 */
type FabricatedWorld = {
  teardown(): Promise<void>;
  inventedByTheSuite: string;
};

/* ------------------------------------------- ATTACK A: fabricate the SUT through bindSuite */

/**
 * The suite declares a system under test with a method the adapter never exposes, and reads it off
 * `open().sut`. `openWorld()` really produced `unknown` here (`h.sut[key]` on a concrete `AtHarness`)
 * and the cast at the end of `open()` relabelled it with whatever the suite asked for.
 */
export const fabricatedSutViaBindSuite = bindSuite<{ notThere(): Promise<void> }, World>({
  sut: 'notifications',
});

fabricatedSutViaBindSuite('AT-016.90', 'reads a sut member no adapter supplies', async ({ open }) => {
  const { sut } = await open();
  await sut.notThere();
});

/* ----------------------------------------- ATTACK B: fabricate the world through bindSuite */

/**
 * The same lie on the other axis. `h.fixtures.world()` really produced `WorldSeam` — teardown and
 * nothing else — and the suite's `W` renamed it, so a member the fixture world never defines was
 * readable with a green type-check.
 */
export const fabricatedWorldViaBindSuite = bindSuite<NotificationsSut, FabricatedWorld>({
  sut: 'notifications',
});

fabricatedWorldViaBindSuite('AT-016.91', 'reads a world member no fixture supplies', async ({ open }) => {
  const { w } = await open();
  void w.inventedByTheSuite.length;
});

/* ------------------------------- ATTACK C: the same two, through the evidence-capture door */

/**
 * `bindSuite` was never the only entrance. `defineEvidenceCapture<T, Sut, W>` handed its producer a
 * full `AtContext<Sut, W>`, so a suite that never called `bindSuite` at all could declare both
 * shapes and read them green — the identical defect, one import further along.
 */
export const fabricatedThroughEvidenceCapture = defineEvidenceCapture<
  string,
  { notThere(): Promise<string> },
  FabricatedWorld
>('a capture that invents both axes', async ({ open }) => {
  const { sut, w } = await open();
  return `${await sut.notThere()}${w.inventedByTheSuite}`;
});
