
import { describe, expect, it } from 'vitest';

import { WRITE_ROUTES } from '../../../supabase/functions/_shared/write-routes.ts';
import {
  freeCreditsOutsideMoneyProblems,
  noPlatformBreakerProblems,
  noSupplementalGrantPathProblems,
  scanFreeCreditsOutsideMoney,
  scanPlatformBreaker,
  scanSupplementalGrantPath,
} from '../suites/req-004/_source-absences.ts';
import type { RouteInventory } from '../suites/req-002/_source-scan.ts';

const inventory = (over: RouteInventory = {}): RouteInventory => ({ ...WRITE_ROUTES, ...over });

const SPEND_TABLE =
  'create table public.discovery_spend (org_id uuid not null, utc_day date not null, spent integer, granted integer, primary key (org_id, utc_day));';
const TURNS_TABLE =
  'create table public.discovery_turns (id uuid primary key, reserved_micros bigint, actual_micros bigint, overrun_micros bigint, micros_per_credit integer, input_micros_per_token integer, output_micros_per_token integer);';
const ORGS_TABLE = 'create table public.organizations (id uuid primary key, name text not null);';
const SWITCH_ALTER =
  'alter table public.organizations add column discovery_disabled_at timestamptz, add column discovery_disabled_by uuid, add column discovery_disabled_reason text;';
const GRANT_MARK =
  'create function public.apply_discovery_grant_mark(p_organization_id uuid, p_utc_day date, p_vetted boolean) returns void as $$ begin insert into public.discovery_spend (org_id, utc_day, spent, granted) values (p_organization_id, p_utc_day, 0, public.discovery_daily_grant(p_vetted)); end; $$;';
const ALLOWANCE =
  'create function public.discovery_allowance() returns jsonb as $$ begin update public.discovery_spend set spent = spent + 1; return \'{}\'::jsonb; end; $$;';
const RELEASE =
  'create function public.discovery_spend_release() returns void as $$ begin update public.discovery_spend set spent = spent - 1; end; $$;';

const cleanGrant = [
  { path: 'supabase/migrations/spend.sql', text: `${SPEND_TABLE}\n${GRANT_MARK}\n${ALLOWANCE}\n${RELEASE}\n` },
  {
    path: 'supabase/functions/_shared/discovery-allowance.ts',
    text: "export const DISCOVERY_DAILY_GRANT = { unverified: 1, vetted: 2 };\nreason: 'organisation has no Discovery credits left today — get vetted (daily grant becomes N)';\n",
  },
];

const cleanBreaker = [
  { path: 'supabase/migrations/orgs.sql', text: `${ORGS_TABLE}\n${SWITCH_ALTER}\n${SPEND_TABLE}\n` },
  { path: 'supabase/functions/_shared/discovery-switch.ts', text: 'export function decideOrganizationDiscovery() { return { ok: true }; }\n' },
];

const cleanMoney = [
  { path: 'supabase/migrations/spend.sql', text: `${SPEND_TABLE}\n${TURNS_TABLE}\n` },
];

describe('REQ-004 absence source oracles over the real tree', () => {
  it('report no problems', () => {
    expect(noSupplementalGrantPathProblems()).toEqual([]);
    expect(noPlatformBreakerProblems()).toEqual([]);
    expect(freeCreditsOutsideMoneyProblems()).toEqual([]);
  });
});

