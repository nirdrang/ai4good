import { writeFileSync } from 'node:fs';
import { readDiscoverySkillsSync } from './discovery-skills.ts';

function escapeTemplate(body: string): string {
  return body.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

const skills = readDiscoverySkillsSync();
const entries = skills.map((skill) => `  { name: ${JSON.stringify(skill.name)}, body: \`${escapeTemplate(skill.body)}\` },`).join('\n');
const source = `import type { DiscoverySkill } from '../discovery-skills.ts';

export const DISCOVERY_SKILLS: readonly DiscoverySkill[] = [
${entries}
];
`;
writeFileSync(new URL('../../../supabase/functions/_shared/discovery-skills/index.ts', import.meta.url), source);
