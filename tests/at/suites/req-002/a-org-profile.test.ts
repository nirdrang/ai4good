/**
 * AT-REQ-002 · A. Org profile — AT-002.01, AT-002.02
 * Source: .taskmaster/docs/acceptance/at-req-002.md
 */

import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import { LEAF, notLanded } from './_pending.ts';

const PROFILE = {
  name: 'Riverside Shelter',
  mission: 'Housing first for people sleeping rough',
  country: 'Kenya',
  website: 'riverside.example.org',
  logo: 'riverside-mark',
} as const;

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

  atTest('AT-002.02', "the NGO's admin edits all five profile fields and every value persists; another NGO, a volunteer and a visitor are refused", notLanded(LEAF.D1_L2));
});
