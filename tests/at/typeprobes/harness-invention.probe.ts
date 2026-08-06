/**
 * NEGATIVE TEST — every statement below MUST fail to compile.
 *
 * This file is excluded from the acceptance-tree type-check on purpose and is checked by its own
 * config, which expects a non-zero exit. `harness/type-invention.selftest.ts` runs it and fails the
 * suite if it ever compiles clean.
 *
 * WHY IT EXISTS: the whole point of AI4DEV-24 is a type-check that does not lie. The lie it removes
 * is a suite declaring harness members nothing supplies and reading them green. Both known routes to
 * that lie are kept here, alive and executable, so a future refactor that reopens one is caught by a
 * failing test rather than by a reviewer noticing.
 *
 * Neither attack needs `any` and neither needs a suppression — which is exactly why a grep for
 * those is not sufficient protection and this file is.
 */

import { bindSuite } from '../harness/registry.ts';
import type { AtHarness } from '../harness/contracts.ts';

/* ---------------------------------------------------------------- ATTACK 1: intersection type */

/**
 * The original Gate 1 finding: hand `bindSuite` a harness type that adds a member, relying on an
 * intersection being a subtype and so satisfying any `extends` constraint.
 * Dead because the harness is no longer a type parameter at all.
 */
type InventedByIntersection = AtHarness & { auditLog: string[] };

export const intersectionAttack = bindSuite<{ notifications?: unknown }, { teardown(): Promise<void> }, InventedByIntersection>({
  sut: 'notifications',
});

/* -------------------------------------------------------------- ATTACK 2: declaration merging */

/**
 * The Gate 2 finding: reach the shared contract through module augmentation instead. The member is
 * OPTIONAL, which is what made this slip past the factory's return annotation — `createHarness()`
 * still satisfies `AtHarness`, so nothing goes red at the producer, and the suite reads a property
 * that is `undefined` at runtime.
 * Dead because `AtHarness` is a type alias, and declaration merging cannot reach one.
 */
declare module '../harness/contracts.ts' {
  interface AtHarness {
    auditLog?: string[];
  }
}

/* ------------------------------------------- ATTACK 3: declaration merging, one level down */

/**
 * The same door, at the capability contracts `AtHarness` REFERENCES rather than at `AtHarness`
 * itself. Closing only the top type left this open, and it was WORSE here: `sentinels`, `faults`,
 * `static` and `vendors` are produced by `pendingCapability<T>()`, which casts a Proxy `as T`, so
 * even a REQUIRED invented member did not break `index.ts` — where the same member added to
 * `AtHarness` fails with TS2741. Both an optional and a required member are kept below, because it
 * was the required one that proved this is not merely a repeat of attack 2.
 * Dead because every capability contract is a type alias too.
 */
declare module '../harness/contracts.ts' {
  // EVERY contract in the file, not a sample. The conversion to aliases was uniform, so the guard
  // is uniform: a future author reverting any single one of these to an interface must fail a test
  // that names it. `Vendors` carries the optional member and `Faults` the required one, because it
  // was the required case that proved this level is not merely a repeat of attack 2.
  interface Vendors {
    auditLog?: string[];
  }
  interface Faults {
    inventedRequired: string;
  }
  interface WorldSeam {
    invented?: string;
  }
  interface Fixtures {
    invented?: string;
  }
  interface Clock {
    invented?: string;
  }
  interface Sentinel {
    invented?: string;
  }
  interface Sentinels {
    invented?: string;
  }
  interface FaultHandle {
    invented?: string;
  }
  interface StaticScan {
    invented?: string;
  }
  interface ProviderAttempt {
    invented?: string;
  }
  interface EmailProviderSim {
    invented?: string;
  }
  // H4's oracle contracts. `SemanticOracle` is the one a suite reaches through `h.oracles`, but the
  // rubric and verdict shapes are handed to and returned from `judge()`, so a member merged into
  // any of them is a member a test body could read off a value that never supplies it. The union
  // aliases (`RubricCriterion`, `CriterionComparator`) are attacked the same way: an interface
  // sharing a type alias's name is a duplicate identifier whatever the alias resolves to.
  interface SemanticCriterion {
    invented?: string;
  }
  interface ExtractionSpec {
    invented?: string;
  }
  interface NumericToleranceComparator {
    invented?: string;
  }
  interface CountAtLeastComparator {
    invented?: string;
  }
  interface CriterionComparator {
    invented?: string;
  }
  interface ExtractionCriterion {
    invented?: string;
  }
  interface RubricCriterion {
    invented?: string;
  }
  interface Rubric {
    invented?: string;
  }
  interface VoteTally {
    invented?: string;
  }
  interface CriterionVerdict {
    invented?: string;
  }
  interface VerdictProvenance {
    invented?: string;
  }
  interface SemanticVerdict {
    invented?: string;
  }
  // REQUIRED rather than optional, like `Faults` above: `oracles` is a real object on the harness
  // and not a `pendingCapability()` Proxy, so a required merged-in member has to be rejected by the
  // alias rule rather than by the factory's return annotation happening to notice it.
  interface SemanticOracle {
    inventedRequired: string;
  }
}

declare module '../harness/config.ts' {
  interface ConfigRegistry {
    inventedKnob?: number;
  }
}

/* ------------------------------------ ATTACK 4: declaration merging on the wrapper types */

/**
 * The same door again, on the objects a test body is handed rather than on the harness inside them.
 * `open()` returns an `OpenWorld` and every body receives an `AtContext`; while those were
 * interfaces, a suite could merge a member into either and read it green — the harness object was
 * shut and the wrapper delivering it was not.
 * Dead because both are type aliases.
 */
declare module '../harness/registry.ts' {
  interface OpenWorld {
    auditLog?: string[];
  }
  interface AtContext {
    invented?: string;
  }
  // `opened.w` is handed to the test body as well, so `WorldLike` is inside the same boundary. It
  // survived the first pass because the exploit needs `W` at its DEFAULT: a suite that pins its own
  // world type resolves `w` to that type and never sees the merged member — pinning hides the hole
  // rather than closing it, which is why "REQ-016 is not affected" was not an answer.
  interface WorldLike {
    invented?: string;
  }
}
