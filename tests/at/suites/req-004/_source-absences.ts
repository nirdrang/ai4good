import { WRITE_ROUTES } from '../../../../supabase/functions/_shared/write-routes.ts';
import { splitSqlStatements } from '../req-001/_policy-scan.ts';
import {
  CRON,
  hasToken,
  lineOf,
  loadProductSurfaces,
  migrationFiles,
  productFiles,
  quotedStrings,
  rpcOf,
  words,
  type RouteInventory,
  type SourceFile,
} from '../req-002/_source-scan.ts';

const TS_DECLARATION =
  /\b(?:export\s+)?(?:type|interface|class|function|const|let|enum)\s+([A-Za-z_][\w]*)/g;
const SQL_TABLE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([A-Za-z_][\w]*)/gi;
const SQL_FUNCTION = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([A-Za-z_][\w]*)/gi;
const SQL_TYPE = /create\s+type\s+(?:public\.)?([A-Za-z_][\w]*)/gi;
const SQL_TRIGGER = /create\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+([A-Za-z_][\w]*)/gi;
const SPEND_WRITE =
  /\b(?:insert\s+into|update|delete\s+from)\s+(?:only\s+)?(?:public\.)?discovery_spend\b/i;
const GRANT_MARK_CALL = /\b(?:perform|select)\s+public\.apply_discovery_grant_mark\s*\(/gi;
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
const SWITCH_COLUMNS = ['discovery_disabled_at', 'discovery_disabled_by', 'discovery_disabled_reason'] as const;
const COST_MICROS = new Set([
  'micros_per_credit',
  'input_micros_per_token',
  'output_micros_per_token',
  'reserved_micros',
  'actual_micros',
  'overrun_micros',
]);
const MONEY_WORDS = ['usd', 'cents', 'dollars', 'price', 'amount', 'paid', 'stripe', 'fuel'] as const;
const MONEY_TABLES = new Set(['discovery_spend', 'discovery_turns']);
const ALLOWED_GRANT_SURFACES = new Set(['discovery-allowance', 'discovery_allowance']);

export type SupplementalGrantInput = {
  files: readonly SourceFile[];
  inventory: RouteInventory;
};

export type PlatformBreakerInput = {
  files: readonly SourceFile[];
  routeFolders: readonly string[];
  inventory: RouteInventory;
  sharedModules: readonly string[];
  uiRoutes: readonly string[];
};

export type FreeCreditsMoneyInput = {
  files: readonly SourceFile[];
};

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
  SQL_TRIGGER.lastIndex = 0;
  for (const match of text.matchAll(SQL_TRIGGER)) {
    if (match[1] !== undefined) names.push(match[1]);
  }
  return names;
}

function functionNameOf(statement: string): string | null {
  const match = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([A-Za-z_][\w]*)/i.exec(statement);
  return match?.[1] ?? null;
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

function argumentList(text: string, openIndex: number): string | null {
  if (text[openIndex] !== '(') return null;
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex + 1, i);
    }
  }
  return null;
}

function splitCallArgs(list: string): string[] {
  const args: string[] = [];
  let current = '';
  let depth = 0;
  for (const ch of list) {
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
      args.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) args.push(current.trim());
  return args;
}

function namesGrantSurface(name: string): boolean {
  if (ALLOWED_GRANT_SURFACES.has(name)) return false;
  const tokens = words(name);
  return hasToken(tokens, 'grant', 'credit', 'credits', 'allowance');
}

function isSupplementalGrantCopy(value: string): boolean {
  const tokens = words(value);
  if (!tokens.includes('discovery') || !hasToken(tokens, 'credit', 'credits')) return false;
  if (hasToken(tokens, 'bonus', 'extra', 'supplement', 'supplemental', 'gift')) return true;
  return hasToken(tokens, 'grant', 'grants') && !tokens.includes('daily') && !tokens.includes('granted');
}

function isPlatformBreakerName(raw: string): boolean {
  const tokens = words(raw);
  if (tokens.length === 0) return false;
  if (hasToken(tokens, 'circuit', 'breaker', 'breakers')) return true;
  const platformed = tokens.includes('platform');
  const verb = hasToken(tokens, 'cap', 'limit', 'pause', 'halt', 'disable', 'disabled');
  const discoveryCtx = tokens.includes('discovery') || tokens.includes('allowance');
  return platformed && verb && discoveryCtx;
}

function namedBreaker(name: string, where: string): string | null {
  return isPlatformBreakerName(name) ? `${where} ${name} names a platform-wide Discovery breaker` : null;
}

function moneyColumnProblems(table: string, column: string, where: string): string | null {
  if (!MONEY_TABLES.has(table)) return null;
  if (COST_MICROS.has(column)) return null;
  const tokens = words(column);
  if (!hasToken(tokens, ...MONEY_WORDS)) return null;
  return `${where} column ${table}.${column} puts free credits on the money ledger`;
}

