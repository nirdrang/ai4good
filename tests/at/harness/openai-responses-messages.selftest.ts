import { expect, it } from 'vitest';
import { conversationId, responsesBody } from '../../../supabase/functions/_shared/openai-responses-request.ts';
import { replyTool } from '../../../supabase/functions/_shared/discovery-reply.ts';

const request = (messages: { role: 'user' | 'assistant'; content: string }[]) => ({
  model: 'real-model', maxTokens: 4096, effort: 'low' as const, system: [{ text: 'You run Discovery.', cached: false }],
  messages, tools: [replyTool(['priority', 'booking'])], toolChoice: { type: 'tool' as const, name: 'reply' },
});

it('asks for the forced tool in the instructions and sends auto tool choice without strict mode', () => {
  const body = responsesBody(request([{ role: 'user', content: 'Start.' }]), true, 'real-model', 'low');
  expect(body.tool_choice).toBe('auto');
  expect(body.instructions).toBe('You run Discovery.\n\nAnswer with exactly one call to the reply tool and nothing else.');
  expect(body.tools).toMatchObject([{ type: 'function', name: 'reply', strict: false }]);
  expect(body).toMatchObject({ model: 'real-model', max_output_tokens: 4096, reasoning: { effort: 'low' }, stream: true });
  expect(body.input).toEqual([{ role: 'user', content: 'Start.' }]);
});

it('keeps one conversation id across turns and a different one for another conversation', async () => {
  const first = await conversationId(request([{ role: 'user', content: 'Start.' }]));
  const later = await conversationId(request([{ role: 'user', content: 'Start.' }, { role: 'assistant', content: 'Hi.' }, { role: 'user', content: 'Ok.' }]));
  const other = await conversationId(request([{ role: 'user', content: 'Another project.' }]));
  expect(later).toBe(first);
  expect(other).not.toBe(first);
  expect(first).toMatch(/^[0-9a-f]{32}$/);
});
