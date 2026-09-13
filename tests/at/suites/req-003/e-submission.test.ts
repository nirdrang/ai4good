import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';

describe('need submission starts Discovery', () => {
  atTest('AT-003.11', 'a complete intake starts Discovery without a reference file', async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-submit-without-file'), { emailVerified: true });
    const allowance = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(allowance.ok && allowance.allowance.remaining > 0).toBe(true);
    const started = await sut.startNeed(ngo.session, {
      organizationId: ngo.organizationId, title: 'Grant deadline tracker',
      description: 'We need a shared record of reporting deadlines.', urgency: 'soon',
    });
    expect(started).toMatchObject({ ok: true, need: { stage: 'draft' } });
    if (!started.ok) return;
    const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
    const submitted = await sut.submitNeed(ngo.session, request);
    expect(submitted).toMatchObject({
      ok: true, changed: true, need: { stage: 'discovery_in_progress', referenceFiles: [] },
    });
    if (!submitted.ok) return;
    expect(submitted.need.submittedAt).not.toBeNull();
    const read = await sut.readNeed(ngo.session, request.projectId);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.value.need.stage).toBe('discovery_in_progress');
    expect((await sut.needRow(request.projectId))?.stage).toBe(read.value.need.stage);
    expect(await sut.publicProjectPage(request.projectId)).toMatchObject({ ok: false, answer: { status: 404 } });
  });

  atTest('AT-003.12', 'submission moves the draft to discovery_in_progress', async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-submit-with-file'), { emailVerified: true });
    const allowance = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(allowance.ok && allowance.allowance.remaining > 0).toBe(true);
    const started = await sut.startNeed(ngo.session, {
      organizationId: ngo.organizationId, title: 'Volunteer rota',
      description: 'We need a shared rota for our teams.', urgency: 'this_quarter',
    });
    expect(started).toMatchObject({ ok: true, need: { stage: 'draft' } });
    if (!started.ok) return;
    const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
    const attached = await sut.attachReferenceFile(ngo.session, {
      ...request, file: { fileName: 'sample-rota.csv', mediaType: 'text/csv', byteSize: 4096 },
    });
    expect(attached.ok).toBe(true);
    if (!attached.ok) return;
    expect(attached.need.referenceFiles).toHaveLength(1);
    const submitted = await sut.submitNeed(ngo.session, request);
    expect(submitted).toMatchObject({ ok: true, changed: true, need: { stage: 'discovery_in_progress' } });
    if (!submitted.ok) return;
    expect(submitted.need.referenceFiles).toEqual(attached.need.referenceFiles);
    expect(submitted.need.submittedAt).not.toBeNull();
    expect(Date.parse(submitted.need.updatedAt)).toBeGreaterThanOrEqual(Date.parse(attached.need.updatedAt));
    expect(submitted.need.updatedAt).toBe(submitted.need.submittedAt);
    expect(await sut.needRow(request.projectId)).toMatchObject({
      stage: 'discovery_in_progress', submittedAt: submitted.need.submittedAt,
    });
    expect(await sut.submitNeed(ngo.session, request)).toMatchObject({
      ok: true, changed: false,
      need: { stage: 'discovery_in_progress', submittedAt: submitted.need.submittedAt, updatedAt: submitted.need.updatedAt },
    });
    expect(await sut.saveNeed(ngo.session, {
      ...request, patch: { description: 'The shared rota also needs team contact details.' },
    })).toMatchObject({ ok: true, changed: true, need: { stage: 'discovery_in_progress' } });
    expect(await sut.attemptNeedDefinerAsOperator({
      accountId: ngo.accountId, request: { ...request, action: 'submit' },
    })).toMatchObject({ ok: true });
  });
});
