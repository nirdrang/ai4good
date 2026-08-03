/**
 * The type-invention attacks, kept dead by an executable test rather than by memory.
 *
 * AI4DEV-24 exists to make `bun run typecheck` mean something. The thing that would quietly undo it
 * is a suite declaring members no runtime value supplies and reading them green — a type-check that
 * lies, which is worse than no type-check at all because it is believed.
 *
 * Two families live here now. AI4DEV-24's is HARNESS invention: a suite declaring seams
 * `createHarness()` never produces. AI4DEV-31's is SUT-AND-WORLD invention: a suite declaring what
 * its system under test and its fixture world are, when the adapter that really supplies them says
 * otherwise. None of the attacks needs `any` and none needs a suppression, so grepping for those
 * would not have caught any of them.
 *
 * THE PROBES ARE COMPILED PER FILE, not only as one program, and that is load-bearing. A combined
 * exit code is satisfied by ANY error anywhere: a protection could be removed and the suite would
 * stay green on the strength of its neighbours' diagnostics. Each probe file therefore has its own
 * committed child config, and each protection is asserted against the output of the file that
 * attacks it.
 */

import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { INSTALL_ROOT } from './check.ts';
import { pinnedTsc } from '../typecheck.ts';

const PROBE_PROJECT = 'tests/at/typeprobes/tsconfig.json';
/** AI4DEV-31's attacks in the API that ALLOWED them — the red half of that item's proof. */
const LEGACY_SEAM_PROJECT = 'tests/at/typeprobes/tsconfig.sut-seam-legacy.json';
/** AI4DEV-31's attacks in the API that REPLACED it — only meaningful after the change. */
const SEAM_PROJECT = 'tests/at/typeprobes/tsconfig.sut-seam.json';

interface ProbeRun {
  status: number | null;
  output: string;
  /** every file tsc actually put in the program — the control against an empty-program exit 0 */
  files: string[];
}

function typecheckProbes(project: string): ProbeRun {
  // The same pinned compiler `bun run typecheck` uses. A negative test is only meaningful if the
  // compiler rejecting the attack is the compiler that will check everything else.
  //
  // `--listFiles` is not decoration: a tsconfig that matches NO files also exits 0 and reports
  // nothing, so "the attack was rejected" and "the attack was never compiled" are indistinguishable
  // without it. Every per-file assertion below leans on `compiled()` to rule that out.
  const result = spawnSync(
    process.execPath,
    [pinnedTsc(INSTALL_ROOT), '--noEmit', '--pretty', 'false', '--listFiles', '-p', project],
    { cwd: INSTALL_ROOT, encoding: 'utf8' },
  );
  if (result.error) throw new Error(`could not run the compiler over ${project}: ${result.error.message}`);
  const raw = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const lines = raw.split('\n');
  // `--listFiles` interleaves the program's files with the diagnostics. The listed files are
  // ABSOLUTE, while diagnostics name their file relative to the cwd and their continuation lines are
  // indented — so the leading drive letter separates the two without guessing at message text.
  const isListedFile = (line: string) => /^[A-Za-z]:[\\/]/.test(line);
  return {
    status: result.status,
    output: lines.filter((line) => !isListedFile(line)).join('\n'),
    files: lines.filter(isListedFile).map((line) => line.trim()),
  };
}

/** Did tsc really read this probe? Guards every assertion below against a program matching nothing. */
function compiled(run: ProbeRun, probeFile: string): boolean {
  return run.files.some((file) => file.endsWith(probeFile));
}

/**
 * TypeScript reports a blocked merge two different ways: `TS2300 Duplicate identifier 'X'` for a
 * single clash, and one `TS6200` listing every identifier when a file has several at once. Both are
 * the rejection these tests assert, so either is accepted — matching only the first form would make
 * a test pass or fail on how many attacks happen to share a file.
 */
function rejects(output: string, name: string): boolean {
  if (output.includes(`Duplicate identifier '${name}'`)) return true;
  return output
    .split('\n')
    .filter((line) => line.includes('conflict with those in another file:'))
    .some((line) => line.split(':').pop()!.split(',').some((entry) => entry.trim() === name));
}

