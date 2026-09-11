/**
 * Oracle for REQ-002's vetting-surface source arms: each refusal the scan names, over injected text.
 */

import { describe, expect, it } from 'vitest';

import { WRITE_ROUTES } from '../../../supabase/functions/_shared/write-routes.ts';
import {
  kycSurfaceProblems,
  orgVettingWriterProblems,
  scanKycSurfaces,
  scanOrgVettingWriters,
  scanScheduledVetting,
  scanVettedState,
  scanVettingRoutes,
  scheduledVettingProblems,
  vettedStateProblems,
  vettingRouteProblems,
} from '../suites/req-002/_source-vetting.ts';
import type { RouteInventory } from '../suites/req-002/_source-scan.ts';

const DEFINER = `
create function public.set_organization_vetting(p_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.org_vetting (org_id, vetted) values (p_account_id, true);
  update public.org_vetting set vetted = false where org_id = p_account_id;
  return '{}'::jsonb;
end;
$$
`;

const TABLE = `
create table public.org_vetting (
  org_id uuid primary key,
  vetted boolean not null
)
`;

const inventory = (over: RouteInventory = {}): RouteInventory => ({ ...WRITE_ROUTES, ...over });

describe('REQ-002 vetting source oracles over the real tree', () => {
  it('report no problems', () => {
    expect(vettingRouteProblems()).toEqual([]);
    expect(orgVettingWriterProblems()).toEqual([]);
    expect(scheduledVettingProblems()).toEqual([]);
    expect(kycSurfaceProblems()).toEqual([]);
    expect(vettedStateProblems()).toEqual([]);
  });
});

describe('scanVettingRoutes refusals', () => {
  it('fails when no write route reaches the definer', () => {
    const rest: RouteInventory = { ...WRITE_ROUTES };
    delete rest['set-organization-vetting'];
    expect(scanVettingRoutes(rest)).toContain('no write route reaches public.set_organization_vetting');
  });

  it('fails a second write route that reaches the same definer', () => {
    const problems = scanVettingRoutes(
      inventory({
        'auto-vet-orgs': {
          surface: { kind: 'edge', rpc: 'set_organization_vetting' },
          standing: { kind: 'account-required', admits: ['platform_admin'] },
        },
      }),
    );
    expect(problems.some((problem) => /exactly one/.test(problem))).toBe(true);
  });

  it('fails when the one route admits anyone other than the platform admin', () => {
    const problems = scanVettingRoutes(
      inventory({
        'set-organization-vetting': {
          surface: { kind: 'edge', rpc: 'set_organization_vetting' },
          standing: { kind: 'account-required', admits: ['ngo'] },
        },
      }),
    );
    expect(problems.some((problem) => problem.includes('admits') && problem.includes('ngo'))).toBe(true);
  });
});

describe('scanOrgVettingWriters refusals', () => {
  it('fails an insert outside the definer', () => {
    const problems = scanOrgVettingWriters([
      { path: 'supabase/migrations/a.sql', text: `${TABLE};\n${DEFINER};` },
      { path: 'supabase/migrations/b.sql', text: 'insert into public.org_vetting (org_id, vetted) values (gen_random_uuid(), true);' },
    ]);
    expect(problems.some((problem) => problem.includes('outside public.set_organization_vetting'))).toBe(true);
  });

  it('fails a client write in a product module', () => {
    const problems = scanOrgVettingWriters([
      { path: 'supabase/migrations/a.sql', text: `${TABLE};\n${DEFINER};` },
      { path: 'supabase/functions/_shared/auto-vet.ts', text: "await supabase.from('org_vetting').insert({ vetted: true });\n" },
    ]);
    expect(problems.some((problem) => problem.includes('client insert'))).toBe(true);
  });

  it('throws when the definer is absent', () => {
    expect(() => scanOrgVettingWriters([{ path: 'supabase/migrations/a.sql', text: TABLE }])).toThrow(/no migration defining public.set_organization_vetting/);
  });

  it('accepts writes that sit inside the definer body', () => {
    expect(scanOrgVettingWriters([{ path: 'supabase/migrations/a.sql', text: `${TABLE};\n${DEFINER};` }])).toEqual([]);
  });
});

