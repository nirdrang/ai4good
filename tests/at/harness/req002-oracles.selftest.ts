/**
 * Oracle for REQ-002's source arms: each refusal the scan names, over injected text.
 * An oracle that cannot fail is not an oracle.
 */

import { describe, expect, it } from 'vitest';

import { WRITE_ROUTES } from '../../../supabase/functions/_shared/write-routes.ts';
import {
  dailyAllowanceExhaustedReason,
  dailyGrantFor,
  debitExceedsRemainingReason,
  emailUnverifiedReason,
  remainingCredits,
} from '../../../supabase/functions/_shared/discovery-allowance.ts';
import {
  absentPublishFlowProblems,
  discoveryWalletProblems,
  documentContentSinks,
  emailUnverifiedSentenceProblems,
  exhaustedSentenceProblems,
  kycSurfaceProblems,
  noticeChannelPinProblems,
  scanNoticeChannelPin,
  orgVettingWriterProblems,
  parseDebitRefusalRaises,
  parseEmailUnverifiedRaise,
  parseTypescriptEmailUnverifiedRenderer,
  parseTypescriptExhaustedRenderer,
  parseTypescriptExceedsRemainingRenderer,
  scanAbsentPublishFlow,
  scanDiscoveryWallet,
  scanDocumentContentSinks,
  scanEmailUnverifiedSentence,
  scanExhaustedSentence,
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
    expect(exhaustedSentenceProblems()).toEqual([]);
    expect(emailUnverifiedSentenceProblems()).toEqual([]);
    expect(noticeChannelPinProblems()).toEqual([]);
    expect(discoveryWalletProblems()).toEqual([]);
    expect(absentPublishFlowProblems()).toEqual([]);
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

describe('scanExhaustedSentence refusals', () => {
  const SAMPLE_ORG = '00000000-0000-4000-8000-000000000002';
  const SAMPLE_REMAINING = remainingCredits(dailyGrantFor('unverified'), 0);
  const UNVERIFIED_FORMAT =
    'discovery_allowance refuses: organisation % has no Discovery credits left today — get vetted (daily grant becomes %), fund project fuel to continue now, or wait for the next UTC day';
  const VETTED_FORMAT =
    'discovery_allowance refuses: organisation % has no Discovery credits left today — fund project fuel to continue now, or wait for the next UTC day';
  const EXCEEDS_FORMAT =
    'discovery_allowance refuses: organisation % still has % Discovery credits remaining today — this debit is larger than what remains';
  const MATCHING_EXHAUSTED_RENDERER =
    'export function dailyAllowanceExhaustedReason(organizationId: string, tier: DiscoveryTier): string {\n' +
    '  const remedies =\n' +
    "    tier === 'vetted'\n" +
    "      ? 'fund project fuel to continue now, or wait for the next UTC day'\n" +
    "      : `get vetted (daily grant becomes ${dailyGrantFor('vetted')}), fund project fuel to continue now, or wait for the next UTC day`;\n" +
    '  return (\n' +
    '    `discovery_allowance refuses: organisation ${organizationId} has no Discovery credits left today` +\n' +
    '    ` — ${remedies}`\n' +
    '  );\n' +
    '}\n';
  const MATCHING_EXCEEDS_RENDERER =
    'export function debitExceedsRemainingReason(organizationId: string, remaining: number): string {\n' +
    '  return (\n' +
    '    `discovery_allowance refuses: organisation ${organizationId} still has ${remaining} Discovery credits remaining today` +\n' +
    '    ` — this debit is larger than what remains`\n' +
    '  );\n' +
    '}\n';

  function allowanceSql(over: {
    unverifiedFormat?: string;
    vettedFormat?: string;
    exceedsFormat?: string;
    grantArg?: string;
    remainingArg?: string;
    omitUnverified?: boolean;
    omitVetted?: boolean;
    omitExceeds?: boolean;
  } = {}): string {
    const unverified = over.omitUnverified
      ? ''
      : `raise exception '${over.unverifiedFormat ?? UNVERIFIED_FORMAT}', p_organization_id, ${over.grantArg ?? 'public.discovery_daily_grant(true)'} using errcode = 'P0001', detail = 'daily-allowance-exhausted';\n`;
    const vetted = over.omitVetted
      ? ''
      : `raise exception '${over.vettedFormat ?? VETTED_FORMAT}', p_organization_id using errcode = 'P0001', detail = 'daily-allowance-exhausted';\n`;
    const exceeds = over.omitExceeds
      ? ''
      : `raise exception '${over.exceedsFormat ?? EXCEEDS_FORMAT}', p_organization_id, ${over.remainingArg ?? 'v_remaining'} using errcode = 'P0001', detail = 'debit-exceeds-remaining';\n`;
    return 'create function public.discovery_allowance()\nas $$\n' + unverified + vetted + exceeds + '$$;\n';
  }

  function input(
    over: Partial<{
      organizationId: string;
      vettedGrant: number;
      remaining: number;
      exhaustedUnverified: string;
      exhaustedVetted: string;
      exceedsRemaining: string;
      allowanceFunctionSql: string;
      typescriptExhaustedRendererSource: string;
      typescriptExceedsRemainingRendererSource: string;
    }> = {},
  ) {
    return {
      organizationId: SAMPLE_ORG,
      vettedGrant: dailyGrantFor('vetted'),
      remaining: SAMPLE_REMAINING,
      exhaustedUnverified: dailyAllowanceExhaustedReason(SAMPLE_ORG, 'unverified'),
      exhaustedVetted: dailyAllowanceExhaustedReason(SAMPLE_ORG, 'vetted'),
      exceedsRemaining: debitExceedsRemainingReason(SAMPLE_ORG, SAMPLE_REMAINING),
      allowanceFunctionSql: allowanceSql(),
      typescriptExhaustedRendererSource: MATCHING_EXHAUSTED_RENDERER,
      typescriptExceedsRemainingRendererSource: MATCHING_EXCEEDS_RENDERER,
      ...over,
    };
  }

  it('accepts matching SQL raises and TypeScript renderers for every arm', () => {
    expect(scanExhaustedSentence(input())).toEqual([]);
  });

  it('fails when the unverified SQL sentence drops the remedies', () => {
    const problems = scanExhaustedSentence(
      input({
        allowanceFunctionSql: allowanceSql({
          unverifiedFormat: 'discovery_allowance refuses: organisation % has no Discovery credits left today — wait only %',
        }),
      }),
    );
    expect(problems.some((problem) => /TypeScript unverified exhausted sentence/.test(problem))).toBe(true);
  });

  it('fails when the vetted SQL sentence still names get vetted', () => {
    const problems = scanExhaustedSentence(
      input({
        allowanceFunctionSql: allowanceSql({
          vettedFormat:
            'discovery_allowance refuses: organisation % has no Discovery credits left today — get vetted, fund project fuel to continue now, or wait for the next UTC day',
        }),
      }),
    );
    expect(problems.some((problem) => /TypeScript vetted exhausted sentence/.test(problem))).toBe(true);
  });

  it('fails when the SQL grant argument is a numeric literal', () => {
    const problems = scanExhaustedSentence(input({ allowanceFunctionSql: allowanceSql({ grantArg: '30' }) }));
    expect(problems.some((problem) => /grant argument/.test(problem))).toBe(true);
  });

  it('fails when the exceeds-remaining SQL sentence disagrees', () => {
    const problems = scanExhaustedSentence(
      input({
        allowanceFunctionSql: allowanceSql({
          exceedsFormat: 'discovery_allowance refuses: organisation % still has % left — ask again',
        }),
      }),
    );
    expect(problems.some((problem) => /TypeScript exceeds-remaining sentence/.test(problem))).toBe(true);
  });

  it('fails when the TypeScript exhausted renderer contains a numeric literal', () => {
    const problems = scanExhaustedSentence(
      input({
        typescriptExhaustedRendererSource:
          'export function dailyAllowanceExhaustedReason(organizationId: string, tier: DiscoveryTier): string {\n' +
          "  return `get vetted (daily grant becomes 30) ${organizationId} ${dailyGrantFor('vetted')}`;\n" +
          '}\n',
      }),
    );
    expect(problems.some((problem) => /numeric literal/.test(problem))).toBe(true);
  });

  it('fails when the TypeScript exhausted renderer does not read dailyGrantFor vetted', () => {
    const problems = scanExhaustedSentence(
      input({
        typescriptExhaustedRendererSource:
          'export function dailyAllowanceExhaustedReason(organizationId: string, tier: DiscoveryTier): string {\n' +
          '  return `get vetted ${organizationId}`;\n' +
          '}\n',
      }),
    );
    expect(problems.some((problem) => /dailyGrantFor/.test(problem))).toBe(true);
  });

  it('throws when the allowance function is absent', () => {
    expect(() => parseDebitRefusalRaises('create function public.other() as $$ begin null; end; $$;')).toThrow(
      /no public.discovery_allowance/,
    );
  });

  it('throws when the unverified exhausted raise is absent', () => {
    expect(() => scanExhaustedSentence(input({ allowanceFunctionSql: allowanceSql({ omitUnverified: true }) }))).toThrow(
      /unverified exhausted/,
    );
  });

  it('throws when the vetted exhausted raise is absent', () => {
    expect(() => scanExhaustedSentence(input({ allowanceFunctionSql: allowanceSql({ omitVetted: true }) }))).toThrow(
      /vetted exhausted/,
    );
  });

  it('throws when the exceeds-remaining raise is absent', () => {
    expect(() => scanExhaustedSentence(input({ allowanceFunctionSql: allowanceSql({ omitExceeds: true }) }))).toThrow(
      /exceeds-remaining/,
    );
  });

  it('throws when the TypeScript exhausted renderer is absent', () => {
    expect(() => parseTypescriptExhaustedRenderer('export function other() { return 1; }\n')).toThrow(
      /no export function dailyAllowanceExhaustedReason/,
    );
  });

  it('throws when the TypeScript exceeds-remaining renderer is absent', () => {
    expect(() => parseTypescriptExceedsRemainingRenderer('export function other() { return 1; }\n')).toThrow(
      /no export function debitExceedsRemainingReason/,
    );
  });
});

describe('scanEmailUnverifiedSentence refusals', () => {
  const SAMPLE_ACCOUNT = '00000000-0000-4000-8000-000000000022';
  const MATCHING_FORMAT = "discovery_allowance refuses %: the caller's email address is not verified";
  const MATCHING_RENDERER =
    'export function emailUnverifiedReason(accountId: string): string {\n' +
    "  return `discovery_allowance refuses ${accountId}: the caller's email address is not verified`;\n" +
    '}\n';

  function allowanceSql(over: { format?: string; arg?: string; omit?: boolean } = {}): string {
    const raise = over.omit
      ? ''
      : `raise exception '${(over.format ?? MATCHING_FORMAT).replace(/'/g, "''")}', ${over.arg ?? 'p_account_id'} using errcode = '42501', detail = 'email-unverified';\n`;
    return 'create function public.discovery_allowance()\nas $$\n' + raise + '$$;\n';
  }

  function input(
    over: Partial<{
      accountId: string;
      typescriptReason: string;
      allowanceFunctionSql: string;
      typescriptRendererSource: string;
    }> = {},
  ) {
    return {
      accountId: SAMPLE_ACCOUNT,
      typescriptReason: emailUnverifiedReason(SAMPLE_ACCOUNT),
      allowanceFunctionSql: allowanceSql(),
      typescriptRendererSource: MATCHING_RENDERER,
      ...over,
    };
  }

  it('accepts a matching SQL raise and TypeScript renderer', () => {
    expect(scanEmailUnverifiedSentence(input())).toEqual([]);
  });

  it('fails when the SQL sentence disagrees', () => {
    const problems = scanEmailUnverifiedSentence(
      input({
        allowanceFunctionSql: allowanceSql({ format: 'discovery_allowance refuses %: not allowed' }),
      }),
    );
    expect(problems.some((problem) => /TypeScript email-unverified sentence/.test(problem))).toBe(true);
  });

  it('fails when the SQL argument is not p_account_id', () => {
    const problems = scanEmailUnverifiedSentence(input({ allowanceFunctionSql: allowanceSql({ arg: 'p_organization_id' }) }));
    expect(problems.some((problem) => /p_account_id/.test(problem))).toBe(true);
  });

  it('fails when the TypeScript renderer contains a numeric literal', () => {
    const problems = scanEmailUnverifiedSentence(
      input({
        typescriptRendererSource:
          'export function emailUnverifiedReason(accountId: string): string {\n' +
          "  return `discovery_allowance refuses ${accountId}: 1 email`;\n" +
          '}\n',
      }),
    );
    expect(problems.some((problem) => /numeric literal/.test(problem))).toBe(true);
  });

  it('throws when the allowance function is absent', () => {
    expect(() => parseEmailUnverifiedRaise('create function public.other() as $$ begin null; end; $$;')).toThrow(
      /no public.discovery_allowance/,
    );
  });

  it('throws when the email-unverified raise is absent', () => {
    expect(() => scanEmailUnverifiedSentence(input({ allowanceFunctionSql: allowanceSql({ omit: true }) }))).toThrow(
      /email-unverified/,
    );
  });

  it('throws when the TypeScript renderer is absent', () => {
    expect(() => parseTypescriptEmailUnverifiedRenderer('export function other() { return 1; }\n')).toThrow(
      /no export function emailUnverifiedReason/,
    );
  });

  it('throws when the TypeScript renderer source is empty', () => {
    expect(() => scanEmailUnverifiedSentence(input({ typescriptRendererSource: '' }))).toThrow(/empty TypeScript renderer/);
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
          "  return { ok: true, value: 'not-vetting-gated' };\n" +
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
          "  if (vetted === true) return { ok: true, value: 'vetted' };\n" +
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

describe('scanNoticeChannelPin refusals', () => {
  const SQL = "v_authorized := '[\"email\", \"inapp\"]'::jsonb;";

  it('accepts a definer set that is the taxonomy set', () => {
    expect(scanNoticeChannelPin({ definerSql: SQL, taxonomyChannels: ['inapp', 'email'] })).toEqual([]);
  });

  it('fails when the definer drops a channel the taxonomy names', () => {
    expect(scanNoticeChannelPin({ definerSql: SQL, taxonomyChannels: ['email', 'inapp', 'sms'] })).toHaveLength(1);
  });

  it('fails when the definer authorises a channel the taxonomy does not name', () => {
    expect(scanNoticeChannelPin({ definerSql: SQL, taxonomyChannels: ['inapp'] })).toHaveLength(1);
  });

  it('throws when the definer names no authorised set', () => {
    expect(() => scanNoticeChannelPin({ definerSql: 'begin end;', taxonomyChannels: ['email'] })).toThrow(
      /could not read the authorised channel set/,
    );
  });
});
