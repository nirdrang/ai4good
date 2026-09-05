/**
 * Oracle for the static tenant catalog scan: each refusal the scan names, and the throw
 * on an empty directory.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  scanTenantMigrations,
  TENANT_CATALOG,
  tenantCatalogProblems,
} from '../suites/req-001/_policy-scan.ts';

const VIEWER = `
create function public.viewer_is_org_member(p_org_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select true; $$;
revoke execute on function public.viewer_is_org_member(uuid) from public;
grant execute on function public.viewer_is_org_member(uuid) to authenticated;
`;

function validSql(): string {
  const tables = Object.keys(TENANT_CATALOG);
  const creates = tables.map((table) => `create table public.${table} (id uuid);`).join('\n');
  const rls = tables
    .filter((table) => TENANT_CATALOG[table] === 'tenant-isolated')
    .map((table) => `alter table public.${table} enable row level security;`)
    .join('\n');
  const grants = tables
    .filter((table) => TENANT_CATALOG[table] === 'tenant-isolated')
    .map((table) => `grant select on public.${table} to authenticated;`)
    .join('\n');
  const policies = tables
    .filter((table) => TENANT_CATALOG[table] === 'tenant-isolated')
    .map((table) =>
      table === 'acknowledgments'
        ? `create policy ${table}_own on public.${table} for select to authenticated using (account_id = (select auth.uid()));`
        : `create policy ${table}_member on public.${table} for select to authenticated using (public.viewer_is_org_member(id));`,
    )
    .join('\n');
  const revokes = tables
    .filter((table) => TENANT_CATALOG[table] === 'unreachable-by-client-roles')
    .map((table) => `revoke all on table public.${table} from anon, authenticated;`)
    .join('\n');
  return [creates, rls, grants, VIEWER, policies, revokes].join('\n');
}

describe('tenantCatalogProblems over the real migrations', () => {
  it('reports no problems', () => {
    expect(tenantCatalogProblems()).toEqual([]);
  });
});

describe('scanTenantMigrations refusals', () => {
  it('refuses a create table public.<t> absent from the catalog', () => {
    const problems = scanTenantMigrations([
      { name: 'a.sql', text: `${validSql()}\ncreate table public.drafts (id uuid);` },
    ]);
    expect(problems.some((p) => p.code === 'undeclared-table')).toBe(true);
  });

  it('refuses a catalog key with no table', () => {
    const sql = validSql().replace(/create table public.accounts \(id uuid\);/, '');
    const problems = scanTenantMigrations([{ name: 'a.sql', text: sql }]);
    expect(problems.some((p) => p.code === 'missing-table' && p.detail.includes('accounts'))).toBe(true);
  });

  it('refuses any grant to anon', () => {
    const problems = scanTenantMigrations([
      { name: 'a.sql', text: `${validSql()}\ngrant select on public.organizations to anon;` },
    ]);
    expect(problems.some((p) => p.code === 'grant-to-anon')).toBe(true);
  });

  it('refuses a tenant-isolated table without enable row level security', () => {
    const sql = validSql().replace(/alter table public.organizations enable row level security;/, '');
    const problems = scanTenantMigrations([{ name: 'a.sql', text: sql }]);
    expect(problems.some((p) => p.code === 'isolated-no-rls' && p.detail.includes('organizations'))).toBe(true);
  });

  it('refuses a tenant-isolated table without grant select to authenticated', () => {
    const sql = validSql().replace(/grant select on public.organizations to authenticated;/, '');
    const problems = scanTenantMigrations([{ name: 'a.sql', text: sql }]);
    expect(problems.some((p) => p.code === 'isolated-no-select-grant' && p.detail.includes('organizations'))).toBe(
      true,
    );
  });

  it('refuses a tenant-isolated table without a create policy', () => {
    const sql = validSql().replace(
      /create policy organizations_member on public.organizations for select to authenticated using \(public.viewer_is_org_member\(id\)\);/,
      '',
    );
    const problems = scanTenantMigrations([{ name: 'a.sql', text: sql }]);
    expect(problems.some((p) => p.code === 'isolated-no-policy' && p.detail.includes('organizations'))).toBe(true);
  });

  it('refuses a tenant-isolated table with using (true)', () => {
    const sql = validSql().replace(
      'using (public.viewer_is_org_member(id));',
      'using (true);',
    );
    const problems = scanTenantMigrations([{ name: 'a.sql', text: sql }]);
    expect(problems.some((p) => p.code === 'isolated-using-true')).toBe(true);
  });

  it('refuses an unreachable table with an un-revoked grant to authenticated', () => {
    const sql = validSql().replace(
      /revoke all on table public.accounts from anon, authenticated;/,
      'grant select on public.accounts to authenticated;',
    );
    const problems = scanTenantMigrations([{ name: 'a.sql', text: sql }]);
    expect(problems.some((p) => p.code === 'unreachable-client-grant' && p.detail.includes('accounts'))).toBe(true);
  });

  it('refuses a function a policy using calls that is not public.viewer_…', () => {
    const sql = validSql().replace(
      'using (public.viewer_is_org_member(id));',
      'using (public.other_helper(id));',
    );
    const problems = scanTenantMigrations([{ name: 'a.sql', text: sql }]);
    expect(problems.some((p) => p.code === 'policy-non-viewer-function')).toBe(true);
  });

  it('refuses a viewer_ function without security definer, search_path, revoke from public, or execute to authenticated', () => {
    const bare = validSql().replace(VIEWER, `
create function public.viewer_is_org_member(p_org_id uuid)
returns boolean language sql stable
as $$ select true; $$;
`);
    const problems = scanTenantMigrations([{ name: 'a.sql', text: bare }]);
    expect(problems.some((p) => p.code === 'viewer-not-definer')).toBe(true);
    expect(problems.some((p) => p.code === 'viewer-search-path')).toBe(true);
    expect(problems.some((p) => p.code === 'viewer-no-revoke')).toBe(true);
    expect(problems.some((p) => p.code === 'viewer-no-execute-grant')).toBe(true);
  });

  it('throws when it finds no table', () => {
    expect(() => scanTenantMigrations([{ name: 'a.sql', text: 'select 1;' }])).toThrow(/no public table/);
  });
});

describe('tenantCatalogProblems empty directory', () => {
  it('throws when the directory has no migration', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tenant-catalog-'));
    mkdirSync(dir, { recursive: true });
    try {
      expect(() => tenantCatalogProblems(dir)).toThrow(/no migration/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws when it can read no migration directory', () => {
    expect(() => tenantCatalogProblems(join(tmpdir(), 'tenant-catalog-missing-nowhere'))).toThrow(
      /could not read migrations/,
    );
  });
});

describe('later statements overlay earlier ones', () => {
  it('a later revoke removes an earlier grant to authenticated on an unreachable table', () => {
    const problems = scanTenantMigrations([
      {
        name: '1.sql',
        text: `${validSql()}\ngrant select on public.accounts to authenticated;`,
      },
      {
        name: '2.sql',
        text: 'revoke all on table public.accounts from authenticated;',
      },
    ]);
    expect(problems.filter((p) => p.code === 'unreachable-client-grant')).toEqual([]);
  });
});
