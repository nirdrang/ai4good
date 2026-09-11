/**
 * REQ-002's vetting-surface source arms: the vet is manual, single-writer, unscheduled;
 * no KYC or automated-verification surface exists; the vetted flag is a two-value boolean.
 *
 * Shared posture (throws rather than report an absence the instrument could not measure;
 * naming oracles over text): `_source-scan.ts`.
 */

import { WRITE_ROUTES } from '../../../../supabase/functions/_shared/write-routes.ts';
import { splitSqlStatements } from '../req-001/_policy-scan.ts';
import {
  CRON,
  DEFINER_HEAD,
  VETTING_DEFINER,
  VETTING_TABLE,
  loadProductSurfaces,
  lineOf,
  migrationFiles,
  productFiles,
  rpcOf,
  type RouteInventory,
  type SourceFile,
  type SurfaceInventory,
} from './_source-scan.ts';

const KYC_OR_AUTOMATED =
  /\bkyc\b|automated[-_ ]?verif(?:ication|y)|document[-_ ]?review|identity[-_ ]?verif(?:ication|y)/i;

const THIRD_VETTED_STATE = /\b(?:pending|under[_ ]?review|in[_ ]?review|review_status|verification_status|document[_ ]?review)\b/i;

const VETTING_WRITE =
  /\b(?:insert\s+into|update|delete\s+from)\s+(?:public\.)?org_vetting\b/gi;
const CLIENT_VETTING_WRITE =
  /\.from\(\s*['"]org_vetting['"]\s*\)\s*\.(?:insert|upsert|update|delete)\b/g;

const TABLE_HEAD = /create\s+table\s+public\.org_vetting\b/i;

const VETTED_COLUMN_ASSIGN = /\bnew\.vetted\s*:=/i;
const VETTED_COLUMN_SET = /\bset\s+vetted\s*=/i;
const CRON_VETS = /\b(?:org_vetting|set_organization_vetting)\b/i;

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
    if (rpcOf(route) === VETTING_DEFINER) reaching.push(name);
  }
  if (reaching.length === 0) {
    problems.push(`no write route reaches public.${VETTING_DEFINER}`);
    return problems;
  }
  if (reaching.length !== 1) {
    problems.push(`write routes that reach public.${VETTING_DEFINER}: ${reaching.join(', ')} (expected exactly one)`);
  }
  for (const name of reaching) {
    const admits = admitsOf(inventory[name]);
    if (admits === null) {
      problems.push(`${name} reaches public.${VETTING_DEFINER} without an account-required standing`);
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
            `${file.path} writes public.${VETTING_TABLE} outside public.${VETTING_DEFINER}: ${match[0].replace(/\s+/g, ' ')}`,
          );
        }
      }
      continue;
    }
    VETTING_WRITE.lastIndex = 0;
    for (const match of file.text.matchAll(VETTING_WRITE)) {
      problems.push(`${file.path}:${lineOf(file.text, match.index)} writes public.${VETTING_TABLE} from a product module`);
    }
    CLIENT_VETTING_WRITE.lastIndex = 0;
    for (const match of file.text.matchAll(CLIENT_VETTING_WRITE)) {
      problems.push(`${file.path}:${lineOf(file.text, match.index)} writes ${VETTING_TABLE} through a client insert`);
    }
  }

  if (!definerDefined) {
    throw new Error(
      `orgVettingWriterProblems found no migration defining public.${VETTING_DEFINER}, so "outside the definer" names nothing. ` +
        'Refusing to report an absence.',
    );
  }
  return problems.sort();
}

export function orgVettingWriterProblems(): string[] {
  return scanOrgVettingWriters(productFiles('orgVettingWriterProblems'));
}

function writesVettedColumn(statement: string): boolean {
  return VETTED_COLUMN_ASSIGN.test(statement) || VETTED_COLUMN_SET.test(statement);
}

/**
 * No cron job that vets, and no writer of the `vetted` column outside the definer. A trigger that
 * maintains a derived row on `org_vetting` is not automated vetting.
 */
export function scanScheduledVetting(migrations: readonly SourceFile[]): string[] {
  const problems: string[] = [];
  for (const file of migrations) {
    for (const statement of splitSqlStatements(file.text)) {
      if (DEFINER_HEAD.test(statement)) continue;
      if (writesVettedColumn(statement)) {
        problems.push(`${file.path} writes public.${VETTING_TABLE}.vetted outside public.${VETTING_DEFINER}`);
      }
      if (CRON.test(statement) && CRON_VETS.test(statement)) {
        problems.push(`${file.path} schedules a job that vets`);
      }
    }
  }
  return problems.sort();
}

export function scheduledVettingProblems(): string[] {
  return scanScheduledVetting(migrationFiles('scheduledVettingProblems'));
}

export type KycSurfaceInput = SurfaceInventory;

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

export function kycSurfaceProblems(): string[] {
  return scanKycSurfaces(loadProductSurfaces('kycSurfaceProblems'));
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