describe('harness invention is rejected by the compiler', () => {
  const probe = typecheckProbes(PROBE_PROJECT);

  it('compiles the probes it claims to check', () => {
    // The empty-program control. A config that matches nothing exits 0 and says nothing, so without
    // this every assertion below could be passing because the attack was never read.
    expect(compiled(probe, 'harness-invention.probe.ts'), `${PROBE_PROJECT} did not compile the probe file`).toBe(true);
  });

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

/**
 * AI4DEV-31's half: the system under test and the fixture world are the ADAPTER's to declare, and no
 * longer the suite's to claim.
 *
 * Two probe files, compiled separately, because one file cannot carry both halves of the proof. The
 * legacy probe is written in the API that ALLOWED the lie — at the pre-fix commit it compiled with
 * exit 0, which is `loop/items/AI4DEV-31/proof-red.txt`; the same file must fail now. The new probe
 * is written in the API that replaced it and is only meaningful afterwards.
 *
 * Every diagnostic asserted below was READ OFF THE COMPILER, never predicted. The design for this
 * item predicted TS2558 by analogy with AI4DEV-24's arity defence and the real code is TS2344,
 * because the new `bindSuite` still takes two type parameters — they are just no longer shapes. A
 * guard asserting a predicted code would have passed on the wrong evidence.
 */
describe('the listed sut/world invention attacks fail to compile', () => {
  const legacy = typecheckProbes(LEGACY_SEAM_PROJECT);
  const seam = typecheckProbes(SEAM_PROJECT);

  it('compiles both probe files it claims to check', () => {
    expect(compiled(legacy, 'sut-seam-legacy.probe.ts'), `${LEGACY_SEAM_PROJECT} compiled no probe`).toBe(true);
    expect(compiled(seam, 'sut-seam.probe.ts'), `${SEAM_PROJECT} compiled no probe`).toBe(true);
  });

  it('the old API can no longer be written at all', () => {
    expect(
      legacy.status,
      `${LEGACY_SEAM_PROJECT} compiled clean. That is the state this item found the tree in: a suite ` +
        `naming any two types it liked and reading them green off a harness that supplies neither.\n${legacy.output}`,
    ).not.toBe(0);
  });

  it('the listed new-API attacks do not compile', () => {
    expect(seam.status, `${SEAM_PROJECT} compiled clean — an attack has reopened.\n${seam.output}`).not.toBe(0);
  });

  /**
   * THE ATTACK LIST IS A SPECIFICATION, not a sample, and each entry names the marker the compiler
   * really emitted. Removing any single protection fails the test that names it, rather than being
   * absorbed by a neighbour's diagnostic inside a shared exit code.
   */
  const SEAM_ATTACKS: { probe: ProbeRun; what: string; marker: string; why: string }[] = [
    {
      probe: legacy,
      what: 'bindSuite<Sut, W> — a fabricated system under test',
      marker: `Type '{ notThere(): Promise<void>; }' does not satisfy the constraint '"req-016"'`,
      why: 'a suite can name a system under test again, and read methods no adapter implements',
    },
    {
      probe: legacy,
      what: 'bindSuite<Sut, W> — a fabricated fixture world',
      marker: `Type 'NotificationsSut' does not satisfy the constraint '"req-016"'`,
      why: 'a suite can name a world type again, and read members no fixture supplies',
    },
    {
      probe: legacy,
      what: 'defineEvidenceCapture<T, Sut, W> — the second door, with no binding at all',
      marker: 'Expected 3 arguments, but got 2',
      why: 'an evidence capture can invent both axes without ever calling bindSuite',
    },
    {
      probe: seam,
      what: 'reading a sut member the adapter does not declare',
      marker: `Property 'notThere' does not exist on type 'NotificationsSut'`,
      why: 'a body can read a method the implementation does not have and still type-check',
    },
    {
      probe: seam,
      what: 'reading a world member the fixture does not supply',
      marker: `Property 'inventedByTheSuite' does not exist on type 'NotificationFixtureWorld'`,
      why: 'a body can read a world member nothing supplies and still type-check',
    },
    {
      probe: seam,
      what: 'reading both invented axes through the raw evidence-capture entry point',
      marker: `Property 'neitherIsThis' does not exist on type 'NotificationsSut'`,
      why: 'the capture door is open again, so closing bindSuite alone only moved the defect',
    },
    {
      probe: seam,
      what: 'binding a sut key the adapter does not expose',
      marker: `Type '"notificatoins"' is not assignable to type '"notifications"'`,
      why: 'a misspelled key compiles again and fails at run time looking like an unbuilt requirement',
    },
    {
      probe: seam,
      what: 'binding a requirement with no registered adapter',
      marker: `Type '"req-999"' is not assignable to type '"req-016"'`,
      why: 'a suite can bind a requirement whose types are derived from nothing',
    },
    {
      probe: seam,
      what: 'widening the seam by annotating the body parameter with a fabricated shape',
      marker: `Type 'NotificationsSut & { invented?: string | undefined; }' does not satisfy the constraint '"req-016"'`,
      why:
        'the subtlest INVITED route back: leave bindSuite alone and widen at the body with an ' +
        'OPTIONAL member. Nothing structural can reject it — a type and that type intersected with ' +
        'an optional member are assignable both ways — so the whole defence is that the seam types ' +
        'take a requirement and a sut key rather than shapes. If this fails, someone has ' +
        're-parameterized them by shape. Note precisely what it does and does not prove: it proves ' +
        'the widened type cannot be PASSED to the seam any more, not that it cannot be BUILT. ' +
        'Rebuilding one by hand out of the derived types still compiles — measured, and recorded as ' +
        'a known-open case at the foot of sut-seam.probe.ts, where it cannot be an active attack ' +
        'because that program must not compile and this one does',
    },
    {
      probe: seam,
      what: 'constructing an EvidenceCapture directly',
      marker: `'EvidenceCapture' only refers to a type, but is being used as a value here`,
      why: 'the class is exported again, so its constructor takes a producer at any types',
    },
    {
      probe: seam,
      what: 'merging a fresh generic overload onto bindSuite',
      marker: `Cannot redeclare block-scoped variable 'bindSuite'`,
      why: 'it is an exported function declaration again, and a declaration accepts a merged-in overload',
    },
    {
      probe: seam,
      what: 'merging a fresh generic overload onto atTest',
      marker: `Cannot redeclare block-scoped variable 'atTest'`,
      why: 'it is an exported function declaration again, and a declaration accepts a merged-in overload',
    },
    {
      probe: seam,
      what: 'merging a fresh generic overload onto defineEvidenceCapture',
      marker: `Cannot redeclare block-scoped variable 'defineEvidenceCapture'`,
      why: 'it is an exported function declaration again, and a declaration accepts a merged-in overload',
    },
  ];

  for (const attack of SEAM_ATTACKS) {
    it(`rejects ${attack.what}`, () => {
      expect(attack.probe.output, `${attack.what} was accepted — ${attack.why}.\n${attack.probe.output}`).toContain(
        attack.marker,
      );
    });
  }

  /**
   * The suite-side contracts that AI4DEV-31 put ON the seam path, and therefore under AI4DEV-24's
   * alias rule. EXHAUSTIVE over the conversion: naming nine and attacking two is the exact failure
   * both AI4DEV-24 reviewers caught in that item, reproduced one item later by its own design.
   *
   * `World` IS ON THIS LIST, and the record of how it nearly was not is the useful part — it is a
   * worked example of a measurement that was correct and still concluded the wrong thing.
   *
   * Gate 1 measured the DIRECT read: after the derivation `open().w` is the adapter's concrete
   * fixture-world CLASS, and a class does not acquire members merely because an interface it
   * implements was augmented, so `open().w.invented` is TS2339 with `World` an interface or an
   * alias. That is true, it was measured on this tree, and it was taken as reason to leave `World`
   * out — with the ruling's own condition attached: only if no remaining seam path resolves to
   * `World`.
   *
   * Gate 2 measured the UPCAST route the direct read never touched. The fixture class IMPLEMENTS
   * `World`, so `const asWorld: World = w` needs no cast, and a member merged into the `World`
   * interface reads green off that — exit 0, measured. The condition failed on its own terms as
   * well: `d-taxonomy-evidence.test.ts` annotates with `World['actors']`, so the suite still spells
   * it. Hence the conversion, and hence the attack in the probe.
   *
   * The lesson worth keeping: measuring ONE route and generalizing to "the type is safe" is the
   * same overclaim, one level down, that this whole item exists to remove.
   */
  const SEAM_ALIAS_PROTECTED = [
    'NotificationsSut',
    'SenderProbe',
    'RegisteredRow',
    'DocumentedDefault',
    'NotificationEvent',
    'Delivery',
    'OpsItem',
    'EmitResult',
    'World',
  ];

  for (const contract of SEAM_ALIAS_PROTECTED) {
    it(`rejects a member merged into ${contract}`, () => {
      expect(
        rejects(seam.output, contract),
        `${contract} accepted a merged-in member, so it is an interface again. It is reachable from ` +
          `open().sut now, so a suite can declare a member on it and read that member green against a ` +
          `value that never supplies it.\n${seam.output}`,
      ).toBe(true);
    });
  }
});
