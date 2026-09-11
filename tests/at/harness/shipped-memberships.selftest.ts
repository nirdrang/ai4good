/**
 * Oracle for the profile renderer and the profile definer's organisation-row lock.
 *
 * The renderer lives in the shared module because no type-checker covers the edge entry point.
 * The lock is a SQL fact: a missing organisation is already a refusal; this file pins that the
 * writer takes FOR UPDATE on the organisation row before the update, matching its siblings.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { renderOrganizationProfile } from '../../../supabase/functions/_shared/memberships.ts';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const PROFILE_MIGRATION = join(REPO_ROOT, 'supabase/migrations/20260915120000_organization_profile.sql');

describe('the shipped organisation profile renderer', () => {
  it('projects the six fields from a well-formed RPC result', () => {
    expect(
      renderOrganizationProfile({
        organization_id: '00000000-0000-4000-8000-000000000010',
        name: 'Riverside Shelter',
        mission: 'Housing first',
        country: 'Kenya',
        website: 'riverside.example.org',
        logo: 'riverside-mark',
      }),
    ).toEqual({
      organizationId: '00000000-0000-4000-8000-000000000010',
      name: 'Riverside Shelter',
      mission: 'Housing first',
      country: 'Kenya',
      website: 'riverside.example.org',
      logo: 'riverside-mark',
    });
  });

  it('answers null fields for a missing or non-object result rather than casting', () => {
    expect(renderOrganizationProfile(null)).toEqual({
      organizationId: null,
      name: null,
      mission: null,
      country: null,
      website: null,
      logo: null,
    });
    expect(renderOrganizationProfile(['Riverside'])).toEqual({
      organizationId: null,
      name: null,
      mission: null,
      country: null,
      website: null,
      logo: null,
    });
  });
});

describe('the profile definer locks the organisation row', () => {
  it('takes FOR UPDATE on public.organizations before the membership read', () => {
    const sql = readFileSync(PROFILE_MIGRATION, 'utf8');
    const body = /create function public\.set_organization_profile[\s\S]*?\$\$;/.exec(sql);
    expect(body, 'the profile definer is missing from its migration').not.toBeNull();
    expect(body?.[0], 'the profile definer does not lock the organisation row').toMatch(
      /from public\.organizations where id = p_organization_id for update/i,
    );
  });
});
