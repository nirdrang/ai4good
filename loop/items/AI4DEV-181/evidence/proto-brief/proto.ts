// Throwaway prototype: does Haiku return a per-turn brief update reliably?
// Variant A: text reply + optional update_brief tool (tool_choice auto).
// Variant B: forced update_brief tool that carries the reply text.
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-181/supabase/functions/.env', 'utf8');
const key = /^ANTHROPIC_API_KEY=(.*)$/m.exec(env)![1].trim();
const model = /^DISCOVERY_MODEL=(.*)$/m.exec(env)![1].trim();

const TOPICS = ['priority', 'booking', 'measure', 'owner', 'rules', 'info'];
const SYSTEM = `You run Discovery for a small NGO. You agree six topics about the NGO's need, one or two questions per reply, never more than three open at once. Topics (ids): priority (what should improve first), booking (who books shifts), measure (how they will know it works), owner (who maintains the tool), rules (booking limits; ask only after booking is agreed), info (what volunteer data the tool keeps). Each question offers 2-4 short options and marks one as suggested. Mark importance: needed-before-build, suggestion-exists, or can-wait. Never invent an answer the NGO did not give. When every topic is agreed, say Discovery is ready.
The NGO need: Harbor Community Kitchen, three kitchens, 45 volunteers; coordinators spend four and a half hours a week scheduling by phone and spreadsheet.`;

const updateSchema = {
  type: 'object',
  properties: {
    agreed: {
      type: 'array',
      description: 'Topics the NGO answered in their LAST message. Empty when they answered nothing.',
      items: { type: 'object', properties: { topicId: { enum: TOPICS }, answer: { type: 'string' }, certain: { type: 'boolean' } }, required: ['topicId', 'answer', 'certain'] },
    },
    questions: {
      type: 'array',
      description: 'The questions you ask in THIS reply, with options.',
      items: {
        type: 'object',
        properties: {
          topicId: { enum: TOPICS },
          text: { type: 'string' },
          importance: { enum: ['needed-before-build', 'suggestion-exists', 'can-wait'] },
          options: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
          suggested: { type: 'integer', description: 'Index into options of the suggested one.' },
        },
        required: ['topicId', 'text', 'importance', 'options', 'suggested'],
      },
    },
    ready: { type: 'boolean', description: 'True only when all six topics are agreed.' },
  },
  required: ['agreed', 'questions', 'ready'],
};

const toolA = { name: 'update_brief', description: 'Record the brief update for this reply. Call it exactly once, after your text, every reply.', input_schema: updateSchema };
const toolB = {
  name: 'reply',
  description: 'Your whole reply: the text the NGO reads, plus the brief update.',
  input_schema: { ...updateSchema, properties: { text: { type: 'string', description: 'The reply the NGO reads. Do not list the questions here; they show as cards.' }, ...updateSchema.properties }, required: ['text', ...updateSchema.required] },
};

type Msg = { role: 'user' | 'assistant'; content: unknown };

async function call(variant: 'A' | 'B', messages: Msg[]) {
  const body: Record<string, unknown> = {
    model, max_tokens: 1200, system: SYSTEM, messages,
    tools: [variant === 'A' ? toolA : toolB],
    tool_choice: variant === 'A' ? { type: 'auto' } : { type: 'tool', name: 'reply' },
  };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await r.json()) as any;
  if (!r.ok) throw new Error(JSON.stringify(json).slice(0, 300));
  return json;
}

function check(update: any): string[] {
  const problems: string[] = [];
  if (!update) return ['no update'];
  if (!Array.isArray(update.agreed)) problems.push('agreed not array');
  if (!Array.isArray(update.questions)) problems.push('questions not array');
  for (const q of update.questions ?? []) {
    if (!TOPICS.includes(q.topicId)) problems.push(`bad topic ${q.topicId}`);
    if (!Array.isArray(q.options) || q.options.length < 2) problems.push('few options');
    if (typeof q.suggested !== 'number' || q.suggested < 0 || q.suggested >= (q.options?.length ?? 0)) problems.push('bad suggested');
  }
  if ((update.questions ?? []).length > 3) problems.push('more than 3 questions');
  return problems;
}

// Scripted NGO turns: each answers the first open question with option 0, plus one free note.
async function conversation(variant: 'A' | 'B', turns: number) {
  const messages: Msg[] = [{ role: 'user', content: 'Start Discovery. (The NGO has opened the chat.)' }];
  const log: any[] = [];
  let usage = { in: 0, out: 0 };
  for (let t = 0; t < turns; t++) {
    const res = await call(variant, messages);
    usage.in += res.usage.input_tokens; usage.out += res.usage.output_tokens;
    const tool = res.content.find((c: any) => c.type === 'tool_use');
    const text = variant === 'A' ? res.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('') : tool?.input?.text ?? '';
    const update = tool?.input;
    log.push({ turn: t + 1, toolCalled: !!tool, textChars: text.length, problems: check(update), agreed: update?.agreed, asked: (update?.questions ?? []).map((q: any) => q.topicId), ready: update?.ready });
    messages.push({ role: 'assistant', content: res.content });
    const first = update?.questions?.[0];
    const answer = first ? `${first.options[0]}` : 'Thanks.';
    const content: any[] = [];
    if (tool) content.push({ type: 'tool_result', tool_use_id: tool.id, content: 'recorded' });
    content.push({ type: 'text', text: first ? `For "${first.text}": ${answer}.` : 'Ok.' });
    messages.push({ role: 'user', content });
  }
  return { log, usage };
}

const out: any = {};
for (const variant of ['A', 'B'] as const) {
  out[variant] = [];
  for (let run = 0; run < 3; run++) out[variant].push(await conversation(variant, 5));
}
writeFileSync('C:/Users/nirdr/AppData/Local/Temp/claude/C--Users-nirdr-Downloads-ai4good/44802c73-47d7-44cd-b178-89b3ea791dc2/scratchpad/proto-brief/result.json', JSON.stringify(out, null, 2));
for (const variant of ['A', 'B'] as const) {
  const turns = out[variant].flatMap((c: any) => c.log);
  const called = turns.filter((t: any) => t.toolCalled).length;
  const clean = turns.filter((t: any) => t.toolCalled && t.problems.length === 0).length;
  const agreedRight = turns.filter((t: any, i: number) => t.turn > 1 && (t.agreed?.length ?? 0) >= 1).length;
  const tokens = out[variant].reduce((a: any, c: any) => ({ in: a.in + c.usage.in, out: a.out + c.usage.out }), { in: 0, out: 0 });
  console.log(`${variant}: tool ${called}/${turns.length}, valid ${clean}/${turns.length}, agreed-after-answer ${agreedRight}/${turns.length - 3}, tokens in ${tokens.in} out ${tokens.out}`);
}
