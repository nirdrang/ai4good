/** Daily Discovery grants, the high-water mark, and the allowance read/debit decision. */

import { orgAdminActionAllowed } from './memberships.ts';
import {
  refuseWrite,
  stringField,
  type AccountWriteRouteInput,
  type WriteRouteDecision,
} from './write-routes.ts';

export type DiscoveryTier = 'unverified' | 'vetted';

/** One place in TypeScript. The SQL function `discovery_daily_grant` is the other. */
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

/** UTC calendar day of an instant, matching `(clock_timestamp() at time zone 'utc')::date`. */
export function utcDayOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * High-water mark for the day's row. `storedGranted` is null when the day has no row yet.
 * Remaining is `granted - spent` and is never stored.
 */
export function highWaterGrant(storedGranted: number | null, tier: DiscoveryTier): number {
  const current = dailyGrantFor(tier);
  return storedGranted === null ? current : Math.max(storedGranted, current);
}

export function remainingCredits(granted: number, spent: number): number {
  return granted - spent;
}

export type SpendRow = {
  organizationId: string;
  utcDay: string;
  spent: number;
  granted: number;
};

/** The allowance route's answer. `dailyGrant` is the high-water mark, not the current-tier raw grant. */
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

function isRecord(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function integerField(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  return value;
}

function isoDay(value: unknown): string | null {
  if (typeof value === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
    return match ? match[1] : null;
  }
  return null;
}

export function renderDiscoveryAllowance(value: unknown): Record<string, unknown> {
  const row = isRecord(value) ? (value as Record<string, unknown>) : null;
  const organizationId = typeof row?.organization_id === 'string' ? row.organization_id : null;
  const utcDay = isoDay(row?.utc_day);
  return {
    organizationId,
    utcDay,
    vetted: row?.vetted === true,
    dailyGrant: typeof row?.daily_grant === 'number' ? row.daily_grant : null,
    spentToday: typeof row?.spent_today === 'number' ? row.spent_today : null,
    remaining: typeof row?.remaining === 'number' ? row.remaining : null,
  };
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
