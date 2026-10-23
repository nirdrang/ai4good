import Anthropic from 'npm:@anthropic-ai/sdk@1.1.0';
import postgres from 'npm:postgres@3.4.7';
import {
  DISCOVERY_STREAM_HEADERS, done, error as errorPart, finish, start, textDelta, textEnd, textStart,
} from '../../../../../supabase/functions/_shared/discovery-stream.ts';

type Path = 'anthropic' | 'openrouter' | 'managed';
type Basis = 'provider-reported' | 'tokens-x-rate' | 'runtime-x-rate';
type Receipt = { receiptId: string; micros: number | null; basis: Basis };
type ToolCall = { id: string; name: string; input: Record<string, unknown> };
type Emit = (chunk: string) => void;
type Tools = (call: ToolCall) => Promise<string>;

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
};
const sql = postgres(env('SPIKE_DB_URL'), { max: 2 });

const OPUS_RATE_MICROS = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 };
const MANAGED_RUNTIME_MICROS_PER_SECOND = 80_000 / 3600;
const MAX_STEPS = 6;
const MAX_OUTPUT_TOKENS = 8000;
const ESTIMATED_INPUT_TOKENS = 4000;
const HOLD_MICROS = MAX_STEPS * (ESTIMATED_INPUT_TOKENS * OPUS_RATE_MICROS.input + MAX_OUTPUT_TOKENS * OPUS_RATE_MICROS.output);
const SYSTEM = 'You are the ai4good PRD assistant spike. After each answer the developer gives, call write_prd_section for every section the answer changes, with the revision you last read; if the write is stale, merge your change into the current text it returns and write again. When asked, use edit_repo_file to write a repository file and create_linear_issue to file an item. Confirm in one sentence.';

const TOOLS = [
  {
    name: 'write_prd_section',
    description: 'Replace one PRD section with new text. Pass the revision you last read; a stale revision returns the current text and revision instead of writing.',
    input_schema: {
      type: 'object' as const, additionalProperties: false, required: ['section', 'expected_revision', 'body', 'sources', 'change'],
      properties: {
        section: { type: 'string' }, expected_revision: { type: 'integer' }, body: { type: 'string' },
        sources: { type: 'array', items: { type: 'string' } }, change: { type: 'string' },
      },
    },
  },
  {
    name: 'edit_repo_file',
    description: 'Create or replace one file in the sandbox repository.',
    input_schema: {
      type: 'object' as const, additionalProperties: false, required: ['path', 'content', 'message'],
      properties: { path: { type: 'string' }, content: { type: 'string' }, message: { type: 'string' } },
    },
  },
  {
    name: 'create_linear_issue',
    description: 'Create one issue in the Linear test team.',
    input_schema: {
      type: 'object' as const, additionalProperties: false, required: ['title', 'description'],
      properties: { title: { type: 'string' }, description: { type: 'string' } },
    },
  },
];

function tokenMicros(usage: { input_tokens?: number | null; output_tokens?: number | null;
  cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null }): number {
  return (usage.input_tokens ?? 0) * OPUS_RATE_MICROS.input + (usage.output_tokens ?? 0) * OPUS_RATE_MICROS.output
    + (usage.cache_creation_input_tokens ?? 0) * OPUS_RATE_MICROS.cacheWrite
    + (usage.cache_read_input_tokens ?? 0) * OPUS_RATE_MICROS.cacheRead;
}

async function editRepoFile(input: Record<string, unknown>): Promise<string> {
  const repo = env('SPIKE_GITHUB_REPO');
  const segments = String(input.path).split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return `refused path ${input.path}`;
  const url = `https://api.github.com/repos/${repo}/contents/${segments.map(encodeURIComponent).join('/')}`;
  const headers = { authorization: `Bearer ${env('SPIKE_GITHUB_TOKEN')}`, accept: 'application/vnd.github+json' };
  const existing = await fetch(url, { headers });
  const sha = existing.ok ? (await existing.json()).sha : undefined;
  if (!existing.ok) await existing.body?.cancel();
  const put = await fetch(url, {
    method: 'PUT', headers,
    body: JSON.stringify({ message: String(input.message), content: btoa(unescape(encodeURIComponent(String(input.content)))), ...(sha ? { sha } : {}) }),
  });
  const body = await put.json();
  return put.ok ? `committed ${body.commit.sha} to ${repo}/${input.path}` : `GitHub ${put.status}: ${body.message}`;
}

