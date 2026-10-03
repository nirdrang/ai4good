import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

const INVITE_OR_ADD_MEMBER = /invite|add[-_ ]?member|addmember|add[-_ ]?user|adduser/i;

export type SourceHit = { where: string; name: string };

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

function routeTreeLiterals(): string[] {
  const text = readFileSync(new URL('../../../../src/routeTree.gen.ts', import.meta.url), 'utf8');
  return [...text.matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)].map((match) => match[1] ?? match[2] ?? '');
}

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
