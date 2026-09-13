import { describe, expect } from 'vitest';
import { intakeSnapshotOf } from '../../../../supabase/functions/_shared/need-intake.ts';
import { atTest } from './_bind.ts';

describe('raw intake audit snapshots', () => {
  atTest('AT-003.14', 'submission retains an audit snapshot equal to the raw intake', async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-snapshot'), { emailVerified: true });
    const started = await sut.startNeed(ngo.session, {
      organizationId: ngo.organizationId, title: 'Volunteer rota',
      description: 'We need a shared rota for our teams.', urgency: 'this_quarter',
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
    expect(await sut.attachReferenceFile(ngo.session, {
      ...request, file: { fileName: 'sample-rota.csv', mediaType: 'text/csv', byteSize: 4096, description: 'Sample rows' },
    })).toMatchObject({ ok: true, changed: true });
    expect(await sut.intakeSnapshots(request.projectId)).toEqual([]);
    const submitted = await sut.submitNeed(ngo.session, request);
    expect(submitted).toMatchObject({ ok: true, changed: true });
    if (!submitted.ok) return;
    expect(submitted.need.submittedAt).not.toBeNull();
    if (submitted.need.submittedAt === null) return;
    const snapshots = await sut.intakeSnapshots(request.projectId);
    expect(snapshots).toHaveLength(1);
    const snapshot = snapshots[0];
    expect(snapshot.detail).toEqual(intakeSnapshotOf({ ...submitted.need, submittedAt: submitted.need.submittedAt }));
    expect(snapshot.detail.submitted_at).toBe(submitted.need.submittedAt);
    expect(new Date(snapshot.occurredAt).getTime()).toBe(new Date(submitted.need.submittedAt).getTime());
    expect(snapshot.actorAccountId).toBe(ngo.accountId);
    expect(snapshot.subjectOrgId).toBe(ngo.organizationId);
    expect(snapshot.reason.trim()).not.toBe('');
  });

  atTest('AT-003.16', 'later working edits leave the retained snapshot unchanged', async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-snapshot-edits'), { emailVerified: true });
    const started = await sut.startNeed(ngo.session, {
      organizationId: ngo.organizationId, title: 'Volunteer rota',
      description: 'We need a shared rota for our teams.', urgency: 'this_quarter',
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
    expect(await sut.attachReferenceFile(ngo.session, {
      ...request, file: { fileName: 'sample-rota.csv', mediaType: 'text/csv', byteSize: 4096 },
    })).toMatchObject({ ok: true, changed: true });
    expect(await sut.submitNeed(ngo.session, request)).toMatchObject({ ok: true, changed: true });
    const snapshots = await sut.intakeSnapshots(request.projectId);
    expect(snapshots).toHaveLength(1);
    expect(await sut.saveNeed(ngo.session, {
      ...request, patch: { description: 'The rota also needs team contact details.', urgency: 'soon' },
    })).toMatchObject({ ok: true, changed: true });
    expect(await sut.attachReferenceFile(ngo.session, {
      ...request, file: { fileName: 'team-contacts.csv', mediaType: 'text/csv', byteSize: 2048 },
    })).toMatchObject({ ok: true, changed: true });
    const repeated = await sut.submitNeed(ngo.session, request);
    expect(repeated).toMatchObject({ ok: true, changed: false });
    expect(await sut.intakeSnapshots(request.projectId)).toEqual(snapshots);
    if (!repeated.ok) return;
    expect(repeated.need.description).not.toBe(snapshots[0].detail.description);
    expect(repeated.need.urgency).not.toBe(snapshots[0].detail.urgency);
    expect(snapshots[0].detail.reference_files).toHaveLength(1);
    expect(repeated.need.referenceFiles).toHaveLength(2);
    const second = await sut.startNeed(ngo.session, {
      organizationId: ngo.organizationId, title: 'Grant tracker',
      description: 'We need a shared record of reporting deadlines.', urgency: 'no_deadline',
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const secondSubmitted = await sut.submitNeed(ngo.session, {
      organizationId: ngo.organizationId, projectId: second.need.projectId,
    });
    expect(secondSubmitted).toMatchObject({ ok: true, changed: true });
    const secondSnapshots = await sut.intakeSnapshots(second.need.projectId);
    expect(secondSnapshots).toHaveLength(1);
    expect(secondSnapshots[0].detail.project_id).toBe(second.need.projectId);
    expect(secondSnapshots[0].id).not.toBe(snapshots[0].id);
    expect(await sut.intakeSnapshots(request.projectId)).toEqual(snapshots);
  });
});