async function createLinearIssue(input: Record<string, unknown>): Promise<string> {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { authorization: env('SPIKE_LINEAR_API_KEY'), 'content-type': 'application/json' },
    body: JSON.stringify({
      query: 'mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { identifier url } } }',
      variables: { input: { teamId: env('SPIKE_LINEAR_TEAM_ID'), title: input.title, description: input.description } },
    }),
  });
  const body = await response.json();
  const issue = body.data?.issueCreate?.issue;
  return issue ? `created ${issue.identifier} ${issue.url}` : `Linear ${response.status}: ${JSON.stringify(body.errors)}`;
}

async function writePrdSection(project: string, input: Record<string, unknown>): Promise<string> {
  const [{ result }] = await sql`select spike.write_section(${project}, ${String(input.section)}, ${Number(input.expected_revision)},
    ${String(input.body)}, ${(input.sources as string[]) ?? []}, ${String(input.change ?? '')}, 'ai') as result`;
  return JSON.stringify(result);
}

const runTool = (call: ToolCall, project: string) =>
  call.name === 'write_prd_section' ? writePrdSection(project, call.input)
  : call.name === 'edit_repo_file' ? editRepoFile(call.input)
  : call.name === 'create_linear_issue' ? createLinearIssue(call.input)
  : Promise.resolve(`unknown tool ${call.name}`);

async function anthropicPath(prompt: string, emit: Emit, settle: (r: Receipt) => Promise<void>, tools: Tools) {
  const client = new Anthropic({ apiKey: env('SPIKE_ANTHROPIC_PROJECT_KEY'), maxRetries: 0 });
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }];
  for (let step = 0; step < MAX_STEPS; step++) {
    const stream = client.messages.stream({
      model: 'claude-opus-5-5', max_tokens: MAX_OUTPUT_TOKENS, system: SYSTEM, output_config: { effort: 'low' },
      tools: TOOLS.map((tool) => ({ ...tool, strict: true })), messages,
    });
    stream.on('text', (delta) => emit(delta));
    let startedId = '';
    stream.on('streamEvent', (event) => { if (event.type === 'message_start') startedId = event.message.id; });
    let message: Anthropic.Message;
    try {
      message = await stream.finalMessage();
    } catch (failure) {
      if (startedId) await settle({ receiptId: startedId, micros: null, basis: 'tokens-x-rate' });
      throw failure;
    }
    await settle({ receiptId: message.id, micros: tokenMicros(message.usage), basis: 'tokens-x-rate' });
    messages.push({ role: 'assistant', content: message.content });
    if (message.stop_reason !== 'tool_use') return;
    const calls = message.content.filter((block) => block.type === 'tool_use');
    const results = await Promise.all(calls.map(async (block) => ({
      type: 'tool_result' as const, tool_use_id: block.id,
      content: await tools({ id: block.id, name: block.name, input: block.input as Record<string, unknown> }),
    })));
    messages.push({ role: 'user', content: results });
  }
}

async function openrouterPath(prompt: string, emit: Emit, settle: (r: Receipt) => Promise<void>, tools: Tools) {
  const messages: Array<Record<string, unknown>> = [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }];
  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${env('SPIKE_OPENROUTER_PROJECT_KEY')}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('SPIKE_OPENROUTER_MODEL') ?? 'anthropic/claude-opus-5.5', stream: true, max_tokens: MAX_OUTPUT_TOKENS,
        usage: { include: true }, messages,
        tools: TOOLS.map((tool) => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.input_schema } })),
      }),
    });
    if (!response.ok || !response.body) throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
    let generationId = '';
    let costUsd: number | null = null;
    let text = '';
    const calls = new Map<number, { id: string; name: string; args: string }>();
    let buffer = '';
    let streamError: unknown = null;
    for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        const event = JSON.parse(line.slice(6));
        generationId ||= event.id ?? '';
        if (event.error) streamError = event.error;
        if (typeof event.usage?.cost === 'number') costUsd = event.usage.cost;
        const delta = event.choices?.[0]?.delta;
        if (delta?.content) { text += delta.content; emit(delta.content); }
        for (const call of delta?.tool_calls ?? []) {
          const entry = calls.get(call.index) ?? { id: '', name: '', args: '' };
          entry.id ||= call.id ?? '';
          entry.name ||= call.function?.name ?? '';
          entry.args += call.function?.arguments ?? '';
          calls.set(call.index, entry);
        }
      }
    }
    if (generationId) await settle({ receiptId: generationId, micros: costUsd === null ? null : costUsd * 1_000_000, basis: 'provider-reported' });
    if (streamError) throw new Error(`OpenRouter stream error ${JSON.stringify(streamError)}`);
    if (calls.size === 0) return;
    const toolCalls = [...calls.values()];
    messages.push({ role: 'assistant', content: text || null,
      tool_calls: toolCalls.map((call) => ({ id: call.id, type: 'function', function: { name: call.name, arguments: call.args } })) });
    for (const call of toolCalls) {
      messages.push({ role: 'tool', tool_call_id: call.id, content: await tools({ id: call.id, name: call.name, input: JSON.parse(call.args || '{}') }) });
    }
  }
}

