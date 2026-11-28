import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { prepareDiscovery, repoRoot } from './prepare-chat-page.ts';
import { authPost, followLink, functionPost, redactValue, sqlClient, verifyLinksFor, type Stack } from '../../../../tests/at/harness/live-stack.ts';
import { cleanupReposNamed } from '../../../../tests/at/harness/github.ts';

export type PreparedPrd = {
  stack: Stack;
  email: string;
  password: string;
  bearer: string;
  devEmail: string;
  devPassword: string;
  devBearer: string;
  organizationId: string;
  projectId: string;
  repoName: string;
  pageUrl: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function revisionOf(json: Record<string, unknown>): number | null {
  const direct = isRecord(json.brief) ? json.brief.revision : undefined;
  const nested = isRecord(json.state) && isRecord(json.state.brief) ? json.state.brief.revision : undefined;
  const revision = typeof direct === 'number' ? direct : nested;
  return typeof revision === 'number' && Number.isInteger(revision) && revision >= 1 ? revision : null;
}

function accountIdFromToken(token: string): string {
  const part = token.split('.')[1] ?? '';
  const payload = JSON.parse(Buffer.from(part, 'base64url').toString()) as { sub?: unknown };
  return typeof payload.sub === 'string' ? payload.sub : '';
}

async function creditFunds(stack: Stack, projectId: string): Promise<void> {
  const response = await fetch(`${stack.apiUrl}/rest/v1/rpc/prd_fund_credit`, {
    method: 'POST',
    headers: {
      apikey: stack.serviceRoleKey,
      Authorization: `Bearer ${stack.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_project: projectId, p_amount: '5.000000', p_note: 'verify skill PRD funds' }),
  });
  if (!response.ok) throw new Error(`prd_fund_credit answered ${response.status}`);
}

export async function preparePrd(outDir: string, repos: string[] = []): Promise<PreparedPrd> {
  const discovery = await prepareDiscovery(join(outDir, 'discovery'));
  const steps: unknown[] = [{
    step: 'discovery-prepare',
    path: 'product',
    organizationId: discovery.organizationId,
    projectId: discovery.projectId,
    why: 'Email signup, confirmation, NGO completion, need start, and need submit.',
  }];
  let repoName = '';
  try {
    const sent = await functionPost(discovery.stack, 'discovery-message', {
      organizationId: discovery.organizationId,
      projectId: discovery.projectId,
      message: 'We coordinate 45 volunteers across three kitchens and need the shared shift rota described in the need.',
      mode: 'opening',
      userMessageId: randomUUID(),
    }, discovery.bearer);
    steps.push({
      step: 'discovery-message',
      path: 'product',
      status: sent.status,
      why: 'The live route requires mode and userMessageId beside organizationId, projectId, and message. Opening mode is the first reply the screen sends, and it spends one real Discovery reply.',
    });
    if (sent.status !== 200) throw new Error(`discovery-message answered ${sent.status}: ${String(sent.json.reason ?? '')}`);
    const conversation = await functionPost(discovery.stack, 'discovery-conversation', { projectId: discovery.projectId }, discovery.bearer);
    const revision = revisionOf(conversation.json);
    steps.push({ step: 'discovery-conversation', path: 'product', status: conversation.status, revision });
    if (conversation.status !== 200 || revision === null) throw new Error('Discovery returned no brief revision.');
    const finished = await functionPost(discovery.stack, 'discovery-brief', {
      organizationId: discovery.organizationId,
      projectId: discovery.projectId,
      action: 'finish',
      revision,
      acks: { reviewed: true, openGaps: true, data: true },
    }, discovery.bearer);
    steps.push({ step: 'discovery-brief finish', path: 'product', status: finished.status, revision });
    if (finished.status !== 200) throw new Error(`discovery-brief answered ${finished.status}: ${String(finished.json.reason ?? finished.json.kind ?? '')}`);

    const devEmail = `verify-prd-dev-${Date.now()}-${randomBytes(3).toString('hex')}@example.com`;
    const devPassword = `PrdDev-${randomBytes(18).toString('base64url')}-Aa1!`;
    const signup = await authPost(discovery.stack, '/auth/v1/signup', { email: devEmail, password: devPassword });
    if (signup.status !== 200) throw new Error(`Dev signup answered ${signup.status}`);
    const link = (await verifyLinksFor(discovery.stack, devEmail, 'signup'))[0];
    if (!link) throw new Error('No Dev confirmation mail.');
    const confirmed = await followLink(link);
    if (confirmed.status < 300 || confirmed.status >= 400) throw new Error('Dev confirmation did not redirect.');
    const signedIn = await authPost(discovery.stack, '/auth/v1/token?grant_type=password', { email: devEmail, password: devPassword });
    const devBearer = String(signedIn.json.access_token ?? '');
    const devId = accountIdFromToken(devBearer);
    if (!devBearer || !devId) throw new Error('Dev sign-in returned no session.');
    steps.push({
      step: 'dev-auth',
      path: 'product',
      why: 'Email signup and confirmation create the Auth user. Signup completion for a volunteer requires a linked GitHub identity, which a drive cannot produce.',
    });

    const sql = sqlClient(discovery.stack);
    try {
      await sql`insert into public.accounts (id, account_type) values (${devId}::uuid, ${'volunteer'}::public.account_type)`;
      steps.push({
        step: 'insert accounts',
        path: 'operator',
        why: 'No product path writes the volunteer account row without a linked GitHub identity. The insert matches the acceptance helper for this screen: account_type volunteer.',
      });
      await sql`insert into public.acknowledgments
        (account_id, kind, text_version, signer_name, signer_title, authority_attestation)
        values (${devId}::uuid, 'platform_tos_and_promise', 'tos-1', ${'Priya Shah'}, 'Coordinator', 'I am allowed to act for this project')`;
      steps.push({
        step: 'insert acknowledgments',
        path: 'operator',
        why: 'The same gap. The screen reads the Dev name from this row. The columns match the acceptance helper for this screen.',
      });
      const seated = await sql`update public.projects set assigned_volunteer_id = ${devId}::uuid where id = ${discovery.projectId}::uuid returning id` as { id: string }[];
      if (seated.length !== 1) throw new Error('The volunteer was not seated.');
      steps.push({
        step: 'seat volunteer',
        path: 'operator',
        why: 'No product path assigns the volunteer. The verify skill already allows this seating update.',
      });
    } finally {
      await sql.close();
    }

    await creditFunds(discovery.stack, discovery.projectId);
    steps.push({
      step: 'prd_fund_credit',
      path: 'operator',
      amount: '5.000000',
      why: 'No edge function credits PRD funds. The credit is the service-role prd_fund_credit RPC.',
    });

    const opened = await functionPost(discovery.stack, 'prd-open', {
      organizationId: discovery.organizationId,
      projectId: discovery.projectId,
    }, devBearer);
    steps.push({ step: 'prd-open', path: 'product', status: opened.status });
    const read = sqlClient(discovery.stack);
    try {
      const rows = await read`select repo_name from public.prd_records where project_id = ${discovery.projectId}::uuid` as { repo_name: string }[];
      repoName = String(rows[0]?.repo_name ?? '');
    } finally {
      await read.close();
    }
    if (repoName) repos.push(repoName);
    steps.push({ step: 'read repo_name', path: 'operator-read', repoName });
    if (opened.status !== 200 || opened.json.ok !== true) throw new Error(`prd-open answered ${opened.status}: ${String(opened.json.reason ?? '')}`);
    if (!repoName) throw new Error('prd-open wrote no repository name.');
    return {
      stack: discovery.stack,
      email: discovery.email,
      password: discovery.password,
      bearer: discovery.bearer,
      devEmail,
      devPassword,
      devBearer,
      organizationId: discovery.organizationId,
      projectId: discovery.projectId,
      repoName,
      pageUrl: `http://localhost:8080/prd/${discovery.organizationId}/${discovery.projectId}`,
    };
  } finally {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'setup.json'), JSON.stringify(redactValue({
      organizationId: discovery.organizationId,
      projectId: discovery.projectId,
      repoName,
      pageUrl: `http://localhost:8080/prd/${discovery.organizationId}/${discovery.projectId}`,
      steps,
    }), null, 2));
  }
}

if (import.meta.main) {
  const flag = process.argv[2];
  if (flag === '--delete') {
    const name = process.argv[3] ?? '';
    await cleanupReposNamed([name]);
    console.log(JSON.stringify({ deleted: name }));
  } else {
    const outDir = resolve(repoRoot, flag ?? `loop/verify-evidence/prd-${Date.now()}`);
    const prepared = await preparePrd(outDir);
    console.log(JSON.stringify({
      email: prepared.email,
      password: prepared.password,
      devEmail: prepared.devEmail,
      devPassword: prepared.devPassword,
      organizationId: prepared.organizationId,
      projectId: prepared.projectId,
      repoName: prepared.repoName,
      apiUrl: prepared.stack.apiUrl,
      pageUrl: prepared.pageUrl,
    }));
  }
}
