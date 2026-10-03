
export const DISCOVERY_STOP_RULE =
  'If the NGO asks to stop, keep unresolved questions in the live brief and invite them to Finish Discovery. Do not generate a closing scope.';
export type DiscoveryNeed = { title: string; description: string | null; urgency: string | null; reference_files: readonly string[] };
export type SystemBlock = { text: string; cached: boolean };
/** The settled transcript as model messages; a turn whose reply was tool-only (empty text) is skipped, because the API refuses an empty assistant message before the last one. */
export function contextMessagesFrom(
  settled: readonly { user_message: string; assistant_message: string | null }[],
): { role: 'user' | 'assistant'; content: string }[] {
  return settled.flatMap((row) => row.assistant_message === '' ? [] : [
    { role: 'user' as const, content: row.user_message },
    { role: 'assistant' as const, content: row.assistant_message! },
  ]);
}
