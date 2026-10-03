import { decideDiscoveryFile } from '../_shared/discovery-file-write.ts';
import { FILE_MAX_BYTES, screenFile, type FileRow } from '../_shared/discovery-files.ts';
import { readDiscoveryFile } from '../_shared/discovery-file-read.ts';
import { discoveryFileWorker, readJsonBody, writeRoute } from '../_shared/edge.ts';
import { organizationIdField, refuseWrite } from '../_shared/write-routes.ts';

const uploads = new WeakMap<Record<string, unknown>, File>();

Deno.serve(writeRoute({
  name: 'discovery-file', target: organizationIdField,
  readBody: async (request) => {
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      const body = await readJsonBody(request);
      if (body.ok && body.value.fileId) body.value.file = { id: body.value.fileId };
      return body;
    }
    if (Number(request.headers.get('content-length')) > FILE_MAX_BYTES + 65536) {
      return { ok: false, kind: 'file-too-large', status: 413, reason: 'Choose a file of 10 MB or less.' };
    }
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return { ok: false, reason: 'Choose a file to add.' };
    if (file.size > FILE_MAX_BYTES) return { ok: false, kind: 'file-too-large', status: 413, reason: 'Choose a file of 10 MB or less.' };
    const contentHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))]
      .map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const value = { action: form.get('action') ?? 'add', organizationId: form.get('organizationId'), projectId: form.get('projectId'),
      file: { id: crypto.randomUUID(), name: file.name, sizeBytes: file.size, mediaType: file.type.split(';')[0].trim().toLowerCase(), contentHash } };
    uploads.set(value.file, file);
    return { ok: true, value };
  },
  decide: decideDiscoveryFile,
  prepare: async (_caller, args, reads) => {
    if (args.p_action === 'remove') return { ok: true, args };
    const upload = uploads.get(args.p_file);
    if (upload === undefined) return refuseWrite('invalid-request', 400, 'Add a file as a multipart upload.');
    const project = await reads.project(args.p_project_id);
    if (!project.ok) throw new Error(project.detail);
    if (!project.rows.some((row) => row.org_id === args.p_organization_id)) return refuseWrite('no-such-project', 409, 'No such project in this organisation.');
    const stored = await discoveryFileWorker().upload(args.p_project_id, String(args.p_file.id), upload);
    if (!stored.ok) throw new Error('The file could not be stored.');
    return { ok: true, args };
  },
  commitRefused: async (args) => {
    if (args.p_action === 'add') await discoveryFileWorker().removeUpload(args.p_project_id, String(args.p_file.id));
  },
  render: (value) => {
    const row = value as FileRow;
    if (row.removed_at === null) EdgeRuntime.waitUntil(readDiscoveryFile(row));
    return { file: screenFile(row) };
  },
}));
