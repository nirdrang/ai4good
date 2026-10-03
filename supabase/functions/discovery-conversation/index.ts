import { screenUsage } from '../_shared/discovery-reply.ts';
import { conversationAnswer } from '../_shared/discovery-turn.ts';
import { uuidField } from '../_shared/write-routes.ts';
import { callerReads, edgeHandler, json, readJsonBody, refusal, requireEnv, resolveCaller } from '../_shared/edge.ts';
import { screenFile } from '../_shared/discovery-files.ts';
import { readDiscoveryFile } from '../_shared/discovery-file-read.ts';
import { needIntakeAnswer } from '../_shared/need-intake.ts';

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
  const reads = callerReads(SUPABASE_URL, ANON_KEY, request.headers.get('Authorization')!);
  const answer = await conversationAnswer(reads, projectId);
  if (answer.status !== 200) return json(answer.body, answer.status);
  const project = await reads.project(projectId);
  const source = project.ok ? project.rows[0] : undefined;
  const usage = source === undefined ? null : screenUsage(await reads.discoveryUsage(caller.id, source.org_id, projectId));
  const files = await reads.discoveryFilesOf!(projectId);
  if (!files.ok) throw new Error(files.detail);
  for (const file of files.rows) {
    if (file.status === 'reading' && Date.parse(file.heartbeat) < Date.now() - 5 * 60 * 1000) {
      EdgeRuntime.waitUntil(readDiscoveryFile(file));
    }
  }
  const need = await needIntakeAnswer(reads, projectId);
  if (need.status !== 200) return json(need.body, need.status);
  return json({ ...answer.body, ...(usage === null ? {} : { usage }), files: [
    ...need.body.need.referenceFiles.map((file) => ({ origin: 'intake', id: file.id, name: file.fileName, sizeBytes: file.byteSize, tookFromIt: null })),
    ...files.rows.map(screenFile),
  ] }, answer.status);
}));
