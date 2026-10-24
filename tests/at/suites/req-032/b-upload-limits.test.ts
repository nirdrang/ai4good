import { expect } from 'vitest';
import { atTest, AtPending } from './_bind.ts';
import { stackFromEnv } from '../../harness/live-stack.ts';
import { decideDiscoveryFile } from '../../../../supabase/functions/_shared/discovery-file-write.ts';
import { FILE_MAX_BYTES } from '../../../../supabase/functions/_shared/discovery-files.ts';
import type { AccountWriteRouteInput } from '../../../../supabase/functions/_shared/write-routes.ts';
import { seedFileProject, uploadFile } from './_files.ts';

const PROJECT_FILES_MAX_BYTES = 50 * 1024 * 1024;

const NAMED_TYPES = [
  ['brief.pdf', 'application/pdf'],
  ['photo.png', 'image/png'],
  ['rota.csv', 'text/csv'],
  ['rota.tsv', 'text/tab-separated-values'],
  ['notes.txt', 'text/plain'],
  ['process.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['shifts.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
] as const;

function addInput(name: string, mediaType: string, sizeBytes: number): AccountWriteRouteInput {
  return {
    caller: { id: 'ngo', emailVerified: true, githubHandle: null }, target: 'org', subject: null, ip: null,
    standing: { kind: 'account', accountType: 'ngo', lifecycle: 'active', orgExists: true, orgRole: 'admin', orgSeatAccountId: 'ngo', subject: null },
    body: { projectId: '00000000-0000-4000-8000-000000000001', action: 'add', file: {
      id: '00000000-0000-4000-8000-000000000002', name, sizeBytes, mediaType, contentHash: 'a'.repeat(64),
    } },
  } as AccountWriteRouteInput;
}

atTest('AT-032.02', 'all supported attachment types', { timeoutMs: { integration: 120_000 } }, {
  loop: async ({ open }) => {
    await open();
    for (const [name, mediaType] of NAMED_TYPES) expect(decideDiscoveryFile(addInput(name, mediaType, 42)).ok, mediaType).toBe(true);
  },
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const stack = stackFromEnv();
    const seed = await seedFileProject(stack, sut, w.email('types'));
    try {
      await seed.sql`update public.projects set funded_at = clock_timestamp() where id = ${seed.projectId}::uuid`;
      for (const [name, mediaType] of NAMED_TYPES) {
        const added = await uploadFile(stack, seed.bearer, seed.ngo.organizationId, seed.projectId, name, `Sample ${name} for the kitchen rota.`, mediaType);
        expect(added, `${mediaType}: ${JSON.stringify(added)}`).toMatchObject({ status: 200, body: { ok: true, file: { name } } });
      }
      const rows = await seed.sql`select media_type from public.discovery_files where project_id = ${seed.projectId}::uuid and removed_at is null` as { media_type: string }[];
      expect(rows.map((row) => row.media_type).sort()).toEqual(NAMED_TYPES.map(([, mediaType]) => mediaType).sort());
    } finally { await seed.sql.close(); }
  },
  default: async () => { throw new AtPending('AT-032.02', 'sut-missing', 'The drill stack has not been configured.'); },
});

atTest('AT-032.03', 'file and aggregate project size caps', { timeoutMs: { integration: 180_000 } }, {
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const stack = stackFromEnv();
    const seed = await seedFileProject(stack, sut, w.email('caps'));
    try {
      await seed.sql`update public.projects set funded_at = clock_timestamp() where id = ${seed.projectId}::uuid`;
      const atCap = await uploadFile(stack, seed.bearer, seed.ngo.organizationId, seed.projectId, 'at-file-cap.pdf', 'a'.repeat(FILE_MAX_BYTES), 'application/pdf');
      expect(atCap.status, JSON.stringify(atCap.body)).toBe(200);
      const overCap = await uploadFile(stack, seed.bearer, seed.ngo.organizationId, seed.projectId, 'over-file-cap.pdf', 'b'.repeat(FILE_MAX_BYTES + 1), 'application/pdf');
      expect(overCap).toMatchObject({ status: 413, body: { kind: 'file-too-large' } });

      const room = 100;
      const seeded = PROJECT_FILES_MAX_BYTES - FILE_MAX_BYTES - room;
      for (let index = 0; index < 4; index++) {
        const id = crypto.randomUUID();
        await seed.sql`insert into public.discovery_files(id, project_id, name, media_type, size_bytes, content_hash, created_by)
          values (${id}::uuid, ${seed.projectId}::uuid, ${`seeded-${index}.pdf`}, 'application/pdf', ${seeded / 4},
          ${id.replaceAll('-', '').repeat(2)}, ${seed.ngo.accountId}::uuid)`;
      }
      const fits = await uploadFile(stack, seed.bearer, seed.ngo.organizationId, seed.projectId, 'fills-project.pdf', 'c'.repeat(room), 'application/pdf');
      expect(fits.status, JSON.stringify(fits.body)).toBe(200);
      const [live] = await seed.sql`select sum(size_bytes)::bigint as total from public.discovery_files where project_id = ${seed.projectId}::uuid and removed_at is null` as { total: string }[];
      expect(Number(live!.total)).toBe(PROJECT_FILES_MAX_BYTES);
      const over = await uploadFile(stack, seed.bearer, seed.ngo.organizationId, seed.projectId, 'one-byte.pdf', 'd', 'application/pdf');
      expect(over).toMatchObject({ status: 409, body: { kind: 'project-files-too-large' } });
      expect(String(over.body.reason)).toContain('50 MB');
    } finally { await seed.sql.close(); }
  },
  default: async () => { throw new AtPending('AT-032.03', 'sut-missing', 'The project size cap is enforced in the database; only the integration tier reaches it.'); },
});