describe('scanScheduledVetting refusals', () => {
  it('fails cron.schedule that updates org_vetting', () => {
    const problems = scanScheduledVetting([
      {
        path: 'supabase/migrations/cron.sql',
        text: "select cron.schedule('auto-vet', '* * * * *', $$ update public.org_vetting set vetted = true $$);",
      },
    ]);
    expect(problems.some((problem) => problem.includes('schedules a job'))).toBe(true);
  });

  it('fails pg_cron that writes the vetted column', () => {
    const problems = scanScheduledVetting([
      {
        path: 'supabase/migrations/vetting.sql',
        text: `${TABLE};\nselect pg_cron.schedule('n', '* * * * *', $$ update public.org_vetting set vetted = true $$);`,
      },
    ]);
    expect(problems.some((problem) => problem.includes('schedules a job') || problem.includes('vetted outside'))).toBe(true);
  });

  it('fails a trigger function that writes the vetted column', () => {
    const problems = scanScheduledVetting([
      {
        path: 'supabase/migrations/trig.sql',
        text:
          'create function public.auto_vet() returns trigger as $$ begin new.vetted := true; return new; end; $$;\n' +
          'create trigger org_vetting_auto before insert on public.org_vetting for each row execute function public.auto_vet();',
      },
    ]);
    expect(problems.some((problem) => problem.includes('vetted outside'))).toBe(true);
  });

  it('does not flag cron that never names vetting', () => {
    expect(
      scanScheduledVetting([
        { path: 'supabase/migrations/other.sql', text: "select cron.schedule('vacuum', '0 3 * * *', $$ select 1 $$);" },
      ]),
    ).toEqual([]);
  });

  it('does not flag a trigger that maintains a derived row without writing vetted', () => {
    expect(
      scanScheduledVetting([
        {
          path: 'supabase/migrations/grant.sql',
          text:
            'create function public.touch_grant() returns trigger as $$ begin perform public.apply_discovery_grant_mark(new.org_id, current_date, new.vetted); return new; end; $$;\n' +
            'create trigger org_vetting_grant after insert or update on public.org_vetting for each row execute function public.touch_grant();',
        },
      ]),
    ).toEqual([]);
  });
});

describe('scanKycSurfaces refusals', () => {
  const clean = {
    routeFolders: ['set-organization-vetting', 'complete-signup'],
    inventory: WRITE_ROUTES,
    sharedModules: ['org-vetting.ts', 'verification.ts', 'write-routes.ts'],
    uiRoutes: ['index.tsx', '__root.tsx'],
  };

  it('does not flag email verification or the manual vetting route', () => {
    expect(scanKycSurfaces(clean)).toEqual([]);
  });

  it('fails a KYC route folder', () => {
    expect(scanKycSurfaces({ ...clean, routeFolders: [...clean.routeFolders, 'kyc-submit'] }).some((problem) => problem.includes('kyc-submit'))).toBe(
      true,
    );
  });

  it('fails an automated-verification write route', () => {
    const problems = scanKycSurfaces({
      ...clean,
      inventory: inventory({
        'automated-verification': {
          surface: { kind: 'edge', rpc: 'run_automated_verification' },
          standing: { kind: 'account-required', admits: ['platform_admin'] },
        },
      }),
    });
    expect(problems.some((problem) => /automated-verification/.test(problem))).toBe(true);
  });

  it('fails a document-review shared module', () => {
    expect(
      scanKycSurfaces({ ...clean, sharedModules: [...clean.sharedModules, 'document-review.ts'] }).some((problem) =>
        problem.includes('document-review.ts'),
      ),
    ).toBe(true);
  });
});

describe('scanVettedState refusals', () => {
  it('fails when vetted is not a boolean', () => {
    const problems = scanVettedState([
      {
        path: 'supabase/migrations/a.sql',
        text: "create table public.org_vetting (org_id uuid primary key, vetted text not null check (vetted in ('vetted', 'unvetted', 'pending')));",
      },
    ]);
    expect(problems.some((problem) => /boolean not null/.test(problem))).toBe(true);
    expect(problems.some((problem) => /third vetting state/.test(problem))).toBe(true);
  });

  it('fails an under-review column', () => {
    const problems = scanVettedState([
      {
        path: 'supabase/migrations/a.sql',
        text: 'create table public.org_vetting (org_id uuid primary key, vetted boolean not null, review_status text);',
      },
    ]);
    expect(problems.some((problem) => /third vetting state/.test(problem))).toBe(true);
  });

  it('throws when the table is absent', () => {
    expect(() => scanVettedState([{ path: 'supabase/migrations/a.sql', text: 'create table public.organizations (id uuid);' }])).toThrow(
      /creates public.org_vetting/,
    );
  });

  it('accepts the two-value boolean column', () => {
    expect(scanVettedState([{ path: 'supabase/migrations/a.sql', text: TABLE }])).toEqual([]);
  });
});
