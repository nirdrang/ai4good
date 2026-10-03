import { splitSqlStatements } from '../req-001/_policy-scan.ts';
import {
  CRON,
  hasToken,
  jsxTexts,
  lineOf,
  loadProductSurfaces,
  productFiles,
  quotedStrings,
  rpcOf,
  words,
  type RouteInventory,
  type SourceFile,
} from './_source-scan.ts';

const EMAIL_OR_AUTH_VERIFICATION = /\bemail\b|\bjwt\b|\btoken\b|\bsource address\b/i;
const EMAIL_OR_AUTH_FIELD = /\bemail\b|\bjwt\b|\btoken\b|\bdomain\b|\bwebhook\b|\bsignature\b|\bsource address\b/i;
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

function enclosingDeclaration(text: string, index: number): string {
  const head = /(?:export\s+)?(?:type|interface|class|const|let|enum|function)\s+[A-Za-z_][\w]*/g;
  let start = Math.max(0, index - 200);
  for (const match of text.matchAll(head)) {
    const at = match.index ?? 0;
    if (at <= index) start = at;
    else break;
  }
  return text.slice(start, Math.min(text.length, index + 400));
}

function isOrgTrustVerifiedField(path: string, enclosing: string): boolean {
  if (EMAIL_OR_AUTH_FIELD.test(enclosing) && !ORG_SUBJECT.test(enclosing)) return false;
  if (isPersonFacingSurface(path)) return true;
  return ORG_SUBJECT.test(enclosing);
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
        const index = match.index ?? 0;
        if (!isOrgTrustVerifiedField(file.path, enclosingDeclaration(file.text, index))) continue;
        problems.push(
          `${file.path}:${lineOf(file.text, index)} names a verified field on a product surface`,
        );
      }
    }
  }

  return [...new Set(problems)].sort();
}

export function trustWordingProblems(): string[] {
  return scanTrustWording(productFiles('trustWordingProblems'));
}

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

function hasDiscovery(tokens: readonly string[]): boolean {
  return tokens.includes('discovery');
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

function isDiscoveryWalletName(raw: string): boolean {
  const tokens = words(raw);
  if (!hasDiscovery(tokens)) return false;
  if (hasWalletForm(tokens)) return true;
  return hasToken(tokens, 'balance', 'balances') && !isDailyGrantAccounting(tokens);
}

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
  const surfaces = loadProductSurfaces('discoveryWalletProblems');
  return scanDiscoveryWallet({
    files: productFiles('discoveryWalletProblems'),
    routeFolders: surfaces.routeFolders,
    inventory: surfaces.inventory,
    sharedModules: surfaces.sharedModules,
    uiRoutes: surfaces.uiRoutes,
  });
}

const PROJECTS_TABLE_HEAD = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?projects\b/i;
const TRIGGER_ON_PROJECTS = /create\s+trigger\b[\s\S]*\bon\s+(?:only\s+)?(?:public\.)?projects\b/i;
const PROJECTS_DML =
  /\b(?:insert\s+into|update|delete\s+from|truncate(?:\s+table)?)\s+(?:only\s+)?(?:public\.)?projects\b/i;
const ALTER_TABLE_HEAD = /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?([A-Za-z_][\w]*)/i;
const ADD_COLUMN = /\badd(?:\s+column)?\s+(?:if\s+not\s+exists\s+)?([A-Za-z_][\w]*)/gi;
const ADD_COLUMN_KEYWORDS = new Set([
  'constraint',
  'check',
  'primary',
  'unique',
  'foreign',
  'column',
  'if',
  'not',
  'exists',
  'only',
  'validate',
]);

export type AbsentPublishFlowInput = {
  files: readonly SourceFile[];
  routeFolders: readonly string[];
  inventory: RouteInventory;
  sharedModules: readonly string[];
  uiRoutes: readonly string[];
};

function isNotificationOrAccountName(tokens: readonly string[]): boolean {
  return hasToken(tokens, 'notification', 'notifications', 'account', 'accounts');
}

