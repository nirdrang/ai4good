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
