/**
 * The AT↔code bijection checker — `bun run at:check req-0NN`.
 *
 * The code-level sibling of `loop/decomp/check-tree.ps1`: every P0 id in the requirement's
 * acceptance file has exactly one executable test, and no executable test claims an id the
 * acceptance file does not carry. Without it a suite can go green while quietly skipping ids.
 *
 * It reads the `atTest('AT-0NN.MM'` CALL SITES rather than importing the suite: the id is
 * declared at that call site and nowhere else, and a static read needs neither a running
 * test framework nor a harness that has not been built yet.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The real checkout this file was loaded from. Where `node_modules` lives, and the default answer
 * for everything below.
 */
export const INSTALL_ROOT = new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/**
 * The tree the checker, the runner and the harness read acceptance files, suites and fixture
 * adapters from — the real checkout unless `AT_REPO_ROOT` says otherwise.
 *
 * WHY THE OVERRIDE EXISTS: the runner's own black-box tests have to feed it whole malformed
 * situations — an acceptance file that yields zero P0 ids, a suite claiming an id nothing
 * registers, a test that reports twice — and observe the exit code and per-id report it produces.
 * Planting those inside the real repository would mean the runner's tests could damage the tree
 * they are checking. With the override the runner is pointed at a disposable tree that is complete
 * in itself, and the paths it resolves stay consistent between the preflight, the harness and
 * vitest's root.
 *
 * The override moves DATA only: `node_modules` is always resolved from INSTALL_ROOT, so a child
 * still runs the pinned vitest and the pinned Supabase CLI. Unset — every ordinary run — it
 * changes nothing at all.
 */
export const REPO_ROOT = process.env.AT_REPO_ROOT?.trim() ? process.env.AT_REPO_ROOT.trim() : INSTALL_ROOT;

/** `req-016` or `016` → `016`. Throws on anything else. */
export function normalizeRequirement(arg: string): string {
  const m = /^(?:req-)?(\d{3}(?:\.\d+)*)$/.exec(arg ?? '');
  if (!m) throw new Error(`"${arg}" is not a requirement — expected req-0NN, e.g. req-016 or req-005.5`);
  return m[1];
}

/** Every P0 id in `.taskmaster/docs/acceptance/at-req-0NN.md`, in file order. */
export function acceptanceP0Ids(requirement: string): string[] {
  const file = join(REPO_ROOT, '.taskmaster', 'docs', 'acceptance', `at-req-${requirement}.md`);
  const text = readFileSync(file, 'utf8');
  const escaped = requirement.replace(/\./g, '\\.');
  const pattern = new RegExp(`AT-${escaped}\\.(\\d+[a-z]?)\\*?\\*?\\s*\\(P0\\)`, 'g');
  const ids: string[] = [];
  for (const m of text.matchAll(pattern)) {
    const id = `AT-${requirement}.${m[1]}`;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function suiteDir(requirement: string): string {
  return join(REPO_ROOT, 'tests', 'at', 'suites', `req-${requirement}`);
}

export interface SuiteRegistration {
  atId: string;
  file: string;
}

/** Every `atTest('AT-…'` call site under the requirement's suite directory. */
export function registeredIds(requirement: string): SuiteRegistration[] {
  const dir = suiteDir(requirement);
  const found: SuiteRegistration[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.test.ts')) continue;
    const text = readFileSync(join(dir, entry.name), 'utf8');
    for (const m of text.matchAll(/atTest\(\s*['"`](AT-[\d.]+[a-z]?)['"`]/g)) {
      found.push({ atId: m[1], file: entry.name });
    }
  }
  return found;
}

export interface BijectionReport {
  expected: string[];
  registered: SuiteRegistration[];
  missing: string[];
  extra: string[];
  duplicate: string[];
  problems: string[];
}

export function bijectionProblems(expected: string[], registered: SuiteRegistration[]): string[] {
  const registeredSet = [...new Set(registered.map((entry) => entry.atId))];
  const missing = expected.filter((id) => !registeredSet.includes(id));
  const extra = registeredSet.filter((id) => !expected.includes(id));
  const duplicate = registeredSet.filter((id) => registered.filter((entry) => entry.atId === id).length > 1);
  const problems: string[] = [];
  if (expected.length === 0) problems.push('the acceptance parser found zero P0 ids');
  if (missing.length) problems.push(`${missing.length} missing: ${missing.join(', ')}`);
  if (extra.length) problems.push(`${extra.length} extra: ${extra.join(', ')}`);
  if (duplicate.length) problems.push(`${duplicate.length} duplicated: ${duplicate.join(', ')}`);
  return problems;
}

export function inspectBijection(requirement: string): BijectionReport {
  const expected = acceptanceP0Ids(requirement);
  const registered = registeredIds(requirement);
  const registeredSet = [...new Set(registered.map((entry) => entry.atId))];
  const missing = expected.filter((id) => !registeredSet.includes(id));
  const extra = registeredSet.filter((id) => !expected.includes(id));
  const duplicate = registeredSet.filter((id) => registered.filter((entry) => entry.atId === id).length > 1);
  return {
    expected,
    registered,
    missing,
    extra,
    duplicate,
    problems: bijectionProblems(expected, registered),
  };
}

function main(argv: string[]): number {
  let requirement: string;
  try {
    requirement = normalizeRequirement(argv[0]);
  } catch (err) {
    console.error(`at:check — ${(err as Error).message}`);
    console.error('usage: bun run at:check req-0NN');
    return 2;
  }

  let report: BijectionReport;
  try {
    report = inspectBijection(requirement);
  } catch (err) {
    console.error(`at:check req-${requirement} — ${(err as Error).message}`);
    return 2;
  }

  console.log(
    `at:check req-${requirement} — ${report.expected.length} P0 in the acceptance file, ` +
      `${report.registered.length} registered in the suite`,
  );
  if (report.expected.length === 0) console.log('  EMPTY      the acceptance parser found zero P0 ids');
  for (const id of report.missing) console.log(`  MISSING    ${id} — no executable test registers this id`);
  for (const id of report.extra) {
    const where = report.registered
      .filter((r) => r.atId === id)
      .map((r) => r.file)
      .join(', ');
    console.log(`  EXTRA      ${id} — registered in ${where} but not a P0 of this requirement`);
  }
  for (const id of report.duplicate) {
    const where = report.registered
      .filter((r) => r.atId === id)
      .map((r) => r.file)
      .join(', ');
    console.log(`  DUPLICATE  ${id} — registered ${report.registered.filter((r) => r.atId === id).length} times (${where})`);
  }

  if (report.problems.length === 0) {
    console.log(`RESULT: ${report.expected.length} P0 ids in bijection`);
    return 0;
  }
  console.log(
    `RESULT: ${report.missing.length} missing, ${report.extra.length} extra, ` +
      `${report.duplicate.length} duplicated${report.expected.length === 0 ? ', zero expected' : ''}`,
  );
  return 1;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
