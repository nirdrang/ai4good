import { projectWorkspace } from '../_shared/tenant-reads.ts';
import {
  callerReads,
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

Deno.serve(edgeHandler('project-workspace', async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refusal('project-workspace accepts POST only', 405);

  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
  if (!caller) return refusal('authenticate before reading a project workspace', 401);

  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);

  const projectId = typeof body.value.projectId === 'string' ? body.value.projectId.trim() : '';
  if (!UUID.test(projectId)) return refusal('a project workspace must name the project as a uuid', 400);

  const authorization = request.headers.get('Authorization') ?? '';
  const answer = await projectWorkspace(callerReads(SUPABASE_URL, ANON_KEY, authorization), projectId);
  return json(answer.body, answer.status);
}));
