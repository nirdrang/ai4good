import type { ScriptedReply } from '../../../harness/contracts.ts';
import type { Elicitation, IntakeFixture } from '../_contract.ts';

export const GRANT_TRACKER_ELICITATION: Elicitation = {
  complete: true,
  facts: [
    'The tool tracks funder reporting deadlines.',
    'Two staff use the tool.',
    'No developer is on staff.',
    'Reminders go out before each deadline.',
  ],
  constraints: ['Only two staff use the tool.', 'No developer is on staff.'],
  userStories: [
    { story: 'As a staff member, I want to track funder reporting deadlines so we know when reports are due.',
      acceptanceCriteria: ['A staff member can add a funder name and reporting deadline and see it in the deadline list.'] },
    { story: 'As one of two staff, I want both staff to use the same deadline list so we see the same dates.',
      acceptanceCriteria: ['Both staff can see and update the same reporting deadlines.'] },
    { story: 'As a staff member with no developer on staff, I want to maintain the deadline list without coding.',
      acceptanceCriteria: ['A staff member can add and change a deadline without a developer or writing code.'] },
    { story: 'As a staff member, I want reminders before each reporting deadline so we have time to prepare the report.',
      acceptanceCriteria: ['An email reminder reaches both staff seven days before the reporting deadline.'] },
  ],
  openQuestions: [],
};

export const GRANT_TRACKER: {
  intake: IntakeFixture; ngoMessages: string[]; replies: ScriptedReply[];
  source: 'recorded' | 'handwritten'; recordedWith?: { model: string; date: string };
} = {
  intake: {
    title: 'Funder reporting deadline tracker',
    description: 'We are a two-person NGO with no developer on staff. We need a shared list to track funder reporting deadlines. Both staff should add and change funder names and due dates without coding. Email reminders should reach both staff seven days before each deadline so we can prepare reports. The tool stores only funder names, reporting dates and our two staff email addresses. We only need the list and reminders.',
    urgency: 'soon',
  },
  ngoMessages: [
    'We keep missing funder reporting deadlines. Please help us scope the tracker described in our intake.',
    'There are two of us and we both need to see and update the same list.',
    'We write funder names and due dates in a shared list today, but checking it every day is easy to forget.',
    'Please email both of us seven days before a report is due.',
    'We have no developer. We must be able to add and change dates ourselves without coding. Only funder names, reporting dates and our two email addresses are needed.',
    'That is everything. Success means we can both update the list and receive an email seven days before each deadline. Please record this need with just the list and reminders.',
  ],
  replies: [
    { kind: 'text', text: 'Who will use the tracker?', usage: { inputTokens: 900, outputTokens: 24 } },
    { kind: 'text', text: 'How do you track these deadlines today?', usage: { inputTokens: 1000, outputTokens: 28 } },
    { kind: 'text', text: 'When should a reminder reach you?', usage: { inputTokens: 1100, outputTokens: 24 } },
    { kind: 'text', text: 'What information and staff skills should we allow for?', usage: { inputTokens: 1200, outputTokens: 32 } },
    { kind: 'text', text: 'Would a shared list and an email to both staff seven days before each deadline meet the need?', usage: { inputTokens: 1400, outputTokens: 40 } },
    { kind: 'tool', name: 'record_elicitation', input: GRANT_TRACKER_ELICITATION,
      text: 'I recorded your shared deadline list and reminders, with both staff able to keep it up to date. This completes the scoping conversation.',
      usage: { inputTokens: 1600, outputTokens: 420 } },
  ],
  source: 'handwritten',
};
