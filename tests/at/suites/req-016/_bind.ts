/**
 * The ONE place this suite touches the AT harness.
 *
 * Everything that used to live here — the AT id grammar, the tier contract (`AT_TIER`, no
 * default), the harness handshake, per-test world/harness teardown, the `harness-missing` vs
 * `sut-missing` split — now lives in the harness registry, so every suite gets the same
 * contract from one implementation. This file supplies only what is REQ-016-specific: which
 * member of `harness.sut` the suite drives, and how to say that it has not landed yet.
 *
 * ID BINDING is unchanged: every test is registered through `atTest(id, name, fn)`, the id is
 * supplied ONCE at that call site, and the bijection checker reads those call sites.
 */

import { bindSuite } from '../../harness/registry.ts';

export { AtPending, TIER, TIERS } from '../../harness/registry.ts';
export type { AtContext, OpenWorld, PendingPhase } from '../../harness/registry.ts';

// The suite names TWO STRINGS and no types at all: which requirement it is, and which member of
// `harness.sut` it drives. It deliberately cannot name - or re-label - the harness TYPE: that shape
// comes from the one shared contract the harness factory is statically checked to produce, so a
// suite can never declare a seam nothing supplies.
//
// It can no longer name its own system-under-test or world type either. It used to
// (`bindSuite<NotificationsSut, World>`), and that was two independent statements about one thing:
// this file said what the seam is, `_fixture.ts` built what the seam is, and nothing compared them
// - so any pair of type arguments type-checked green and a body could read members no adapter
// supplies. Both shapes are now DERIVED from the adapter registered under 'req-016' in
// `harness/suite-adapters.ts`, which is the module that really answers `open()`. There is one
// statement, made where it is already checked, and no type argument left to disagree with it.
export const { atTest, defineEvidenceCapture } = bindSuite({
  requirement: 'req-016',
  sut: 'notifications',
  sutMissingDetail:
    `REQ-016's notification emitter is not implemented — harness.sut.notifications is absent ` +
    `(loop/decomp/req-016.md D1.L1 "one shared emitter is the sole writer" has not landed)`,
});
