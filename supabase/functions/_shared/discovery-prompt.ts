import type { BriefVersion } from './discovery-brief.ts';

export const DISCOVERY_STOP_RULE =
  'If the NGO asks to stop, keep unresolved questions in the live brief and invite them to Finish Discovery. Do not generate a closing scope.';
export type DiscoveryNeed = { title: string; description: string | null; urgency: string | null };
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

export function currentAnswersText(current: BriefVersion | null): string {
  if (current === null) return '';
  const document = current.document;
  const lines = document.topicOrder.flatMap((id) => {
    const topic = document.topics[id];
    if (!topic) return [];
    const state = topic.state.kind === 'agreed' ? (topic.needsReview ? `needs review (was: ${topic.state.answer})` : topic.state.answer)
      : topic.state.kind === 'not-sure' ? 'not sure' : 'open';
    return [`- ${topic.title}: ${state}`];
  });
  return `\nCurrent answers (these replace anything said earlier in this conversation):\n${lines.join('\n')}`;
}
