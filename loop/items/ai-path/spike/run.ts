import postgres from 'npm:postgres@3.4.7';

const FUNCTION_URL = Deno.env.get('SPIKE_FUNCTION_URL') ?? 'http://127.0.0.1:9000';
const sql = postgres(Deno.env.get('SPIKE_DB_URL')!, { max: 1 });
const paths = (Deno.env.get('SPIKE_PATHS') ?? 'anthropic,openrouter,managed').split(',');
const runs = Number(Deno.env.get('SPIKE_RUNS') ?? '3');
const secrets = ['SPIKE_ANTHROPIC_PROJECT_KEY', 'SPIKE_OPENROUTER_PROJECT_KEY', 'SPIKE_LINEAR_API_KEY', 'SPIKE_GITHUB_TOKEN']
  .map((name) => Deno.env.get(name)).filter((value): value is string => Boolean(value));

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

await sql`insert into spike.allocations ${sql(paths.map((path) => ({ project_id: `spike-${path}`, cap_micros: 5_000_000 })))} on conflict do nothing`;

const results = [];
for (const path of paths) {
  for (let index = 0; index < runs; index++) results.push({ kind: 'chat', ...(await once(path, CHAT_PROMPT)) });
  results.push({ kind: 'act', ...(await once(path, ACT_PROMPT(`${path}-${Date.now()}`))) });
}

for (const result of results.filter((result) => result.receipts)) {
  const { hold, settled } = result.receipts;
  for (const receipt of settled) {
    const [{ replay }] = await sql`select spike.settle(${hold}, ${result.path}, ${receipt.receiptId}, ${receipt.micros}, ${receipt.basis}) as replay`;
    if (replay) throw new Error(`replayed receipt ${receipt.receiptId} settled twice`);
  }
}

console.log(JSON.stringify({ results, balance: await sql`select * from spike.balance order by project_id` }, null, 2));
await sql.end();
