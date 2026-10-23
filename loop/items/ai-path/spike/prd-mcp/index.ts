import postgres from 'npm:postgres@3.4.7';
import { type Grant, verifyGrant } from '../grant.ts';

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (grant: Grant, input: Record<string, unknown>) => Promise<unknown>;
};

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
};
const sql = postgres(env('SPIKE_DB_URL'), { max: 2 });
const PROTOCOL_VERSION = '2025-06-18';

async function grantFrom(request: Request): Promise<Grant | null> {
  return verifyGrant(env('SPIKE_MCP_SIGNING_KEY'), (request.headers.get('authorization') ?? '').replace(/^Bearer /, ''));
}

const object = (properties: Record<string, unknown>, required: string[]) => ({ type: 'object', additionalProperties: false, properties, required });

const TOOLS: Tool[] = [
  {
    name: 'list_sections',
    description: 'List every PRD section with its state, revision and dependencies, without the text.',
    inputSchema: object({}, []),
    run: (grant) => sql`select section_id, state, revision, depends_on from spike.sections where project_id = ${grant.project} order by section_id`,
  },
  {
    name: 'read_section',
    description: 'Read one section: text, state, revision, dependencies and the line saying what changed since it was confirmed.',
    inputSchema: object({ section: { type: 'string' } }, ['section']),
    run: async (grant, input) => (await sql`select section_id, body, state, revision, depends_on, changed_since_confirmed
      from spike.sections where project_id = ${grant.project} and section_id = ${String(input.section)}`)[0] ?? { error: 'no such section' },
  },
  {
    name: 'stage_section',
    description: 'Stage new text for one section in this turn. Nothing is visible until commit_turn. Pass the revision you read.',
    inputSchema: object({
      section: { type: 'string' }, base_revision: { type: 'integer' }, body: { type: 'string' },
      sources: { type: 'array', items: { type: 'string' } }, change: { type: 'string' },
    }, ['section', 'base_revision', 'body', 'sources', 'change']),
    run: async (grant, input) => {
      await sql`insert into spike.staged_writes values (${grant.session}, ${grant.project}, ${String(input.section)},
        ${Number(input.base_revision)}, ${String(input.body)}, ${(input.sources as string[]) ?? []}, ${String(input.change ?? '')})
        on conflict (session_id, section_id) do update set base_revision = excluded.base_revision, body = excluded.body,
        sources = excluded.sources, change = excluded.change`;
      return { staged: input.section };
    },
  },
  {
    name: 'commit_turn',
    description: 'Apply every staged section in one step. If any staged section changed since you read it, nothing is applied and the stale sections come back with their current text; merge, stage again, and commit again.',
    inputSchema: object({}, []),
    run: async (grant) => sql.begin(async (tx) => {
      const staged = await tx`select section_id as section, base_revision, body, sources, change
        from spike.staged_writes where session_id = ${grant.session} and project_id = ${grant.project}`;
      if (staged.length === 0) return { ok: true, applied: [] };
      const [{ result }] = await tx`select spike.apply_turn(${grant.project}, ${tx.json(staged)}, ${`ai:${grant.chat}`}) as result`;
      if (result.ok) await tx`delete from spike.staged_writes where session_id = ${grant.session}`;
      return result;
    }),
  },
];

const reply = (id: unknown, result: unknown) => Response.json({ jsonrpc: '2.0', id, result });
const failure = (id: unknown, code: number, message: string) => Response.json({ jsonrpc: '2.0', id, error: { code, message } });

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const grant = await grantFrom(request);
  if (!grant) return new Response('unauthorized', { status: 401 });
  const message = await request.json() as { id?: unknown; method: string; params?: Record<string, unknown> };
  if (message.id === undefined) return new Response(null, { status: 202 });
  if (message.method === 'initialize') {
    return reply(message.id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: 'ai4good-prd', version: '0.0.1' } });
  }
  if (message.method === 'ping') return reply(message.id, {});
  if (message.method === 'tools/list') {
    return reply(message.id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
  }
  if (message.method === 'tools/call') {
    const tool = TOOLS.find((candidate) => candidate.name === message.params?.name);
    if (!tool) return failure(message.id, -32602, `unknown tool ${message.params?.name}`);
    try {
      const output = await tool.run(grant, (message.params?.arguments as Record<string, unknown>) ?? {});
      return reply(message.id, { content: [{ type: 'text', text: JSON.stringify(output) }], isError: false });
    } catch (error) {
      console.error(error);
      return reply(message.id, { content: [{ type: 'text', text: 'The tool failed.' }], isError: true });
    }
  }
  return failure(message.id, -32601, `unknown method ${message.method}`);
});
