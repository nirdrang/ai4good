import type { ScriptedReply } from '../../../harness/contracts.ts';
import type { Elicitation, IntakeFixture } from '../_contract.ts';
import type { Scope } from '../../../../../supabase/functions/_shared/scope.ts';

export const FOOD_BANK_ELICITATION: Elicitation = {
  complete: true,
  facts: [
    'The tool is a shared list of food items on the shelves.',
    'Two volunteers use the tool from a church hall.',
    'No developer is on staff.',
    'A weekly record of families already served avoids doubling up.',
  ],
  constraints: ['Only two volunteers use the tool.', 'No developer is on staff.', 'Store first names only.'],
  userStories: [
    { story: 'As a volunteer, I want to see which food items are on the shelves so I can pack a bag without guessing.',
      acceptanceCriteria: ['A volunteer can add, change and remove a food item and see the current shelf list.'] },
    { story: 'As one of two volunteers, I want both of us to use the same shelf list so we pack from the same stock.',
      acceptanceCriteria: ['Both volunteers can see and update the same food items.'] },
    { story: 'As a volunteer, I want a weekly record of families already served so we do not double up.',
      acceptanceCriteria: ['A volunteer can add a family first name to this week\'s served list and see it.'] },
    { story: 'As a volunteer with no developer on staff, I want to keep the lists without coding.',
      acceptanceCriteria: ['A volunteer can add and change a food item or a served-family name without a developer.'] },
  ],
  openQuestions: [],
};

export const FOOD_BANK_SCOPE: Scope = {
  summary: 'A shared shelf list of food items and a weekly first-name record of families already served, used by two volunteers with no developer.',
  userStories: FOOD_BANK_ELICITATION.userStories,
  suggestedStack: ['Lovable', 'Supabase'],
  complexity: {
    tier: 'small',
    rationale: 'One shared shelf list and one weekly first-name record for two volunteers.',
    startSmallAdvice: 'Start with the shelf list, then add the weekly served record.',
  },
  riskFlags: ['Volunteers must not type health notes or family surnames into the lists.'],
  dataSensitivity: {
    tier: 'tier1',
    rationale: 'The tool stores first names of families already served this week, together with food item names.',
  },
  maintainabilityFit: {
    verdict: 'fit',
    rationale: 'Two non-technical volunteers can keep the lists by chat after the volunteer builder leaves.',
  },
  causeLabels: ['Food Security'],
  lovableRecommendation: {
    recommended: true,
    rationale: 'The food bank edits the lists by chat and has no developer on staff.',
  },
  buildSplit: {
    lovable: ['Shelf list screens', 'Weekly served-family record'],
    claudeCode: ['A weekly reset of the served-family record'],
  },
};

export const FOOD_BANK_ELICITATION_REPLY: ScriptedReply = {
  kind: 'tool', name: 'record_elicitation', input: FOOD_BANK_ELICITATION,
  text: 'I recorded the shared shelf list and the weekly first-name record. This completes the scoping conversation.',
  usage: { inputTokens: 1600, outputTokens: 80 },
};

export const FOOD_BANK_SCOPE_REPLY: ScriptedReply = {
  kind: 'tool', name: 'record_scope', input: FOOD_BANK_SCOPE,
  text: '', usage: { inputTokens: 1800, outputTokens: 640 },
};

export const FOOD_BANK_THIN_SCOPE_REPLY: ScriptedReply = {
  kind: 'tool', name: 'record_scope', input: { ...FOOD_BANK_SCOPE, causeLabels: [] },
  text: '', usage: { inputTokens: 1800, outputTokens: 640 },
};

export const FOOD_BANK: { intake: IntakeFixture; elicitation: Elicitation } = {
  intake: {
    title: 'Neighbourhood food bank shelf list',
    description: 'We run a small food bank from a church hall. Two volunteers track which food items we have on the shelves and which families we already served this week so we do not double up. We write this on paper today and lose track. We need a shared list of food items and a simple weekly record of families served. We store first names only, no health notes. We have no developer.',
    urgency: 'soon',
  },
  elicitation: FOOD_BANK_ELICITATION,
};
