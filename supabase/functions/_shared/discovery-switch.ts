/** The platform administrator's per-organisation Discovery switch: request validation, RPC arguments and result projection. */

import {
  booleanField,
  isRecord,
  refuseWrite,
  stringField,
  type AccountWriteRouteInput,
  type WriteRouteDecision,
} from './write-routes.ts';

export type OrganizationDiscoveryArgs = {
  readonly p_account_id: string;
  readonly p_organization_id: string;
  readonly p_enabled: boolean;
  readonly p_reason: string;
};

export type OrganizationDiscoveryRender = {
  organizationId: string | null;
  discoveryEnabled: boolean;
  changed: boolean;
  disabledAt: string | null;
};

function instant(value: unknown): string | null {
  if (typeof value === 'string' && value !== '') return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return null;
}

export function renderDiscoverySwitch(value: unknown): OrganizationDiscoveryRender {
  const row = isRecord(value) ? value : null;
  const organizationId = typeof row?.organization_id === 'string' ? row.organization_id : null;
  return {
    organizationId,
    discoveryEnabled: row?.discovery_enabled === true,
    changed: row?.changed === true,
    disabledAt: instant(row?.disabled_at),
  };
}

export function decideOrganizationDiscovery(input: AccountWriteRouteInput): WriteRouteDecision<OrganizationDiscoveryArgs> {
  const organizationId = input.target;
  if (organizationId === null) {
    return refuseWrite('invalid-request', 400, 'the Discovery switch must name the organisation by id (organizationId)');
  }
  const enabled = booleanField(input.body.enabled);
  if (enabled === null) {
    return refuseWrite('invalid-request', 400, 'the Discovery switch must say whether Discovery is enabled');
  }
  const reason = stringField(input.body.reason);
  if (reason === null) {
    return refuseWrite('invalid-request', 400, 'the Discovery switch must carry a reason — the audit record is written with it');
  }
  if (!input.standing.orgExists) {
    return refuseWrite('no-such-organisation', 409, `no organisation ${organizationId} exists`);
  }
  return {
    ok: true,
    args: {
      p_account_id: input.caller.id,
      p_organization_id: organizationId,
      p_enabled: enabled,
      p_reason: reason,
    },
  };
}
