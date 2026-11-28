import type { ScriptedReply } from '../../../harness/contracts.ts';
import { SCOPE_COPY } from '../../../../../supabase/functions/_shared/scope-copy.ts';
import { parseScope, SCOPE_CAUSE_LABELS_MAX, type Scope } from '../../../../../supabase/functions/_shared/scope.ts';
import { GRANT_TRACKER_ELICITATION } from './grant-tracker.ts';

export const GRANT_TRACKER_SCOPE: Scope = {
  summary: 'A shared list of funder reporting deadlines with email reminders seven days before each due date, used by two staff with no developer.',
  userStories: GRANT_TRACKER_ELICITATION.userStories,
  suggestedStack: ['Supabase', 'email delivery'],
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
};

export const GRANT_TRACKER_SCOPE_REPLY: ScriptedReply = {
  kind: 'tool', name: 'record_scope', input: GRANT_TRACKER_SCOPE,
  text: '', usage: { inputTokens: 1800, outputTokens: 640 },
};

export const VOLUNTEER_ROSTER_SCOPE: Scope = {
  summary: 'A roster of volunteer roles and weekly shift slots. Coordinators post open slots. The tool does not store volunteer names, emails or phone numbers.',
  userStories: [
    { story: 'As a coordinator, I want to post open shifts so volunteers can see where help is needed.',
      acceptanceCriteria: ['A coordinator can add a role, day and time slot to the roster.'] },
    { story: 'As a coordinator, I want to take a filled shift off the roster so the list stays current.',
      acceptanceCriteria: ['A coordinator can mark a shift as filled and it leaves the open list.'] },
  ],
  suggestedStack: ['Supabase'],
  complexity: {
    tier: 'small',
    rationale: 'One roster of roles and time slots, edited by a coordinator.',
    startSmallAdvice: 'Start with the open-shift list, then add filled-shift removal.',
  },
  riskFlags: ['Coordinators must not type volunteer contact details into the roster.'],
  dataSensitivity: {
    tier: 'tier0',
    rationale: 'The roster holds public role names and times. It does not store personal records.',
  },
  maintainabilityFit: {
    verdict: 'fit',
    rationale: 'A coordinator can keep the roster by chat after the volunteer leaves.',
  },
  causeLabels: ['volunteer coordination'],
};

export const CASE_NOTES_SCOPE: Scope = {
  summary: 'A case-notes tool for two case workers to record session notes about clients receiving health support.',
  userStories: [
    { story: 'As a case worker, I want to record a session note so the next worker can continue care.',
      acceptanceCriteria: ['A case worker can add a note to a case and see earlier notes in date order.'] },
    { story: 'As a case worker, I want only case workers on this project to read notes so client health details stay inside the team.',
      acceptanceCriteria: ['A person without the case-worker role cannot open a note.'] },
  ],
  suggestedStack: ['Supabase'],
  complexity: {
    tier: 'medium',
    rationale: 'Notes, role-gated access and a later join to records the organisation holds.',
    startSmallAdvice: 'Start with fixture notes and role-gated access, then connect real records after completion.',
  },
  riskFlags: ['Health notes are special-category personal data.', 'Real records must never enter the build.'],
  dataSensitivity: {
    tier: 'tier2',
    rationale: 'Session notes include health information about named clients.',
  },
  maintainabilityFit: {
    verdict: 'fit',
    rationale: 'Case workers can add notes by chat once the volunteer has set the screens.',
  },
  causeLabels: ['health support'],
};

export type ScopeTierFixture = { title: string; scope: Scope };

export const SCOPE_TIER_FIXTURES: readonly ScopeTierFixture[] = [
  { title: 'Volunteer roster', scope: VOLUNTEER_ROSTER_SCOPE },
  { title: 'Funder reporting deadline tracker', scope: GRANT_TRACKER_SCOPE },
  { title: 'Case notes', scope: CASE_NOTES_SCOPE },
];

export function scopeDocumentProblems(markdown: string, fixture: ScopeTierFixture): string[] {
  const problems: string[] = [];
  const dataCopy = SCOPE_COPY.dataTier[fixture.scope.dataSensitivity.tier];
  if (!markdown.includes(dataCopy)) problems.push('missing data-tier sentence');
  if (fixture.scope.dataSensitivity.tier === 'tier2' && !markdown.includes('synthetic or anonymised fixtures')) {
    problems.push('missing fixtures-only paragraph');
  }
  if (!markdown.includes('This need is ' + fixture.scope.complexity.tier + '.')) {
    problems.push('missing complexity tier word');
  }
  if (!markdown.includes(fixture.scope.complexity.rationale)) problems.push('missing complexity rationale');
  if (!markdown.includes(SCOPE_COPY.startSmall)) problems.push('missing start-small lead');
  if (!markdown.includes(fixture.scope.complexity.startSmallAdvice)) problems.push('missing start-small advice');
  if (fixture.scope.riskFlags.length < 1) problems.push('missing risk flags');
  for (const flag of fixture.scope.riskFlags) {
    if (!markdown.includes(flag)) problems.push('missing risk flag');
  }
  for (const story of fixture.scope.userStories) {
    if (story.acceptanceCriteria.length < 1) problems.push('a user story has no acceptance criteria');
    if (!markdown.includes(story.story)) problems.push('missing user story');
    for (const criterion of story.acceptanceCriteria) {
      if (!markdown.includes(criterion)) problems.push('missing acceptance criterion');
    }
  }
  if (fixture.scope.suggestedStack.length < 1) problems.push('missing suggested stack');
  for (const item of fixture.scope.suggestedStack) {
    if (!markdown.includes(item)) problems.push('missing suggested stack');
  }
  if (markdown.includes('## Lovable recommendation') || markdown.includes('## Build split') || markdown.includes('## Maintenance')) {
    problems.push('lovable recommendation or build split is present');
  }
  if (markdown.includes('lovable.dev/pricing')) problems.push('pricing link present');
  return problems;
}

export function scopeContractProblems(input: unknown): string[] {
  const scope = parseScope(input);
  if (!scope) return ['not a complete scope shape'];
  const problems: string[] = [];
  if (scope.userStories.length < 1) problems.push('missing user stories');
  if (scope.userStories.some((story) => story.acceptanceCriteria.length < 1)) {
    problems.push('a user story has no acceptance criteria');
  }
  if (scope.userStories.some((story) => !story.discoveryTopicId)) {
    problems.push('a user story has no Discovery topic');
  }
  if (scope.suggestedStack.length < 1) problems.push('missing suggested stack');
  if (!scope.complexity.tier || !scope.complexity.rationale || !scope.complexity.startSmallAdvice) {
    problems.push('missing complexity tier, rationale, or start-small advice');
  }
  if (scope.riskFlags.length < 1) problems.push('missing risk flags');
  if (scope.causeLabels.length > SCOPE_CAUSE_LABELS_MAX) problems.push('too many cause labels');
  return problems;
}
