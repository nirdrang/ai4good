import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WRITE_ROUTES } from '../../../../supabase/functions/_shared/write-routes.ts';

export const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

const PRODUCT_ROOTS = ['supabase/functions', 'supabase/migrations', 'src'] as const;
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.sql'];

export const VETTING_DEFINER = 'set_organization_vetting';
export const VETTING_TABLE = 'org_vetting';
export const DEFINER_HEAD = /create\s+(?:or\s+replace\s+)?function\s+public\.set_organization_vetting\s*\(/i;
export const CRON = /\bcron\.schedule\b|\bpg_cron\b/i;

export type SourceFile = { path: string; text: string };
export type RouteInventory = Record<
  string,
  {
    surface: { kind: 'edge'; rpc: string } | { kind: 'stand-in'; reason: string };
    standing: { kind: 'account-required'; admits: readonly string[] } | { kind: 'account-absent-by-design'; reason: string };
  }
>;

export type SurfaceInventory = {
  routeFolders: readonly string[];
  inventory: RouteInventory;
  sharedModules: readonly string[];
  uiRoutes: readonly string[];
};

export function posix(path: string): string {
  return path.replace(/\\/g, '/');
}

export function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

export function words(raw: string): string[] {
  return raw
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

export function hasToken(tokens: readonly string[], ...names: readonly string[]): boolean {
  return names.some((name) => tokens.includes(name));
}

export function quotedStrings(text: string): ReadonlyArray<{ value: string; index: number }> {
  const found: Array<{ value: string; index: number }> = [];
  const pattern = /'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g;
  for (const match of text.matchAll(pattern)) {
    found.push({ value: match[1] ?? match[2] ?? match[3] ?? '', index: match.index ?? 0 });
  }
  return found;
}

export function jsxTexts(text: string): ReadonlyArray<{ value: string; index: number }> {
  const found: Array<{ value: string; index: number }> = [];
  const pattern = />([^<>{\n]+)</g;
  for (const match of text.matchAll(pattern)) {
    const value = (match[1] ?? '').trim();
    if (value.length === 0) continue;
    found.push({ value, index: match.index ?? 0 });
  }
  return found;
}

function sourceFilesUnder(root: string): SourceFile[] {
  const found: SourceFile[] = [];
  const walk = (dir: string, relative: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules') continue;
      const full = join(dir, name);
      const rel = posix(`${relative}${name}`);
      if (statSync(full).isDirectory()) {
        walk(full, `${rel}/`);
      } else if (SOURCE_EXTENSIONS.some((extension) => name.endsWith(extension))) {
        found.push({ path: rel, text: readFileSync(full, 'utf8') });
      }
    }
  };
  walk(join(REPO_ROOT, root), `${root}/`);
  return found;
}

export function productFiles(oracle: string): SourceFile[] {
  const files: SourceFile[] = [];
  for (const root of PRODUCT_ROOTS) {
    try {
      files.push(...sourceFilesUnder(root));
    } catch (error) {
      throw new Error(
        `${oracle} could not read ${root}/ under ${REPO_ROOT}. The absence it would report would be the instrument's, ` +
          `not the product's: ${(error as Error).message}`,
      );
    }
  }
  if (files.length === 0) {
    throw new Error(
      `${oracle} found no product source under ${PRODUCT_ROOTS.join(', ')}, which no checkout of this tree is. Refusing to report an absence.`,
    );
  }
  return files;
}

export function migrationFiles(oracle: string): SourceFile[] {
  const files = productFiles(oracle).filter((file) => file.path.startsWith('supabase/migrations/') && file.path.endsWith('.sql'));
  if (files.length === 0) {
    throw new Error(`${oracle} found no SQL migrations under supabase/migrations/. Refusing to report an absence.`);
  }
  return files;
}

function directoryNames(dir: string, prefix: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = posix(`${prefix}${name}`);
    found.push(rel);
    if (statSync(full).isDirectory()) found.push(...directoryNames(full, `${rel}/`));
  }
  return found;
}

export function rpcOf(route: RouteInventory[string]): string | null {
  return route.surface.kind === 'edge' ? route.surface.rpc : null;
}

export function loadProductSurfaces(oracle: string): SurfaceInventory {
  const functionsDir = join(REPO_ROOT, 'supabase', 'functions');
  const sharedDir = join(functionsDir, '_shared');
  const routesDir = join(REPO_ROOT, 'src', 'routes');
  let routeFolders: string[];
  let sharedModules: string[];
  let uiRoutes: string[];
  try {
    routeFolders = readdirSync(functionsDir).filter((name) => name !== '_shared' && statSync(join(functionsDir, name)).isDirectory());
  } catch (error) {
    throw new Error(`${oracle} could not read supabase/functions under ${REPO_ROOT}: ${(error as Error).message}`);
  }
  if (routeFolders.length === 0) {
    throw new Error(`${oracle} found supabase/functions empty of route folders, which no checkout of this tree is. Refusing to report an absence.`);
  }
  try {
    sharedModules = readdirSync(sharedDir).filter((name) => name.endsWith('.ts'));
  } catch (error) {
    throw new Error(`${oracle} could not read supabase/functions/_shared under ${REPO_ROOT}: ${(error as Error).message}`);
  }
  if (sharedModules.length === 0) {
    throw new Error(`${oracle} found supabase/functions/_shared empty, which no checkout of this tree is. Refusing to report an absence.`);
  }
  try {
    uiRoutes = directoryNames(routesDir, '');
  } catch (error) {
    throw new Error(`${oracle} could not read src/routes under ${REPO_ROOT}: ${(error as Error).message}`);
  }
  if (uiRoutes.length === 0) {
    throw new Error(`${oracle} found src/routes empty, which no checkout of this tree is. Refusing to report an absence.`);
  }
  return { routeFolders, inventory: WRITE_ROUTES, sharedModules, uiRoutes };
}
