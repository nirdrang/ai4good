import assert from 'node:assert/strict';
import { authPost, functionPost, sqlClient, type Stack } from '../../harness/live-stack.ts';
import { openingDocument } from '../../../../supabase/functions/_shared/discovery-brief.ts';
import type { NeedsSut } from '../req-003/_contract.ts';
import type { FileRow } from '../../../../supabase/functions/_shared/discovery-files.ts';

export async function seedFileProject(stack: Stack, needs: NeedsSut, email: string) {
  const ngo = await needs.provisionNgo(email, { emailVerified: true });
  const started = await needs.startNeed(ngo.session, { organizationId: ngo.organizationId, title: 'Kitchen volunteer rota', description: 'Coordinate volunteers across three community kitchens.' });
  if (!started.ok) throw new Error(started.reason);
  const projectId = started.need.projectId;
  const attached = await needs.attachReferenceFile(ngo.session, { organizationId: ngo.organizationId, projectId,
    file: { fileName: 'intake.txt', mediaType: 'text/plain', byteSize: 12, description: 'An intake reference' } });
  assert.equal(attached.ok, true);
  const sql = sqlClient(stack);
  const brief = openingDocument({ need: started.need.description! });
  await sql`update public.need_intakes set stage = 'discovery_in_progress', submitted_at = clock_timestamp() where project_id = ${projectId}::uuid`;
  await sql`insert into public.brief_revisions(project_id, revision, document, created_by)
    values (${projectId}::uuid, 1, ${JSON.stringify(brief.document)}::text::jsonb, ${ngo.accountId}::uuid)`;
  const login = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password: 'correct horse battery staple' });
  assert.equal(login.status, 200);
  const bearer = String(login.json.access_token);
  return { ngo, projectId, bearer, sql };
}

export async function uploadFile(stack: Stack, bearer: string, organizationId: string, projectId: string, name: string, text: string, mediaType = 'text/plain') {
  const form = new FormData();
  form.append('action', 'add');
  form.append('organizationId', organizationId);
  form.append('projectId', projectId);
  form.append('file', new Blob([text], { type: mediaType }), name);
  const response = await fetch(`${stack.apiUrl}/functions/v1/discovery-file`, {
    method: 'POST', headers: { apikey: stack.anonKey, Authorization: `Bearer ${bearer}` }, body: form,
  });
  const raw = await response.text();
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { throw new Error(`upload answered ${response.status}: ${raw}`); }
  return { status: response.status, body };
}

export async function waitForFile(stack: Stack, bearer: string, projectId: string, fileId: string, timeoutMs = 240_000): Promise<FileRow> {
  const sql = sqlClient(stack);
  try {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const rows = await sql`select * from public.discovery_files where id = ${fileId}::uuid` as FileRow[];
      const row = rows[0];
      if (row?.status === 'failed') throw new Error(`file ${row.name} failed: ${row.failure_reason}`);
      if (row?.status === 'read') return row;
      await functionPost(stack, 'discovery-conversation', { projectId }, bearer);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`file ${fileId} did not finish within ${timeoutMs} ms`);
  } finally { await sql.close(); }
}
