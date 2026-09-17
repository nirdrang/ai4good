export const DISCOVERY_STREAM_HEADERS = {
  'content-type': 'text/event-stream', 'cache-control': 'no-cache',
  connection: 'keep-alive', 'x-vercel-ai-ui-message-stream': 'v1',
  'access-control-expose-headers': 'x-vercel-ai-ui-message-stream',
};
const part = (value: unknown): string => `data: ${JSON.stringify(value)}\n\n`;
export const start = (messageId: string): string => part({ type: 'start', messageId });
export const textStart = (id: string): string => part({ type: 'text-start', id });
export const textDelta = (id: string, delta: string): string => part({ type: 'text-delta', id, delta });
export const textEnd = (id: string): string => part({ type: 'text-end', id });
export const dataTurn = (payload: unknown): string => part({ type: 'data-turn', data: payload });
export const error = (errorText: string): string => part({ type: 'error', errorText });
export const finish = (): string => part({ type: 'finish' });
export const done = (): string => 'data: [DONE]\n\n';
export function wantsEventStream(acceptHeader: string | null): boolean {
  return (acceptHeader ?? '').split(',').some((entry) => entry.split(';')[0].trim().toLowerCase() === 'text/event-stream');
}
