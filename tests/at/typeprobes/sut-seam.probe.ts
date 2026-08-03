/**
 * NEGATIVE TEST — every statement below MUST fail to compile.
 *
 * The attacks that are only MEANINGFUL after AI4DEV-31. `sut-seam-legacy.probe.ts` next door holds
 * the pre-fix API and proves the hole was real; this file holds the new API and proves each way
 * back in is shut. They are separate files because one file cannot serve both halves: the
 * read-a-missing-member attacks need fabricated type arguments to compile BEFORE the fix, and after
 * it those arguments fail earlier, so the read is never reached and its diagnostic never appears.
 *
 * `harness/type-invention.selftest.ts` compiles this file under its own config and asserts each
 * attack BY NAME, so removing any single protection fails a test that says which one — never a
 * combined exit code that could be satisfied by an unrelated error.
 *
 * None of these needs `any` and none needs a suppression, which is exactly why grepping for those
 * is not protection and this file is.
 */

import { atTest, bindSuite, defineEvidenceCapture, EvidenceCapture } from '../harness/registry.ts';
import type { AtContext } from '../harness/registry.ts';
import type { NotificationsSut, World } from '../suites/req-016/_contract.ts';

const suite = bindSuite({ requirement: 'req-016', sut: 'notifications' });

/* ------------------------------------ ATTACK 1: read a sut member the adapter does not declare */

/**
 * The suite no longer names its system under test, so it cannot fabricate one wholesale. This is
 * the residue: reading a member off the DERIVED type that the adapter never declared. It is the
 * honest-mistake shape — a suite drifting from an implementation that moved — and it must be red.
 */
suite.atTest('AT-016.92', 'reads a sut member the adapter never declared', async ({ open }) => {
  const { sut } = await open();
  await sut.notThere();
});

/* --------------------------------- ATTACK 2: read a world member the adapter does not supply */

suite.atTest('AT-016.93', 'reads a world member the fixture never supplies', async ({ open }) => {
  const { w } = await open();
  void w.inventedByTheSuite;
});

/* ------------------------------------------- ATTACK 3: name a sut key the adapter does not have */

/**
 * `sut: 'notificatoins'` used to compile and fail three runs later as a run-time `sut-missing`,
 * which reads exactly like an unimplemented requirement. `K extends SutKeyOf<R>` makes it a
 * compile error that names the legal key set.
 */
export const misspelledSutKey = bindSuite({ requirement: 'req-016', sut: 'notificatoins' });

/* ------------------------------------ ATTACK 4: bind a requirement with no registered adapter */

/**
 * Without the registry the requirement was a free string and any value "worked". A suite whose line
 * is missing from `suite-adapters.ts` must not be able to bind at all — otherwise the types would
 * be derived from nothing while the loader still resolved a path.
 */
export const unregisteredRequirement = bindSuite({ requirement: 'req-999', sut: 'notifications' });

/* ------------------------------- ATTACK 5: re-widen the seam by annotating the body parameter */

/**
 * Gate 1's finding, and the subtlest one here: leave `bindSuite` alone and widen the type at the
 * BODY instead, with an intersection carrying an OPTIONAL member. An optional member is what makes
 * this dangerous — the derived type still satisfies the annotation, so nothing goes red at the
 * producer, and the body reads `undefined` at run time believing it read data.
 *
 * It was MEASURED still compiling clean once every other door here was shut, which is what forced
 * the exported seam types to be parameterized by requirement and sut key instead of by shape. No
 * structural defence exists: a type and that type intersected with an optional member are
 * assignable in both directions, so nothing can tell them apart. Only being unable to WRITE the
 * widened type stops it.
 */
suite.atTest(
  'AT-016.94',
  'widens the context with an intersection at the body parameter',
  async (ctx: AtContext<NotificationsSut & { invented?: string }, World>) => {
    const { sut } = await ctx.open();
    void sut.invented;
  },
);

/* ------------------------- ATTACK 6: reach the seam through the raw evidence-capture entry point */

/**
 * `defineEvidenceCapture` was the second door, and closing `bindSuite` alone would have moved the
 * defect rather than removed it. It now takes the binding and derives, so the same two reads are
 * rejected here as they are through `atTest`.
 */
