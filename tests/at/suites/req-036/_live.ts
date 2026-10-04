import { createLiveAdapter as discoveryAdapter } from '../req-004/_live.ts';
export const requirement = 'req-036' as const;
export async function createLiveAdapter(opts: Parameters<typeof discoveryAdapter>[0]) {
  const inner = await discoveryAdapter(opts);
  return { ...inner, sut: { ...inner.sut, scope: {} } };
}
