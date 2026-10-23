import postgres from 'npm:postgres@3.4.7';

const need = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} must be set for the live run`);
  return value;
};
const FUNCTION_URL = Deno.env.get('SPIKE_FUNCTION_URL') ?? 'http://127.0.0.1:9000';
const sql = postgres(need('SPIKE_DB_URL'), { max: 1 });
const paths = (Deno.env.get('SPIKE_PATHS') ?? 'anthropic,openrouter,managed').split(',');
const runs = Number(Deno.env.get('SPIKE_RUNS') ?? '3');
const secrets = ['SPIKE_ANTHROPIC_PROJECT_KEY', 'SPIKE_OPENROUTER_PROJECT_KEY', 'SPIKE_LINEAR_API_KEY', 'SPIKE_GITHUB_TOKEN'].map(need);

const CHAT_PROMPT = 'In two sentences, what does a PRD completion check compare?';
const ACT_PROMPT = (stamp: string) =>
  `Write the file spike/${stamp}.md containing "spike ${stamp}", then create a Linear issue titled "spike ${stamp}" with description "throwaway".`;

async function once(path: string, prompt: string) {
  const startedAt = performance.now();
  const response = await fetch(FUNCTION_URL, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify({ path, prompt, project: `spike-${path}` }),
  });
  let firstTextMs: number | null = null;
  let raw = '';
  for await (const chunk of response.body!.pipeThrough(new TextDecoderStream())) {
    raw += chunk;
    if (firstTextMs === null && raw.includes('"type":"text-delta"')) firstTextMs = performance.now() - startedAt;
  }
  const totalMs = performance.now() - startedAt;
  const parts = raw.split('\n\n').filter((line) => line.startsWith('data: {')).map((line) => JSON.parse(line.slice(6)));
  const receipts = parts.find((part) => part.type === 'data-receipts')?.data ?? null;
  const failure = parts.find((part) => part.type === 'error')?.errorText ?? null;
  const leaked = secrets.some((secret) => raw.includes(secret));
  return { path, firstTextMs, totalMs, receipts, failure, leaked, protocolOk: raw.endsWith('data: [DONE]\n\n') };
}

async function openrouterTruth(generationId: string): Promise<number | null> {
  const response = await fetch(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`, {
    headers: { authorization: `Bearer ${need('SPIKE_OPENROUTER_PROJECT_KEY')}` },
  });
  if (!response.ok) return null;
  const body = await response.json();
  return typeof body.data?.total_cost === 'number' ? body.data.total_cost * 1_000_000 : null;
}

async function fileExists(stamp: string): Promise<boolean> {
  const response = await fetch(`https://api.github.com/repos/${need('SPIKE_GITHUB_REPO')}/contents/spike/${stamp}.md`, {
    headers: { authorization: `Bearer ${need('SPIKE_GITHUB_TOKEN')}`, accept: 'application/vnd.github+json' },
  });
  await response.body?.cancel();
  return response.ok;
}

async function issueExists(stamp: string): Promise<boolean> {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST', headers: { authorization: need('SPIKE_LINEAR_API_KEY'), 'content-type': 'application/json' },
    body: JSON.stringify({
      query: 'query($title: String!) { issues(filter: { title: { eq: $title } }) { nodes { identifier } } }',
      variables: { title: `spike ${stamp}` },
    }),
  });
  const body = await response.json();
  return (body.data?.issues?.nodes?.length ?? 0) === 1;
}

await sql`insert into spike.allocations ${sql(paths.map((path) => ({ project_id: `spike-${path}`, cap_micros: 20_000_000 })))} on conflict do nothing`;

const results = [];
for (const path of paths) {
  for (let index = 0; index < runs; index++) results.push({ kind: 'chat', ...(await once(path, CHAT_PROMPT)) });
  const stamp = `${path}-${Date.now()}`;
  const act = await once(path, ACT_PROMPT(stamp));
  results.push({ kind: 'act', ...act, fileWritten: await fileExists(stamp), issueCreated: await issueExists(stamp) });
}

const costChecks = [];
for (const result of results.filter((result) => result.path === 'openrouter' && result.receipts)) {
  for (const receipt of result.receipts.settled) {
    costChecks.push({ receipt: receipt.receiptId, settledMicros: receipt.micros, providerMicros: await openrouterTruth(receipt.receiptId) });
  }
}
const managedChecks = results.filter((result) => result.path === 'managed' && result.receipts).map((result) => ({
  settledMicros: result.receipts.settled.reduce((sum: number, receipt: { micros: number | null }) => sum + (receipt.micros ?? 0), 0),
  providerTruth: result.receipts.providerTruth,
}));

console.log(JSON.stringify({ results, costChecks, managedChecks, balance: await sql`select * from spike.balance order by project_id` }, null, 2));
await sql.end();
