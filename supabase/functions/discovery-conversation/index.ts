import { conversationAnswer } from '../_shared/discovery-turn.ts';
import { uuidField } from '../_shared/write-routes.ts';
import { callerReads, edgeHandler, json, readJsonBody, refusal, requireEnv, resolveCaller } from '../_shared/edge.ts';

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const ANON_KEY = requireEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');

Deno.serve(edgeHandler('discovery-conversation', async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refusal('discovery-conversation accepts POST only', 405);
  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
  if (!caller) return refusal('authenticate before reading a Discovery conversation', 401);
  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);
  const projectId = uuidField(body.value.projectId);
  if (projectId === null) return refusal('a Discovery conversation must name the project as a uuid', 400);
  const answer = await conversationAnswer(callerReads(SUPABASE_URL, ANON_KEY, request.headers.get('Authorization')!), projectId);
  return json(answer.body, answer.status);
}));
