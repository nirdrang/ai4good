import { describe, expect } from 'vitest';
import { NEED_URGENCIES } from '../../../../supabase/functions/_shared/need-intake.ts';
import { atTest } from './_bind.ts';
import { needDefinerCallsAcknowledgmentHook } from './_source-need.ts';

describe('need intake capture', () => {
  atTest('AT-003.01', 'an NGO admin can start an unvetted need and the title and free-text description persist on a private draft', async ({ open }) => {
    expect(needDefinerCallsAcknowledgmentHook()).toEqual([]);
    const { w, sut } = await open();
    for (const emailVerified of [false, true]) {
      const ngo = await sut.provisionNgo(w.email(`ngo-capture-${emailVerified}`), { emailVerified });
      const request = {
        organizationId: ngo.organizationId, title: 'Grant deadline tracker',
        description: 'We miss reporting deadlines.\nStaff need a shared view of each funder’s dates.',
      };
      const started = await sut.startNeed(ngo.session, request);
      expect(started).toMatchObject({ ok: true, changed: true, need: { ...request, stage: 'draft', urgency: null } });
      if (!started.ok) return;
      expect(await sut.needRow(started.need.projectId)).toMatchObject({ ...request, stage: 'draft' });
      const reopened = await sut.readNeed(ngo.session, started.need.projectId);
      expect(reopened.ok).toBe(true);
      if (!reopened.ok) return;
      expect(reopened.value.need).toEqual(started.need);
      const page = await sut.publicProjectPage(started.need.projectId);
      expect(page.ok, 'a draft appeared on the public page').toBe(false);
      expect(page.answer.status).toBe(404);
      expect(page.answer.body).not.toContain(request.title);
      expect(page.answer.body).not.toContain(request.description);
    }
  });

  atTest('AT-003.02', 'every supported urgency persists and renders on the draft read', async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-urgency'), { emailVerified: false });
    for (const urgency of NEED_URGENCIES) {
      const started = await sut.startNeed(ngo.session, { organizationId: ngo.organizationId, title: 'Volunteer rota', urgency });
      expect(started).toMatchObject({ ok: true, need: { urgency, stage: 'draft', description: null } });
      if (!started.ok) return;
      expect((await sut.needRow(started.need.projectId))?.urgency).toBe(urgency);
      const read = await sut.readNeed(ngo.session, started.need.projectId);
      expect(read.ok).toBe(true);
      if (!read.ok) return;
      expect(read.value.need.urgency).toBe(urgency);
    }
  });

  atTest('AT-003.04', 'the organisation member, volunteer and visitor cannot start a need; the database rechecks the admin role', async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-admin-role'), { emailVerified: true });
    const volunteer = await sut.provisionVolunteer(w.email('vol-admin-role'));
    const request = { organizationId: ngo.organizationId, title: 'Meal planning', description: 'Coordinate the kitchen.' };
    expect(await sut.startNeed(ngo.session, request)).toMatchObject({ ok: true, changed: true });
    await sut.setMembershipRoleAsOperator(ngo.organizationId, ngo.accountId, 'member');
    expect(await sut.startNeed(ngo.session, request)).toMatchObject({ ok: false, kind: 'not-an-admin', status: 403 });
    expect(await sut.attemptNeedDefinerAsOperator({ accountId: ngo.accountId, request: { ...request, action: 'start' } }))
      .toMatchObject({ ok: false, kind: 'not-an-admin' });
    expect(await sut.startNeed(volunteer, request)).toMatchObject({ ok: false, kind: 'not-an-ngo-account', status: 403 });
    expect(await sut.attemptNeedDefinerAsOperator({ accountId: volunteer.accountId, request: { ...request, action: 'start' } }))
      .toMatchObject({ ok: false, kind: 'not-a-member' });
    expect(await sut.startNeed(null, request)).toMatchObject({ ok: false, kind: 'unauthenticated', status: 401 });
  });
});
