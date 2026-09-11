/**
 * REQ-002's SOURCE ARMS for AT-002.30: only the manual founder vet and unvet path exists.
 *
 * Precedent: `tests/at/suites/req-001/_source-scan.ts` and `tests/at/suites/req-016/_source-scan.ts`.
 * The arms run at both tiers. The file name starts with an underscore and does not end in
 * `.test.ts`, so `at:check` does not read it. Each oracle returns a problem list; empty is the
 * assertion. Each THROWS rather than returning nothing when it could not read what it claims to
 * have read: a negative from a broken instrument is indistinguishable from a true absence unless
 * the instrument says so.
 *
 * WHAT THESE ARE NOT. They are naming and statement oracles over text. A disguised KYC screen
 * named `review-desk.tsx` escapes the surface oracle, exactly as it escapes any static check. The
 * realistic regression is somebody adding `kyc-submit`, a second writer of `org_vetting`, a cron
 * job that vets, or a third `pending` state, and that is what these turn into a red in the same run.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WRITE_ROUTES } from '../../../../supabase/functions/_shared/write-routes.ts';
import { splitSqlStatements } from '../req-001/_policy-scan.ts';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

const PRODUCT_ROOTS = ['supabase/functions', 'supabase/migrations', 'src'] as const;
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.sql'];

const DEFINER = 'set_organization_vetting';
const TABLE = 'org_vetting';

/** A KYC or automated-verification surface, by the names those surfaces actually take. */
const KYC_OR_AUTOMATED =
  /\bkyc\b|automated[-_ ]?verif(?:ication|y)|document[-_ ]?review|identity[-_ ]?verif(?:ication|y)/i;

const THIRD_VETTED_STATE = /\b(?:pending|under[_ ]?review|in[_ ]?review|review_status|verification_status|document[_ ]?review)\b/i;

const VETTING_WRITE =
  /\b(?:insert\s+into|update|delete\s+from)\s+(?:public\.)?org_vetting\b/gi;
