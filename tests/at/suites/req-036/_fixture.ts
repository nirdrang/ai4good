import { createFixtureAdapter as discoveryAdapter } from '../req-004/_fixture.ts';
import { generateConfirmedScope } from '../../../../supabase/functions/_shared/scope.ts';
import { DISCOVERY_SKILLS } from '../../../../supabase/functions/_shared/discovery-skills/index.ts';
export const requirement = 'req-036' as const;

export function createFixtureAdapter(opts: Parameters<typeof discoveryAdapter>[0]) {
  const inner = discoveryAdapter(opts);
  return { ...inner, sut: { ...inner.sut, scope: {
    generate: (input: Parameters<typeof generateConfirmedScope>[0]) => generateConfirmedScope(input, DISCOVERY_SKILLS, opts.vendors.anthropic),
  } } };
}
