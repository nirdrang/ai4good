/**
 * THE STATIC HALF of the tenant catalog guard — a text oracle over `supabase/migrations/*.sql`.
 *
 * CI runs the loop tier only, so a live catalog check over `pg_class` would never run after merge.
 * This module is the half that does: every `public` table is declared tenant-isolated or
 * unreachable-by-client-roles, and later statements overlay earlier ones, including drop, disable,
 * alter, and force. A grant that is not modelled is refused outright so the overlay cannot lie.
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
    .map((part) => {
      const lowered = part.toLowerCase();
      const rest = lowered.startsWith(prefix) ? part.slice(prefix.length).trim() : part;
      const quoted = /^"([^"]+)"/.exec(rest);
      return quoted ? quoted[1] : rest.replace(/\(.*$/, '').trim();
    })
    .filter((part) => part.length > 0);
}

function publicIdent(stmt: string, before: RegExp): string | null {
  const match = before.exec(stmt);
  if (!match) return null;
  const rest = stmt.slice(match[0].length);
  const quoted = /^"([A-Za-z_][A-Za-z0-9_]*)"/.exec(rest);
  if (quoted) return quoted[1];
  const bare = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(rest);
  return bare ? bare[1] : null;
}

export function isTautologicalUsing(expr: string): boolean {
  const normalised = expr.replace(/\s+/g, ' ').trim().toLowerCase();
  const stripped = normalised.replace(/^\(+/, '').replace(/\)+$/, '').trim();
  return stripped === 'true' || stripped === '1=1';
}

function usingNamesAuthOrViewer(expr: string): boolean {
  return /\bauth\.uid\s*\(/i.test(expr) || /public\.viewer_[A-Za-z_][A-Za-z0-9_]*\s*\(/i.test(expr);
}

function usingExpression(statement: string): string | null {
  const folded = collapse(statement);
  const match = /\busing\s*\(/i.exec(folded);
  if (!match) return null;
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

type DefinerFn = {
  viewer: boolean;
  definer: boolean;
  searchPath: boolean;
  revokedPublic: boolean;
  executeRoles: Set<string>;
};

const WRITE_PRIVS = new Set(['insert', 'update', 'delete', 'truncate', 'all']);
const CLIENT_EXECUTE_ROLES = new Set(['anon', 'authenticated', 'public']);

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

function equalSet(left: Set<string>, expected: readonly string[]): boolean {
  if (left.size !== expected.length) return false;
  return expected.every((item) => left.has(item));
}

function recordPolicyUsing(
  problems: PolicyProblem[],
  name: string,
  table: string,
  using: string,
): void {
  if (isTautologicalUsing(using)) {
    problems.push({
      code: 'policy-tautological-using',
      detail: `${table} policy ${name} uses a tautology (${using})`,
    });
  } else if (!usingNamesAuthOrViewer(using)) {
    problems.push({
      code: 'policy-using-no-auth',
      detail: `${table} policy ${name} using does not name auth.uid() or a public.viewer_ function`,
    });
  }
  for (const fn of publicFunctionCalls(using)) {
    if (!fn.startsWith('public.viewer_')) {
      problems.push({
        code: 'policy-non-viewer-function',
        detail: `policy ${name} on ${table} calls ${fn}, which is not public.viewer_…`,
      });
    }
  }
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
  const definers = new Map<string, DefinerFn>();
  const baselineAnon = new Set<string>();
  const baselineAuthenticated = new Set<string>();
  const problems: PolicyProblem[] = [];

  const dropTable = (table: string): void => {
    tables.delete(table);
    rls.delete(table);
    policies.delete(table);
    grants.delete(table);
    baselineAnon.delete(table);
    baselineAuthenticated.delete(table);
  };

  const ordered = [...files].sort((a, b) => a.name.localeCompare(b.name));
  for (const file of ordered) {
    for (const raw of splitSqlStatements(file.text)) {
      const stmt = collapse(raw);
      const lower = stmt.toLowerCase();

      if (/^alter\s+default\s+privileges\b/i.test(stmt)) {
        problems.push({ code: 'alter-default-privileges', detail: stmt });
        continue;
      }

      if (/^grant\b/i.test(stmt) && /\bon\s+all\s+tables\b/i.test(stmt)) {
        problems.push({ code: 'grant-all-tables', detail: stmt });
        continue;
      }

      if (/^grant\b/i.test(stmt) && /\bto\s+public\b/i.test(stmt)) {
        problems.push({ code: 'grant-to-public', detail: `grant to public: ${stmt}` });
        continue;
      }

      if (/^grant\b/i.test(lower) && /\bto\b[\s\S]*\banon\b/i.test(lower)) {
        problems.push({ code: 'grant-to-anon', detail: `grant to anon: ${stmt}` });
      }

      const created = publicIdent(stmt, /^create\s+table(?:\s+if\s+not\s+exists)?\s+public\./i);
      if (created) {
        tables.add(created);
        continue;
      }

      const droppedTable = publicIdent(stmt, /^drop\s+table(?:\s+if\s+exists)?\s+public\./i);
      if (droppedTable) {
        dropTable(droppedTable);
        continue;
      }

      const enabled = publicIdent(stmt, /^alter\s+table\s+public\./i);
      if (enabled && /\benable\s+row\s+level\s+security\b/i.test(stmt)) {
        rls.add(enabled);
        continue;
      }
      if (enabled && /\bdisable\s+row\s+level\s+security\b/i.test(stmt)) {
        rls.delete(enabled);
        continue;
      }
      if (enabled && /\bforce\s+row\s+level\s+security\b/i.test(stmt) && !/\bno\s+force\s+row\s+level\s+security\b/i.test(stmt)) {
        problems.push({
          code: 'force-row-level-security',
          detail: `force row level security on ${enabled}`,
        });
        continue;
      }

      const droppedPolicy = /^drop\s+policy(?:\s+if\s+exists)?\s+(\S+)\s+on\s+public\./i.exec(stmt);
      if (droppedPolicy) {
        const table = publicIdent(stmt, /^drop\s+policy(?:\s+if\s+exists)?\s+\S+\s+on\s+public\./i);
        if (table) {
          const list = (policies.get(table) ?? []).filter((policy) => policy.name !== droppedPolicy[1]);
          policies.set(table, list);
        }
        continue;
      }

      const alteredPolicy = /^alter\s+policy\s+(\S+)\s+on\s+public\./i.exec(stmt);
      if (alteredPolicy) {
        const table = publicIdent(stmt, /^alter\s+policy\s+\S+\s+on\s+public\./i);
        const using = usingExpression(stmt);
        if (table && using !== null) {
          const list = policies.get(table) ?? [];
          const existing = list.find((policy) => policy.name === alteredPolicy[1]);
          if (existing) existing.using = using;
          recordPolicyUsing(problems, alteredPolicy[1], table, using);
        }
        continue;
      }

      const policy = /^create\s+policy\s+(\S+)\s+on\s+public\./i.exec(stmt);
      if (policy) {
        const table = publicIdent(stmt, /^create\s+policy\s+\S+\s+on\s+public\./i);
        if (!table) continue;
        const name = policy[1];
        const using = usingExpression(stmt) ?? '';
        if (/\bto\s+anon\b/i.test(stmt)) {
          problems.push({ code: 'policy-to-anon', detail: `policy ${name} on ${table} is to anon` });
        }
        if (/\bfor\s+all\b/i.test(stmt)) {
          problems.push({ code: 'policy-for-all', detail: `policy ${name} on ${table} is for all` });
        }
        const list = policies.get(table) ?? [];
        list.push({ name, using });
        policies.set(table, list);
        recordPolicyUsing(problems, name, table, using);
        continue;
      }

      const createdFn = /^create(?:\s+or\s+replace)?\s+function\s+public\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/i.exec(stmt);
      if (createdFn) {
        const short = createdFn[1];
        const name = `public.${short}`;
        const viewer = short.startsWith('viewer_');
        const definer = /\bsecurity\s+definer\b/i.test(stmt);
        if (viewer || definer) {
          definers.set(name, {
            viewer,
            definer,
            searchPath: /set\s+search_path\s*=\s*''/i.test(stmt),
            revokedPublic: false,
            executeRoles: new Set(),
          });
        }
        continue;
      }

      const droppedFn = publicIdent(stmt, /^drop\s+function(?:\s+if\s+exists)?\s+public\./i);
      if (droppedFn) {
        definers.delete(`public.${droppedFn}`);
        continue;
      }

      if (/^revoke\s+execute\s+on\s+function\b/i.test(stmt)) {
        const name = functionNameOf(stmt);
        const fn = name ? definers.get(name) : undefined;
        if (fn) {
          const from = /\bfrom\s+(.+)$/i.exec(stmt)?.[1] ?? '';
          const roles = from.split(',').map((role) => role.trim().toLowerCase());
          if (roles.includes('public')) fn.revokedPublic = true;
          for (const role of roles) fn.executeRoles.delete(role);
        }
        continue;
      }

      if (/^grant\s+execute\s+on\s+function\b/i.test(stmt)) {
        const name = functionNameOf(stmt);
        const fn = name ? definers.get(name) : undefined;
        if (fn) {
          const to = /\bto\s+(.+)$/i.exec(stmt)?.[1] ?? '';
          for (const role of to.split(',').map((part) => part.trim().toLowerCase())) {
            if (role) fn.executeRoles.add(role);
          }
        }
        continue;
      }

      const grantTable = /^grant\s+(.+?)\s+on\s+(?:table\s+)?(.+?)\s+to\s+(.+)$/i.exec(stmt);
      if (grantTable && !/\bon\s+function\b/i.test(stmt) && !/\bon\s+all\s+tables\b/i.test(stmt)) {
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
              if (role === 'anon') baselineAnon.add(table);
              if (role === 'authenticated') baselineAuthenticated.add(table);
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
    if (!baselineAnon.has(table) || !baselineAuthenticated.has(table)) {
      problems.push({
        code: 'no-baseline-revoke',
        detail: `${table} has no revoke all from anon, authenticated after create table`,
      });
    }
    const roleGrants = grants.get(table) ?? new Map();
    const anon = roleGrants.get('anon') ?? new Set();
    if (anon.size > 0) {
      problems.push({
        code: 'anon-privilege',
        detail: `${table} still grants ${[...anon].join(', ')} to anon`,
      });
    }
    const serviceRole = roleGrants.get('service_role') ?? new Set();
    for (const priv of serviceRole) {
      if (WRITE_PRIVS.has(priv)) {
        problems.push({
          code: 'service-role-write',
          detail: `${table} still grants ${priv} to service_role`,
        });
        break;
      }
    }
    if (posture === 'tenant-isolated') {
      if (!rls.has(table)) {
        problems.push({ code: 'isolated-no-rls', detail: `${table} is tenant-isolated but never enables row level security` });
      }
      const authenticated = roleGrants.get('authenticated') ?? new Set();
      if (!equalSet(authenticated, ['select'])) {
        problems.push({
          code: 'isolated-wrong-privileges',
          detail: `${table} is tenant-isolated but authenticated holds {${[...authenticated].join(', ')}} rather than {select}`,
        });
      }
      const tablePolicies = policies.get(table) ?? [];
      if (tablePolicies.length === 0) {
        problems.push({ code: 'isolated-no-policy', detail: `${table} is tenant-isolated but has no create policy` });
      }
    } else {
      const remaining = roleGrants.get('authenticated');
      if (remaining && remaining.size > 0) {
        problems.push({
          code: 'unreachable-client-grant',
          detail: `${table} is unreachable-by-client-roles but still grants ${[...remaining].join(', ')} to authenticated`,
        });
      }
    }
  }

  for (const [name, fn] of definers) {
    if (fn.viewer && !fn.definer) {
      problems.push({ code: 'viewer-not-definer', detail: `${name} is a viewer_ function without security definer` });
    }
    if (fn.viewer && !fn.searchPath) {
      problems.push({ code: 'viewer-search-path', detail: `${name} is a viewer_ function without set search_path = ''` });
    }
    if (fn.viewer && !fn.revokedPublic) {
      problems.push({ code: 'viewer-no-revoke', detail: `${name} is a viewer_ function without revoke execute from public` });
    }
    if (fn.viewer && !fn.executeRoles.has('authenticated')) {
      problems.push({
        code: 'viewer-no-execute-grant',
        detail: `${name} is a viewer_ function without execute granted to authenticated`,
      });
    }
    if (fn.definer && !fn.viewer && !fn.revokedPublic) {
      problems.push({ code: 'definer-no-revoke', detail: `${name} is a security definer function without revoke execute from public` });
    }
    if (fn.definer && !fn.viewer) {
      for (const role of fn.executeRoles) {
        if (CLIENT_EXECUTE_ROLES.has(role)) {
          problems.push({
            code: 'definer-client-execute',
            detail: `${name} grants execute to ${role}; non-viewer definers stay service_role only`,
          });
        }
      }
    }
  }

  for (const [table, list] of policies) {
    for (const policy of list) {
      for (const fn of publicFunctionCalls(policy.using)) {
        if (fn.startsWith('public.viewer_') && !definers.has(fn)) {
          problems.push({
            code: 'policy-missing-function',
            detail: `policy ${policy.name} on ${table} calls ${fn}, which was dropped`,
          });
        }
      }
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
