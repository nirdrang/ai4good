/**
 * THE STATIC HALF of the tenant catalog guard — a text oracle over `supabase/migrations/*.sql`.
 *
 * CI runs the loop tier only, so a live catalog check over `pg_class` would never run after merge.
 * This module is the half that does: every `public` table is declared tenant-isolated or
 * unreachable-by-client-roles, and the SQL that landed is checked against that declaration.
 *
 * THE CATALOG IS THE GUARD'S EXPECTATION, not a source of truth. Nothing derives from it.
 * Precedent: `_source-scan.ts`. No sentinel, fault, vendor stand-in or fixture world.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

export type TenantPosture = 'tenant-isolated' | 'unreachable-by-client-roles';

export const TENANT_CATALOG: { readonly [table: string]: TenantPosture } = {
  organizations: 'tenant-isolated',
  org_memberships: 'tenant-isolated',
  projects: 'tenant-isolated',
  acknowledgments: 'tenant-isolated',
  accounts: 'unreachable-by-client-roles',
  volunteer_profiles: 'unreachable-by-client-roles',
};

export type PolicyProblem = { code: string; detail: string };

export type MigrationFile = { name: string; text: string };

function matchDollarTag(sql: string, i: number): string | null {
  const slice = sql.slice(i);
  const m = /^\$[A-Za-z0-9_]*\$/.exec(slice);
  return m ? m[0] : null;
}

function readSingleQuote(sql: string, i: number): { text: string; next: number } {
  let out = sql[i];
  let n = i + 1;
  while (n < sql.length) {
    out += sql[n];
    if (sql[n] === "'") {
      if (sql[n + 1] === "'") {
        out += sql[n + 1];
        n += 2;
        continue;
      }
      return { text: out, next: n + 1 };
    }
    n += 1;
  }
  return { text: out, next: n };
}

/** Split SQL into statements, dropping comments, respecting dollar quotes and strings. */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === '$') {
      const tag = matchDollarTag(sql, i);
      if (tag !== null) {
        const end = sql.indexOf(tag, i + tag.length);
        if (end === -1) {
          current += sql.slice(i);
          break;
        }
        current += sql.slice(i, end + tag.length);
        i = end + tag.length;
        continue;
      }
    }
    if (c === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i);
      current += ' ';
      i = end === -1 ? sql.length : end;
      continue;
    }
    if (c === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      current += ' ';
      i = end === -1 ? sql.length : end + 2;
      continue;
    }
    if (c === "'") {
      const quoted = readSingleQuote(sql, i);
      current += quoted.text;
      i = quoted.next;
      continue;
    }
    if (c === ';') {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      i += 1;
      continue;
    }
    current += c;
    i += 1;
  }
  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);
  return statements;
}

