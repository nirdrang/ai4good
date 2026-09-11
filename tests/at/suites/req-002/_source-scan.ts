/**
 * REQ-002's SOURCE ARMS for AT-002.30 (manual founder vet only), AT-002.16 (no document
 * content is stored or returned), the grant-drift scan (the pinned registry, the TypeScript
 * constants, and the SQL grant function), the exhausted-sentence pin (the TypeScript renderer
 * and the SQL debit raise), the founder-vetted wording arm (no acceptance id; AT-002.23
 * stays red on the listing screens), and the no-wallet arm (no acceptance id; AT-002.10
 * stays red on the missing checkout).
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
 * A jsonb column holding a PDF, or a download screen named `file-desk.tsx`, escapes the document
 * oracle the same way. Rejecting attachments and storing only metadata cannot prove a document
 * was deleted from the founder's mailbox.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  dailyAllowanceExhaustedReason,
  dailyGrantFor,
  DISCOVERY_DAILY_GRANT,
} from '../../../../supabase/functions/_shared/discovery-allowance.ts';
import { WRITE_ROUTES } from '../../../../supabase/functions/_shared/write-routes.ts';
import { AT_CONFIG } from '../../harness/atconfig.ts';
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

/**
 * AT-002.16's structural half: no column holds document bytes, and no route returns a document.
 *
 * WHAT THIS IS NOT. It is a type-and-name oracle. A jsonb or text column holding a base64 PDF
 * escapes it. A download screen named `file-desk.tsx` escapes it. Rejecting attachments and
 * storing only metadata cannot prove a document was deleted from the founder's mailbox; this
 * oracle does not look at a mailbox and does not treat `registration_copies_deleted` as proof.
 */

const DOCUMENT_BYTE_TYPE = /\b([a-zA-Z_][\w]*)\s+bytea\b/gi;

const DOCUMENT_CONTENT_COLUMNS = [
  'attachment',
  'attachment_bytes',
  'attachment_content',
  'binary_content',
  'content_bytes',
  'document_body',
  'document_bytes',
  'document_content',
  'download_path',
  'download_url',
  'file_bytes',
  'file_content',
  'file_data',
  'object_key',
  'object_path',
  'storage_key',
  'storage_path',
] as const;

const DOCUMENT_CONTENT_COLUMN = new RegExp(
  `\\b(${DOCUMENT_CONTENT_COLUMNS.join('|')})\\s+[a-zA-Z_]`,
  'gi',
);

const DOCUMENT_RETURN_NAME =
  /\b(?:attachment[-_]?download|document[-_]?content|document[-_]?download|document[-_]?file|document[-_]?upload|download[-_]?document|get[-_]?attachment|serve[-_]?document|upload[-_]?document)\b/i;

