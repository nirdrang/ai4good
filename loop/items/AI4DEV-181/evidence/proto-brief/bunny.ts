// Throwaway probe: space-bunny-free on opencode Zen (OpenAI-compatible), forced reply tool, low effort.
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('C:/Users/nirdr/Downloads/ai4good/.env.local', 'utf8');
const key = /^OPENCODE_API_KEY=(.*)$/m.exec(env)![1].trim();
const URL = 'https://opencode.ai/zen/v1/chat/completions';
const MODEL = 'space-bunny-free';
const TOPICS = ['priority', 'booking', 'measure', 'owner', 'rules', 'info'];
const SYSTEM = `You run Discovery for a small NGO. You agree six topics about the NGO's need, one or two questions per reply. Topics (ids): priority (what should improve first), booking (who books shifts), measure (how they will know it works), owner (who maintains the tool), rules (booking limits; ask only after booking is agreed), info (what volunteer data the tool keeps). Each question offers 2-4 short options and marks one as suggested. Never invent an answer the NGO did not give.
The NGO need: Harbor Community Kitchen, three kitchens, 45 volunteers; coordinators spend four and a half hours a week scheduling by phone and spreadsheet.`;
const parameters = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'The reply the NGO reads. Do not list the questions; they show as cards.' },
    agreed: { type: 'array', items: { type: 'object', properties: { topicId: { type: 'string', enum: TOPICS }, answer: { type: 'string' }, certain: { type: 'boolean' } }, required: ['topicId', 'answer', 'certain'] } },
    questions: { type: 'array', items: { type: 'object', properties: { topicId: { type: 'string', enum: TOPICS }, text: { type: 'string' }, options: { type: 'array', items: { type: 'string' } }, suggested: { type: 'integer' } }, required: ['topicId', 'text', 'options', 'suggested'] } },
    ready: { type: 'boolean' },
  },
  required: ['text', 'agreed', 'questions', 'ready'],
};

async function turn(messages: any[], stream: boolean) {
  const t0 = Date.now();
  const r = await fetch(URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, messages: [{ role: 'system', content: SYSTEM }, ...messages], stream,
      reasoning_effort: 'low', max_tokens: 2000,
      tools: [{ type: 'function', function: { name: 'reply', description: 'Your whole reply plus the brief update.', parameters } }],
      tool_choice: { type: 'function', function: { name: 'reply' } },
      ...(stream ? { stream_options: { include_usage: true } } : {}),
    }),
  });
  if (!r.ok) return { error: `${r.status} ${(await r.text()).slice(0, 300)}` };
  if (!stream) {
    const j: any = await r.json();
    const call = j.choices?.[0]?.message?.tool_calls?.[0];
    return { ms: Date.now() - t0, args: call?.function?.arguments, usage: j.usage, finish: j.choices?.[0]?.finish_reason };
  }
  const reader = r.body!.getReader(); const dec = new TextDecoder(); let buf = ''; let args = ''; let chunks = 0; let firstArgMs = 0; let usage: any;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    for (const line of buf.split('\n').slice(0, -1)) {
      if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
      const ev = JSON.parse(line.slice(6));
      const d = ev.choices?.[0]?.delta?.tool_calls?.[0]?.function?.arguments;
      if (d) { if (!firstArgMs) firstArgMs = Date.now() - t0; args += d; chunks++; }
      if (ev.usage) usage = ev.usage;
    }
    buf = buf.split('\n').slice(-1)[0];
  }
  return { ms: Date.now() - t0, firstArgMs, chunks, args, usage };
}

const out: any[] = [];
const msgs: any[] = [{ role: 'user', content: 'Start Discovery. (The NGO has opened the chat.)' }];
for (let i = 0; i < 3; i++) {
  const res: any = await turn(msgs, i !== 1);
  let parsed: any = null; try { parsed = JSON.parse(res.args ?? 'null'); } catch {}
  out.push({ turn: i + 1, stream: i !== 1, ms: res.ms, firstArgMs: res.firstArgMs, chunks: res.chunks, error: res.error, textFirst: (res.args ?? '').trimStart().startsWith('{"text"'), ok: !!parsed?.text, asked: parsed?.questions?.map((q: any) => q.topicId), agreed: parsed?.agreed?.map((a: any) => a.topicId), usage: res.usage });
  if (!parsed) break;
  const q = parsed.questions?.[0];
  msgs.push({ role: 'assistant', content: null, tool_calls: [{ id: `c${i}`, type: 'function', function: { name: 'reply', arguments: res.args } }] });
  msgs.push({ role: 'tool', tool_call_id: `c${i}`, content: 'recorded' });
  msgs.push({ role: 'user', content: q ? `For "${q.text}": ${q.options[0]}.` : 'Ok.' });
}
writeFileSync('C:/Users/nirdr/AppData/Local/Temp/claude/C--Users-nirdr-Downloads-ai4good/44802c73-47d7-44cd-b178-89b3ea791dc2/scratchpad/proto-brief/bunny-result.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
