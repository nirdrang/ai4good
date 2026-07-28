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

export const REPO_ROOT = new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

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

function main(argv: string[]): number {
  let requirement: string;
  try {
    requirement = normalizeRequirement(argv[0]);
  } catch (err) {
    console.error(`at:check — ${(err as Error).message}`);
    console.error('usage: bun run at:check req-0NN');
    return 2;
  }

  let expected: string[];
  let registered: SuiteRegistration[];
  try {
    expected = acceptanceP0Ids(requirement);
    registered = registeredIds(requirement);
  } catch (err) {
    console.error(`at:check req-${requirement} — ${(err as Error).message}`);
    return 2;
  }

  const registeredSet = [...new Set(registered.map((r) => r.atId))];
  const missing = expected.filter((id) => !registeredSet.includes(id));
  const extra = registeredSet.filter((id) => !expected.includes(id));
  const duplicate = registeredSet.filter((id) => registered.filter((r) => r.atId === id).length > 1);

  console.log(`at:check req-${requirement} — ${expected.length} P0 in the acceptance file, ${registered.length} registered in the suite`);
  for (const id of missing) console.log(`  MISSING    ${id} — no executable test registers this id`);
  for (const id of extra) {
    const where = registered.filter((r) => r.atId === id).map((r) => r.file).join(', ');
    console.log(`  EXTRA      ${id} — registered in ${where} but not a P0 of this requirement`);
  }
  for (const id of duplicate) {
    const where = registered.filter((r) => r.atId === id).map((r) => r.file).join(', ');
    console.log(`  DUPLICATE  ${id} — registered ${registered.filter((r) => r.atId === id).length} times (${where})`);
  }

  const failures = missing.length + extra.length + duplicate.length;
  if (failures === 0) {
    console.log(`RESULT: ${expected.length} P0 ids in bijection`);
    return 0;
  }
  console.log(`RESULT: ${missing.length} missing, ${extra.length} extra, ${duplicate.length} duplicated`);
  return 1;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
