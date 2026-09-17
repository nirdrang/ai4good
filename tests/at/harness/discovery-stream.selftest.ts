import { expect, it } from 'vitest';
import * as stream from '../../../supabase/functions/_shared/discovery-stream.ts';

it('encodes the UI message stream parts and response headers', () => {
  const parts = [
    [stream.start('message'), { type: 'start', messageId: 'message' }],
    [stream.textStart('text'), { type: 'text-start', id: 'text' }],
    [stream.textDelta('text', 'line\n"two"'), { type: 'text-delta', id: 'text', delta: 'line\n"two"' }],
    [stream.textEnd('text'), { type: 'text-end', id: 'text' }],
    [stream.dataTurn({ ok: true }), { type: 'data-turn', data: { ok: true } }],
    [stream.error('unavailable'), { type: 'error', errorText: 'unavailable' }],
    [stream.finish(), { type: 'finish' }],
  ] as const;
  for (const [line, part] of parts) expect(line).toBe(`data: ${JSON.stringify(part)}\n\n`);
  expect(stream.done()).toBe('data: [DONE]\n\n');
  expect(stream.DISCOVERY_STREAM_HEADERS).toEqual({ 'content-type': 'text/event-stream', 'cache-control': 'no-cache',
    connection: 'keep-alive', 'x-vercel-ai-ui-message-stream': 'v1' });
  expect(stream.wantsEventStream('application/json, text/event-stream; charset=utf-8')).toBe(true);
  expect(stream.wantsEventStream(null)).toBe(false);
  expect(stream.wantsEventStream('application/json')).toBe(false);
  expect(stream.wantsEventStream('text/event-streaming')).toBe(false);
});
