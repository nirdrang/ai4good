import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';

describe('need submission gate and autosave', () => {
  atTest('AT-003.03', 'submission is blocked on the missing description alone', async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-description-gate'), { emailVerified: true });
    const allowance = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(allowance.ok && allowance.allowance.remaining > 0).toBe(true);
    const started = await sut.startNeed(ngo.session, {
      organizationId: ngo.organizationId, title: 'Grant deadline tracker', urgency: 'soon',
    });
    expect(started).toMatchObject({ ok: true, need: { description: null, stage: 'draft' } });
    if (!started.ok) return;
    const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
    expect(await sut.submitNeed(ngo.session, request))
      .toMatchObject({ ok: false, kind: 'missing-description', status: 409 });
    expect((await sut.needRow(request.projectId))?.stage).toBe('draft');
    expect(await sut.saveNeed(ngo.session, { ...request, patch: { description: ' \t\r\n\f\u00a0 ' } }))
      .toMatchObject({ ok: true, need: { description: null } });
    expect(await sut.submitNeed(ngo.session, request))
      .toMatchObject({ ok: false, kind: 'missing-description', status: 409 });
    expect((await sut.needRow(request.projectId))?.stage).toBe('draft');
    expect(await sut.attemptNeedDefinerAsOperator({ accountId: ngo.accountId, request: { ...request, action: 'submit' } }))
      .toMatchObject({ ok: false, kind: 'missing-description' });
  });

  atTest('AT-003.05', 'typed intake persists when the admin leaves and returns without an explicit save', { surface: 'ui' }, async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-autosave'), { emailVerified: true });
    const started = await sut.startNeed(ngo.session, {
      organizationId: ngo.organizationId, title: 'Volunteer rota', urgency: 'this_quarter',
      description: '  Initial notes\n  still being typed.  ',
    });
    expect(started).toMatchObject({ ok: true, need: { description: '  Initial notes\n  still being typed.  ' } });
    if (!started.ok) return;
    const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
    const description = '  We need  a shared rota.\n\n  Keep each team\'s notes.\t ';
    const saved = await sut.saveNeed(ngo.session, { ...request, patch: { description } });
    expect(saved).toMatchObject({ ok: true, changed: true, need: { description } });
    if (!saved.ok) return;
    expect(await sut.saveNeed(ngo.session, { ...request, patch: { description } }))
      .toMatchObject({ ok: true, changed: false, need: { updatedAt: saved.need.updatedAt } });
    expect(await sut.saveNeed(ngo.session, { ...request, patch: { urgency: null } }))
      .toMatchObject({ ok: true, changed: true, need: { urgency: null } });
    const second = await sut.signInAgain(ngo.email);
    expect(second.accountId).toBe(ngo.accountId);
    expect(second.sessionId).not.toBe(ngo.session.sessionId);
    const reopened = await sut.readNeed(second, request.projectId);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(reopened.value.need).toMatchObject({ description, urgency: null, stage: 'draft' });
    const other = await sut.provisionNgo(w.email('ngo-other-autosave'), { emailVerified: true });
    const foreignRequest = { ...request, organizationId: other.organizationId, patch: { description: 'Foreign edit' } };
    expect(await sut.saveNeed(other.session, foreignRequest))
      .toMatchObject({ ok: false, kind: 'no-such-need', status: 409 });
    expect(await sut.attemptNeedDefinerAsOperator({ accountId: other.accountId, request: { ...foreignRequest, action: 'save' } }))
      .toMatchObject({ ok: false, kind: 'no-such-need' });
    const unknownPatch = { description, unexpected: true };
    expect(await sut.saveNeed(ngo.session, { ...request, patch: unknownPatch }))
      .toMatchObject({ ok: false, kind: 'invalid-request', status: 400 });
    expect(await sut.saveNeed(ngo.session, { ...request, projectId: 'not-a-uuid', patch: { description } }))
      .toMatchObject({ ok: false, kind: 'invalid-request', status: 400 });
    expect(await sut.submitNeed(ngo.session, { ...request, projectId: 'not-a-uuid' }))
      .toMatchObject({ ok: false, kind: 'invalid-request', status: 400 });
    expect(await sut.attachReferenceFile(ngo.session, {
      ...request, projectId: 'not-a-uuid', file: { fileName: 'sample-rota.csv', mediaType: 'text/csv', byteSize: 4096 },
    })).toMatchObject({ ok: false, kind: 'invalid-request', status: 400 });
  });
});
