import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLocalConfig, stackFromLocalStatus } from '../../../../tests/at/harness/local-stack.ts';
import { authPost, functionPost, followLink, mailIdentification, verifyLinksFor, redactValue } from '../../../../tests/at/harness/live-stack.ts';
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

export const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../..');

export async function prepareDiscovery(outDir: string) {
  const stack = stackFromLocalStatus(repoRoot);
  const health = await fetch(`${stack.apiUrl}/auth/v1/health`);
  if (!health.ok) throw new Error(`Auth health answered ${health.status}`);
  await mailIdentification(stack);
  const inspect = spawnSync('docker', ['inspect', `supabase_edge_runtime_${readLocalConfig(repoRoot).projectId}`, '--format', '{{json .Mounts}}'], { encoding: 'utf8', windowsHide: true });
  if (inspect.status !== 0) throw new Error('Cannot identify the edge runtime mount.');
  const normalize = (value: string) => value.replace(/\\/g, '/').replace(/^\/run\/desktop\/mnt\/host\/([a-z])\//i, '$1:/').toLowerCase();
  const mounts = JSON.parse(inspect.stdout) as { Source: string }[];
  if (!mounts.some((mount) => normalize(mount.Source) === normalize(join(repoRoot, 'supabase/functions')))) throw new Error('The edge runtime mounts another checkout. Ask the stack owner to load this committed checkout.');
  const email = `verify-discovery-${Date.now()}-${randomBytes(3).toString('hex')}@example.com`;
  const password = `Discovery-${randomBytes(18).toString('base64url')}-Aa1!`;
  const transcript: unknown[] = [];
  const signup = await authPost(stack, '/auth/v1/signup', { email, password });
  if (signup.status !== 200) throw new Error(`Signup answered ${signup.status}`);
  const link = (await verifyLinksFor(stack, email, 'signup'))[0];
  if (!link) throw new Error('No confirmation mail.');
  const confirmed = await followLink(link);
  if (confirmed.status < 300 || confirmed.status >= 400) throw new Error('Confirmation did not redirect.');
  const signedIn = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
  const bearer = String(signedIn.json.access_token ?? '');
  if (!bearer) throw new Error('Sign-in returned no session.');
  async function post(name: string, body: Record<string, unknown>) {
    const answer = await functionPost(stack, name, body, bearer);
    transcript.push({ name, request: body, status: answer.status, response: answer.json });
    if (answer.status !== 200) throw new Error(`${name} answered ${answer.status}: ${String(answer.json.reason)}`);
    return answer.json;
  }
  const ngo = await post('complete-signup', { accountType: 'ngo', organizationName: `Discovery drive ${Date.now()}`,
    acknowledgmentTextVersion: 'tos-platform-promise-v1', signerName: 'Discovery verifier', signerTitle: 'Coordinator',
    authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement });
  const organizationId = String(ngo.organizationId);
  const start = await post('project-need', { organizationId, action: 'start', title: 'Volunteer scheduling',
    description: 'We coordinate 45 volunteers across three kitchens. Scheduling takes four hours each week. We need a shared shift rota to reduce coordination time.', urgency: 'soon' });
  const projectId = String((start.need as Record<string, unknown>).projectId);
  await post('project-need', { organizationId, projectId, action: 'submit' });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'setup.json'), JSON.stringify(redactValue({ email, organizationId, projectId, transcript }), null, 2));
  return { stack, email, password, bearer, organizationId, projectId, pageUrl: `http://localhost:8080/discovery/${organizationId}/${projectId}` };
}

if (import.meta.main) {
  const outDir = resolve(repoRoot, process.argv[2] ?? `loop/verify-evidence/discovery-${Date.now()}`);
  const prepared = await prepareDiscovery(outDir);
  console.log(JSON.stringify({ email: prepared.email, password: prepared.password, organizationId: prepared.organizationId,
    projectId: prepared.projectId, apiUrl: prepared.stack.apiUrl, pageUrl: prepared.pageUrl }));
}
