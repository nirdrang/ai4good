/**
 * The ONE place this suite touches the AT harness, and the ONE place an AT id is declared.
 *
 * Two failure modes are kept strictly apart so a red is never ambiguous:
 *   - `harness-missing` — AI4DEV-3's capability modules (H1-H6) are not in the tree.
 *   - `sut-missing`     — the harness is up, but REQ-016's emitter is not implemented yet
 *                         (decomp req-016 D1.L1). This is the EXPECTED red for the proving
 *                         ground: the suite is test-first, ahead of the implementation.
 *
 * Neither mode can produce a green. There is no skip, no `todo`, no swallowed assertion —
 * a pending id fails loudly, stamped with its own AT id and the reason.
 *
 * ID BINDING: every test is registered through `atTest(id, name, fn)`. The id is supplied
 * ONCE, at that call site; the title, the assertion guard, the world's failure stamp and the
 * per-id report all derive from it. Nothing else in the suite may name an AT id — a copied
 * test therefore cannot stamp its failure onto a sibling's acceptance id. The bijection
 * checker reads the `atTest('AT-016.NN'` call sites, not a comment.
 */

import { expect, it } from 'vitest';
import type { AtHarness, HarnessModule, Tier, World } from './_contract.ts';
import { TIERS } from './_contract.ts';

/** Canonical harness barrel produced by AI4DEV-3 H1-H6. Reconcile HERE if it lands elsewhere. */
export const HARNESS_MODULE = '../../harness/index.ts';

const RAW_TIER = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.AT_TIER;

/**
 * The runner (`bun run at:verify req-0NN --tier <tier>`) passes the tier through this env var.
 * There is NO default: an unset or misspelled AT_TIER on an intended integration run must
 * not silently degrade to the stubbed `loop` world — that is the /pm-done gate quietly
 * grading itself on an easier exam.
 */
export const TIER: Tier | null = TIERS.includes(RAW_TIER as Tier) ? (RAW_TIER as Tier) : null;

const TIER_ERROR = `AT_TIER is ${RAW_TIER === undefined ? 'unset' : JSON.stringify(RAW_TIER)}; expected one of ${TIERS.join('|')} — run via \`bun run at:verify req-016 --tier <tier>\``;

let harnessModule: HarnessModule | null = null;
let harnessResolveError = '';

try {
  const mod = (await import(/* @vite-ignore */ HARNESS_MODULE)) as Partial<HarnessModule>;
  if (typeof mod.createHarness !== 'function') {
    harnessResolveError = `resolved ${HARNESS_MODULE} but it exports no createHarness()`;
  } else {
    harnessModule = mod as HarnessModule;
  }
} catch (err) {
  harnessResolveError = err instanceof Error ? err.message : String(err);
}

export type PendingPhase = 'harness-missing' | 'sut-missing' | 'tier-unset';

export class AtPending extends Error {
  constructor(
    readonly atId: string,
    readonly phase: PendingPhase,
    detail: string,
  ) {
    super(`${atId} PENDING [${phase}] — ${detail}`);
    this.name = 'AtPending';
  }
}

export interface OpenWorld {
  h: AtHarness;
  w: World;
  /** REQ-016's system under test, guaranteed non-null once open() returns */
  sut: NonNullable<AtHarness['sut']['notifications']>;
}

/** Everything a test body is given. `atId` is read-only context, never re-supplied to open(). */
export interface AtContext {
  atId: string;
  /** build a fresh "Given" world (and its own harness). Call it more than once for isolation. */
  open(fixture?: string): Promise<OpenWorld>;
}

async function openWorld(atId: string, fixture: string): Promise<{ opened: OpenWorld; harness: AtHarness }> {
  if (TIER === null) throw new AtPending(atId, 'tier-unset', TIER_ERROR);

  if (!harnessModule) {
    throw new AtPending(
      atId,
      'harness-missing',
      `AI4DEV-3 capability modules (H1 runner/tiers, H2 fixtures/clock, H3 sentinels/faults, ` +
        `H5 vendor sims, H6 at-config) are not in the tree: cannot resolve "${HARNESS_MODULE}" ` +
        `from tests/at/suites/req-016 (${harnessResolveError})`,
    );
  }

  const h = await harnessModule.createHarness({ requirement: 'req-016', tier: TIER });
  // Tracked from here on: every later failure must still tear the harness down.
  try {
    expect(h.tier, `harness built tier "${h.tier}" for a --tier ${TIER} run`).toBe(TIER);

    // Tier semantics: above `loop`, nothing this suite leans on may be a stand-in.
    if (TIER !== 'loop') {
      expect(
        await h.stubbedCapabilities(),
        `a ${TIER}-tier run stubbed capabilities — the gate would be grading a stand-in`,
      ).toEqual([]);
    }

    const sut = h.sut?.notifications;
    if (!sut) {
      throw new AtPending(
        atId,
        'sut-missing',
        `REQ-016's notification emitter is not implemented — harness.sut.notifications is absent ` +
          `(loop/decomp/req-016.md D1.L1 "one shared emitter is the sole writer" has not landed)`,
      );
    }

    const w = await h.fixtures.world(fixture);
    return { opened: { h, w, sut }, harness: h };
  } catch (err) {
    await h.teardown().catch(() => undefined);
    throw err;
  }
}

/**
 * Register one acceptance test. The id is declared here and nowhere else.
 *
 * - `expect.hasAssertions()` makes a body that asserts nothing a RED, so a tagged test cannot
 *   satisfy the bijection checker by existing.
 * - worlds AND harnesses are tracked per test and torn down in `finally`, so a frozen clock,
 *   a vendor counter or an armed fault cannot leak into the next id.
 */
export function atTest(atId: string, name: string, fn: (ctx: AtContext) => Promise<void>): void {
  it(`${atId} — ${name}`, async () => {
    expect.hasAssertions();

    const worlds: OpenWorld[] = [];
    const harnesses: AtHarness[] = [];
    const ctx: AtContext = {
      atId,
      open: async (fixture = 'req-016/base') => {
        const { opened, harness } = await openWorld(atId, fixture);
        harnesses.push(harness);
        worlds.push(opened);
        return opened;
      },
    };

    try {
      await fn(ctx);
    } finally {
      while (worlds.length) await worlds.pop()!.w.teardown().catch(() => undefined);
      while (harnesses.length) await harnesses.pop()!.teardown().catch(() => undefined);
    }
  });
}
