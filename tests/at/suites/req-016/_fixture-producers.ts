import { TAXONOMY } from './taxonomy.ts';

const NAMED_SAMPLES: Readonly<Record<string, unknown>> = {
  marketplaceVisibility: true,
  reason: 'The scope needs a clearer measurable outcome',
  consentCta: 'Confirm consent',
  fundToKickOff: 'Fund to kick off',
  replacementOnDashboard: 'Find the replacement on your dashboard',
  whatToDoInstead: 'Use the supported status command to continue',
  declineCause: 'ongoing_developer_maintenance',
  reshapingSuggestion: 'Consider reshaping this as a staffer-maintainable intake tool',
  oversightSentence: 'A person reads every decline; if we got it wrong, we will reach out',
  discoveryReopened: true,
  projectId: '11111111-1111-4111-8111-111111111111',
  organizationId: '22222222-2222-4222-8222-222222222222',
  strikes: 3,
  regenerations: 3,
  lastReason: 'The reminder channel is missing from the scope',
};

export function producerPayload(event: string, params: Record<string, unknown> = {}): Record<string, unknown> {
  const row = TAXONOMY.find((candidate) => candidate.event === event);
  const payload: Record<string, unknown> = { ...params };
  for (const key of row?.payloadKeys ?? []) payload[key] = NAMED_SAMPLES[key] ?? `${event} ${key}`;
  return payload;
}
