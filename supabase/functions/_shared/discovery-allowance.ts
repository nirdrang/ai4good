import { orgAdminActionAllowed } from './memberships.ts';
import {
  integerField,
  isRecord,
  isoDay,
  refuseWrite,
  stringField,
  type AccountWriteRouteInput,
  type WriteRouteDecision,
} from './write-routes.ts';

export type DiscoveryTier = 'unverified' | 'vetted';

export const DISCOVERY_DAILY_GRANT: Readonly<Record<DiscoveryTier, number>> = {
  unverified: 10,
  vetted: 30,
};

export function dailyGrantFor(tier: DiscoveryTier): number {
  return DISCOVERY_DAILY_GRANT[tier];
}

export function discoveryTier(vetted: boolean): DiscoveryTier {
  return vetted ? 'vetted' : 'unverified';
}

export function utcDayOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function highWaterGrant(storedGranted: number | null, tier: DiscoveryTier): number {
  const current = dailyGrantFor(tier);
  return storedGranted === null ? current : Math.max(storedGranted, current);
}

export function remainingCredits(granted: number, spent: number): number {
  return granted - spent;
}

export function dailyAllowanceExhaustedReason(organizationId: string, tier: DiscoveryTier): string {
  const remedies =
    tier === 'vetted'
      ? 'fund project fuel to continue now, or wait for the next UTC day'
      : `get vetted (daily grant becomes ${dailyGrantFor('vetted')}), fund project fuel to continue now, or wait for the next UTC day`;
  return (
    `discovery_allowance refuses: organisation ${organizationId} has no Discovery credits left today` +
    ` — ${remedies}`
  );
}

export function debitExceedsRemainingReason(organizationId: string, remaining: number): string {
  return (
    `discovery_allowance refuses: organisation ${organizationId} still has ${remaining} Discovery credits remaining today` +
    ` — this debit is larger than what remains`
  );
}

export function emailUnverifiedReason(accountId: string): string {
  return `discovery_allowance refuses ${accountId}: the caller's email address is not verified`;
}

export type SpendRow = {
  organizationId: string;
  utcDay: string;
  spent: number;
  granted: number;
};

export type Allowance = {
  organizationId: string;
  utcDay: string;
  vetted: boolean;
  dailyGrant: number;
  spentToday: number;
  remaining: number;
};

export function allowanceOf(input: {
  organizationId: string;
  utcDay: string;
  vetted: boolean;
  granted: number;
  spent: number;
}): Allowance {
  return {
    organizationId: input.organizationId,
    utcDay: input.utcDay,
    vetted: input.vetted,
    dailyGrant: input.granted,
    spentToday: input.spent,
    remaining: remainingCredits(input.granted, input.spent),
  };
}

export type DiscoveryAllowanceArgs = {
  readonly p_account_id: string;
  readonly p_organization_id: string;
  readonly p_action: 'read' | 'debit';
  readonly p_credits: number | null;
};

export function renderDiscoveryAllowance(value: unknown): Allowance {
  if (!isRecord(value)) {
    throw new Error('discovery_allowance answered a result that is not an allowance');
  }
  const organizationId = typeof value.organization_id === 'string' ? value.organization_id : null;
  const utcDay = isoDay(value.utc_day);
  const dailyGrant = integerField(value.daily_grant);
  const spentToday = integerField(value.spent_today);
  const remaining = integerField(value.remaining);
  if (
    organizationId === null ||
    utcDay === null ||
    dailyGrant === null ||
    spentToday === null ||
    remaining === null ||
    typeof value.vetted !== 'boolean'
  ) {
    throw new Error('discovery_allowance answered a result that is not an allowance');
  }
  const allowance = allowanceOf({
    organizationId,
    utcDay,
    vetted: value.vetted,
    granted: dailyGrant,
    spent: spentToday,
  });
  if (allowance.remaining !== remaining) {
    throw new Error('discovery_allowance answered a remaining count that does not match granted minus spent');
  }
  return allowance;
}

export function decideDiscoveryAllowance(input: AccountWriteRouteInput): WriteRouteDecision<DiscoveryAllowanceArgs> {
  const organizationId = input.target;
  if (organizationId === null) {
    return refuseWrite('invalid-request', 400, 'the allowance action must name the organisation by id (organizationId)');
  }

  const action = stringField(input.body.action);
  if (action !== 'read' && action !== 'debit') {
    return refuseWrite('invalid-request', 400, 'the allowance action must be read or debit');
  }

  if (!input.standing.orgExists) {
    return refuseWrite('no-such-organisation', 409, `no organisation ${organizationId} exists`);
  }

  const allowed = orgAdminActionAllowed(input.standing.orgRole);
  if (!allowed.ok) {
    return { ok: false, kind: allowed.kind, reason: allowed.reason, status: 403 };
  }

  if (action === 'read') {
    if (input.body.credits !== undefined && input.body.credits !== null) {
      return refuseWrite('invalid-request', 400, 'an allowance read carries no credit amount');
    }
    return {
      ok: true,
      args: {
        p_account_id: input.caller.id,
        p_organization_id: organizationId,
        p_action: 'read',
        p_credits: null,
      },
    };
  }

  const credits = integerField(input.body.credits);
  if (credits === null || credits <= 0) {
    return refuseWrite('invalid-credit-amount', 400, 'a debit must spend a positive whole number of credits');
  }

  return {
    ok: true,
    args: {
      p_account_id: input.caller.id,
      p_organization_id: organizationId,
      p_action: 'debit',
      p_credits: credits,
    },
  };
}
