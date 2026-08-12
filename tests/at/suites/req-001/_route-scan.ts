/**
 * AT-001.24's ROUTE ARM — the executable oracle for "every authenticated surface redirects to
 * sign-in", reduced to the half this pull request is allowed to build.
 *
 * The criterion is about a browser: public surfaces render for a visitor who never signed in, and
 * every other surface sends that visitor to sign in. There is no screen in this tree and `src/` is
 * another territory that continuous integration forbids this change to touch, so what lands here is
 * the DECISION — `supabase/functions/_shared/route-visibility.ts` declares each route public or
 * authenticated — and this file is what fails when a route arrives that nobody declared.
 *
 * IT READS THE TREE, NOT THE SYSTEM UNDER TEST, which is the posture `_source-scan.ts` takes towards
 * the same directory: the witness is the source, never something the component under test reports
 * about itself.
 *
 * IT READS FILE NAMES ONLY, AND `src/routeTree.gen.ts` IS DELIBERATELY NOT READ. That file is
 * GENERATED from the very names below, so reading both would be reading one fact twice. The risk a
 * second witness would cover — a route present in the generated tree and absent from `src/routes/` —
 * cannot occur, because the generator derives the tree from the files. `_source-scan.ts` reads both
 * because it hunts for a NAME anywhere, a hand-edited path included; this arm asks a different
 * question, so no coverage is lost.
 *
 * THE RULE ITSELF IS NOT HERE. `undeclaredRoutes` is shipped code and this file only supplies it with
 * what the disk holds, which is what lets the rule be driven with inputs no checkout carries —
 * `tests/at/harness/shipped-route-visibility.selftest.ts` is where the failure case is exercised.
 */

import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { undeclaredRoutes } from '../../../../supabase/functions/_shared/route-visibility.ts';

/** The repository root, resolved from THIS file, so the answer never depends on the caller's cwd. */
const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** Every file and directory name under `src/routes/`, recursively, relative to that directory. */
function routeDirectoryEntries(): string[] {
  const root = new URL('../../../../src/routes/', import.meta.url);
  const found: string[] = [];
  const walk = (relative: string): void => {
    for (const entry of readdirSync(new URL(relative, root), { withFileTypes: true })) {
      const path = `${relative}${entry.name}`;
      found.push(path);
      if (entry.isDirectory()) walk(`${path}/`);
    }
  };
  walk('');
  return found;
}

/**
 * Every route in this tree that the shipped registry does not classify.
 *
 * AN EMPTY ARRAY IS THE ASSERTION AT-001.24's loop body makes. It THROWS rather than returning
 * nothing when `src/routes/` cannot be read, and again when the directory is empty: an oracle that
 * answered "nothing undeclared" because it found no directory would report every declaration complete
 * while measuring nothing at all. That is `_source-scan.ts`'s exact posture and this repository's
 * standing rule that a negative is re-measured before it is believed — here the instrument says so
 * itself rather than being re-measured after the fact.
 */
export function undeclaredRoutesInTree(): string[] {
  let entries: string[];
  try {
    entries = routeDirectoryEntries();
  } catch (error) {
    throw new Error(
      `AT-001.24's route arm could not read src/routes/ under ${REPO_ROOT} — the absence it reports would be the ` +
        `instrument's, not the product's: ${(error as Error).message}`,
    );
  }
  if (entries.length === 0) {
    throw new Error("AT-001.24's route arm found src/routes/ empty, which no checkout of this tree is — refusing to report an absence");
  }
  return undeclaredRoutes(entries);
}