function referencedTables(statement: string): string[] {
  const names: string[] = [];
  const pattern = /\breferences\s+(?:public\.)?([A-Za-z_][\w]*)/gi;
  for (const match of statement.matchAll(pattern)) {
    if (match[1] !== undefined) names.push(match[1]);
  }
  return names;
}

function isMoneyTableName(name: string): boolean {
  const tokens = words(name);
  return hasToken(tokens, 'fuel', 'stripe', 'payment', 'checkout');
}

export function scanSupplementalGrantPath(input: SupplementalGrantInput): string[] {
  if (input.files.length === 0) {
    throw new Error('scanSupplementalGrantPath found no product source. Refusing to report an absence.');
  }
  const migrations = input.files.filter((file) => file.path.startsWith('supabase/migrations/') && file.path.endsWith('.sql'));
  if (migrations.length === 0) {
    throw new Error('scanSupplementalGrantPath found no SQL migrations under supabase/migrations/. Refusing to report an absence.');
  }
  let sawSpend = false;
  const problems: string[] = [];

  for (const file of migrations) {
    for (const statement of splitSqlStatements(file.text)) {
      if (/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?discovery_spend\b/i.test(statement)) {
        sawSpend = true;
      }
      if (!SPEND_WRITE.test(statement)) continue;
      const fn = functionNameOf(statement);
      if (fn === 'apply_discovery_grant_mark') {
        if (!/public\.discovery_daily_grant\s*\(/i.test(statement)) {
          problems.push(`${file.path} apply_discovery_grant_mark writes granted without public.discovery_daily_grant`);
        }
        continue;
      }
      if (fn === 'discovery_allowance' || fn === 'discovery_spend_release') {
        if (/\bset\s+granted\s*=/i.test(statement)) {
          problems.push(`${file.path} function ${fn} writes discovery_spend.granted`);
        }
        continue;
      }
      problems.push(
        `${file.path} writes public.discovery_spend outside apply_discovery_grant_mark, discovery_allowance, and discovery_spend_release`,
      );
    }
  }
  if (!sawSpend) {
    throw new Error(
      'scanSupplementalGrantPath found no migration that creates public.discovery_spend. Refusing to report an absence.',
    );
  }

  for (const file of migrations) {
    GRANT_MARK_CALL.lastIndex = 0;
    for (const match of file.text.matchAll(GRANT_MARK_CALL)) {
      const index = match.index ?? 0;
      const open = file.text.indexOf('(', index);
      const list = argumentList(file.text, open);
      if (list === null) continue;
      const args = splitCallArgs(list);
      if (args.length < 3) continue;
      const vettedArg = args[2];
      if (/^\d+$/.test(vettedArg) || !/vetted/i.test(vettedArg)) {
        problems.push(
          `${file.path}:${lineOf(file.text, index)} calls apply_discovery_grant_mark with ${JSON.stringify(vettedArg)} rather than a vetted boolean`,
        );
      }
    }
  }

  for (const name of Object.keys(input.inventory)) {
    if (namesGrantSurface(name)) {
      problems.push(`write route ${name} names a grant, credit, or allowance surface other than discovery-allowance`);
    }
    const rpc = rpcOf(input.inventory[name]);
    if (rpc !== null && namesGrantSurface(rpc)) {
      problems.push(`write route ${name} rpc ${rpc} names a grant, credit, or allowance surface other than discovery-allowance`);
    }
  }

  for (const file of input.files) {
    for (const piece of quotedStrings(file.text)) {
      if (piece.value.length === 0 || !isSupplementalGrantCopy(piece.value)) continue;
      problems.push(
        `${file.path}:${lineOf(file.text, piece.index)} names Discovery credits with a supplemental grant: ${JSON.stringify(piece.value)}`,
      );
    }
  }

  return [...new Set(problems)].sort();
}

export function noSupplementalGrantPathProblems(): string[] {
  return scanSupplementalGrantPath({
    files: productFiles('noSupplementalGrantPathProblems'),
    inventory: WRITE_ROUTES,
  });
}

export function scanPlatformBreaker(input: PlatformBreakerInput): string[] {
  if (input.files.length === 0) {
    throw new Error('scanPlatformBreaker found no product source. Refusing to report an absence.');
  }
  const migrations = input.files.filter((file) => file.path.startsWith('supabase/migrations/') && file.path.endsWith('.sql'));
  if (migrations.length === 0) {
    throw new Error('scanPlatformBreaker found no SQL migrations under supabase/migrations/. Refusing to report an absence.');
  }
  const problems: string[] = [];
  const switchOn = new Set<string>();
  let sawOrganizations = false;
  let spendKey: string | null = null;

  for (const name of input.routeFolders) {
    const named = namedBreaker(name, 'route folder');
    if (named) problems.push(named);
  }
  for (const name of Object.keys(input.inventory)) {
    const named = namedBreaker(name, 'write route');
    if (named) problems.push(named);
    const rpc = rpcOf(input.inventory[name]);
    if (rpc !== null) {
      const rpcNamed = namedBreaker(rpc, `write route ${name} rpc`);
      if (rpcNamed) problems.push(rpcNamed);
    }
  }
  for (const name of input.sharedModules) {
    const named = namedBreaker(name, 'shared module');
    if (named) problems.push(named);
  }
  for (const name of input.uiRoutes) {
    const named = namedBreaker(name, 'ui route');
    if (named) problems.push(named);
  }

  for (const file of input.files) {
    for (const name of declarationNames(file.text)) {
      if (!isPlatformBreakerName(name)) continue;
      problems.push(`${file.path} declares ${name} as a platform-wide Discovery breaker`);
    }
  }

  for (const file of migrations) {
    for (const statement of splitSqlStatements(file.text)) {
      if (/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?organizations\b/i.test(statement)) {
        sawOrganizations = true;
      }
      const table = createTableColumns(statement);
      if (table !== null && table.table === 'discovery_spend') {
        const key = /primary\s+key\s*\(\s*org_id\s*,\s*utc_day\s*\)/i.exec(statement);
        spendKey = key ? 'org_id,utc_day' : 'other';
      }
      const altered = addedColumns(statement);
      if (altered !== null && altered.table === 'organizations') {
        for (const column of altered.columns) {
          if ((SWITCH_COLUMNS as readonly string[]).includes(column)) switchOn.add(column);
        }
      }
      if (table !== null && table.table === 'organizations') {
        sawOrganizations = true;
        for (const column of table.columns) {
          if ((SWITCH_COLUMNS as readonly string[]).includes(column)) switchOn.add(column);
        }
      }
      if (CRON.test(statement) && isPlatformBreakerName(statement)) {
        problems.push(`${file.path} schedules a platform-wide Discovery breaker`);
      }
    }
  }

  if (!sawOrganizations) {
    throw new Error(
      'scanPlatformBreaker found no migration that creates public.organizations, so the switch columns name nothing. ' +
        'Refusing to report an absence.',
    );
  }
  if (spendKey === null) {
    throw new Error(
      'scanPlatformBreaker found no migration that creates public.discovery_spend, so the spend key names nothing. ' +
        'Refusing to report an absence.',
    );
  }
  for (const column of SWITCH_COLUMNS) {
    if (!switchOn.has(column)) {
      problems.push(`organizations is missing switch column ${column}`);
    }
  }
  if (spendKey !== 'org_id,utc_day') {
    problems.push('discovery_spend primary key is not (org_id, utc_day)');
  }

  return [...new Set(problems)].sort();
}

export function noPlatformBreakerProblems(): string[] {
  const surfaces = loadProductSurfaces('noPlatformBreakerProblems');
  return scanPlatformBreaker({
    files: productFiles('noPlatformBreakerProblems'),
    routeFolders: surfaces.routeFolders,
    inventory: surfaces.inventory,
    sharedModules: surfaces.sharedModules,
    uiRoutes: surfaces.uiRoutes,
  });
}

export function scanFreeCreditsOutsideMoney(input: FreeCreditsMoneyInput): string[] {
  if (input.files.length === 0) {
    throw new Error('scanFreeCreditsOutsideMoney found no product source. Refusing to report an absence.');
  }
  const migrations = input.files.filter((file) => file.path.startsWith('supabase/migrations/') && file.path.endsWith('.sql'));
  if (migrations.length === 0) {
    throw new Error('scanFreeCreditsOutsideMoney found no SQL migrations under supabase/migrations/. Refusing to report an absence.');
  }
  const seen = new Set<string>();
  const problems: string[] = [];

  for (const file of migrations) {
    for (const statement of splitSqlStatements(file.text)) {
      const table = createTableColumns(statement);
      if (table !== null && MONEY_TABLES.has(table.table)) {
        seen.add(table.table);
        for (const column of table.columns) {
          const named = moneyColumnProblems(table.table, column, file.path);
          if (named) problems.push(named);
        }
        for (const referenced of referencedTables(statement)) {
          if (isMoneyTableName(referenced)) {
            problems.push(`${file.path} table ${table.table} references money table ${referenced}`);
          }
        }
      }
      const altered = addedColumns(statement);
      if (altered !== null && MONEY_TABLES.has(altered.table)) {
        for (const column of altered.columns) {
          const named = moneyColumnProblems(altered.table, column, file.path);
          if (named) problems.push(named);
        }
        if (/\badd\s+foreign\s+key\b/i.test(statement) || /\breferences\b/i.test(statement)) {
          for (const referenced of referencedTables(statement)) {
            if (isMoneyTableName(referenced)) {
              problems.push(`${file.path} table ${altered.table} references money table ${referenced}`);
            }
          }
        }
      }
    }
  }
  if (!seen.has('discovery_spend') || !seen.has('discovery_turns')) {
    throw new Error(
      'scanFreeCreditsOutsideMoney found no migration that creates public.discovery_spend and public.discovery_turns. ' +
        'Refusing to report an absence.',
    );
  }
  return [...new Set(problems)].sort();
}

export function freeCreditsOutsideMoneyProblems(): string[] {
  return scanFreeCreditsOutsideMoney({ files: productFiles('freeCreditsOutsideMoneyProblems') });
}