const STORAGE_API = /\bstorage\.from\s*\(|\bcreateBucket\s*\(|\bcreateSignedUrl\s*\(/;
const DOCUMENT_CONTENT_TYPE = /['"]application\/(?:pdf|octet-stream)['"]/;

export type DocumentContentSinkInput = {
  files: readonly SourceFile[];
  routeFolders: readonly string[];
  inventory: RouteInventory;
  uiRoutes: readonly string[];
};

function namedDocumentReturn(name: string, where: string): string | null {
  return DOCUMENT_RETURN_NAME.test(name) ? `${where} ${name} names a document-content route` : null;
}

export function scanDocumentContentSinks(input: DocumentContentSinkInput): string[] {
  if (input.files.length === 0) {
    throw new Error('scanDocumentContentSinks found no product source. Refusing to report an absence.');
  }
  const migrations = input.files.filter((file) => file.path.startsWith('supabase/migrations/') && file.path.endsWith('.sql'));
  if (migrations.length === 0) {
    throw new Error('scanDocumentContentSinks found no SQL migrations under supabase/migrations/. Refusing to report an absence.');
  }
  if (input.routeFolders.length === 0) {
    throw new Error('scanDocumentContentSinks found no edge-function route folders. Refusing to report an absence.');
  }
  if (input.uiRoutes.length === 0) {
    throw new Error('scanDocumentContentSinks found no ui routes under src/routes/. Refusing to report an absence.');
  }

  const problems: string[] = [];

  for (const file of migrations) {
    for (const statement of splitSqlStatements(file.text)) {
      DOCUMENT_BYTE_TYPE.lastIndex = 0;
      for (const match of statement.matchAll(DOCUMENT_BYTE_TYPE)) {
        problems.push(`${file.path} column ${match[1]} is bytea, which can hold document bytes`);
      }
      DOCUMENT_CONTENT_COLUMN.lastIndex = 0;
      for (const match of statement.matchAll(DOCUMENT_CONTENT_COLUMN)) {
        problems.push(`${file.path} column ${match[1]} is a document-content sink`);
      }
    }
  }

  for (const file of input.files) {
    const named = namedDocumentReturn(file.path, file.path);
    if (named) problems.push(named);
    if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) continue;
    if (STORAGE_API.test(file.text)) {
      problems.push(`${file.path}:${lineOf(file.text, file.text.search(STORAGE_API))} calls object storage that can hold a document`);
    }
    if (DOCUMENT_CONTENT_TYPE.test(file.text)) {
      problems.push(`${file.path} answers with a document content type`);
    }
  }

  for (const name of input.routeFolders) {
    const named = namedDocumentReturn(name, 'route folder');
    if (named) problems.push(named);
  }
  for (const name of Object.keys(input.inventory)) {
    const named = namedDocumentReturn(name, 'write route');
    if (named) problems.push(named);
    const rpc = rpcOf(input.inventory[name]);
    if (rpc !== null) {
      const rpcNamed = namedDocumentReturn(rpc, `write route ${name} rpc`);
      if (rpcNamed) problems.push(rpcNamed);
    }
  }
  for (const name of input.uiRoutes) {
    const named = namedDocumentReturn(name, 'ui route');
    if (named) problems.push(named);
  }

  return problems.sort();
}

function loadDocumentContentSinkInput(oracle: string): DocumentContentSinkInput {
  const surfaces = loadKycSurfaceInput(oracle);
  return {
    files: productFiles(oracle),
    routeFolders: surfaces.routeFolders,
    inventory: surfaces.inventory,
    uiRoutes: surfaces.uiRoutes,
  };
}

export function documentContentSinks(): string[] {
  return scanDocumentContentSinks(loadDocumentContentSinkInput('documentContentSinks'));
}

/* ---------------------------------------------------------------------- founder-vetted wording */

/**
 * WHAT THIS IS. A naming-and-copy oracle over quoted strings (and JSX text under src/). It
 * refuses a "verified" trust claim about an organisation, and it refuses a person-facing trust
 * flag whose label is not exactly "founder-vetted".
 *
 * HOW IT TELLS EMAIL VERIFICATION APART FROM AN ORG TRUST CLAIM.
 * "verified" in this tree almost always means the email-confirmation floor (GoTrue
 * `email_confirmed_at`, the `email-unverified` refusal, `Decision<'verified'>` in
 * `verification.ts`). That is a different subject from founder-vetting. An arm that treated
 * every "verified" as a trust claim would be red on honest code and would then be weakened
 * until it proved nothing.
 *
 * The split is the SUBJECT of each string, not a proximity heuristic on the word "email" alone.
 * A string is email or auth verification when it names email, a jwt, a token, or a source
 * address. A string is an organisation trust claim when it names an organisation or NGO and
 * uses "verified" as that organisation's trust word. A standalone "verified" / "Verified" label
 * is a claim only on a person-facing surface (src/, notification-copy, public-project,
 * tenant-reads); the same token in `verification.ts` is the email-decision value and is left
 * alone. Internal identifiers (`DiscoveryTier = 'unverified' | 'vetted'`, `vetted: boolean`)
 * are not a person-facing flag.
 *
 * WHAT THIS IS NOT. A naming oracle. A badge whose text is assembled at runtime, or a listing
 * screen that does not exist yet, escapes it. That is why AT-002.23 stays red on the public
 * listing screens: this arm covers the copy and the projections this tree has, not a render of
 * screens that are not here.
 */

const EMAIL_OR_AUTH_VERIFICATION = /\bemail\b|\bjwt\b|\btoken\b|\bsource address\b/i;
const ORG_SUBJECT = /\b(?:organisation|organization|ngo)\b/i;
const VERIFIED_WORD = /\bverified\b/i;
const WRONG_ORG_TRUST_PREDICATE =
  /\b(?:organisation|organization)\s+is\s+(?:not\s+|no longer\s+)?(?!founder-vetted)(?:verified|vetted)\b/i;
const FOUNDER_VERIFIED_BLEND = /\bfounder-verified\b/i;
const BARE_VERIFIED_LABEL = /^(?:verified|Verified|VERIFIED)$/;
const WRONG_TRUST_SPELLING = /^(?:founder vetted|founder_vetted|founder-verified)$/i;
const BARE_VETTED_UI_LABEL = /^(?:vetted|Vetted|VETTED)$/;
const VERIFIED_FIELD = /\bverified\s*\??\s*:/g;

function isPersonFacingSurface(path: string): boolean {
  return (
    path.startsWith('src/') ||
    path.endsWith('notification-copy.ts') ||
    path.endsWith('public-project.ts') ||
    path.endsWith('tenant-reads.ts')
  );
}

function quotedStrings(text: string): ReadonlyArray<{ value: string; index: number }> {
  const found: Array<{ value: string; index: number }> = [];
  const pattern = /'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g;
  for (const match of text.matchAll(pattern)) {
    found.push({ value: match[1] ?? match[2] ?? match[3] ?? '', index: match.index ?? 0 });
  }
  return found;
}

function jsxTexts(text: string): ReadonlyArray<{ value: string; index: number }> {
  const found: Array<{ value: string; index: number }> = [];
  const pattern = />([^<>{\n]+)</g;
  for (const match of text.matchAll(pattern)) {
    const value = (match[1] ?? '').trim();
    if (value.length === 0) continue;
    found.push({ value, index: match.index ?? 0 });
  }
  return found;
}

export function scanTrustWording(files: readonly SourceFile[]): string[] {
  if (files.length === 0) {
    throw new Error('scanTrustWording found no product source. Refusing to report an absence.');
  }

  const problems: string[] = [];

  for (const file of files) {
    const pieces = [...quotedStrings(file.text), ...(file.path.startsWith('src/') ? jsxTexts(file.text) : [])];
    for (const piece of pieces) {
      if (piece.value.length === 0) continue;
      const loc = `${file.path}:${lineOf(file.text, piece.index)}`;
      const shown = JSON.stringify(piece.value);

      if (WRONG_ORG_TRUST_PREDICATE.test(piece.value) || FOUNDER_VERIFIED_BLEND.test(piece.value)) {
        problems.push(`${loc} names organisation trust as something other than founder-vetted: ${shown}`);
        continue;
      }
      if (VERIFIED_WORD.test(piece.value) && !EMAIL_OR_AUTH_VERIFICATION.test(piece.value) && ORG_SUBJECT.test(piece.value)) {
        problems.push(`${loc} makes a verified trust claim about an organisation: ${shown}`);
        continue;
      }
      if (WRONG_TRUST_SPELLING.test(piece.value)) {
        problems.push(`${loc} uses ${shown} as a trust label; the label is founder-vetted`);
        continue;
      }
      // The one exemption, stated once: `'verified'` in lower case away from a person-facing
      // surface is the email decision's value, as in `Decision<'verified'>`. `'Verified'` is not
      // that value, and neither is the same token in copy a person reads.
      const isEmailDecisionValue = piece.value === 'verified' && !isPersonFacingSurface(file.path);
      if (BARE_VERIFIED_LABEL.test(piece.value) && !isEmailDecisionValue) {
        problems.push(`${loc} uses ${shown} as a trust label; the label is founder-vetted`);
        continue;
      }
      if (file.path.startsWith('src/') && BARE_VETTED_UI_LABEL.test(piece.value)) {
        problems.push(`${loc} uses ${shown} as a trust label; the label is founder-vetted`);
      }
    }

    if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
      VERIFIED_FIELD.lastIndex = 0;
      for (const match of file.text.matchAll(VERIFIED_FIELD)) {
        problems.push(
          `${file.path}:${lineOf(file.text, match.index ?? 0)} names a verified field on a product surface`,
        );
      }
    }
  }

  return [...new Set(problems)].sort();
}

export function trustWordingProblems(): string[] {
  return scanTrustWording(productFiles('trustWordingProblems'));
}

/* ---------------------------------------------------------------------- grant-drift (G5) */

const GRANT_FUNCTION_HEAD = /create\s+(?:or\s+replace\s+)?function\s+public\.discovery_daily_grant\s*\(/i;
const GRANT_VETTED_ARM = /when\s+p_vetted\s+then\s+(\d+)/i;
const GRANT_UNVERIFIED_ARM = /else\s+(\d+)/i;

export type GrantPinInput = {
  unverifiedPin: number;
  vettedPin: number;
  typescriptUnverified: number;
  typescriptVetted: number;
  grantFunctionSql: string;
};

/** SQL arms of `public.discovery_daily_grant`. Throws when the function text cannot be read. */
export function parseGrantFunctionArms(sql: string): { unverified: number; vetted: number } {
  if (!GRANT_FUNCTION_HEAD.test(sql)) {
    throw new Error(
      'parseGrantFunctionArms found no public.discovery_daily_grant definition in the SQL it was given. ' +
        'Refusing to report agreement.',
    );
  }
  const vetted = GRANT_VETTED_ARM.exec(sql);
  const unverified = GRANT_UNVERIFIED_ARM.exec(sql);
  if (vetted === null || unverified === null) {
    throw new Error(
      "parseGrantFunctionArms could not read `when p_vetted then N else M` from public.discovery_daily_grant. " +
        'Refusing to report agreement.',
    );
  }
  return { vetted: Number(vetted[1]), unverified: Number(unverified[1]) };
}

/** Every disagreement between the pinned registry, the TypeScript constants, and the SQL grant. */
export function scanGrantPins(input: GrantPinInput): string[] {
  const arms = parseGrantFunctionArms(input.grantFunctionSql);
  const problems: string[] = [];
  const rows: ReadonlyArray<{ label: string; value: number; pin: number; pinName: string }> = [
    { label: 'DISCOVERY_DAILY_GRANT.unverified', value: input.typescriptUnverified, pin: input.unverifiedPin, pinName: 'unverified pin' },
    { label: 'DISCOVERY_DAILY_GRANT.vetted', value: input.typescriptVetted, pin: input.vettedPin, pinName: 'vetted pin' },
    { label: 'discovery_daily_grant unverified arm', value: arms.unverified, pin: input.unverifiedPin, pinName: 'unverified pin' },
    { label: 'discovery_daily_grant vetted arm', value: arms.vetted, pin: input.vettedPin, pinName: 'vetted pin' },
  ];
  for (const row of rows) {
    if (row.value !== row.pin) {
      problems.push(`${row.label} is ${row.value}, ${row.pinName} is ${row.pin}`);
    }
  }
  return problems.sort();
}

function lastGrantFunctionSql(oracle: string): string {
  const files = migrationFiles(oracle);
  let last: { path: string; text: string } | null = null;
  for (const file of files) {
    for (const statement of splitSqlStatements(file.text)) {
      if (GRANT_FUNCTION_HEAD.test(statement)) last = { path: file.path, text: statement };
    }
  }
  if (last === null) {
    throw new Error(
      `${oracle} found no migration defining public.discovery_daily_grant, so there is no SQL grant to compare. ` +
        'Refusing to report agreement.',
    );
  }
  return last.text;
}

function pinnedGrant(key: 'discoveryDailyCreditsUnverified' | 'discoveryDailyCreditsVetted'): number {
  const value = AT_CONFIG[key].value;
  if (typeof value !== 'number') {
    throw new Error(
      `grantPinProblems: ${key} is not a pinned number (${JSON.stringify(value)}). Refusing to report agreement.`,
    );
  }
  return value;
}

export function grantPinProblems(): string[] {
  const unverifiedPin = pinnedGrant('discoveryDailyCreditsUnverified');
  const vettedPin = pinnedGrant('discoveryDailyCreditsVetted');
  const problems = scanGrantPins({
    unverifiedPin,
    vettedPin,
    typescriptUnverified: DISCOVERY_DAILY_GRANT.unverified,
    typescriptVetted: DISCOVERY_DAILY_GRANT.vetted,
    grantFunctionSql: lastGrantFunctionSql('grantPinProblems'),
  });
  if (dailyGrantFor('unverified') !== unverifiedPin) {
    problems.push(`dailyGrantFor('unverified') is ${dailyGrantFor('unverified')}, unverified pin is ${unverifiedPin}`);
  }
  if (dailyGrantFor('vetted') !== vettedPin) {
    problems.push(`dailyGrantFor('vetted') is ${dailyGrantFor('vetted')}, vetted pin is ${vettedPin}`);
  }
  return [...new Set(problems)].sort();
}

/* ---------------------------------------------------------------------- exhausted-sentence pin */

const ALLOWANCE_FUNCTION_HEAD = /create\s+(?:or\s+replace\s+)?function\s+public\.discovery_allowance\s*\(/i;
const EXHAUSTED_RAISE =
  /raise\s+exception\s+'((?:[^']|'')*)'([^;]*);/gi;
const EXHAUSTED_DETAIL = /detail\s*=\s*'daily-allowance-exhausted'/i;
const EXHAUSTED_ERRCODE = /errcode\s*=\s*'P0001'/i;
const EXHAUSTED_ARGS = /^\s*,\s*([^,]+)\s*,\s*([\s\S]+?)\s+using\s+/i;
const GRANT_FROM_FUNCTION = /^public\.discovery_daily_grant\(\s*true\s*\)$/i;
const RENDERER_HEAD = /export function dailyAllowanceExhaustedReason\(/;
const VETTED_GRANT_READ = /dailyGrantFor\(\s*['"]vetted['"]\s*\)/;

export type ExhaustedRaise = {
  format: string;
  organizationArg: string;
  grantArg: string;
};

export type ExhaustedSentenceInput = {
  renderedReason: string;
  organizationId: string;
  vettedGrant: number;
  allowanceFunctionSql: string;
  typescriptRendererSource: string;
};

/** The `daily-allowance-exhausted` raise inside `public.discovery_allowance`. Throws when it cannot be read. */
export function parseExhaustedRaise(sql: string): ExhaustedRaise {
  if (!ALLOWANCE_FUNCTION_HEAD.test(sql)) {
    throw new Error(
      'parseExhaustedRaise found no public.discovery_allowance definition in the SQL it was given. ' +
        'Refusing to report agreement.',
    );
  }
  EXHAUSTED_RAISE.lastIndex = 0;
  let found: ExhaustedRaise | null = null;
  for (const match of sql.matchAll(EXHAUSTED_RAISE)) {
    const tail = match[2] ?? '';
    if (!EXHAUSTED_DETAIL.test(tail) || !EXHAUSTED_ERRCODE.test(tail)) continue;
    const args = EXHAUSTED_ARGS.exec(tail);
    if (args === null || args[1] === undefined || args[2] === undefined) {
      throw new Error(
        'parseExhaustedRaise could not read the daily-allowance-exhausted raise as a format string, ' +
          'p_organization_id, and a grant argument. Refusing to report agreement.',
      );
    }
    found = {
      format: (match[1] ?? '').replace(/''/g, "'"),
      organizationArg: args[1].trim(),
      grantArg: args[2].trim(),
    };
  }
  if (found === null) {
    throw new Error(
      'parseExhaustedRaise could not read the daily-allowance-exhausted raise as a format string, ' +
        'p_organization_id, and a grant argument. Refusing to report agreement.',
    );
  }
  return found;
}

/** The exported TypeScript renderer. Throws when the function text cannot be read. */
export function parseTypescriptExhaustedRenderer(source: string): string {
  const start = source.search(RENDERER_HEAD);
  if (start < 0) {
    throw new Error(
      'parseTypescriptExhaustedRenderer found no export function dailyAllowanceExhaustedReason. ' +
        'Refusing to report agreement.',
    );
  }
  const match = /export function dailyAllowanceExhaustedReason\([\s\S]*?\r?\n\}\r?\n/.exec(source.slice(start));
  if (match === null) {
    throw new Error(
      'parseTypescriptExhaustedRenderer could not read the body of dailyAllowanceExhaustedReason. ' +
        'Refusing to report agreement.',
    );
  }
  return match[0];
}

function applyRaiseFormat(format: string, values: readonly string[]): string {
  let index = 0;
  return format.replace(/%/g, () => {
    const value = values[index];
    index += 1;
    if (value === undefined) {
      throw new Error(
        'applyRaiseFormat ran out of values before the format string ran out of % slots. Refusing to report agreement.',
      );
    }
    return value;
  });
}

/** Every disagreement between the TypeScript exhausted renderer and the SQL debit raise. */
export function scanExhaustedSentence(input: ExhaustedSentenceInput): string[] {
  const raise = parseExhaustedRaise(input.allowanceFunctionSql);
  const problems: string[] = [];
  if (raise.organizationArg !== 'p_organization_id') {
    problems.push(
      `exhausted raise organisation argument is ${raise.organizationArg}, expected p_organization_id`,
    );
  }
  if (!GRANT_FROM_FUNCTION.test(raise.grantArg)) {
    problems.push(
      `exhausted raise grant argument is ${raise.grantArg}, expected public.discovery_daily_grant(true)`,
    );
  }
  if (/\d/.test(raise.format)) {
    problems.push('the SQL exhausted sentence contains a numeric literal');
  }
  if (!VETTED_GRANT_READ.test(input.typescriptRendererSource)) {
    problems.push("dailyAllowanceExhaustedReason does not read the vetted grant from dailyGrantFor('vetted')");
  }
  if (/\b\d+\b/.test(input.typescriptRendererSource)) {
    problems.push('dailyAllowanceExhaustedReason contains a numeric literal');
  }
  const fromSql = applyRaiseFormat(raise.format, [input.organizationId, String(input.vettedGrant)]);
  if (fromSql !== input.renderedReason) {
    problems.push(
      `TypeScript exhausted sentence is ${JSON.stringify(input.renderedReason)}, ` +
        `SQL raise filled with the vetted grant is ${JSON.stringify(fromSql)}`,
    );
  }
  return problems.sort();
}

function lastAllowanceFunctionSql(oracle: string): string {
  const files = migrationFiles(oracle);
  let last: { path: string; text: string } | null = null;
  for (const file of files) {
    for (const statement of splitSqlStatements(file.text)) {
      if (ALLOWANCE_FUNCTION_HEAD.test(statement)) last = { path: file.path, text: statement };
    }
  }
  if (last === null) {
    throw new Error(
      `${oracle} found no migration defining public.discovery_allowance, so there is no SQL raise to compare. ` +
        'Refusing to report agreement.',
    );
  }
  return last.text;
}

function typescriptRendererFile(oracle: string): string {
  const path = join(REPO_ROOT, 'supabase', 'functions', '_shared', 'discovery-allowance.ts');
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(
      `${oracle} could not read ${posix(path)}: ${(error as Error).message}. Refusing to report agreement.`,
    );
  }
}

export function exhaustedSentenceProblems(): string[] {
  const organizationId = '00000000-0000-4000-8000-000000000002';
  return scanExhaustedSentence({
    renderedReason: dailyAllowanceExhaustedReason(organizationId),
    organizationId,
    vettedGrant: dailyGrantFor('vetted'),
    allowanceFunctionSql: lastAllowanceFunctionSql('exhaustedSentenceProblems'),
    typescriptRendererSource: parseTypescriptExhaustedRenderer(typescriptRendererFile('exhaustedSentenceProblems')),
  });
}

/* ---------------------------------------------------------------------- no Discovery wallet */

/**
 * WHAT THIS IS. A naming oracle over surface names, declaration names, quoted strings, and JSX
 * text. It refuses a Discovery wallet, a Discovery-credit product for sale, and a Discovery-only
 * balance a caller can hold or buy.
 *
 * HOW IT TELLS A DAILY GRANT APART FROM A WALLET.
 * A wallet is a stored, purchasable, carried-over balance. The tree is full of legitimate
 * Discovery credits that are none of those: a daily grant, a spend row, a debit, a remaining
 * count. Remaining is `granted - spent` and is never stored. An arm that treated every
 * "Discovery credit" as a wallet would be red on honest code and would then be weakened until
 * it proved nothing.
 *
 * The split is the SUBJECT of each name or string, not a proximity count of the word "credit".
 * A name or string is a Discovery wallet when it names Discovery together with wallet, sku,
 * buy/purchase/top-up, or a holdable balance. A name or string is daily-grant accounting when
 * it names grant, granted, spent, remaining, debit, allowance, or "left today" and does not
 * also name a wallet form. Ordinary project fuel, the general balance, and Lovable credits are
 * a different subject and are left alone.
 *
 * WHAT THIS IS NOT. A disguised `credit-desk.tsx` escapes it, as does a `balance` column
 * added to `discovery_spend` under that word, and copy assembled at runtime. That is why
 * AT-002.10 stays red on the missing checkout: this arm covers the names and the copy this
 * tree has, not a paid-continuation path that is not here.
 */

const TS_DECLARATION =
  /\b(?:export\s+)?(?:type|interface|class|function|const|let|enum)\s+([A-Za-z_][\w]*)/g;
const SQL_TABLE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([A-Za-z_][\w]*)/gi;
const SQL_FUNCTION = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([A-Za-z_][\w]*)/gi;
const SQL_TYPE = /create\s+type\s+(?:public\.)?([A-Za-z_][\w]*)/gi;

export type DiscoveryWalletInput = {
  files: readonly SourceFile[];
  routeFolders: readonly string[];
  inventory: RouteInventory;
  sharedModules: readonly string[];
  uiRoutes: readonly string[];
};

function words(raw: string): string[] {
  return raw
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

function hasDiscovery(tokens: readonly string[]): boolean {
  return tokens.includes('discovery');
}

function hasToken(tokens: readonly string[], ...names: readonly string[]): boolean {
  return names.some((name) => tokens.includes(name));
}

function hasWalletForm(tokens: readonly string[]): boolean {
  if (hasToken(tokens, 'wallet', 'wallets', 'sku', 'skus')) return true;
  if (hasToken(tokens, 'buy', 'purchase', 'purchases', 'purchasable')) return true;
  if (hasToken(tokens, 'topup') || (tokens.includes('top') && tokens.includes('up'))) return true;
  return false;
}

function isDailyGrantAccounting(tokens: readonly string[]): boolean {
  return (
    tokens.includes('grant') ||
    tokens.includes('granted') ||
    tokens.includes('spent') ||
    tokens.includes('remaining') ||
    tokens.includes('debit') ||
    tokens.includes('allowance') ||
    tokens.includes('daily') ||
    (tokens.includes('left') && tokens.includes('today'))
  );
}

/** A type, table, route, or file whose name is a Discovery wallet. */
function isDiscoveryWalletName(raw: string): boolean {
  const tokens = words(raw);
  if (!hasDiscovery(tokens)) return false;
  if (hasWalletForm(tokens)) return true;
  return hasToken(tokens, 'balance', 'balances');
}

/**
 * Quoted copy is a Discovery wallet when it names Discovery together with a wallet form, a
 * credit sale that is not fuel, or a holdable balance that is not the day's remaining.
 */
function isDiscoveryWalletCopy(value: string): boolean {
  const tokens = words(value);
  if (!hasDiscovery(tokens)) return false;
  if (hasToken(tokens, 'wallet', 'wallets', 'sku', 'skus')) return true;
  const sale = hasWalletForm(tokens);
  const credits = hasToken(tokens, 'credit', 'credits');
  if (sale && credits && !tokens.includes('fuel')) return true;
  if (hasToken(tokens, 'balance', 'balances') && !isDailyGrantAccounting(tokens)) return true;
  return false;
}

function namedWallet(name: string, where: string): string | null {
  return isDiscoveryWalletName(name)
    ? `${where} ${name} names a Discovery wallet, a Discovery-credit product for sale, or a Discovery-only balance`
    : null;
}

function declarationNames(text: string): string[] {
  const names: string[] = [];
  TS_DECLARATION.lastIndex = 0;
  for (const match of text.matchAll(TS_DECLARATION)) {
    if (match[1] !== undefined) names.push(match[1]);
  }
  SQL_TABLE.lastIndex = 0;
  for (const match of text.matchAll(SQL_TABLE)) {
    if (match[1] !== undefined) names.push(match[1]);
  }
  SQL_FUNCTION.lastIndex = 0;
  for (const match of text.matchAll(SQL_FUNCTION)) {
    if (match[1] !== undefined) names.push(match[1]);
  }
  SQL_TYPE.lastIndex = 0;
  for (const match of text.matchAll(SQL_TYPE)) {
    if (match[1] !== undefined) names.push(match[1]);
  }
  return names;
}

export function scanDiscoveryWallet(input: DiscoveryWalletInput): string[] {
  if (input.files.length === 0) {
    throw new Error('scanDiscoveryWallet found no product source. Refusing to report an absence.');
  }

  const problems: string[] = [];

  for (const name of input.routeFolders) {
    const named = namedWallet(name, 'route folder');
    if (named) problems.push(named);
  }
  for (const name of Object.keys(input.inventory)) {
    const named = namedWallet(name, 'write route');
    if (named) problems.push(named);
    const rpc = rpcOf(input.inventory[name]);
    if (rpc !== null) {
      const rpcNamed = namedWallet(rpc, `write route ${name} rpc`);
      if (rpcNamed) problems.push(rpcNamed);
    }
  }
  for (const name of input.sharedModules) {
    const named = namedWallet(name, 'shared module');
    if (named) problems.push(named);
  }
  for (const name of input.uiRoutes) {
    const named = namedWallet(name, 'ui route');
    if (named) problems.push(named);
  }

  for (const file of input.files) {
    const pathNamed = namedWallet(file.path, file.path);
    if (pathNamed) problems.push(pathNamed);
    for (const name of declarationNames(file.text)) {
      if (!isDiscoveryWalletName(name)) continue;
      problems.push(
        `${file.path} declares ${name} as a Discovery wallet, a Discovery-credit product for sale, or a Discovery-only balance`,
      );
    }
    const pieces = [...quotedStrings(file.text), ...(file.path.startsWith('src/') ? jsxTexts(file.text) : [])];
    for (const piece of pieces) {
      if (piece.value.length === 0) continue;
      if (!isDiscoveryWalletCopy(piece.value)) continue;
      const loc = `${file.path}:${lineOf(file.text, piece.index)}`;
      problems.push(
        `${loc} names a Discovery wallet, a Discovery-credit product for sale, or a Discovery-only balance: ${JSON.stringify(piece.value)}`,
      );
    }
  }

  return [...new Set(problems)].sort();
}

export function discoveryWalletProblems(): string[] {
  const surfaces = loadKycSurfaceInput('discoveryWalletProblems');
  return scanDiscoveryWallet({
    files: productFiles('discoveryWalletProblems'),
    routeFolders: surfaces.routeFolders,
    inventory: surfaces.inventory,
    sharedModules: surfaces.sharedModules,
    uiRoutes: surfaces.uiRoutes,
  });
}
