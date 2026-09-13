import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';

describe('need draft cause labels', () => {
  atTest('AT-003.17', 'a draft carries zero cause labels before Discovery', async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-draft-labels'), { emailVerified: true });
    const started = await sut.startNeed(ngo.session, {
      organizationId: ngo.organizationId, title: 'Volunteer rota',
      description: 'Coordinate volunteers across our weekly shifts.',
    });
    expect(started).toMatchObject({ ok: true, need: { stage: 'draft' } });
    if (!started.ok) return;
    expect(started.need.causeLabels).toEqual([]);
    const read = await sut.readNeed(ngo.session, started.need.projectId);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.value.need.causeLabels).toEqual([]);
    expect((await sut.needRow(started.need.projectId))?.causeLabels).toEqual([]);

    const saved = await sut.saveNeed(ngo.session, {
      organizationId: ngo.organizationId, projectId: started.need.projectId,
      patch: { description: 'Coordinate volunteers across our weekly shifts and weekend events.' },
    });
    expect(saved).toMatchObject({ ok: true, changed: true, need: { stage: 'draft' } });
    if (!saved.ok) return;
    expect(saved.need.causeLabels).toEqual([]);
    const reopened = await sut.readNeed(ngo.session, started.need.projectId);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(reopened.value.need.causeLabels).toEqual([]);
    expect((await sut.needRow(started.need.projectId))?.causeLabels).toEqual([]);
  });
});
