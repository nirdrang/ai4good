import { expect, it } from 'vitest';
import { requestBody } from '../../../supabase/functions/_shared/openai-compatible-request.ts';
import { replyTool } from '../../../supabase/functions/_shared/discovery-reply.ts';

it('preserves the strict reply schema and asks for the reply tool in the system message', () => {
  const tool = replyTool(['priority', 'booking']);
  const body = requestBody({ model: 'real-model', maxTokens: 4096, effort: 'low', system: [], messages: [],
    tools: [tool], toolChoice: { type: 'tool', name: 'reply' } }, true, 'real-model', 'low');
  expect(body.tools).toEqual([{ type: 'function', function: { name: 'reply', description: tool.description, parameters: tool.input_schema, strict: true } }]);
  expect(body.tool_choice).toBe('auto');
  expect(body.messages).toEqual([{ role: 'system', content: '\n\nAnswer with exactly one call to the reply tool and nothing else.' }]);
  expect(body).toMatchObject({ stream: true, stream_options: { include_usage: true } });
});
