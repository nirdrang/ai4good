import type { ScriptedReply } from '../../../harness/contracts.ts';
import { parseScope, SCOPE_CAUSE_LABELS_MAX, type Scope } from '../../../../../supabase/functions/_shared/scope.ts';
import { GRANT_TRACKER_ELICITATION } from './grant-tracker.ts';

export const GRANT_TRACKER_SCOPE: Scope = {
  summary: 'A shared list of funder reporting deadlines with email reminders seven days before each due date, used by two staff with no developer.',
  userStories: GRANT_TRACKER_ELICITATION.userStories,
  suggestedStack: ['Lovable', 'Supabase', 'email delivery'],
  complexity: {
    tier: 'small',
    rationale: 'One shared list and one reminder for two staff.',
    startSmallAdvice: 'Start with the shared deadline list, then add the seven-day email.',
  },
  riskFlags: ['Email delivery must reach both staff.'],
  dataSensitivity: {
    tier: 'tier1',
    rationale: 'The tool stores two staff email addresses together with funder names and reporting dates.',
  },
  maintainabilityFit: {
    verdict: 'fit',
    rationale: 'Two non-technical staff can keep the list by chat after the volunteer leaves.',
  },
  causeLabels: ['grant reporting'],
  lovableRecommendation: {
    recommended: true,
    rationale: 'The NGO edits the list by chat and has no developer on staff.',
  },
  buildSplit: {
    lovable: ['Deadline list screens', 'Staff login and shared records'],
    claudeCode: ['Seven-day reminder email job'],
  },
};

export const GRANT_TRACKER_SCOPE_REPLY: ScriptedReply = {
  kind: 'tool', name: 'record_scope', input: GRANT_TRACKER_SCOPE,
  text: '', usage: { inputTokens: 1800, outputTokens: 640 },
};

export function scopeContractProblems(input: unknown): string[] {
  const scope = parseScope(input);
  if (!scope) return ['not a complete scope shape'];
  const problems: string[] = [];
  if (scope.userStories.length < 1) problems.push('missing user stories');
  if (scope.userStories.some((story) => story.acceptanceCriteria.length < 1)) {
    problems.push('a user story has no acceptance criteria');
  }
  if (scope.suggestedStack.length < 1) problems.push('missing suggested stack');
  if (scope.buildSplit.lovable.length < 1 || scope.buildSplit.claudeCode.length < 1) {
    problems.push('a build-split part is empty');
  }
  if (scope.causeLabels.length > SCOPE_CAUSE_LABELS_MAX) problems.push('too many cause labels');
  return problems;
}
