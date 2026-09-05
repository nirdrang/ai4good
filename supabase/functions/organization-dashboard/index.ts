import { organizationDashboard } from '../_shared/tenant-reads.ts';
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

Deno.serve(edgeHandler('organization-dashboard', async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refusal('organization-dashboard accepts POST only', 405);

  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
  if (!caller) return refusal('authenticate before reading an organisation dashboard', 401);

  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);

  const organizationId = typeof body.value.organizationId === 'string' ? body.value.organizationId.trim() : '';
  if (!UUID.test(organizationId)) {
    return refusal('an organisation dashboard must name the organisation as a uuid', 400);
  }

  const authorization = request.headers.get('Authorization') ?? '';
  const answer = await organizationDashboard(callerReads(SUPABASE_URL, ANON_KEY, authorization), organizationId);
  return json(answer.body, answer.status);
}));
