/**
 * AT-REQ-002 · A. Org profile — AT-002.01, AT-002.02
 * Source: .taskmaster/docs/acceptance/at-req-002.md
 */

import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import type { OrganizationProfileRow, OrganizationsSut, ProfileRequest, Session, WriteRefusal } from './_contract.ts';

const PROFILE = {
  name: 'Riverside Shelter',
  mission: 'Housing first for people sleeping rough',
  country: 'Kenya',
  website: 'riverside.example.org',
  logo: 'riverside-mark',
} as const;

const EDITED = {
  name: 'Riverside Shelter and Kitchen',
  mission: 'Warm beds and a kitchen for people sleeping rough',
  country: 'Uganda',
  website: 'riverside-kitchen.example.org',
  logo: 'riverside-kitchen-mark',
} as const;

const ATTACKED = {
  name: 'Hijacked Shelter',
  mission: 'A mission that must not persist',
  country: 'Nowhere',
  website: 'hijacked.example.org',
  logo: 'hijacked-mark',
} as const;

type ProfileFields = {
  name: string;
  mission: string;
  country: string;
  website: string;
  logo: string;
};

function fieldsOf(row: OrganizationProfileRow): ProfileFields {
  return {
    name: row.name,
    mission: row.mission ?? '',
    country: row.country ?? '',
    website: row.website ?? '',
    logo: row.logo ?? '',
  };
}

function profileRequest(organizationId: string, fields: ProfileFields): ProfileRequest {
  return { organizationId, ...fields };
}

async function storedFields(sut: OrganizationsSut, organizationId: string): Promise<ProfileFields | null> {
  const row = await sut.profile(organizationId);
  return row === null ? null : fieldsOf(row);
}

describe('AT-REQ-002 A — org profile', () => {
  atTest(
    'AT-002.01',
    'an email-verified NGO creates the profile with name, mission, country, website and logo, and every field persists and renders',
    async ({ open }) => {
      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-01'), { emailVerified: true });

      const outcome = await sut.setProfile(ngo.session, {
        organizationId: ngo.organizationId,
        ...PROFILE,
      });
      expect(outcome, 'the NGO admin profile write was refused').toMatchObject({
        ok: true,
        organizationId: ngo.organizationId,
      });
      if (!outcome.ok) return;

      const row = await sut.profile(ngo.organizationId);
      expect(row, 'the profile did not persist').not.toBeNull();
      if (row === null) return;
      expect(row.name).toBe(PROFILE.name);
      expect(row.mission).toBe(PROFILE.mission);
      expect(row.country).toBe(PROFILE.country);
      expect(row.website).toBe(PROFILE.website);
      expect(row.logo).toBe(PROFILE.logo);

      const dash = await sut.organizationDashboard(ngo.session, ngo.organizationId);
      expect(dash.ok, 'the organisation dashboard did not render the profile').toBe(true);
      if (!dash.ok) return;
      expect(dash.value.organizationName).toBe(PROFILE.name);
      expect(dash.value.mission).toBe(PROFILE.mission);
      expect(dash.value.country).toBe(PROFILE.country);
      expect(dash.value.website).toBe(PROFILE.website);
      expect(dash.value.logo).toBe(PROFILE.logo);
    },
  );

  atTest(
    'AT-002.02',
    "the NGO's admin edits all five profile fields and every value persists; another NGO, a volunteer and a visitor are refused",
    async ({ open }) => {
      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-02'), { emailVerified: true });
      const otherNgo = await sut.provisionNgo(w.email('ngo-02-other'), { emailVerified: true });
      const volunteer = await sut.provisionVolunteer(w.email('vol-02'));

      const created = await sut.setProfile(ngo.session, profileRequest(ngo.organizationId, PROFILE));
      expect(created, 'the Given profile write was refused').toMatchObject({
        ok: true,
        organizationId: ngo.organizationId,
      });
      if (!created.ok) return;

      const edited = await sut.setProfile(ngo.session, profileRequest(ngo.organizationId, EDITED));
      expect(edited, 'the NGO admin profile edit was refused').toMatchObject({
        ok: true,
        organizationId: ngo.organizationId,
      });
      if (!edited.ok) return;

      expect(await storedFields(sut, ngo.organizationId), 'the edited profile did not persist').toEqual(EDITED);

      const dash = await sut.organizationDashboard(ngo.session, ngo.organizationId);
      expect(dash.ok, 'the organisation dashboard did not render the edited profile').toBe(true);
      if (!dash.ok) return;
      expect(dash.value.organizationName).toBe(EDITED.name);
      expect(dash.value.mission).toBe(EDITED.mission);
      expect(dash.value.country).toBe(EDITED.country);
      expect(dash.value.website).toBe(EDITED.website);
      expect(dash.value.logo).toBe(EDITED.logo);

      const attack = profileRequest(ngo.organizationId, ATTACKED);

      const assertRouteRefused = async (
        label: string,
        session: Session | null,
        kind: WriteRefusal['kind'],
        status: number,
      ) => {
        const before = await storedFields(sut, ngo.organizationId);
        const outcome = await sut.setProfile(session, attack);
        expect(outcome.ok, `${label} was admitted`).toBe(false);
        if (outcome.ok) return;
        expect(outcome.kind, `${label} was refused as ${outcome.kind}: ${outcome.reason}`).toBe(kind);
        expect(outcome.status, `${label} was refused with status ${outcome.status}`).toBe(status);
        expect(await storedFields(sut, ngo.organizationId), `${label} changed the stored profile`).toEqual(before);
      };

      const assertDefinerRefused = async (label: string, accountId: string, kind: WriteRefusal['kind']) => {
        const before = await storedFields(sut, ngo.organizationId);
        const outcome = await sut.attemptProfileDefinerAsOperator({ accountId, request: attack });
        expect(outcome.ok, `${label} was admitted by the definer`).toBe(false);
        if (outcome.ok) return;
        expect(outcome.kind, `${label} was refused as ${outcome.kind}: ${outcome.reason}`).toBe(kind);
        expect(await storedFields(sut, ngo.organizationId), `${label} changed the stored profile`).toEqual(before);
      };

      await assertRouteRefused("the admin of a different NGO", otherNgo.session, 'not-a-member', 403);
      await assertRouteRefused('a volunteer', volunteer, 'not-an-ngo-account', 403);
      await assertRouteRefused('an unauthenticated visitor', null, 'unauthenticated', 401);
      await assertDefinerRefused("the admin of a different NGO, through the definer", otherNgo.accountId, 'not-a-member');

      const nbsp = await sut.attemptProfileDefinerAsOperator({
        accountId: ngo.accountId,
        request: profileRequest(ngo.organizationId, { ...EDITED, name: '\u00A0' }),
      });
      expect(nbsp.ok, 'a name of only a non-breaking space was admitted by the definer').toBe(false);
      if (!nbsp.ok) {
        expect(nbsp.kind, `a name of only a non-breaking space was refused as ${nbsp.kind}`).toBe('invalid-name');
      }
      expect(await storedFields(sut, ngo.organizationId), 'a name of only a non-breaking space changed the stored profile').toEqual(
        EDITED,
      );

      // The unique seat forbids a second membership row, so a member of this organisation is the
      // existing seat with its role changed. No product path writes `member`.
      await sut.setMembershipRoleAsOperator(ngo.organizationId, ngo.accountId, 'member');
      await assertRouteRefused('a member of this organisation', ngo.session, 'not-an-admin', 403);
      await assertDefinerRefused('a member of this organisation, through the definer', ngo.accountId, 'not-an-admin');
    },
  );
});
