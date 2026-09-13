import { describe, expect } from 'vitest';
import { REFERENCE_FILE_DISCLOSURE } from '../../../../supabase/functions/_shared/need-intake-copy.ts';
import type { ReferenceFileInput } from './_contract.ts';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';

describe('need reference files', () => {
  atTest('AT-003.07', 'an optional reference upload attaches to the draft', { surface: 'ui' }, {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-reference-file'), { emailVerified: true });
      const started = await sut.startNeed(ngo.session, { organizationId: ngo.organizationId, title: 'Grant deadline tracker' });
      expect(started.ok).toBe(true);
      if (!started.ok) return;
      const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
      const file = { fileName: 'grants-tracker.csv', mediaType: 'text/csv', byteSize: 4096, description: 'Sample rows' };
      const attached = await sut.attachReferenceFile(ngo.session, { ...request, file });
      expect(attached).toMatchObject({ ok: true, changed: true });
      if (!attached.ok) return;
      expect(attached.need.referenceFiles).toHaveLength(1);
      expect(attached.need.referenceFiles[0]).toMatchObject({ ...file, addedByAccountId: ngo.accountId });
      const secondFile = { fileName: 'blank-form.txt', mediaType: 'text/plain', byteSize: 256 };
      const second = await sut.attachReferenceFile(ngo.session, { ...request, file: secondFile });
      expect(second).toMatchObject({ ok: true, changed: true });
      if (!second.ok) return;
      expect(second.need.referenceFiles).toHaveLength(2);
      expect(second.need.referenceFiles[0]).toEqual(attached.need.referenceFiles[0]);
      expect(second.need.referenceFiles[1]).toMatchObject({ ...secondFile, description: null, addedByAccountId: ngo.accountId });
      const read = await sut.readNeed(ngo.session, request.projectId);
      expect(read.ok).toBe(true);
      if (!read.ok) return;
      expect(read.value.need.referenceFiles).toEqual(second.need.referenceFiles);
      expect((await sut.needRow(request.projectId))?.referenceFiles).toEqual(second.need.referenceFiles);
      expect(await sut.attachReferenceFile(ngo.session, { ...request, file: { ...file, byteSize: 0 } }))
        .toMatchObject({ ok: false, kind: 'invalid-request', status: 400 });
      const missingName = { mediaType: 'text/csv', byteSize: 4096 } as ReferenceFileInput;
      expect(await sut.attachReferenceFile(ngo.session, { ...request, file: missingName }))
        .toMatchObject({ ok: false, kind: 'invalid-request', status: 400 });
    },
    integration: awaiting(AWAITED.referenceUpload),
  });

  atTest('AT-003.09', 'the upload surface shows the base data-responsibility disclosure', { surface: 'ui' }, {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-base-disclosure'), { emailVerified: true });
      const started = await sut.startNeed(ngo.session, { organizationId: ngo.organizationId, title: 'Grant deadline tracker' });
      expect(started.ok).toBe(true);
      if (!started.ok) return;
      const disclosure = {
        level: 'base', acknowledgmentRequired: false, heading: REFERENCE_FILE_DISCLOSURE.base.heading,
        body: REFERENCE_FILE_DISCLOSURE.base.body, acknowledgment: null,
      };
      expect(started.need.upload.disclosure).toEqual(disclosure);
      const read = await sut.readNeed(ngo.session, started.need.projectId);
      expect(read.ok).toBe(true);
      if (!read.ok) return;
      expect(read.value.need.upload.disclosure).toEqual(disclosure);
      const attached = await sut.attachReferenceFile(ngo.session, {
        organizationId: ngo.organizationId, projectId: started.need.projectId,
        file: { fileName: 'grants-tracker.csv', mediaType: 'text/csv', byteSize: 4096, description: 'Sample rows' },
      });
      expect(attached).toMatchObject({ ok: true, changed: true });
      if (!attached.ok) return;
      expect(attached.need.upload.disclosure).toEqual(disclosure);
    },
    integration: awaiting(AWAITED.uploadSurface),
  });

  atTest('AT-003.10', 'classification hardens the disclosure before another upload', { surface: 'ui' }, {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-tier2-disclosure'), { emailVerified: true });
      const started = await sut.startNeed(ngo.session, { organizationId: ngo.organizationId, title: 'Grant deadline tracker' });
      expect(started.ok).toBe(true);
      if (!started.ok) return;
      const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
      const attached = await sut.attachReferenceFile(ngo.session, {
        ...request, file: { fileName: 'grants-tracker.csv', mediaType: 'text/csv', byteSize: 4096 },
      });
      expect(attached).toMatchObject({ ok: true, changed: true });
      if (!attached.ok) return;
      expect(attached.need.referenceFiles).toHaveLength(1);
      expect(attached.need.upload.disclosure.level).toBe('base');
      await sut.classifyTier2AsOperator(request.projectId);
      const read = await sut.readNeed(ngo.session, request.projectId);
      expect(read.ok).toBe(true);
      if (!read.ok) return;
      const disclosure = {
        level: 'tier2-hardened', acknowledgmentRequired: true,
        heading: REFERENCE_FILE_DISCLOSURE.tier2Hardened.heading,
        body: REFERENCE_FILE_DISCLOSURE.tier2Hardened.body,
        acknowledgment: REFERENCE_FILE_DISCLOSURE.tier2Hardened.acknowledgment,
      };
      expect(read.value.need.upload.disclosure).toEqual(disclosure);
      expect(read.value.need.tier2ClassifiedAt).not.toBeNull();
      const second = await sut.attachReferenceFile(ngo.session, {
        ...request, file: { fileName: 'blank-form.txt', mediaType: 'text/plain', byteSize: 256 },
      });
      expect(second).toMatchObject({ ok: true, changed: true });
      if (!second.ok) return;
      expect(second.need.upload.disclosure).toEqual(disclosure);
      expect(second.need.referenceFiles).toHaveLength(2);
      expect(second.need.referenceFiles[0]).toEqual(attached.need.referenceFiles[0]);
      expect(second.need.tier2ClassifiedAt).toEqual(read.value.need.tier2ClassifiedAt);
      expect(await sut.needRow(request.projectId)).toEqual(second.need);
    },
    integration: awaiting(AWAITED.uploadSurface),
  });
});