function isProjectPublishName(raw: string): boolean {
  const tokens = words(raw);
  if (tokens.length === 0) return false;
  if (hasToken(tokens, 'public') && !hasToken(tokens, 'publish', 'publishing', 'published', 'publication', 'publications')) {
    return false;
  }
  if (hasToken(tokens, 'notification', 'notifications', 'emit', 'emitter', 'delivery', 'deliveries')) return false;
  if (
    hasToken(tokens, 'publish', 'publishing', 'published', 'publication', 'publications') &&
    hasToken(tokens, 'allowed', 'allow', 'permit', 'permitted')
  ) {
    return false;
  }
  if (hasToken(tokens, 'publish', 'publishing', 'published', 'publication', 'publications')) return true;
  if (hasToken(tokens, 'triage')) return true;
  if (
    hasToken(tokens, 'visibility') &&
    hasToken(tokens, 'project', 'projects', 'publish', 'publishing', 'published', 'publication')
  ) {
    return true;
  }
  if (hasToken(tokens, 'scoped') && hasToken(tokens, 'project', 'projects')) return true;
  if (
    hasToken(tokens, 'project', 'projects') &&
    hasToken(tokens, 'lifecycle', 'state', 'status') &&
    !hasToken(tokens, 'account', 'accounts')
  ) {
    return true;
  }
  return false;
}

function isProjectPublishColumn(table: string, column: string): boolean {
  const tableTokens = words(table);
  const colTokens = words(column);
  if (isNotificationOrAccountName(tableTokens)) return false;
  const projectTable = table === 'projects' || hasToken(tableTokens, 'project', 'projects');
  if (hasToken(colTokens, 'visibility', 'published', 'publish', 'publishing', 'publication', 'triage', 'scoped')) {
    return projectTable || isProjectPublishName(table);
  }
  return projectTable && hasToken(colTokens, 'lifecycle', 'state', 'status');
}

function namedPublishSurface(name: string, where: string): string | null {
  return isProjectPublishName(name) ? `${where} ${name} names a publish surface` : null;
}

