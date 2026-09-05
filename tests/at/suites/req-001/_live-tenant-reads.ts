/**
 * Caller-bound tenant reads for the live adapter. Spread into `createLiveAdapter`.
 */

import {
  authPost,
  functionPostRaw,
  restGet,
  type Stack,
} from '../../harness/live-stack.ts';
import type {
  AccountsSut,
  OrganizationDashboard,
  OrganizationRow,
  ProjectWorkspace,
  PublicProjectOutcome,
  PublicProjectView,
  Session,
  TablePrivilege,
  TenantCatalogFacts,
  TenantFunctionFacts,
  TenantReadOutcome,
  TenantTableFacts,
  ViewerRead,
} from './_contract.ts';

type AccessTokens = { accessToken: string; refreshToken: string };

type SqlQuery = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

export type JwtClaims = { session_id?: unknown; sub?: unknown; exp?: unknown; iat?: unknown };

const TABLE_PRIVILEGES: readonly TablePrivilege[] = [
  'select',
  'insert',
  'update',
  'delete',
  'truncate',
  'references',
  'trigger',
];

type LiveTenantDeps = {
  stack: Stack;
  sessions: Map<string, AccessTokens>;
  tokensOf: (session: Session, act: string) => AccessTokens;
  claimsOf: (token: string) => JwtClaims;
  rows: <T>(query: Promise<unknown>) => Promise<T[]>;
  sql: SqlQuery;
};

function mappedRows<Row>(
  value: unknown,
  map: (row: Record<string, unknown>) => Row | null,
): { ok: true; rows: readonly Row[] } | { ok: false } {
  if (!Array.isArray(value)) return { ok: false };
  const rows: Row[] = [];
  for (const entry of value) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return { ok: false };
    const mapped = map(entry as Record<string, unknown>);
    if (mapped === null) return { ok: false };
    rows.push(mapped);
  }
  return { ok: true, rows };
}

function viewerRead<Row>(
  answer: { status: number; text: string },
  map: (row: Record<string, unknown>) => Row | null,
): ViewerRead<Row> {
  const viewerAnswer = { status: answer.status, body: answer.text };
  if (answer.status === 200) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(answer.text) as unknown;
    } catch {
      return { ok: false, kind: 'refused', reason: answer.text, answer: viewerAnswer };
    }
    const mapped = mappedRows(parsed, map);
    if (!mapped.ok) {
      return {
        ok: false,
        kind: 'refused',
        reason: 'a row did not match the expected shape',
        answer: viewerAnswer,
      };
    }
    return { ok: true, rows: mapped.rows, answer: viewerAnswer };
  }
  const messageFirst = answer.text;
  if ((answer.status === 401 || answer.status === 403) && /permission denied/i.test(messageFirst)) {
    return { ok: false, kind: 'privilege-denied', reason: messageFirst, answer: viewerAnswer };
  }
  if ((answer.status === 401 || answer.status === 403) && /jwt|token|expired|invalid claim/i.test(messageFirst)) {
    return { ok: false, kind: 'session-refused', reason: messageFirst, answer: viewerAnswer };
  }
  return { ok: false, kind: 'refused', reason: messageFirst, answer: viewerAnswer };
}

function functionOutcome<T extends { ok: true }>(answer: { status: number; text: string }): TenantReadOutcome<T> {
  const viewerAnswer = { status: answer.status, body: answer.text };
  if (answer.status !== 200) return { ok: false, answer: viewerAnswer };
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer.text) as unknown;
  } catch {
    return { ok: false, answer: viewerAnswer };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, answer: viewerAnswer };
  }
  if ((parsed as { ok?: unknown }).ok !== true) return { ok: false, answer: viewerAnswer };
  return { ok: true, value: parsed as T, answer: viewerAnswer };
}

function privilegeSet(
  row: Record<string, boolean | string>,
  prefix: 'anon' | 'authenticated' | 'service_role',
): TablePrivilege[] {
  return TABLE_PRIVILEGES.filter((name) => row[`${prefix}_${name}`] === true);
}

export function liveTenantReads(deps: LiveTenantDeps): Pick<
  AccountsSut,
  | 'organizationAsViewer'
  | 'membershipsAsViewer'
  | 'projectAsViewer'
  | 'acknowledgmentsAsViewer'
  | 'organizationsAsViewer'
  | 'organizationDashboard'
  | 'projectWorkspace'
  | 'publicProjectPage'
  | 'tenantTableFacts'