function collapse(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

function namesIn(list: string, prefix: string): string[] {
  return list
    .split(',')
    .map((part) => part.trim())
    .map((part) => (part.toLowerCase().startsWith(prefix) ? part.slice(prefix.length).trim() : part))
    .filter((part) => part.length > 0);
}

function usingExpression(statement: string): string | null {
  const folded = collapse(statement);
  const match = /\busing\s*\(/i.exec(folded);
  if (!match || match.index === undefined) return null;
  const start = match.index + match[0].length - 1;
  let depth = 0;
  for (let i = start; i < folded.length; i += 1) {
    if (folded[i] === '(') depth += 1;
    else if (folded[i] === ')') {
      depth -= 1;
      if (depth === 0) return folded.slice(start + 1, i).trim();
    }
  }
  return null;
}

function publicFunctionCalls(expr: string): string[] {
  const found: string[] = [];
  const pattern = /public\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  for (const match of expr.matchAll(pattern)) {
    found.push(`public.${match[1]}`);
  }
  return found;
}

function functionNameOf(statement: string): string | null {
  const match = /\bon\s+function\s+public\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/i.exec(statement);
  return match ? `public.${match[1]}` : null;
}

type TablePrivs = Map<string, Set<string>>;

function privsOf(byTable: Map<string, TablePrivs>, table: string, role: string): Set<string> {
  let roles = byTable.get(table);
  if (!roles) {
    roles = new Map();
    byTable.set(table, roles);
  }
  let privs = roles.get(role);
  if (!privs) {
    privs = new Set();
    roles.set(role, privs);
  }
  return privs;
}

/**
 * Apply later statements over earlier ones and return every catalog problem.
 * Throws when the files contain no `create table public.<t>`.
 */
export function scanTenantMigrations(files: readonly MigrationFile[]): PolicyProblem[] {
  const tables = new Set<string>();
  const rls = new Set<string>();
  const policies = new Map<string, { name: string; using: string }[]>();
  const grants: Map<string, TablePrivs> = new Map();
  const viewerFns = new Map<
    string,
    { definer: boolean; searchPath: boolean; revokedPublic: boolean; executeAuthenticated: boolean }
  >();
  const problems: PolicyProblem[] = [];

  const ordered = [...files].sort((a, b) => a.name.localeCompare(b.name));
  for (const file of ordered) {
    for (const raw of splitSqlStatements(file.text)) {
      const stmt = collapse(raw);
      const lower = stmt.toLowerCase();

      const created = /^create\s+table\s+public\.([a-zA-Z_][a-zA-Z0-9_]*)\b/i.exec(stmt);
      if (created) {
        tables.add(created[1]);
        continue;
      }

      const enabled = /^alter\s+table\s+public\.([a-zA-Z_][a-zA-Z0-9_]*)\s+enable\s+row\s+level\s+security\b/i.exec(stmt);
      if (enabled) {
        rls.add(enabled[1]);
        continue;
      }

      const policy = /^create\s+policy\s+(\S+)\s+on\s+public\.([a-zA-Z_][a-zA-Z0-9_]*)\b/i.exec(stmt);
      if (policy) {
        const name = policy[1];
        const table = policy[2];
        const using = usingExpression(stmt) ?? '';
        const list = policies.get(table) ?? [];
        list.push({ name, using });
        policies.set(table, list);
        for (const fn of publicFunctionCalls(using)) {
          if (!fn.startsWith('public.viewer_')) {
            problems.push({
              code: 'policy-non-viewer-function',
              detail: `policy ${name} on ${table} calls ${fn}, which is not public.viewer_…`,
            });
          }
        }
        continue;
      }

      const createdFn = /^create(?:\s+or\s+replace)?\s+function\s+public\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/i.exec(stmt);
      if (createdFn) {
        const name = `public.${createdFn[1]}`;
        if (createdFn[1].startsWith('viewer_')) {
          viewerFns.set(name, {
            definer: /\bsecurity\s+definer\b/i.test(stmt),
            searchPath: /set\s+search_path\s*=\s*''/i.test(stmt),
            revokedPublic: false,
            executeAuthenticated: false,
          });
        }
        continue;
      }

      if (/^revoke\s+execute\s+on\s+function\b/i.test(stmt)) {
        const name = functionNameOf(stmt);
        const fn = name ? viewerFns.get(name) : undefined;
        if (fn && /\bfrom\s+public\b/i.test(stmt)) fn.revokedPublic = true;
        continue;
      }

      if (/^grant\s+execute\s+on\s+function\b/i.test(stmt)) {
        const name = functionNameOf(stmt);
        const fn = name ? viewerFns.get(name) : undefined;
        if (fn && /\bto\b[\s\S]*\bauthenticated\b/i.test(stmt)) fn.executeAuthenticated = true;
      }

      if (/^grant\b/i.test(lower) && /\bto\b[\s\S]*\banon\b/i.test(lower)) {
        problems.push({ code: 'grant-to-anon', detail: `grant to anon: ${stmt}` });
      }

      const grantTable = /^grant\s+(.+?)\s+on\s+(?:table\s+)?(.+?)\s+to\s+(.+)$/i.exec(stmt);
      if (grantTable && !/\bon\s+function\b/i.test(stmt)) {
        const privileges = grantTable[1].split(',').map((p) => p.trim().toLowerCase());
        const tableNames = namesIn(grantTable[2], 'public.');
        const roles = grantTable[3].split(',').map((r) => r.trim().toLowerCase());
        for (const table of tableNames) {
          for (const role of roles) {
            const set = privsOf(grants, table, role);
            for (const priv of privileges) set.add(priv);
          }
        }
        continue;
      }

      const revokeTable = /^revoke\s+(.+?)\s+on\s+(?:table\s+)?(.+?)\s+from\s+(.+)$/i.exec(stmt);
      if (revokeTable && !/\bon\s+function\b/i.test(stmt)) {
        const privileges = revokeTable[1].split(',').map((p) => p.trim().toLowerCase());
        const tableNames = namesIn(revokeTable[2], 'public.');
        const roles = revokeTable[3].split(',').map((r) => r.trim().toLowerCase());
        const all = privileges.length === 1 && privileges[0] === 'all';
        for (const table of tableNames) {
          for (const role of roles) {
            if (all) {
              grants.get(table)?.delete(role);
            } else {
              const set = grants.get(table)?.get(role);
              if (set) for (const priv of privileges) set.delete(priv);
            }
          }
        }
      }
    }
  }

  if (tables.size === 0) {
    throw new Error('tenant catalog scan found no public table');
  }

  for (const table of tables) {
    if (!(table in TENANT_CATALOG)) {
      problems.push({ code: 'undeclared-table', detail: `create table public.${table} is absent from TENANT_CATALOG` });
    }
  }
  for (const table of Object.keys(TENANT_CATALOG)) {
    if (!tables.has(table)) {
      problems.push({ code: 'missing-table', detail: `TENANT_CATALOG names ${table} but no migration creates it` });
    }
  }

  for (const [table, posture] of Object.entries(TENANT_CATALOG)) {
    if (!tables.has(table)) continue;
    const roleGrants = grants.get(table) ?? new Map();
    if (posture === 'tenant-isolated') {
      if (!rls.has(table)) {
        problems.push({ code: 'isolated-no-rls', detail: `${table} is tenant-isolated but never enables row level security` });
      }
      const authenticated = roleGrants.get('authenticated') ?? new Set();
      if (!authenticated.has('select')) {
        problems.push({
          code: 'isolated-no-select-grant',
          detail: `${table} is tenant-isolated but has no remaining grant select to authenticated`,
        });
      }
      const tablePolicies = policies.get(table) ?? [];
      if (tablePolicies.length === 0) {
        problems.push({ code: 'isolated-no-policy', detail: `${table} is tenant-isolated but has no create policy` });
      }
      for (const policy of tablePolicies) {
        const normalised = policy.using.replace(/\s+/g, ' ').trim().toLowerCase();
        if (normalised === 'true' || normalised === '(true)') {
          problems.push({
            code: 'isolated-using-true',
            detail: `${table} policy ${policy.name} uses (true)`,
          });
        }
      }
    } else {
      for (const role of ['anon', 'authenticated'] as const) {
        const remaining = roleGrants.get(role);
        if (remaining && remaining.size > 0) {
          problems.push({
            code: 'unreachable-client-grant',
            detail: `${table} is unreachable-by-client-roles but still grants ${[...remaining].join(', ')} to ${role}`,
          });
        }
      }
    }
  }

  for (const [name, fn] of viewerFns) {
    if (!fn.definer) {
      problems.push({ code: 'viewer-not-definer', detail: `${name} is a viewer_ function without security definer` });
    }
    if (!fn.searchPath) {
      problems.push({ code: 'viewer-search-path', detail: `${name} is a viewer_ function without set search_path = ''` });
    }
    if (!fn.revokedPublic) {
      problems.push({ code: 'viewer-no-revoke', detail: `${name} is a viewer_ function without revoke execute from public` });
    }
    if (!fn.executeAuthenticated) {
      problems.push({
        code: 'viewer-no-execute-grant',
        detail: `${name} is a viewer_ function without execute granted to authenticated`,
      });
    }
  }

  return problems;
}

export function tenantCatalogProblems(migrationsDir?: string): PolicyProblem[] {
  const dir = migrationsDir ?? join(REPO_ROOT, 'supabase', 'migrations');
  let names: string[];
  try {
    names = readdirSync(dir).filter((name) => name.endsWith('.sql')).sort();
  } catch (error) {
    throw new Error(
      `tenant catalog scan could not read migrations under ${dir}: ${(error as Error).message}`,
    );
  }
  if (names.length === 0) {
    throw new Error(`tenant catalog scan found no migration under ${dir}`);
  }
  const files = names.map((name) => ({ name, text: readFileSync(join(dir, name), 'utf8') }));
  return scanTenantMigrations(files);
}
