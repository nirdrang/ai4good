export type DiscoverySkill = { name: string; body: string };

export function discoverySkillsText(skills: readonly DiscoverySkill[]): string {
  return skills.map((skill) => `# ${skill.name}\n${skill.body.trim()}`).join('\n\n');
}
