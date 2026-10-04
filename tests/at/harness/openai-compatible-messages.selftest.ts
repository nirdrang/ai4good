import { expect, it } from 'vitest';
import { requestBody } from '../../../supabase/functions/_shared/openai-compatible-request.ts';
import { replyTool } from '../../../supabase/functions/_shared/discovery-reply.ts';

it('preserves the strict reply schema and forced tool in the provider request', () => {
  const tool = replyTool(['priority', 'booking']);
  const body = requestBody({ model: 'real-model', maxTokens: 4096, effort: 'low', system: [], messages: [],
    tools: [tool], toolChoice: { type: 'tool', name: 'reply' } }, true, 'real-model', 'low');
  expect(body.tools).toEqual([{ type: 'function', function: { name: 'reply', description: tool.description, parameters: tool.input_schema, strict: true } }]);
  expect(body.tool_choice).toEqual({ type: 'function', function: { name: 'reply' } });
  expect(body).toMatchObject({ stream: true, stream_options: { include_usage: true } });
});