describe('scanSupplementalGrantPath refusals', () => {
  it('accepts the daily grant mark, the spent writers, and daily-grant copy', () => {
    expect(scanSupplementalGrantPath({ files: cleanGrant, inventory: WRITE_ROUTES })).toEqual([]);
  });

  it('throws when discovery_spend is missing', () => {
    expect(() =>
      scanSupplementalGrantPath({
        files: [{ path: 'supabase/migrations/empty.sql', text: 'select 1;' }],
        inventory: WRITE_ROUTES,
      }),
    ).toThrow(/discovery_spend/);
  });

  it('fails a writer of discovery_spend outside the three functions', () => {
    const problems = scanSupplementalGrantPath({
      files: [
        ...cleanGrant,
        {
          path: 'supabase/migrations/gift.sql',
          text: 'create function public.gift_credits() returns void as $$ begin insert into public.discovery_spend (org_id, utc_day, spent, granted) values (gen_random_uuid(), current_date, 0, 99); end; $$;',
        },
      ],
      inventory: WRITE_ROUTES,
    });
    expect(problems.some((problem) => /outside apply_discovery_grant_mark/.test(problem))).toBe(true);
  });

  it('fails apply_discovery_grant_mark called with a number', () => {
    const problems = scanSupplementalGrantPath({
      files: [
        ...cleanGrant,
        {
          path: 'supabase/migrations/mark.sql',
          text: 'create function public.touch() returns void as $$ begin perform public.apply_discovery_grant_mark(gen_random_uuid(), current_date, 50); end; $$;',
        },
      ],
      inventory: WRITE_ROUTES,
    });
    expect(problems.some((problem) => /vetted boolean/.test(problem))).toBe(true);
  });

  it('fails a grant write route other than discovery-allowance', () => {
    const problems = scanSupplementalGrantPath({
      files: cleanGrant,
      inventory: inventory({
        'grant-discovery-credits': {
          surface: { kind: 'edge', rpc: 'grant_discovery_credits' },
          standing: { kind: 'account-required', admits: ['platform_admin'] },
        },
      }),
    });
    expect(problems.some((problem) => /grant-discovery-credits/.test(problem))).toBe(true);
    expect(problems.some((problem) => /grant_discovery_credits/.test(problem))).toBe(true);
  });

  it('fails Discovery credits gift copy', () => {
    const problems = scanSupplementalGrantPath({
      files: [
        ...cleanGrant,
        { path: 'src/routes/index.tsx', text: "label: 'a gift of Discovery credits';\n" },
      ],
      inventory: WRITE_ROUTES,
    });
    expect(problems.some((problem) => /gift of Discovery credits/.test(problem))).toBe(true);
  });
});

describe('scanPlatformBreaker refusals', () => {
  const surfaces = {
    routeFolders: ['set-organization-discovery', 'discovery-message'],
    inventory: WRITE_ROUTES,
    sharedModules: ['discovery-switch.ts'],
    uiRoutes: ['index.tsx'],
  };

  it('accepts the per-organisation switch and the spend key', () => {
    expect(scanPlatformBreaker({ ...surfaces, files: cleanBreaker })).toEqual([]);
  });

  it('throws when organizations is missing', () => {
    expect(() =>
      scanPlatformBreaker({
        ...surfaces,
        files: [{ path: 'supabase/migrations/spend.sql', text: SPEND_TABLE }],
      }),
    ).toThrow(/organizations/);
  });

  it('fails a circuit-breaker route', () => {
    const problems = scanPlatformBreaker({
      ...surfaces,
      files: cleanBreaker,
      routeFolders: [...surfaces.routeFolders, 'discovery-circuit-breaker'],
    });
    expect(problems.some((problem) => /discovery-circuit-breaker/.test(problem))).toBe(true);
  });

  it('fails a platform Discovery disable declaration', () => {
    const problems = scanPlatformBreaker({
      ...surfaces,
      files: [
        ...cleanBreaker,
        { path: 'supabase/functions/_shared/platform.ts', text: 'export function platformDiscoveryDisable() { return true; }\n' },
      ],
    });
    expect(problems.some((problem) => /platformDiscoveryDisable/.test(problem))).toBe(true);
  });
});

describe('scanFreeCreditsOutsideMoney refusals', () => {
  it('accepts the cost micros columns', () => {
    expect(scanFreeCreditsOutsideMoney({ files: cleanMoney })).toEqual([]);
  });

  it('throws when a credits table is missing', () => {
    expect(() =>
      scanFreeCreditsOutsideMoney({ files: [{ path: 'supabase/migrations/spend.sql', text: SPEND_TABLE }] }),
    ).toThrow(/discovery_turns/);
  });

  it('fails a fuel column on discovery_turns', () => {
    const problems = scanFreeCreditsOutsideMoney({
      files: [
        {
          path: 'supabase/migrations/spend.sql',
          text: `${SPEND_TABLE}\ncreate table public.discovery_turns (id uuid primary key, fuel_micros bigint);\n`,
        },
      ],
    });
    expect(problems.some((problem) => /fuel_micros/.test(problem))).toBe(true);
  });

  it('fails a foreign key from discovery_spend to a checkout table', () => {
    const problems = scanFreeCreditsOutsideMoney({
      files: [
        {
          path: 'supabase/migrations/spend.sql',
          text:
            'create table public.discovery_spend (org_id uuid, utc_day date, checkout_id uuid references public.fuel_checkout (id), primary key (org_id, utc_day));\n' +
            TURNS_TABLE,
        },
      ],
    });
    expect(problems.some((problem) => /fuel_checkout/.test(problem))).toBe(true);
  });
});
