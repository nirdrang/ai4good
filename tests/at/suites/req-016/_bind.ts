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
import type { NotificationsSut, World } from './_contract.ts';
import type { Channel } from './taxonomy.ts';

export { AtPending, TIER, TIERS } from '../../harness/registry.ts';
export type { AtContext, OpenWorld, PendingPhase } from '../../harness/registry.ts';

// The suite names its system under test, its fixture world and its channel names. It deliberately
// cannot name a harness TYPE: that shape comes from the one shared contract the harness factory is
// statically checked to produce, so a suite can never declare a seam nothing supplies.
export const atTest = bindSuite<NotificationsSut, World, Channel>({
  sut: 'notifications',
  sutMissingDetail:
    `REQ-016's notification emitter is not implemented — harness.sut.notifications is absent ` +
    `(loop/decomp/req-016.md D1.L1 "one shared emitter is the sole writer" has not landed)`,
});