const CLIENT_VETTING_WRITE =
  /\.from\(\s*['"]org_vetting['"]\s*\)\s*\.(?:insert|upsert|update|delete)\b/g;

const DEFINER_HEAD = /create\s+(?:or\s+replace\s+)?function\s+public\.set_organization_vetting\s*\(/i;
const TABLE_HEAD = /create\s+table\s+public\.org_vetting\b/i;
const TRIGGER_ON_VETTING = /create\s+trigger\b[\s\S]*\bon\s+(?:only\s+)?(?:public\.)?org_vetting\b/i;
const CRON = /\bcron\.schedule\b|\bpg_cron\b/i;
const VETTING_IN_STATEMENT = /\borg_vetting\b|\bset_organization_vetting\b|\bkyc\b|automated[-_ ]?verif(?:ication|y)|document[-_ ]?review/i;

export type SourceFile = { path: string; text: string };
export type RouteInventory = Record<
  string,
  {
    surface: { kind: 'edge'; rpc: string } | { kind: 'stand-in'; reason: string };
    standing: { kind: 'account-required'; admits: readonly string[] } | { kind: 'account-absent-by-design'; reason: string };
  }
>;

function posix(path: string): string {
  return path.replace(/\\/g, '/');
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
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

function productFiles(oracle: string): SourceFile[] {
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

function migrationFiles(oracle: string): SourceFile[] {
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

function rpcOf(route: RouteInventory[string]): string | null {
  return route.surface.kind === 'edge' ? route.surface.rpc : null;
}

function admitsOf(route: RouteInventory[string]): readonly string[] | null {
  return route.standing.kind === 'account-required' ? route.standing.admits : null;
}

/**
 * Write-route rows whose RPC is the vetting definer. Empty is not success: the product has that
 * route, so zero hits means the inventory stopped naming it.
 */
export function scanVettingRoutes(inventory: RouteInventory): string[] {
  const problems: string[] = [];
  const reaching: string[] = [];
  for (const name of Object.keys(inventory)) {
    const route = inventory[name];
    if (rpcOf(route) === DEFINER) reaching.push(name);
  }
  if (reaching.length === 0) {
    problems.push(`no write route reaches public.${DEFINER}`);
    return problems;
  }
  if (reaching.length !== 1) {
    problems.push(`write routes that reach public.${DEFINER}: ${reaching.join(', ')} (expected exactly one)`);
  }
  for (const name of reaching) {
    const admits = admitsOf(inventory[name]);
    if (admits === null) {
      problems.push(`${name} reaches public.${DEFINER} without an account-required standing`);
      continue;
    }
    if (admits.length !== 1 || admits[0] !== 'platform_admin') {
      problems.push(`${name} admits ${JSON.stringify(admits)} rather than exactly ["platform_admin"]`);
    }
  }
  return problems.sort();
}

export function vettingRouteProblems(): string[] {
  return scanVettingRoutes(WRITE_ROUTES);
}

/**
 * Every statement that writes `public.org_vetting` must sit inside the body of
 * `public.set_organization_vetting`. A product module must not write the table at all.
 */
export function scanOrgVettingWriters(files: readonly SourceFile[]): string[] {
  const problems: string[] = [];
  let definerDefined = false;

  for (const file of files) {
    if (file.path.startsWith('supabase/migrations/') && file.path.endsWith('.sql')) {
      for (const statement of splitSqlStatements(file.text)) {
        if (DEFINER_HEAD.test(statement)) {
          definerDefined = true;
          continue;
        }
        VETTING_WRITE.lastIndex = 0;
        const match = VETTING_WRITE.exec(statement);
        if (match) {
          problems.push(
            `${file.path} writes public.${TABLE} outside public.${DEFINER}: ${match[0].replace(/\s+/g, ' ')}`,
          );
        }
      }
      continue;
    }
    VETTING_WRITE.lastIndex = 0;
    for (const match of file.text.matchAll(VETTING_WRITE)) {
      problems.push(`${file.path}:${lineOf(file.text, match.index)} writes public.${TABLE} from a product module`);
    }
    CLIENT_VETTING_WRITE.lastIndex = 0;
    for (const match of file.text.matchAll(CLIENT_VETTING_WRITE)) {
      problems.push(`${file.path}:${lineOf(file.text, match.index)} writes ${TABLE} through a client insert`);
    }
  }

  if (!definerDefined) {
    throw new Error(
      `orgVettingWriterProblems found no migration defining public.${DEFINER}, so "outside the definer" names nothing. ` +
        'Refusing to report an absence.',
    );
  }
  return problems.sort();
}

export function orgVettingWriterProblems(): string[] {
  return scanOrgVettingWriters(productFiles('orgVettingWriterProblems'));
}

/**
 * No scheduled job touches vetting: no `cron.schedule` / `pg_cron` on a vetting statement or in a
 * migration that defines the table or the definer, and no trigger on `org_vetting`.
 */
export function scanScheduledVetting(migrations: readonly SourceFile[]): string[] {
  const problems: string[] = [];
  for (const file of migrations) {
    const statements = splitSqlStatements(file.text);
    const fileDefinesVetting = statements.some((statement) => DEFINER_HEAD.test(statement) || TABLE_HEAD.test(statement));
    for (const statement of statements) {
      if (TRIGGER_ON_VETTING.test(statement)) {
        problems.push(`${file.path} creates a trigger on public.${TABLE}`);
      }
      if (CRON.test(statement) && (fileDefinesVetting || VETTING_IN_STATEMENT.test(statement))) {
        problems.push(`${file.path} schedules a job that touches vetting`);
      }
    }
  }
  return problems.sort();
}

export function scheduledVettingProblems(): string[] {
  return scanScheduledVetting(migrationFiles('scheduledVettingProblems'));
}

export type KycSurfaceInput = {
  routeFolders: readonly string[];
  inventory: RouteInventory;
  sharedModules: readonly string[];
  uiRoutes: readonly string[];
};

/** Route folders, write-route rows and shared modules that name a KYC or automated-verification surface. */
export function scanKycSurfaces(input: KycSurfaceInput): string[] {
  const problems: string[] = [];
  for (const name of input.routeFolders) {
    if (KYC_OR_AUTOMATED.test(name)) problems.push(`route folder ${name} names a KYC or automated-verification surface`);
  }
  for (const name of Object.keys(input.inventory)) {
    const rpc = rpcOf(input.inventory[name]) ?? '';
    if (KYC_OR_AUTOMATED.test(name)) problems.push(`write route ${name} names a KYC or automated-verification surface`);
    if (KYC_OR_AUTOMATED.test(rpc)) problems.push(`write route ${name} rpc ${rpc} names a KYC or automated-verification surface`);
  }
  for (const name of input.sharedModules) {
    if (KYC_OR_AUTOMATED.test(name)) problems.push(`shared module ${name} names a KYC or automated-verification surface`);
  }
  for (const name of input.uiRoutes) {
    if (KYC_OR_AUTOMATED.test(name)) problems.push(`ui route ${name} names a KYC or automated-verification surface`);
  }
  return problems.sort();
}

function loadKycSurfaceInput(oracle: string): KycSurfaceInput {
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

export function kycSurfaceProblems(): string[] {
  return scanKycSurfaces(loadKycSurfaceInput('kycSurfaceProblems'));
}

/**
 * The vetted flag is a two-value boolean. A third `pending` / `under review` column or check is a
 * document-review status transition.
 */
export function scanVettedState(migrations: readonly SourceFile[]): string[] {
  const problems: string[] = [];
  let table: { path: string; text: string } | null = null;
  for (const file of migrations) {
    for (const statement of splitSqlStatements(file.text)) {
      if (TABLE_HEAD.test(statement)) table = { path: file.path, text: statement };
    }
  }
  if (table === null) {
    throw new Error('vettedStateProblems found no migration that creates public.org_vetting. Refusing to report a two-value state.');
  }
  if (!/\bvetted\s+boolean\s+not\s+null\b/i.test(table.text)) {
    problems.push(`${table.path} does not declare org_vetting.vetted as boolean not null`);
  }
  if (THIRD_VETTED_STATE.test(table.text)) {
    problems.push(`${table.path} names a third vetting state on public.org_vetting`);
  }
  return problems.sort();
}

export function vettedStateProblems(): string[] {
  return scanVettedState(migrationFiles('vettedStateProblems'));
}
