/**
 * Oracle for REQ-002's absence source arms: each refusal the scan names, over injected text.
 */

import { describe, expect, it } from 'vitest';

import { WRITE_ROUTES } from '../../../supabase/functions/_shared/write-routes.ts';
import {
  absentPublishFlowProblems,
  discoveryWalletProblems,
  scanAbsentPublishFlow,
  scanDiscoveryWallet,
  scanTrustWording,
  trustWordingProblems,
} from '../suites/req-002/_source-absences.ts';
import type { RouteInventory } from '../suites/req-002/_source-scan.ts';

const inventory = (over: RouteInventory = {}): RouteInventory => ({ ...WRITE_ROUTES, ...over });

describe('REQ-002 absence source oracles over the real tree', () => {
  it('report no problems', () => {
    expect(trustWordingProblems()).toEqual([]);
    expect(discoveryWalletProblems()).toEqual([]);
    expect(absentPublishFlowProblems()).toEqual([]);
  });
});

describe('scanTrustWording refusals', () => {
  const clean = [
    {
      path: 'supabase/functions/_shared/verification.ts',
      text:
        "export function discoveryMessageAllowed(): { ok: true; value: 'verified' } {\n" +
        "  return { ok: true; value: 'verified' };\n" +
        '}\n',
    },
    {
      path: 'supabase/functions/_shared/notification-copy.ts',
      text:
        "subject: 'Your organisation is founder-vetted';\n" +
        "body: 'A platform administrator vetted your organisation. Your daily Discovery allowance is now the vetted grant.';\n" +
        "if (text(payload, 'outcome') === 'vetted') return subject;\n",
    },
    {
      path: 'supabase/functions/_shared/public-project.ts',
      text: 'export type PublicProjectView = { projectId: string; projectName: string; organizationName: string };\n',
    },
    {
      path: 'supabase/functions/_shared/discovery-allowance.ts',
      text: "export type DiscoveryTier = 'unverified' | 'vetted';\nexport const DISCOVERY_DAILY_GRANT = { unverified: 10, vetted: 30 };\n",
    },
    {
      path: 'supabase/functions/_shared/org-vetting.ts',
      text: "reason: 'publishing needs a founder-vetted organisation — this organisation is not founder-vetted';\n",
    },
    {
      path: 'supabase/migrations/allowance.sql',
      text: "raise exception 'discovery_allowance refuses %: the caller''s email address is not verified';\n",
    },
    { path: 'src/routes/index.tsx', text: '<h1 className="text-4xl font-bold">ai4good</h1>\n' },
  ];

  it('accepts email-verification copy, the email-decision token, internal tier names, and founder-vetted wording', () => {
    expect(scanTrustWording(clean)).toEqual([]);
  });

  it('fails a verified trust claim about an organisation', () => {
    const problems = scanTrustWording([
      ...clean,
      {
        path: 'supabase/functions/_shared/notification-copy.ts',
        text: "subject: 'Your organisation is verified';\n",
      },
    ]);
    expect(problems.some((problem) => /verified trust claim|other than founder-vetted/.test(problem))).toBe(true);
  });

  it('fails a person-facing Verified badge', () => {
    const problems = scanTrustWording([...clean, { path: 'src/routes/index.tsx', text: '<span>Verified</span>\n' }]);
    expect(problems.some((problem) => problem.includes('Verified') && /trust label/.test(problem))).toBe(true);
  });

  it('fails a verified field on the public projection', () => {
    const problems = scanTrustWording([
      {
        path: 'supabase/functions/_shared/public-project.ts',
        text: 'export type PublicProjectView = { projectId: string; verified: boolean };\n',
      },
    ]);
    expect(problems.some((problem) => /verified field/.test(problem))).toBe(true);
  });

  it('fails organisation-is-vetted copy that drops founder-', () => {
    const problems = scanTrustWording([
      {
        path: 'supabase/functions/_shared/notification-copy.ts',
        text: "subject: 'Your organisation is vetted';\n",
      },
    ]);
    expect(problems.some((problem) => /other than founder-vetted/.test(problem))).toBe(true);
  });

  it('does not flag a verified email refusal that names an organisation', () => {
    expect(
      scanTrustWording([
        {
          path: 'supabase/functions/_shared/verification.ts',
          text: "reason: 'the organisation admin email address is not verified';\n",
        },
      ]),
    ).toEqual([]);
  });

  it('does not flag a verified field about an email address', () => {
    expect(
      scanTrustWording([
        {
          path: 'src/routes/settings.tsx',
          text: 'export type EmailBadge = { email: string; verified: boolean };\n',
        },
      ]),
    ).toEqual([]);
  });

  it('does not flag a verified field about a webhook signature', () => {
    expect(
      scanTrustWording([
        {
          path: 'supabase/functions/_shared/webhooks.ts',
          text: 'export type WebhookEvent = { signature: string; verified: boolean };\n',
        },
      ]),
    ).toEqual([]);
  });

  it('does not flag a lone verified field on an internal module', () => {
    expect(
      scanTrustWording([
        {
          path: 'supabase/functions/_shared/clock.ts',
          text: 'export type ClockSkew = { verified: boolean };\n',
        },
      ]),
    ).toEqual([]);
  });

  it('throws when there is no product source', () => {
    expect(() => scanTrustWording([])).toThrow(/no product source/);
  });
});

