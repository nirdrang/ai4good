/**
 * The harness-invention attacks, kept dead by an executable test rather than by memory.
 *
 * AI4DEV-24 exists to make `bun run typecheck` mean something. The thing that would quietly undo it
 * is a suite declaring harness members no runtime value supplies and reading them green — a
 * type-check that lies, which is worse than no type-check at all because it is believed.
 *
 * Two routes to that lie were found and closed, one per adversarial gate. Neither needed `any` and
 * neither needed a suppression, so grepping for those would not have caught either. This test runs
 * the compiler over `tests/at/typeprobes/` and fails if that program EVER compiles clean.
 */

import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { INSTALL_ROOT } from './check.ts';
import { pinnedTsc } from '../typecheck.ts';

const PROBE_PROJECT = 'tests/at/typeprobes/tsconfig.json';

function typecheckProbes(): { status: number | null; output: string } {
  // The same pinned compiler `bun run typecheck` uses. A negative test is only meaningful if the
  // compiler rejecting the attack is the compiler that will check everything else.
  const result = spawnSync(process.execPath, [pinnedTsc(INSTALL_ROOT), '--noEmit', '--pretty', 'false', '-p', PROBE_PROJECT], {
    cwd: INSTALL_ROOT,
    encoding: 'utf8',
  });
  if (result.error) throw new Error(`could not run the compiler over ${PROBE_PROJECT}: ${result.error.message}`);
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

describe('harness invention is rejected by the compiler', () => {
  const probe = typecheckProbes();

  it('the probe program does not compile — if it ever does, an attack has reopened', () => {
    expect(
      probe.status,
      `${PROBE_PROJECT} compiled clean. Every construct in it is a way for a suite to declare harness ` +
        `members the factory never produces; a green run means one of them is legal again and the ` +
        `type-check is once more able to promise a runtime shape nothing establishes.\n${probe.output}`,
    ).not.toBe(0);
  });

  it('rejects a harness type invented through an intersection', () => {
    // `AtHarness & { auditLog }` is a SUBTYPE of AtHarness, so it satisfies any `extends` constraint.
    // The defence is that the harness is not a type parameter at all — hence an arity error.
    expect(probe.output, 'the intersection attack was not rejected by arity').toContain('TS2558');
  });

  /**
   * EVERY type that must stay a type alias, and why the list is exhaustive rather than a sample.
   *
   * The rule is uniform — nothing reachable from the harness object, or from the wrapper handed to a
   * test body, may be an interface — so the guard is uniform too. An earlier version of this test
   * asserted three of these and claimed to assert all of them; both Gate 2 reviewers caught that the
   * guard was narrower than its own comment, which is exactly the reversion such a gap invites.
   *
   * THIS ARRAY IS THE SPECIFICATION. The probe file has to carry an augmentation for every name in
   * it, because a name listed here but not attacked there produces no diagnostic and fails its test.
   * So the two files cannot drift apart silently.
   */
  const ALIAS_PROTECTED = [
    // the harness contract itself
    'AtHarness',
    // the capability contracts it references (contracts.ts)
    'WorldSeam',
    'Fixtures',
    'Clock',
    'Sentinel',
    'Sentinels',
    'FaultHandle',
    'Faults',
    'StaticScan',
    'ProviderAttempt',
    'EmailProviderSim',
    'Vendors',
    // the config seam (config.ts)
    'ConfigRegistry',
    // the wrapper types every test body holds directly (registry.ts) — including the world itself,
    // because `open()` hands `w` to the body exactly as it hands `h`
    'OpenWorld',
    'AtContext',
    'WorldLike',
  ];

  /**
   * TypeScript reports a blocked merge two different ways: `TS2300 Duplicate identifier 'X'` for a
   * single clash, and one `TS6200` listing every identifier when a file has several at once. Both
   * are the rejection this test is asserting, so it accepts either — matching only the first form
   * would make the test pass or fail on how many attacks happen to share a file.
   */
  function rejects(output: string, name: string): boolean {
    if (output.includes(`Duplicate identifier '${name}'`)) return true;
    return output
      .split('\n')
      .filter((line) => line.includes('conflict with those in another file:'))
      .some((line) => line.split(':').pop()!.split(',').some((entry) => entry.trim() === name));
  }

  for (const contract of ALIAS_PROTECTED) {
    it(`rejects a member merged into ${contract}`, () => {
      expect(
        rejects(probe.output, contract),
        `${contract} accepted a merged-in member, so it is an interface again. A suite can now declare ` +
          `a member on it and read that member green against a value that never supplies it.\n${probe.output}`,
      ).toBe(true);
    });
  }
});
