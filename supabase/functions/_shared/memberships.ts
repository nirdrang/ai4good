import { validateOrganizationName } from './accounts.ts';
import { isRecord, type AccountWriteRouteInput, type WriteRouteDecision } from './write-routes.ts';

export const ORG_ROLES = ['admin', 'member'] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export function parseOrgRole(raw: unknown): OrgRole | null {
  if (typeof raw !== 'string') return null;
  const candidate = raw.trim();
  return (ORG_ROLES as readonly string[]).includes(candidate) ? (candidate as OrgRole) : null;
}

export type OrgAdminRefusalKind = 'not-a-member' | 'not-an-admin';

export type OrgAdminDecision =
  | { ok: true; role: 'admin' }
  | { ok: false; kind: OrgAdminRefusalKind; reason: string };

export function orgAdminActionAllowed(role: OrgRole | null): OrgAdminDecision {
  if (role === 'admin') return { ok: true, role: 'admin' };
  if (role === 'member') {
    return {
      ok: false,
      kind: 'not-an-admin',
      reason:
        'this action is available to the admin of this organisation only — the caller holds the member role here, ' +
        'and a role is held per organisation, so admin standing in another organisation does not carry into this one',
    };
  }
  return {
    ok: false,
    kind: 'not-a-member',
    reason:
      'this action is available to members of this organisation only — the caller holds no membership in it, ' +
      'and membership is held per organisation, so acting in one organisation grants nothing in another',
  };
}

export type OrganizationRenameArgs = {
  readonly p_account_id: string;
  readonly p_organization_id: string;
  readonly p_name: string;
};

export function decideOrganizationRename(input: AccountWriteRouteInput): WriteRouteDecision<OrganizationRenameArgs> {
  if (input.target === null) {
    return { ok: false, kind: 'invalid-request', reason: 'an organisation rename must name the organisation to rename', status: 400 };
  }
  const allowed = orgAdminActionAllowed(input.standing.orgRole);
  if (!allowed.ok) return { ok: false, kind: allowed.kind, reason: allowed.reason, status: 403 };
  const name = validateOrganizationName(input.body.name);
  if (!name.ok) return { ok: false, kind: 'invalid-name', reason: name.reason, status: 400 };
  return { ok: true, args: { p_account_id: input.caller.id, p_organization_id: input.target, p_name: name.value } };
}

export type OrganizationProfileArgs = {
  readonly p_account_id: string;
  readonly p_organization_id: string;
  readonly p_name: string;
  readonly p_mission: string;
  readonly p_country: string;
  readonly p_website: string;
  readonly p_logo: string;
};

function nonEmptyProfileText(raw: unknown, field: string): { ok: true; value: string } | { ok: false; reason: string } {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, reason: `an organisation needs a non-empty ${field}` };
  }
  return { ok: true, value: raw.trim() };
}

export function decideOrganizationProfile(input: AccountWriteRouteInput): WriteRouteDecision<OrganizationProfileArgs> {
  if (input.target === null) {
    return {
      ok: false,
      kind: 'invalid-request',
      reason: 'an organisation profile write must name the organisation to write',
      status: 400,
    };
  }
  const allowed = orgAdminActionAllowed(input.standing.orgRole);
  if (!allowed.ok) return { ok: false, kind: allowed.kind, reason: allowed.reason, status: 403 };
  const name = validateOrganizationName(input.body.name);
  if (!name.ok) return { ok: false, kind: 'invalid-name', reason: name.reason, status: 400 };
  const mission = nonEmptyProfileText(input.body.mission, 'mission');
  if (!mission.ok) return { ok: false, kind: 'invalid-request', reason: mission.reason, status: 400 };
  const country = nonEmptyProfileText(input.body.country, 'country');
  if (!country.ok) return { ok: false, kind: 'invalid-request', reason: country.reason, status: 400 };
  const website = nonEmptyProfileText(input.body.website, 'website');
  if (!website.ok) return { ok: false, kind: 'invalid-request', reason: website.reason, status: 400 };
  const logo = nonEmptyProfileText(input.body.logo, 'logo');
  if (!logo.ok) return { ok: false, kind: 'invalid-request', reason: logo.reason, status: 400 };
  return {
    ok: true,
    args: {
      p_account_id: input.caller.id,
      p_organization_id: input.target,
      p_name: name.value,
      p_mission: mission.value,
      p_country: country.value,
      p_website: website.value,
      p_logo: logo.value,
    },
  };
}

export type OrganizationProfileRender = {
  organizationId: string | null;
  name: string | null;
  mission: string | null;
  country: string | null;
  website: string | null;
  logo: string | null;
};

export function renderOrganizationProfile(value: unknown): OrganizationProfileRender {
  const row = isRecord(value) ? value : null;
  return {
    organizationId: typeof row?.organization_id === 'string' ? row.organization_id : null,
    name: typeof row?.name === 'string' ? row.name : null,
    mission: typeof row?.mission === 'string' ? row.mission : null,
    country: typeof row?.country === 'string' ? row.country : null,
    website: typeof row?.website === 'string' ? row.website : null,
    logo: typeof row?.logo === 'string' ? row.logo : null,
  };
}
