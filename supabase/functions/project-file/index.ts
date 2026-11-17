import { TENANT_NOT_FOUND, TENANT_READ_FAILED } from '../_shared/tenant-reads.ts';
import {
  callerReads,
  CORS_HEADERS,
  discoveryFileWorker,
  edgeHandler,
  json,
  readJsonBody,
  refusal,
  requireEnv,
  resolveCaller,
} from '../_shared/edge.ts';

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const ANON_KEY = requireEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(edgeHandler('project-file', async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refusal('project-file accepts POST only', 405);

  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
  if (!caller) return refusal('authenticate before reading a project file', 401);

  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);
  const fileId = typeof body.value.fileId === 'string' ? body.value.fileId.trim() : '';
  if (!UUID.test(fileId)) return refusal('a project file must be named by its uuid', 400);

  const read = await callerReads(SUPABASE_URL, ANON_KEY, request.headers.get('Authorization')!).projectFile!(fileId);
  if (!read.ok) return json(TENANT_READ_FAILED.body, TENANT_READ_FAILED.status);
  const file = read.value;
  if (file === null) return json(TENANT_NOT_FOUND.body, TENANT_NOT_FOUND.status);

  const stored = await discoveryFileWorker().download(file.project_id, file.id);
  if (!stored.ok) throw new Error(`the stored file answered ${stored.status}`);
  return new Response(stored.body, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'content-type': file.media_type,
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    },
  });
}));
