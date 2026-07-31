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

  it('rejects a harness member added by declaration merging', () => {
    // An OPTIONAL member added to an interface leaves the factory's return annotation satisfied, so
    // nothing goes red at the producer. The defence is that `AtHarness` is a type alias, which
    // cannot be merged into.
    expect(probe.output, 'the declaration-merging attack was not rejected').toContain('TS2300');
  });
});
