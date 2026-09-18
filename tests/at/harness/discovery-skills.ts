import { readdirSync, readFileSync } from 'node:fs';
import type { DiscoverySkill } from '../../../supabase/functions/_shared/discovery-skills.ts';

export function readDiscoverySkillsSync(): DiscoverySkill[] {
  const folder = new URL('../../../supabase/functions/_shared/discovery-skills/', import.meta.url);
  return readdirSync(folder).filter((name) => name.endsWith('.md')).sort().map((name) => ({
    name: name.replace(/\.md$/, ''), body: readFileSync(new URL(name, folder), 'utf8').replace(/\r\n/g, '\n'),
  }));
}