function createTableColumns(statement: string): { table: string; columns: string[] } | null {
  const match = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([A-Za-z_][\w]*)\s*\(/i.exec(statement);
  if (match === null || match.index === undefined || match[1] === undefined) return null;
  const open = statement.indexOf('(', match.index);
  if (open < 0) return null;
  let depth = 0;
  let close = -1;
  for (let i = open; i < statement.length; i += 1) {
    if (statement[i] === '(') depth += 1;
    else if (statement[i] === ')') {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close < 0) return null;
  return { table: match[1], columns: columnNamesFromTableBody(statement.slice(open + 1, close)) };
}

function columnNamesFromTableBody(body: string): string[] {
  const names: string[] = [];
  let current = '';
  let depth = 0;
  for (const ch of body) {
    if (ch === '(') {
      depth += 1;
      current += ch;
      continue;
    }
    if (ch === ')') {
      depth -= 1;
      current += ch;
      continue;
    }
    if (ch === ',' && depth === 0) {
      pushTableMemberName(names, current);
      current = '';
      continue;
    }
    current += ch;
  }
  pushTableMemberName(names, current);
  return names;
}

function pushTableMemberName(names: string[], piece: string): void {
  const trimmed = piece.trim();
  if (trimmed.length === 0) return;
  if (/^(constraint|check|primary|unique|foreign|exclude|like)\b/i.test(trimmed)) return;
  const name = /^"?([A-Za-z_][\w]*)"?/.exec(trimmed);
  if (name?.[1] !== undefined) names.push(name[1]);
}

function addedColumns(statement: string): { table: string; columns: string[] } | null {
  const head = ALTER_TABLE_HEAD.exec(statement);
  if (head === null || head[1] === undefined) return null;
  const columns: string[] = [];
  ADD_COLUMN.lastIndex = 0;
  for (const match of statement.matchAll(ADD_COLUMN)) {
    const name = match[1];
    if (name === undefined || ADD_COLUMN_KEYWORDS.has(name.toLowerCase())) continue;
    columns.push(name);
  }
  return { table: head[1], columns };
}

function cronChangesAProject(statement: string): boolean {
  if (!CRON.test(statement)) return false;
  if (PROJECTS_DML.test(statement)) return true;
  const tokens = words(statement);
  if (hasToken(tokens, 'publish', 'publishing', 'published', 'publication', 'publications')) return true;
  if (hasToken(tokens, 'triage') && !hasToken(tokens, 'notification', 'notifications')) return true;
  if (hasToken(tokens, 'visibility') && hasToken(tokens, 'project', 'projects')) return true;
  if (hasToken(tokens, 'scoped') && hasToken(tokens, 'project', 'projects')) return true;
  if (hasToken(tokens, 'age', 'aged', 'aging') && hasToken(tokens, 'project', 'projects')) return true;
  return false;
}

function triggerWouldChangeProjectPublishState(statement: string): boolean {
  if (!TRIGGER_ON_PROJECTS.test(statement)) return false;
  const tokens = words(statement);
  if (hasToken(tokens, 'publish', 'publishing', 'published', 'publication', 'visibility', 'scoped', 'triage', 'aging', 'aged', 'lifecycle')) {
    return true;
  }
  return hasToken(tokens, 'age');
}

export function scanAbsentPublishFlow(input: AbsentPublishFlowInput): string[] {
  if (input.files.length === 0) {
    throw new Error('scanAbsentPublishFlow found no product source. Refusing to report an absence.');
  }
  const migrations = input.files.filter((file) => file.path.startsWith('supabase/migrations/') && file.path.endsWith('.sql'));
  if (migrations.length === 0) {
    throw new Error('scanAbsentPublishFlow found no SQL migrations under supabase/migrations/. Refusing to report an absence.');
  }
  let sawProjectsTable = false;
  for (const file of migrations) {
    for (const statement of splitSqlStatements(file.text)) {
      if (PROJECTS_TABLE_HEAD.test(statement)) sawProjectsTable = true;
    }
  }
  if (!sawProjectsTable) {
    throw new Error(
      'scanAbsentPublishFlow found no migration that creates public.projects, so "no publish state on projects" names nothing. ' +
        'Refusing to report an absence.',
    );
  }

  const problems: string[] = [];

  for (const name of input.routeFolders) {
    const named = namedPublishSurface(name, 'route folder');
    if (named) problems.push(named);
  }
  for (const name of Object.keys(input.inventory)) {
    const named = namedPublishSurface(name, 'write route');
    if (named) problems.push(named);
    const rpc = rpcOf(input.inventory[name]);
    if (rpc !== null) {
      const rpcNamed = namedPublishSurface(rpc, `write route ${name} rpc`);
      if (rpcNamed) problems.push(rpcNamed);
    }
  }
  for (const name of input.sharedModules) {
    const named = namedPublishSurface(name, 'shared module');
    if (named) problems.push(named);
  }
  for (const name of input.uiRoutes) {
    const named = namedPublishSurface(name, 'ui route');
    if (named) problems.push(named);
  }

  for (const file of migrations) {
    for (const statement of splitSqlStatements(file.text)) {
      const table = createTableColumns(statement);
      if (table !== null) {
        if (isProjectPublishName(table.table)) {
          problems.push(`${file.path} table ${table.table} holds a publish state, a visibility, or a triage queue`);
        }
        for (const column of table.columns) {
          if (isProjectPublishColumn(table.table, column)) {
            problems.push(
              `${file.path} column ${table.table}.${column} holds a publish state, a visibility, or a triage queue`,
            );
          }
        }
      }
      const altered = addedColumns(statement);
      if (altered !== null) {
        for (const column of altered.columns) {
          if (isProjectPublishColumn(altered.table, column)) {
            problems.push(
              `${file.path} column ${altered.table}.${column} holds a publish state, a visibility, or a triage queue`,
            );
          }
        }
      }
      SQL_FUNCTION.lastIndex = 0;
      for (const match of statement.matchAll(SQL_FUNCTION)) {
        const name = match[1];
        if (name !== undefined && isProjectPublishName(name)) {
          problems.push(`${file.path} function ${name} publishes a project`);
        }
      }
      SQL_TYPE.lastIndex = 0;
      for (const match of statement.matchAll(SQL_TYPE)) {
        const name = match[1];
        if (name !== undefined && isProjectPublishName(name)) {
          problems.push(`${file.path} type ${name} holds a publish state, a visibility, or a triage queue`);
        }
      }
      if (cronChangesAProject(statement)) {
        problems.push(`${file.path} schedules a change to a project`);
      }
      if (triggerWouldChangeProjectPublishState(statement)) {
        problems.push(`${file.path} creates a trigger that would change a project's publish or scope state`);
      }
    }
  }

  return [...new Set(problems)].sort();
}

export function absentPublishFlowProblems(): string[] {
  const surfaces = loadProductSurfaces('absentPublishFlowProblems');
  return scanAbsentPublishFlow({
    files: productFiles('absentPublishFlowProblems'),
    routeFolders: surfaces.routeFolders,
    inventory: surfaces.inventory,
    sharedModules: surfaces.sharedModules,
    uiRoutes: surfaces.uiRoutes,
  });
}
