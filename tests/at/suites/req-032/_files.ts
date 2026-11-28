import assert from 'node:assert/strict';
import { authPost, functionPost, sqlClient, type Stack } from '../../harness/live-stack.ts';
import { testOpening } from '../../harness/discovery-topic-plan.ts';
import { type BriefVersion } from '../../../../supabase/functions/_shared/discovery-brief.ts';
import type { NeedsSut } from '../req-003/_contract.ts';
import type { FileRow } from '../../../../supabase/functions/_shared/discovery-files.ts';

const PASSWORD = 'correct horse battery staple';
const STALE_READ_RESTART_MS = 5 * 60 * 1000;

export async function seedFileProject(stack: Stack, needs: NeedsSut, email: string, input?: { brief: BriefVersion | null; title: string; description: string }) {
  const ngo = await needs.provisionNgo(email, { emailVerified: true });
  const started = await needs.startNeed(ngo.session, { organizationId: ngo.organizationId, title: input?.title ?? 'Kitchen volunteer rota', description: input?.description ?? 'Coordinate volunteers across three community kitchens.' });
  if (!started.ok) throw new Error(started.reason);
  const projectId = started.need.projectId;
  const sql = sqlClient(stack);
  const brief = input ? input.brief : testOpening(started.need.description!);
  await sql`update public.need_intakes set stage = 'discovery_in_progress', submitted_at = clock_timestamp() where project_id = ${projectId}::uuid`;
  if (brief) await sql`insert into public.brief_revisions(project_id, revision, document, created_by)
    values (${projectId}::uuid, ${brief.revision}, ${JSON.stringify(brief.document)}::text::jsonb, ${ngo.accountId}::uuid)`;
  const login = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password: PASSWORD });
  assert.equal(login.status, 200);
  const bearer = String(login.json.access_token);
  let signedIn = { token: bearer, at: Date.now() };
  const freshBearer = async () => {
    if (Date.now() - signedIn.at > 60_000) {
      const again = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password: PASSWORD });
      if (again.status !== 200) throw new Error(`signing ${email} in again answered ${again.status}: ${JSON.stringify(again.json)}`);
      signedIn = { token: String(again.json.access_token), at: Date.now() };
    }
    return signedIn.token;
  };
  return { ngo, projectId, bearer, freshBearer, sql, authSession: login.json };
}

export async function uploadFile(stack: Stack, bearer: string, organizationId: string, projectId: string, name: string, text: string | Uint8Array<ArrayBuffer>, mediaType = 'text/plain') {
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

export async function waitForFile(stack: Stack, bearer: () => Promise<string>, projectId: string, fileId: string, timeoutMs = STALE_READ_RESTART_MS + 120_000): Promise<FileRow> {
  const sql = sqlClient(stack);
  try {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const rows = await sql`select * from public.discovery_files where id = ${fileId}::uuid` as FileRow[];
      const row = rows[0];
      if (row?.status === 'failed') throw new Error(`file ${row.name} failed: ${row.failure_reason}`);
      if (row?.status === 'read') return row;
      await functionPost(stack, 'discovery-conversation', { projectId }, await bearer());
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`file ${fileId} did not finish within ${timeoutMs} ms`);
  } finally { await sql.close(); }
}