describe('scanDiscoveryWallet refusals', () => {
  const clean = {
    files: [
      {
        path: 'supabase/functions/_shared/discovery-allowance.ts',
        text:
          "export type DiscoveryTier = 'unverified' | 'vetted';\n" +
          'export const DISCOVERY_DAILY_GRANT = { unverified: 10, vetted: 30 };\n' +
          'export function remainingCredits(granted: number, spent: number) {\n' +
          '  return granted - spent;\n' +
          '}\n' +
          'export function dailyAllowanceExhaustedReason(organizationId: string) {\n' +
          "  return `discovery_allowance refuses: organisation ${organizationId} has no Discovery credits left today` +\n" +
          "    ` — get vetted (daily grant becomes ${dailyGrantFor('vetted')}), fund project fuel to continue now, or wait for the next UTC day`;\n" +
          '}\n',
      },
      {
        path: 'supabase/functions/_shared/org-vetting.ts',
        text:
          "export function fundingAllowed(vetted: boolean): { ok: true; value: 'not-vetting-gated' } {\n" +
          "  return { ok: true; value: 'not-vetting-gated' };\n" +
          '}\n',
      },
      {
        path: 'supabase/functions/_shared/acknowledgment-copy.ts',
        text: "authorityStatement: 'to fund non-refundable model-fuel purchases';\n",
      },
      {
        path: 'supabase/functions/_shared/notification-copy.ts',
        text:
          "body: 'Leftover funds were released to your general balance.';\n" +
          "body: 'Your daily Discovery allowance is now the vetted grant, and you may publish.';\n",
      },
      {
        path: 'supabase/functions/_shared/notification-taxonomy.ts',
        text: "event: 'lovable.credits_low';\nevent: 'discovery.fit_declined';\n",
      },
      {
        path: 'supabase/migrations/allowance.sql',
        text:
          'create table public.discovery_spend (org_id uuid, utc_day date, spent integer, granted integer);\n' +
          'create function public.discovery_allowance() returns jsonb as $$ begin return 1; end; $$;\n' +
          'create function public.discovery_daily_grant(p_vetted boolean) returns integer as $$ begin return 10; end; $$;\n',
      },
      { path: 'src/routes/index.tsx', text: '<h1 className="text-4xl font-bold">ai4good</h1>\n' },
    ],
    routeFolders: ['set-organization-vetting', 'discovery-allowance', 'complete-signup'],
    inventory: WRITE_ROUTES,
    sharedModules: ['org-vetting.ts', 'discovery-allowance.ts', 'write-routes.ts'],
    uiRoutes: ['index.tsx', '__root.tsx'],
  };

  it('accepts the daily grant, the spend row, remaining, fuel copy, and Lovable credits', () => {
    expect(scanDiscoveryWallet(clean)).toEqual([]);
  });

  it('fails a Discovery-wallet route folder', () => {
    expect(
      scanDiscoveryWallet({ ...clean, routeFolders: [...clean.routeFolders, 'discovery-wallet'] }).some((problem) =>
        problem.includes('discovery-wallet'),
      ),
    ).toBe(true);
  });

  it('fails a buy-Discovery-credits write route', () => {
    const problems = scanDiscoveryWallet({
      ...clean,
      inventory: inventory({
        'buy-discovery-credits': {
          surface: { kind: 'edge', rpc: 'purchase_discovery_credits' },
          standing: { kind: 'account-required', admits: ['ngo'] },
        },
      }),
    });
    expect(problems.some((problem) => /buy-discovery-credits/.test(problem))).toBe(true);
    expect(problems.some((problem) => /purchase_discovery_credits/.test(problem))).toBe(true);
  });

  it('fails a Discovery-sku shared module', () => {
    expect(
      scanDiscoveryWallet({ ...clean, sharedModules: [...clean.sharedModules, 'discovery-sku.ts'] }).some((problem) =>
        problem.includes('discovery-sku.ts'),
      ),
    ).toBe(true);
  });

  it('fails a quoted Discovery wallet', () => {
    const problems = scanDiscoveryWallet({
      ...clean,
      files: [...clean.files, { path: 'src/routes/index.tsx', text: "label: 'Discovery wallet';\n" }],
    });
    expect(problems.some((problem) => /Discovery wallet/.test(problem))).toBe(true);
  });

  it('fails a Buy Discovery credits label', () => {
    const problems = scanDiscoveryWallet({
      ...clean,
      files: [...clean.files, { path: 'src/routes/index.tsx', text: '<button>Buy Discovery credits</button>\n' }],
    });
    expect(problems.some((problem) => /Buy Discovery credits/.test(problem))).toBe(true);
  });

  it('fails a Discovery-credit SKU string', () => {
    const problems = scanDiscoveryWallet({
      ...clean,
      files: [...clean.files, { path: 'supabase/functions/_shared/catalog.ts', text: "name: 'Discovery-credit SKU';\n" }],
    });
    expect(problems.some((problem) => /Discovery-credit SKU/.test(problem))).toBe(true);
  });

  it('fails a Discovery-only balance string', () => {
    const problems = scanDiscoveryWallet({
      ...clean,
      files: [
        ...clean.files,
        { path: 'supabase/functions/_shared/catalog.ts', text: "reason: 'this organisation holds a Discovery-only balance';\n" },
      ],
    });
    expect(problems.some((problem) => /Discovery-only balance/.test(problem))).toBe(true);
  });

  it('fails a DiscoveryWallet type declaration', () => {
    const problems = scanDiscoveryWallet({
      ...clean,
      files: [
        ...clean.files,
        { path: 'supabase/functions/_shared/wallet.ts', text: 'export type DiscoveryWallet = { credits: number };\n' },
      ],
    });
    expect(problems.some((problem) => /DiscoveryWallet/.test(problem))).toBe(true);
  });

  it('fails a discovery_wallets table', () => {
    const problems = scanDiscoveryWallet({
      ...clean,
      files: [
        ...clean.files,
        {
          path: 'supabase/migrations/wallet.sql',
          text: 'create table public.discovery_wallets (org_id uuid, balance integer);\n',
        },
      ],
    });
    expect(problems.some((problem) => /discovery_wallets/.test(problem))).toBe(true);
  });

  it('does not flag a Discovery grant-balance name', () => {
    expect(
      scanDiscoveryWallet({
        ...clean,
        files: [
          ...clean.files,
          { path: 'supabase/functions/_shared/discovery-allowance.ts', text: 'export type DiscoveryGrantBalance = { remaining: number };\n' },
        ],
      }),
    ).toEqual([]);
  });

  it('throws when there is no product source', () => {
    expect(() =>
      scanDiscoveryWallet({ files: [], routeFolders: ['discovery-allowance'], inventory: WRITE_ROUTES, sharedModules: [], uiRoutes: [] }),
    ).toThrow(/no product source/);
  });
});

