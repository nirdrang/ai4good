export const DISCOVERY_SYSTEM_PROMPT_TEMPLATE = 'Help this NGO clarify its software need. Ask one concise question at a time.';
export type DiscoveryNeed = { title: string; description: string | null; urgency: string | null; reference_files: readonly string[] };
export function discoverySystemPrompt(need: DiscoveryNeed): string {
  return `${DISCOVERY_SYSTEM_PROMPT_TEMPLATE}\n${JSON.stringify(need)}`;
}
