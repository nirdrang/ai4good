import { describe, expect, it } from 'vitest';

import {
  dailyAllowanceExhaustedReason,
  dailyGrantFor,
  debitExceedsRemainingReason,
  emailUnverifiedReason,
  remainingCredits,
} from '../../../supabase/functions/_shared/discovery-allowance.ts';
import {
  emailUnverifiedSentenceProblems,
  exhaustedSentenceProblems,
  noticeChannelPinProblems,
  parseDebitRefusalRaises,
  parseReserveRefusalRaises,
  parseEmailUnverifiedRaise,
  parseTypescriptEmailUnverifiedRenderer,
  parseTypescriptExhaustedRenderer,
  parseTypescriptExceedsRemainingRenderer,
  scanEmailUnverifiedSentence,
  scanExhaustedSentence,
  scanNoticeChannelPin,
} from '../suites/req-002/_source-pins.ts';

describe('REQ-002 pin source oracles over the real tree', () => {
  it('report no problems', () => {
    expect(exhaustedSentenceProblems()).toEqual([]);
    expect(emailUnverifiedSentenceProblems()).toEqual([]);
    expect(noticeChannelPinProblems()).toEqual([]);
  });
});

describe('scanExhaustedSentence refusals', () => {
  const SAMPLE_ORG = '00000000-0000-4000-8000-000000000002';
  const SAMPLE_REMAINING = remainingCredits(dailyGrantFor('unverified'), 0);
  const EXHAUSTED_FORMAT =
    'discovery_allowance refuses: organisation % has no Discovery credits left today — fund project fuel to continue now, or wait for the next UTC day';
  const GET_VETTED_FORMAT =
    'discovery_allowance refuses: organisation % has no Discovery credits left today — get vetted, fund project fuel to continue now, or wait for the next UTC day';
  const EXCEEDS_FORMAT =
    'discovery_allowance refuses: organisation % still has % Discovery credits remaining today — this debit is larger than what remains';
  const MATCHING_EXHAUSTED_RENDERER =
    'export function dailyAllowanceExhaustedReason(organizationId: string): string {\n' +
    '  return (\n' +
    '    `discovery_allowance refuses: organisation ${organizationId} has no Discovery credits left today` +\n' +
    '    ` — fund project fuel to continue now, or wait for the next UTC day`\n' +
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
    exhaustedFormat?: string;
    exceedsFormat?: string;
    remainingArg?: string;
    omitExhausted?: boolean;
    omitExceeds?: boolean;
  } = {}): string {
    const exhausted = over.omitExhausted
      ? ''
      : `raise exception '${over.exhaustedFormat ?? EXHAUSTED_FORMAT}', p_organization_id using errcode = 'P0001', detail = 'daily-allowance-exhausted';\n`;
    const exceeds = over.omitExceeds
      ? ''
      : `raise exception '${over.exceedsFormat ?? EXCEEDS_FORMAT}', p_organization_id, ${over.remainingArg ?? 'v_remaining'} using errcode = 'P0001', detail = 'debit-exceeds-remaining';\n`;
    return 'create function public.discovery_allowance()\nas $$\n' + exhausted + exceeds + '$$;\n';
  }

  function reserveSql(over: { format?: string; omit?: boolean } = {}): string {
    const exhausted = over.omit
      ? ''
      : `raise exception '${over.format ?? EXHAUSTED_FORMAT}', p_organization_id using errcode = 'P0001', detail = 'daily-limit';\n`;
    return 'create or replace function public.discovery_turn_reserve()\nas $$\n' + exhausted + '$$;\n';
  }

  function input(
    over: Partial<{
      organizationId: string;
      remaining: number;
      exhausted: string;
      exceedsRemaining: string;
      allowanceFunctionSql: string;
      reserveFunctionSql: string;
      typescriptExhaustedRendererSource: string;
      typescriptExceedsRemainingRendererSource: string;
    }> = {},
  ) {
    return {
      organizationId: SAMPLE_ORG,
      remaining: SAMPLE_REMAINING,
      exhausted: dailyAllowanceExhaustedReason(SAMPLE_ORG),
      exceedsRemaining: debitExceedsRemainingReason(SAMPLE_ORG, SAMPLE_REMAINING),
      allowanceFunctionSql: allowanceSql(),
      reserveFunctionSql: reserveSql(),
      typescriptExhaustedRendererSource: MATCHING_EXHAUSTED_RENDERER,
      typescriptExceedsRemainingRendererSource: MATCHING_EXCEEDS_RENDERER,
      ...over,
    };
  }

  it('accepts matching SQL raises in both functions and matching TypeScript renderers', () => {
    expect(scanExhaustedSentence(input())).toEqual([]);
  });

  it('fails when the allowance SQL sentence drops a remedy', () => {
    const problems = scanExhaustedSentence(
      input({
        allowanceFunctionSql: allowanceSql({
          exhaustedFormat: 'discovery_allowance refuses: organisation % has no Discovery credits left today — wait only',
        }),
      }),
    );
    expect(problems.some((problem) => /SQL discovery_allowance exhausted raise filled/.test(problem))).toBe(true);
  });

  it('fails when the reserve SQL sentence disagrees with the TypeScript sentence', () => {
    const problems = scanExhaustedSentence(
      input({
        reserveFunctionSql: reserveSql({
          format: 'discovery_allowance refuses: organisation % has no Discovery credits left today — wait for tomorrow',
        }),
      }),
    );
    expect(problems.some((problem) => /SQL discovery_turn_reserve exhausted raise filled/.test(problem))).toBe(true);
  });

  it('fails when either SQL sentence names get vetted again', () => {
    const allowance = scanExhaustedSentence(input({ allowanceFunctionSql: allowanceSql({ exhaustedFormat: GET_VETTED_FORMAT }) }));
    expect(allowance).toContain('the SQL discovery_allowance exhausted sentence names get vetted');
    const reserve = scanExhaustedSentence(input({ reserveFunctionSql: reserveSql({ format: GET_VETTED_FORMAT }) }));
    expect(reserve).toContain('the SQL discovery_turn_reserve exhausted sentence names get vetted');
  });

  it('fails when the TypeScript sentence names get vetted again', () => {
    const problems = scanExhaustedSentence(
      input({ exhausted: GET_VETTED_FORMAT.replace('%', SAMPLE_ORG) }),
    );
    expect(problems).toContain('dailyAllowanceExhaustedReason names get vetted');
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
          'export function dailyAllowanceExhaustedReason(organizationId: string): string {\n' +
          '  return `daily grant becomes 30 ${organizationId}`;\n' +
          '}\n',
      }),
    );
    expect(problems.some((problem) => /numeric literal/.test(problem))).toBe(true);
  });

  it('throws when the allowance function is absent', () => {
    expect(() => parseDebitRefusalRaises('create function public.other() as $$ begin null; end; $$;')).toThrow(
      /no public.discovery_allowance/,
    );
  });

  it('throws when the reserve function is absent', () => {
    expect(() => parseReserveRefusalRaises('create function public.other() as $$ begin null; end; $$;')).toThrow(
      /no public.discovery_turn_reserve/,
    );
  });

  it('throws when the allowance exhausted raise is absent', () => {
    expect(() => scanExhaustedSentence(input({ allowanceFunctionSql: allowanceSql({ omitExhausted: true }) }))).toThrow(
      /discovery_allowance exhausted/,
    );
  });

  it('throws when the reserve exhausted raise is absent', () => {
    expect(() => scanExhaustedSentence(input({ reserveFunctionSql: reserveSql({ omit: true }) }))).toThrow(
      /discovery_turn_reserve exhausted/,
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