export const rawCaptureAttack = defineEvidenceCapture(
  { requirement: 'req-016', sut: 'notifications' },
  'a capture that invents both axes',
  // Distinct member names from attacks 1 and 2 on purpose: the selftest asserts each attack by the
  // diagnostic it produces, so two attacks sharing a member name would be one assertion covering
  // both, and removing either protection could leave the test green.
  async ({ open }) => {
    const { sut, w } = await open();
    return `${await sut.neitherIsThis()}${w.norIsThisSupplied}`;
  },
);

/* ---------------------------------- ATTACK 7: construct an EvidenceCapture with fabricated types */

/**
 * The class used to be exported, so `new EvidenceCapture<T, Anything, AnythingElse>(…)` handed a
 * producer a fabricated context without touching `bindSuite` at all. Only the TYPE is exported now,
 * so there is no constructor to reach.
 */
export const constructedCapture = new EvidenceCapture<string, { notThere(): Promise<string> }, World>(
  'constructed directly',
  'req-016',
  async ({ open }) => {
    const { sut } = await open();
    return sut.notThere();
  },
);

/* ------------------- ATTACK 8: merge a fresh generic overload onto each const entry point */

/**
 * THE DOOR THE ALIAS DOCTRINE DID NOT COVER, found by Gate 1 running the compiler rather than
 * reading the rule. AI4DEV-24's whole defence rests on "declaration merging cannot reach a type
 * alias" — but `bindSuite`, `atTest` and `defineEvidenceCapture` were exported FUNCTION
 * DECLARATIONS, and a function declaration accepts a merged-in overload. The seam was protected at
 * the type level and left open at the value level; an overload restoring a required invented SUT
 * member was verified to compile cleanly.
 *
 * All three are `const` bindings now, so there is no function declaration left to merge into. One
 * attack per entry point, because a guard that covers two of three is the failure both AI4DEV-24
 * reviewers caught in that item.
 */
declare module '../harness/registry.ts' {
  export function bindSuite<Sut, W>(binding: {
    requirement: string;
    sut: string;
  }): { atTest: (atId: string, title: string, body: (ctx: { sut: Sut; w: W }) => Promise<void>) => void };

  export function atTest<Sut, W>(
    atId: string,
    title: string,
    opts: { requirement: string; sut: string },
    body: (ctx: { sut: Sut; w: W }) => Promise<void>,
  ): void;

  export function defineEvidenceCapture<T, Sut, W>(
    name: string,
    producer: (ctx: { sut: Sut; w: W }) => Promise<T>,
  ): T;
}

/* -------------------- ATTACK 9: merge a member into each contract now on the seam path */

/**
 * EVERY type `open()` can now reach through `sut`, one attack each — the list in
 * `type-invention.selftest.ts` is a SPECIFICATION, not a sample, and a name listed there without an
 * attack here produces no diagnostic and fails its own test. So the two files cannot drift apart.
 *
 * `NotificationsSut` carries the REQUIRED member and the rest carry optional ones, because the
 * required case is the one that proves this is not merely a repeat of the optional-member attack.
 *
 * `World` IS HERE, after being left out on a measurement that covered the wrong route. Gate 1
 * measured the direct read — `open().w.invented` on the adapter's concrete fixture-world class — and
 * found it rejected whether `World` is an interface or an alias, which is true. Gate 2 measured the
 * UPCAST: the class implements `World`, so `const asWorld: World = w` needs no cast, and a member
 * merged into the interface reads green off THAT — exit 0. The suite is on that path too, annotating
 * with `World['actors']`. So it is converted and attacked like the rest.
 */
declare module '../suites/req-016/_contract.ts' {
  interface NotificationsSut {
    inventedRequired(): Promise<string>;
  }
  interface World {
    invented?: string;
  }
  interface SenderProbe {
    invented?: string;
  }
  interface RegisteredRow {
    invented?: string;
  }
  interface DocumentedDefault {
    invented?: string;
  }
  interface NotificationEvent {
    invented?: string;
  }
  interface Delivery {
    invented?: string;
  }
  interface OpsItem {
    invented?: string;
  }
  interface EmitResult {
    invented?: string;
  }
}
