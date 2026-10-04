import { expect } from 'vitest';
import { atTest, AtPending } from './_bind.ts';
import { stackFromEnv, functionPost } from '../../harness/live-stack.ts';
import { fileLimitReached } from '../../../../supabase/functions/_shared/discovery-files.ts';
import { seedFileProject, uploadFile, waitForFile } from './_files.ts';

atTest('AT-032.13', 'three unfunded Discovery files, intake excluded, removal frees a place, funded unlimited', { timeoutMs: { integration: 300_000 } }, {
  loop: async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('files'), { emailVerified: true });
    const need = await sut.startNeed(ngo.session, { organizationId: ngo.organizationId, title: 'Volunteer rota' });
    expect(need.ok).toBe(true);
    if (!need.ok) return;
    const intake = await sut.attachReferenceFile(ngo.session, { organizationId: ngo.organizationId, projectId: need.need.projectId,
      file: { fileName: 'intake.txt', mediaType: 'text/plain', byteSize: 12 } });
    expect(intake.ok).toBe(true);
    const files = [{ origin: 'intake', removedAt: null as string | null }, ...Array.from({ length: 3 }, () => ({ origin: 'discovery', removedAt: null as string | null }))];
    expect(fileLimitReached(false, files)).toBe(true);
    files[1]!.removedAt = '2026-10-03';
    expect(fileLimitReached(false, files)).toBe(false);
    files.push({ origin: 'discovery', removedAt: null });
    expect(fileLimitReached(false, files)).toBe(true);
    expect(fileLimitReached(true, files)).toBe(false);
  },
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const stack = stackFromEnv();
    const seed = await seedFileProject(stack, sut, w.email('files'));
    try {
      const ids: string[] = [];
      for (let index = 1; index <= 3; index++) {
        const added = await uploadFile(stack, seed.bearer, seed.ngo.organizationId, seed.projectId, `rota-${index}.txt`, `Kitchen ${index} has ${index * 10} volunteers.`);
        expect(added, JSON.stringify(added)).toMatchObject({ status: 200, body: { ok: true, file: { origin: 'discovery', status: { kind: 'reading' } } } });
        ids.push(String((added.body.file as { id: string }).id));
      }
      const refused = await uploadFile(stack, seed.bearer, seed.ngo.organizationId, seed.projectId, 'fourth.txt', 'A fourth kitchen coordinates volunteers.');
      expect(refused).toMatchObject({ status: 409, body: { kind: 'file-limit' } });
      expect(String(refused.body.reason)).toContain('three');
      const removed = await functionPost(stack, 'discovery-file', { action: 'remove', organizationId: seed.ngo.organizationId, projectId: seed.projectId, fileId: ids.shift() }, seed.bearer);
      expect(removed).toMatchObject({ status: 200, json: { ok: true } });
      const replacement = await uploadFile(stack, seed.bearer, seed.ngo.organizationId, seed.projectId, 'replacement.txt', 'Replacement rota: coordinators book volunteers on Sundays.');
      expect(replacement.status).toBe(200);
      ids.push(String((replacement.body.file as { id: string }).id));
      await seed.sql`update public.projects set funded_at = clock_timestamp() where id = ${seed.projectId}::uuid`;
      const funded = await uploadFile(stack, seed.bearer, seed.ngo.organizationId, seed.projectId, 'funded-fourth.txt', 'Funded rota: volunteers cover four kitchens.');
      expect(funded.status).toBe(200);
      ids.push(String((funded.body.file as { id: string }).id));
      const loaded = await functionPost(stack, 'discovery-conversation', { projectId: seed.projectId }, seed.bearer);
      expect((loaded.json.files as { origin: string }[]).filter((file) => file.origin === 'intake')).toHaveLength(1);
      expect((loaded.json.files as { origin: string }[]).filter((file) => file.origin === 'discovery')).toHaveLength(4);
      for (const id of ids) expect((await waitForFile(stack, seed.bearer, seed.projectId, id)).status).toBe('read');
    } finally { await seed.sql.close(); }
  },
  default: async () => { throw new AtPending('AT-032.13', 'sut-missing', 'The drill stack has not been configured.'); },
});
