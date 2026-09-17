import { readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import { readDiscoverySkillsSync } from './discovery-skills.ts';
import { DISCOVERY_SKILLS } from '../../../supabase/functions/_shared/discovery-skills/index.ts';
import { discoverySkillsText } from '../../../supabase/functions/_shared/discovery-skills.ts';

it('loads every skill in file order and keeps the prompt skills bounded', () => {
  const files = readdirSync(new URL('../../../supabase/functions/_shared/discovery-skills/', import.meta.url)).filter((name) => name.endsWith('.md')).sort();
  const skills = readDiscoverySkillsSync();
  expect(skills.length).toBeGreaterThanOrEqual(3);
  expect(skills.map((skill) => skill.name)).toEqual(files.map((name) => name.replace(/\.md$/, '')));
  const text = discoverySkillsText(skills);
  expect(text.match(/^# .+$/gm)).toEqual(skills.map((skill) => `# ${skill.name}`));
  expect(text.length).toBeLessThan(6000);
  expect(text).not.toContain('\u2014');
  expect(DISCOVERY_SKILLS, 'run bun run discovery:skills').toEqual(skills);
});