> {
  const { stack, sessions, tokensOf, claimsOf, rows, sql } = deps;

  const freshAccessToken = async (session: Session, act: string): Promise<AccessTokens> => {
    const held = tokensOf(session, act);
    if (Number(claimsOf(held.accessToken).exp) * 1000 - Date.now() >= 20_000) return held;
    const { status, json } = await authPost(stack, '/auth/v1/token?grant_type=refresh_token', {
      refresh_token: held.refreshToken,
    });
    if (status >= 400) {
      throw new Error(`refusing to ${act}: the access token could not be refreshed (${status})`);
    }
    const accessToken = String(json.access_token ?? '');
    if (!accessToken) throw new Error(`refusing to ${act}: the refresh answered with no access token`);
    const next = { accessToken, refreshToken: String(json.refresh_token ?? held.refreshToken) };
    sessions.set(session.sessionId, next);
    return next;
  };

  const bearerOf = async (session: Session | null, act: string): Promise<string | null> => {
    if (session === null) return null;
    return (await freshAccessToken(session, act)).accessToken;
  };

  const organizationRow = (row: Record<string, unknown>): OrganizationRow | null =>
    typeof row.id === 'string' && typeof row.name === 'string' ? { id: row.id, name: row.name } : null;

  return {
    organizationAsViewer: async (session, organizationId) => {
      const bearer = await bearerOf(session, 'read an organisation as the caller');
      const answer = await restGet(
        stack,
        `/organizations?id=eq.${encodeURIComponent(organizationId)}&select=id,name`,
        bearer,
      );
      return viewerRead(answer, organizationRow);
    },

    organizationsAsViewer: async (session) => {
      const bearer = await bearerOf(session, 'list organisations as the caller');
      const answer = await restGet(stack, '/organizations?select=id,name', bearer);
      return viewerRead(answer, organizationRow);
    },

    membershipsAsViewer: async (session, organizationId) => {
      const bearer = await bearerOf(session, 'read memberships as the caller');
      const answer = await restGet(
        stack,
        `/org_memberships?org_id=eq.${encodeURIComponent(organizationId)}&select=org_id,account_id,role`,
        bearer,
      );
      return viewerRead(answer, (row) => {
        if (typeof row.org_id !== 'string' || typeof row.account_id !== 'string') return null;
        if (row.role !== 'admin' && row.role !== 'member') return null;
        return { organizationId: row.org_id, accountId: row.account_id, role: row.role };
      });
    },

    projectAsViewer: async (session, projectId) => {
      const bearer = await bearerOf(session, 'read a project as the caller');
      const answer = await restGet(
        stack,
        `/projects?id=eq.${encodeURIComponent(projectId)}&select=id,org_id,name,assigned_volunteer_id`,
        bearer,
      );
      return viewerRead(answer, (row) => {
        if (typeof row.id !== 'string' || typeof row.org_id !== 'string' || typeof row.name !== 'string') return null;
        return {
          id: row.id,
          organizationId: row.org_id,
          name: row.name,
          assignedVolunteerId:
            row.assigned_volunteer_id === null || row.assigned_volunteer_id === undefined
              ? null
              : String(row.assigned_volunteer_id),
        };
      });
    },

    acknowledgmentsAsViewer: async (session, accountId) => {
      const bearer = await bearerOf(session, 'read acknowledgments as the caller');
      const answer = await restGet(
        stack,
        `/acknowledgments?account_id=eq.${encodeURIComponent(accountId)}&select=account_id,kind,acknowledged_at,ip,text_version,signer_name,signer_title,authority_attestation`,
        bearer,
      );
      return viewerRead(answer, (row) => {
        if (typeof row.account_id !== 'string' || typeof row.kind !== 'string') return null;
        return {
          accountId: row.account_id,
          kind: row.kind,
          acknowledgedAt: String(row.acknowledged_at ?? ''),
          ip: String(row.ip ?? ''),
          textVersion: String(row.text_version ?? ''),
          signerName: String(row.signer_name ?? ''),
          signerTitle: String(row.signer_title ?? ''),
          authorityAttestation: String(row.authority_attestation ?? ''),
        };
      });
    },

    organizationDashboard: async (session, organizationId): Promise<TenantReadOutcome<OrganizationDashboard>> => {
      const bearer = await bearerOf(session, 'call the deployed organization-dashboard');
      const raw = await functionPostRaw(stack, 'organization-dashboard', { organizationId }, bearer);
      return functionOutcome<OrganizationDashboard>(raw);
    },

    projectWorkspace: async (session, projectId): Promise<TenantReadOutcome<ProjectWorkspace>> => {
      const bearer = await bearerOf(session, 'call the deployed project-workspace');
      const raw = await functionPostRaw(stack, 'project-workspace', { projectId }, bearer);
      return functionOutcome<ProjectWorkspace>(raw);
    },

    publicProjectPage: async (projectId, session): Promise<PublicProjectOutcome> => {
      const bearer = session ? (await freshAccessToken(session, 'call the deployed public-project')).accessToken : null;
      const raw = await functionPostRaw(stack, 'public-project', { projectId }, bearer);
      const outcome = functionOutcome<{ ok: true } & PublicProjectView>(raw);
      if (!outcome.ok) return { ok: false, answer: outcome.answer };
      return {
        ok: true,
        page: {
          projectId: outcome.value.projectId,
          projectName: outcome.value.projectName,
          organizationName: outcome.value.organizationName,
        },
        answer: outcome.answer,
      };
    },

    tenantTableFacts: async (): Promise<TenantCatalogFacts> => {
      const tables = await rows<Record<string, boolean | string>>(sql`
        select c.relname as table_name,
               c.relrowsecurity as rls,
               c.relforcerowsecurity as force_rls,
               has_table_privilege('anon', format('public.%I', c.relname), 'select') as anon_select,
               has_table_privilege('anon', format('public.%I', c.relname), 'insert') as anon_insert,
               has_table_privilege('anon', format('public.%I', c.relname), 'update') as anon_update,
               has_table_privilege('anon', format('public.%I', c.relname), 'delete') as anon_delete,
               has_table_privilege('anon', format('public.%I', c.relname), 'truncate') as anon_truncate,
               has_table_privilege('anon', format('public.%I', c.relname), 'references') as anon_references,
               has_table_privilege('anon', format('public.%I', c.relname), 'trigger') as anon_trigger,
               has_table_privilege('authenticated', format('public.%I', c.relname), 'select') as authenticated_select,
               has_table_privilege('authenticated', format('public.%I', c.relname), 'insert') as authenticated_insert,
               has_table_privilege('authenticated', format('public.%I', c.relname), 'update') as authenticated_update,
               has_table_privilege('authenticated', format('public.%I', c.relname), 'delete') as authenticated_delete,
               has_table_privilege('authenticated', format('public.%I', c.relname), 'truncate') as authenticated_truncate,
               has_table_privilege('authenticated', format('public.%I', c.relname), 'references') as authenticated_references,
               has_table_privilege('authenticated', format('public.%I', c.relname), 'trigger') as authenticated_trigger,
               has_table_privilege('service_role', format('public.%I', c.relname), 'select') as service_role_select,
               has_table_privilege('service_role', format('public.%I', c.relname), 'insert') as service_role_insert,
               has_table_privilege('service_role', format('public.%I', c.relname), 'update') as service_role_update,
               has_table_privilege('service_role', format('public.%I', c.relname), 'delete') as service_role_delete,
               has_table_privilege('service_role', format('public.%I', c.relname), 'truncate') as service_role_truncate,
               has_table_privilege('service_role', format('public.%I', c.relname), 'references') as service_role_references,
               has_table_privilege('service_role', format('public.%I', c.relname), 'trigger') as service_role_trigger
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind = 'r'
         order by c.relname
      `);
      const policyRows = await rows<{ tablename: string; policyname: string; qual: string | null }>(sql`
        select tablename, policyname, qual
          from pg_policies
         where schemaname = 'public'
      `);
      const functionRows = await rows<{ name: string; anon_execute: boolean; authenticated_execute: boolean }>(sql`
        select p.proname as name,
               has_function_privilege('anon', p.oid, 'execute') as anon_execute,
               has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.prosecdef
         order by p.proname
      `);
      const policiesByTable = new Map<string, { name: string; using: string }[]>();
      for (const policy of policyRows) {
        const list = policiesByTable.get(policy.tablename) ?? [];
        list.push({ name: policy.policyname, using: policy.qual ?? '' });
        policiesByTable.set(policy.tablename, list);
      }
      const tableFacts: TenantTableFacts[] = tables.map((table) => ({
        table: String(table.table_name),
        rowLevelSecurity: table.rls === true,
        forceRowLevelSecurity: table.force_rls === true,
        anon: privilegeSet(table, 'anon'),
        authenticated: privilegeSet(table, 'authenticated'),
        serviceRole: privilegeSet(table, 'service_role'),
        policies: policiesByTable.get(String(table.table_name)) ?? [],
      }));
      const functions: TenantFunctionFacts[] = functionRows.map((fn) => ({
        name: fn.name,
        anonExecute: fn.anon_execute === true,
        authenticatedExecute: fn.authenticated_execute === true,
      }));
      return { tables: tableFacts, functions };
    },
  };
}
