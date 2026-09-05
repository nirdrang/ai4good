import { publicProjectAnswer } from '../_shared/public-project.ts';
import {
  edgeHandler,
  json,
  publicProjectReads,
  readJsonBody,
  refusal,
  requireEnv,
} from '../_shared/edge.ts';

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(edgeHandler('public-project', async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refusal('public-project accepts POST only', 405);

  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);

  const projectId = typeof body.value.projectId === 'string' ? body.value.projectId.trim() : '';
  if (!UUID.test(projectId)) return refusal('a public project page must name the project as a uuid', 400);

  const answer = await publicProjectAnswer(projectId, publicProjectReads(SUPABASE_URL, SERVICE_ROLE_KEY));
  return json(answer.body, answer.status);
}));
