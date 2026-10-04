import { readFileSync } from 'node:fs';
import { generateConfirmedScope } from '../../../../supabase/functions/_shared/scope.ts';
import { discoveryModelPort } from '../../../../supabase/functions/_shared/discovery-model.ts';
import { DISCOVERY_SKILLS } from '../../../../supabase/functions/_shared/discovery-skills/index.ts';
import { createLiveAdapter as discoveryAdapter } from '../req-004/_live.ts';
export const requirement = 'req-036' as const;
export async function createLiveAdapter(opts: Parameters<typeof discoveryAdapter>[0]) {
  const inner = await discoveryAdapter(opts);
  const port = livePort();
  return { ...inner, sut: { ...inner.sut, scope: {
    generate: (input: Parameters<typeof generateConfirmedScope>[0]) => generateConfirmedScope(input, DISCOVERY_SKILLS, port),
  } } };
}

function livePort() {
  const values = new Map<string, string>();
  for (const line of readFileSync('supabase/functions/.env', 'utf8').split(/\r?\n/)) {
    const match = /^(DISCOVERY_[A-Z_]+|ANTHROPIC_API_KEY)=(.*)$/.exec(line);
    if (match) values.set(match[1], match[2].replace(/^['"]|['"]$/g, ''));
  }
  Object.defineProperty(globalThis, 'Deno', { configurable: true, value: { env: { get: (name: string) => values.get(name) } } });
  return discoveryModelPort();
}