async function managedPath(prompt: string, emit: Emit, settle: (r: Receipt) => Promise<void>, tools: Tools) {
  const client = new Anthropic({ apiKey: env('SPIKE_ANTHROPIC_PROJECT_KEY') });
  const session = await client.beta.sessions.create({
    agent: env('SPIKE_MANAGED_AGENT_ID'), environment_id: env('SPIKE_MANAGED_ENVIRONMENT_ID'),
    budget: { type: 'limit', max_list_cost: { amount: String(Math.ceil(HOLD_MICROS / 10_000)), currency: 'USD' } },
    resources: [{
      type: 'github_repository', url: `https://github.com/${env('SPIKE_GITHUB_REPO')}`,
      mount_path: '/workspace/repo', authorization_token: env('SPIKE_GITHUB_TOKEN'),
    }],
  });
  let previewed = false;
  const stream = await client.beta.sessions.events.stream(session.id, { event_deltas: ['agent.message'] });
  await client.beta.sessions.events.send(session.id, { events: [{ type: 'user.message', content: [{ type: 'text', text: prompt }] }] });
  for await (const event of stream) {
    if (event.type === 'event_delta' && event.delta.content.type === 'text') { previewed = true; emit(event.delta.content.text); }
    if (event.type === 'agent.message' && !previewed) {
      for (const block of event.content) if (block.type === 'text') emit(block.text);
    }
    if (event.type === 'agent.message') previewed = false;
    if (event.type === 'span.model_request_end' && event.model_usage) {
      await settle({ receiptId: event.id, micros: tokenMicros(event.model_usage), basis: 'tokens-x-rate' });
    }
    if (event.type === 'agent.custom_tool_use') {
      const output = await tools({ id: event.id, name: event.name, input: event.input as Record<string, unknown> });
      await client.beta.sessions.events.send(session.id, { events: [{ type: 'user.custom_tool_result', custom_tool_use_id: event.id, content: [{ type: 'text', text: output }] }] });
    }
    if (event.type === 'session.status_idle' && event.stop_reason.type !== 'requires_action') {
      const finished = await client.beta.sessions.retrieve(session.id);
      const activeSeconds = finished.usage?.active_seconds ?? null;
      await settle({ receiptId: `${session.id}:runtime`, micros: activeSeconds === null ? null : activeSeconds * MANAGED_RUNTIME_MICROS_PER_SECOND, basis: 'runtime-x-rate' });
      return { session: session.id, list_cost: finished.usage?.list_cost, active_seconds: activeSeconds };
    }
    if (event.type === 'session.status_terminated') return;
  }
}

const PATHS: Record<Path, (prompt: string, emit: Emit, settle: (r: Receipt) => Promise<void>, tools: Tools) => Promise<unknown>> = { anthropic: anthropicPath, openrouter: openrouterPath, managed: managedPath };

Deno.serve(async (request) => {
  const { path, prompt, project } = await request.json() as { path: Path; prompt: string; project: string };
  const run = Object.hasOwn(PATHS, path) ? PATHS[path] : undefined;
  if (!run || typeof prompt !== 'string' || typeof project !== 'string') return new Response(`unknown path ${path}`, { status: 400 });
  const [{ hold }] = await sql`select spike.hold(${project}, ${path}, ${HOLD_MICROS}) as hold`;
  const settled: Array<Receipt & { first: boolean }> = [];
  const settle = async (receipt: Receipt) => {
    const [{ first }] = await sql`select spike.settle(${hold}, ${path}, ${receipt.receiptId}, ${receipt.micros}, ${receipt.basis}) as first`;
    settled.push({ ...receipt, first });
  };
  const body = new ReadableStream<string>({
    async start(controller) {
      const textId = crypto.randomUUID();
      controller.enqueue(start(crypto.randomUUID()));
      controller.enqueue(textStart(textId));
      try {
        const providerTruth = await run(prompt, (delta) => delta && controller.enqueue(textDelta(textId, delta)), settle, (call) => runTool(call, project));
        controller.enqueue(textEnd(textId));
        controller.enqueue(`data: ${JSON.stringify({ type: 'data-receipts', data: { hold, settled, providerTruth: providerTruth ?? null } })}\n\n`);
        controller.enqueue(finish());
      } catch (failure) {
        console.error(failure);
        controller.enqueue(errorPart('The AI request failed.'));
      } finally {
        await sql`select spike.close(${hold})`;
      }
      controller.enqueue(done());
      controller.close();
    },
  });
  return new Response(body.pipeThrough(new TextEncoderStream()), { headers: DISCOVERY_STREAM_HEADERS });
});
