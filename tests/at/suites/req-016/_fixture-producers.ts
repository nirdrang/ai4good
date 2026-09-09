/**
 * The sample payloads the fixture producers supply, shared by both bindings of the suite.
 *
 * This is producer data, not emitter behaviour. A real producer supplies a real reason, a real
 * consent call-to-action, a real instruction; the fixture producer supplies a stated one for every
 * payload key the requirement names, so the payload predicates in `taxonomy.ts` have a value to
 * judge. It lives in the test tree because sample copy in the product would be test data shipped.
 */

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
};

/** The producer's context for one firing: the caller's params plus a sample for every named key. */
export function producerPayload(event: string, params: Record<string, unknown> = {}): Record<string, unknown> {
  const row = TAXONOMY.find((candidate) => candidate.event === event);
  const payload: Record<string, unknown> = { ...params };
  for (const key of row?.payloadKeys ?? []) payload[key] = NAMED_SAMPLES[key] ?? `${event} ${key}`;
  return payload;
}
