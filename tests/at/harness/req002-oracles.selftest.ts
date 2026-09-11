/**
 * Oracle for REQ-002's source arms: each refusal the scan names, over injected text.
 * An oracle that cannot fail is not an oracle.
 */

import { describe, expect, it } from 'vitest';

import { WRITE_ROUTES } from '../../../supabase/functions/_shared/write-routes.ts';
import {
  documentContentSinks,
  kycSurfaceProblems,
  orgVettingWriterProblems,
  scanDocumentContentSinks,
  scanKycSurfaces,
  scanOrgVettingWriters,
  scanScheduledVetting,
  scanTrustWording,
  scanVettedState,
  scanVettingRoutes,
  scheduledVettingProblems,
  trustWordingProblems,
  vettedStateProblems,
  vettingRouteProblems,
  type RouteInventory,
} from '../suites/req-002/_source-scan.ts';

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

describe('REQ-002 source oracles over the real tree', () => {
  it('report no problems', () => {
    expect(vettingRouteProblems()).toEqual([]);
    expect(orgVettingWriterProblems()).toEqual([]);
    expect(scheduledVettingProblems()).toEqual([]);
    expect(kycSurfaceProblems()).toEqual([]);
    expect(vettedStateProblems()).toEqual([]);
    expect(documentContentSinks()).toEqual([]);
    expect(trustWordingProblems()).toEqual([]);
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

  it('fails pg_cron in the migration that defines the table', () => {
    const problems = scanScheduledVetting([
      { path: 'supabase/migrations/vetting.sql', text: `${TABLE};\nselect pg_cron.schedule('n', '* * * * *', $$ select 1 $$);` },
    ]);
    expect(problems.some((problem) => problem.includes('schedules a job'))).toBe(true);
  });

  it('fails a trigger on org_vetting', () => {
    const problems = scanScheduledVetting([
      {
        path: 'supabase/migrations/trig.sql',
        text: 'create trigger org_vetting_auto before update on public.org_vetting for each row execute function public.touch();',
      },
    ]);
    expect(problems.some((problem) => problem.includes('creates a trigger'))).toBe(true);
  });

  it('does not flag cron that never names vetting', () => {
    expect(
      scanScheduledVetting([
        { path: 'supabase/migrations/other.sql', text: "select cron.schedule('vacuum', '0 3 * * *', $$ select 1 $$);" },
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

describe('scanDocumentContentSinks refusals', () => {
  const clean = {
    files: [{ path: 'supabase/migrations/a.sql', text: TABLE }],
    routeFolders: ['set-organization-vetting', 'organization-dashboard', 'public-project'],
    inventory: WRITE_ROUTES,
    uiRoutes: ['index.tsx', '__root.tsx'],
  };

  it('accepts the real metadata columns and the existing routes', () => {
    expect(
      scanDocumentContentSinks({
        ...clean,
        files: [{ path: 'supabase/migrations/a.sql', text: `${TABLE};\ncreate table public.org_vetting (org_id uuid, registration_document_count integer);` }],
      }),
    ).toEqual([]);
  });

  it('fails a bytea column', () => {
    const problems = scanDocumentContentSinks({
      ...clean,
      files: [{ path: 'supabase/migrations/a.sql', text: 'create table public.docs (id uuid, content bytea);' }],
    });
    expect(problems.some((problem) => /content is bytea/.test(problem))).toBe(true);
  });

  it('fails a named document-content column', () => {
    const problems = scanDocumentContentSinks({
      ...clean,
      files: [{ path: 'supabase/migrations/a.sql', text: 'create table public.docs (id uuid, document_content text);' }],
    });
    expect(problems.some((problem) => problem.includes('document_content') && /sink/.test(problem))).toBe(true);
  });

  it('fails a download-document route folder', () => {
    const problems = scanDocumentContentSinks({ ...clean, routeFolders: [...clean.routeFolders, 'download-document'] });
    expect(problems.some((problem) => problem.includes('download-document'))).toBe(true);
  });

  it('fails an object-storage call in a product module', () => {
    const problems = scanDocumentContentSinks({
      ...clean,
      files: [
        { path: 'supabase/migrations/a.sql', text: TABLE },
        { path: 'supabase/functions/_shared/docs.ts', text: "await supabase.storage.from('docs').upload('a', bytes);\n" },
      ],
    });
    expect(problems.some((problem) => /object storage/.test(problem))).toBe(true);
  });

  it('fails a document content type in a product module', () => {
    const problems = scanDocumentContentSinks({
      ...clean,
      files: [
        { path: 'supabase/migrations/a.sql', text: TABLE },
        {
          path: 'supabase/functions/download-file/index.ts',
          text: "return new Response(pdf, { headers: { 'Content-Type': 'application/pdf' } });\n",
        },
      ],
    });
    expect(problems.some((problem) => /document content type/.test(problem))).toBe(true);
  });

  it('throws when there is no product source', () => {
    expect(() =>
      scanDocumentContentSinks({ files: [], routeFolders: ['set-organization-vetting'], inventory: WRITE_ROUTES, uiRoutes: ['index.tsx'] }),
    ).toThrow(/no product source/);
  });

  it('throws when there are no migrations', () => {
    expect(() =>
      scanDocumentContentSinks({
        files: [{ path: 'supabase/functions/_shared/org-vetting.ts', text: 'export const x = 1;\n' }],
        routeFolders: ['set-organization-vetting'],
        inventory: WRITE_ROUTES,
        uiRoutes: ['index.tsx'],
      }),
    ).toThrow(/no SQL migrations/);
  });
});

describe('scanTrustWording refusals', () => {
  const clean = [
    {
      path: 'supabase/functions/_shared/verification.ts',
      text:
        "export function discoveryMessageAllowed(): { ok: true; value: 'verified' } {\n" +
        "  return { ok: true, value: 'verified' };\n" +
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

  it('throws when there is no product source', () => {
    expect(() => scanTrustWording([])).toThrow(/no product source/);
  });
});
