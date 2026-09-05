/**
 * AT-001.17's SOURCE ARM — the executable oracle for its "UI absent" clause (gate-1 ruling 3).
 *
 * The criterion's parenthetical is "(UI absent; API rejects)", and every other arm of that body
 * tests the second half: the acceptance surface holds no invite method, the deployed function does
 * not exist, `anon` holds nothing on the membership table (the 401 is the privilege layer for
 * `anon`, not "no client role"), and the database refuses a second seat. `authenticated` holds
 * SELECT on the four tenant tables, filtered by policy.
 * None of them looks at `src/routes/`, so an invite screen could be added while both tiers stayed
 * green. This module is what looks.
 *
 * IT LIVES IN ITS OWN FILE, not in a test file and not in `_integration.ts`, for one reason: the arm
 * runs at BOTH tiers and the two bodies live in different files. A helper imported by both is a
 * shared arm, which is what the plan permits; a copy in each would be two statements of one check.
 * The file name starts with an underscore and does not end in `.test.ts`, so `at:check` does not
 * read it for call sites.
 *
 * ============================================================================================
 * WHAT THIS ORACLE IS, AND WHAT IT IS NOT — the residual, stated openly because the ruling states it
 * ============================================================================================
 *
 * IT IS A NAMING ORACLE. It reads the names of the files under `src/routes/` and the route paths in
 * the generated route tree, and it fails when one of them is named like an invite or an add-member
 * surface. A deliberately renamed invite screen escapes it, exactly as it escapes any static check.
 * Semantic absence — "this screen does not invite anybody, whatever it is called" — stays with human
 * review, and the merge ruling carries that limit.
 *
 * WHY IT IS WORTH HAVING ANYWAY: the realistic regression is not a disguise, it is somebody adding
 * `src/routes/invite.tsx` because a design asked for it. This oracle turns that into a red test in
 * the same run rather than into a green suite over a product that grew a second seat.
 *
 * IT READS THE TREE, NOT THE SYSTEM UNDER TEST. That is the point of an out-of-band check: the
 * witness is the source, not something the component under test reports about itself.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The repository root, resolved from THIS file, so the answer never depends on the caller's cwd. */
const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/**
 * The naming this oracle refuses.
 *
 * The two spellings the criterion itself uses — "invite" and "add a second member" — plus the
 * hyphen, underscore and camel-case forms a router file or a route path would carry. It is
 * deliberately narrow: a pattern wide enough to catch anything would fail on unrelated names and
 * would then be widened back by whoever hit it first.
 */
const INVITE_OR_ADD_MEMBER = /invite|add[-_ ]?member|addmember|add[-_ ]?user|adduser/i;

export type SourceHit = { where: string; name: string };

/** Every file and directory name under `src/routes/`, recursively, relative to that directory. */
function routeFileNames(): string[] {
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

/** Every quoted string literal in the generated route tree — which is where its paths and ids are. */
function routeTreeLiterals(): string[] {
  const text = readFileSync(new URL('../../../../src/routeTree.gen.ts', import.meta.url), 'utf8');
  return [...text.matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)].map((match) => match[1] ?? match[2] ?? '');
}

/**
 * Every place in the route surface whose NAME reads like an invite or an add-member capability.
 *
 * An EMPTY array is the assertion both AT-001.17 bodies make. It throws rather than returning
 * nothing when `src/routes/` cannot be read at all: an oracle that answered "no hits" because it
 * found no directory would be the false green this whole arrangement exists to remove — a negative
 * from a broken instrument is indistinguishable from a true absence unless the instrument says so.
 */
export function inviteOrAddMemberSurface(): SourceHit[] {
  let files: string[];
  try {
    files = routeFileNames();
  } catch (error) {
    throw new Error(
      `AT-001.17's source arm could not read src/routes/ under ${REPO_ROOT} — the absence it reports would be the ` +
        `instrument's, not the product's: ${(error as Error).message}`,
    );
  }
  if (files.length === 0) {
    throw new Error("AT-001.17's source arm found src/routes/ empty, which no checkout of this tree is — refusing to report an absence");
  }

  const hits: SourceHit[] = files
    .filter((name) => INVITE_OR_ADD_MEMBER.test(name))
    .map((name) => ({ where: 'src/routes/', name }));

  for (const literal of routeTreeLiterals()) {
    if (INVITE_OR_ADD_MEMBER.test(literal)) hits.push({ where: 'src/routeTree.gen.ts', name: literal });
  }
  return hits;
}