describe('scanAbsentPublishFlow refusals', () => {
  const PROJECTS = `
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  assigned_volunteer_id uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now()
)
`;
  const SEAT_TRIGGER = `
create function public.project_seat_holds_one_developer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.assigned_volunteer_id is not null
     and new.assigned_volunteer_id is not null
     and new.assigned_volunteer_id <> old.assigned_volunteer_id then
    raise exception 'projects refuses a second volunteer on project %', old.id using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger projects_single_developer_seat
before update on public.projects
for each row
execute function public.project_seat_holds_one_developer()
`;
  const PUBLIC_READ = `
create function public.read_public_project(p_project_id uuid)
returns table (project_id uuid, project_name text, organization_name text)
language sql
stable
as $$
  select p.id, p.name, o.name
    from public.projects p
    join public.organizations o on o.id = p.org_id
   where p.id = p_project_id;
$$
`;
  const NOTIFICATIONS = `
create table public.notification_event_types (
  event text primary key
);
insert into public.notification_event_types (event) values
  ('triage.approved'),
  ('triage.returned_to_scoped'),
  ('triage.declined_terminal');
create table public.notification_events (
  id uuid primary key,
  event text not null,
  state public.notification_state not null default 'pending'
);
create function public.emit_notification(p_write jsonb)
returns uuid
language plpgsql
as $$
begin
  return gen_random_uuid();
end;
$$
`;
  const ACCOUNTS = `
create type public.account_lifecycle as enum ('active', 'deactivated');
alter table public.accounts
  add column lifecycle public.account_lifecycle not null default 'active'
`;

  const clean = {
    files: [
      { path: 'supabase/migrations/projects.sql', text: `${PROJECTS};\n${SEAT_TRIGGER};\n${PUBLIC_READ};` },
      { path: 'supabase/migrations/notifications.sql', text: `${NOTIFICATIONS};\n${ACCOUNTS};` },
      {
        path: 'supabase/migrations/other.sql',
        text: "select cron.schedule('vacuum', '0 3 * * *', $$ select 1 $$);",
      },
      {
        path: 'supabase/functions/_shared/org-vetting.ts',
        text:
          "export function publishingAllowed(vetted: boolean): { ok: true; value: 'vetted' } | { ok: false; reason: string } {\n" +
          "  if (vetted === true) return { ok: true; value: 'vetted' };\n" +
          "  return { ok: false, reason: 'publishing needs a founder-vetted organisation — this organisation is not founder-vetted' };\n" +
          '}\n',
      },
      {
        path: 'supabase/functions/_shared/notification-copy.ts',
        text: "body: 'Your daily Discovery allowance is now the vetted grant, and you may publish.';\n",
      },
      {
        path: 'supabase/functions/_shared/public-project.ts',
        text: 'export function projectIsPublic(_source: { project_id: string }): boolean {\n  return true;\n}\n',
      },
    ],
    routeFolders: ['set-organization-vetting', 'public-project', 'project-workspace', 'complete-signup'],
    inventory: WRITE_ROUTES,
    sharedModules: ['org-vetting.ts', 'public-project.ts', 'notifications.ts', 'write-routes.ts'],
    uiRoutes: ['index.tsx', '__root.tsx'],
  };

  it('accepts the public page, the permit, notifications, account lifecycle, and seat triggers', () => {
    expect(scanAbsentPublishFlow(clean)).toEqual([]);
  });

  it('fails a publish-project route folder', () => {
    expect(
      scanAbsentPublishFlow({ ...clean, routeFolders: [...clean.routeFolders, 'publish-project'] }).some((problem) =>
        problem.includes('publish-project'),
      ),
    ).toBe(true);
  });

  it('fails a publish write route and its rpc', () => {
    const problems = scanAbsentPublishFlow({
      ...clean,
      inventory: inventory({
        'publish-project': {
          surface: { kind: 'edge', rpc: 'publish_project' },
          standing: { kind: 'account-required', admits: ['ngo'] },
        },
      }),
    });
    expect(problems.some((problem) => /publish-project/.test(problem))).toBe(true);
    expect(problems.some((problem) => /publish_project/.test(problem))).toBe(true);
  });

  it('fails a triage-queue shared module and ui route', () => {
    const problems = scanAbsentPublishFlow({
      ...clean,
      sharedModules: [...clean.sharedModules, 'triage-queue.ts'],
      uiRoutes: [...clean.uiRoutes, 'triage.tsx'],
    });
    expect(problems.some((problem) => problem.includes('triage-queue.ts'))).toBe(true);
    expect(problems.some((problem) => problem.includes('triage.tsx'))).toBe(true);
  });

  it('fails a SQL function that publishes a project', () => {
    const problems = scanAbsentPublishFlow({
      ...clean,
      files: [
        ...clean.files,
        {
          path: 'supabase/migrations/publish.sql',
          text: 'create function public.publish_project(p_id uuid) returns void as $$ begin null; end; $$;\n',
        },
      ],
    });
    expect(problems.some((problem) => problem.includes('publish_project') && /publishes a project/.test(problem))).toBe(
      true,
    );
  });

  it('fails a visibility column on projects', () => {
    const problems = scanAbsentPublishFlow({
      ...clean,
      files: [
        ...clean.files,
        {
          path: 'supabase/migrations/visibility.sql',
          text: 'alter table public.projects add column visibility text;\n',
        },
      ],
    });
    expect(problems.some((problem) => problem.includes('projects.visibility'))).toBe(true);
  });

  it('fails a state column on projects', () => {
    const problems = scanAbsentPublishFlow({
      ...clean,
      files: [
        ...clean.files,
        {
          path: 'supabase/migrations/state.sql',
          text: 'alter table public.projects add column state text;\n',
        },
      ],
    });
    expect(problems.some((problem) => problem.includes('projects.state'))).toBe(true);
  });

  it('fails a triage_queue table', () => {
    const problems = scanAbsentPublishFlow({
      ...clean,
      files: [
        ...clean.files,
        {
          path: 'supabase/migrations/triage.sql',
          text: 'create table public.triage_queue (project_id uuid);\n',
        },
      ],
    });
    expect(problems.some((problem) => problem.includes('triage_queue'))).toBe(true);
  });

  it('fails cron that updates public.projects', () => {
    const problems = scanAbsentPublishFlow({
      ...clean,
      files: [
        ...clean.files,
        {
          path: 'supabase/migrations/cron.sql',
          text: "select cron.schedule('age-scoped', '* * * * *', $$ update public.projects set name = name $$);",
        },
      ],
    });
    expect(problems.some((problem) => problem.includes('schedules a change to a project'))).toBe(true);
  });

  it('fails cron that calls age_projects', () => {
    const problems = scanAbsentPublishFlow({
      ...clean,
      files: [
        ...clean.files,
        {
          path: 'supabase/migrations/cron-age.sql',
          text: "select cron.schedule('age', '* * * * *', $$ select public.age_projects() $$);",
        },
      ],
    });
    expect(problems.some((problem) => problem.includes('schedules a change to a project'))).toBe(true);
  });

  it('fails a trigger that ages a scoped project', () => {
    const problems = scanAbsentPublishFlow({
      ...clean,
      files: [
        ...clean.files,
        {
          path: 'supabase/migrations/trig.sql',
          text:
            'create trigger age_scoped_projects after insert on public.projects for each row execute function public.age_scoped_projects();',
        },
      ],
    });
    expect(problems.some((problem) => /trigger that would change a project's publish or scope state/.test(problem))).toBe(
      true,
    );
  });

  it('does not flag cron that never writes a project', () => {
    expect(
      scanAbsentPublishFlow({
        ...clean,
        files: [
          ...clean.files,
          {
            path: 'supabase/migrations/retry.sql',
            text: "select cron.schedule('retry-deliveries', '* * * * *', $$ select public.apply_delivery_results('[]'::jsonb, 'epoch') $$);",
          },
        ],
      }),
    ).toEqual([]);
  });

  it('does not flag a UI visibility control that is not a project publish state', () => {
    expect(scanAbsentPublishFlow({ ...clean, uiRoutes: [...clean.uiRoutes, 'column-visibility.tsx'] })).toEqual([]);
  });

  it('does not flag a visibility column on a non-project table', () => {
    expect(
      scanAbsentPublishFlow({
        ...clean,
        files: [
          ...clean.files,
          {
            path: 'supabase/migrations/orgs.sql',
            text: 'alter table public.organizations add column visibility text;\n',
          },
        ],
      }),
    ).toEqual([]);
  });

  it('throws when there is no product source', () => {
    expect(() =>
      scanAbsentPublishFlow({ files: [], routeFolders: ['public-project'], inventory: WRITE_ROUTES, sharedModules: [], uiRoutes: [] }),
    ).toThrow(/no product source/);
  });

  it('throws when the projects table is absent', () => {
    expect(() =>
      scanAbsentPublishFlow({
        ...clean,
        files: [{ path: 'supabase/migrations/a.sql', text: 'create table public.organizations (id uuid);\n' }],
      }),
    ).toThrow(/creates public.projects/);
  });
});
