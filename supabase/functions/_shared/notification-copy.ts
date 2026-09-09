/**
 * The copy a recipient receives, rendered from a taxonomy row and the producer's payload.
 *
 * Rows whose payload keys the requirement names have their own wording, so the named meaning
 * reaches the recipient rather than sitting in a field the general sentence never uses. Every
 * other row uses one general template: the subject is the event name in words, and the body
 * carries every string the payload holds.
 *
 * Pure: no I/O, no clock, no Deno, relative imports only.
 */

import type { TaxonomyRow } from './notification-taxonomy.ts';

export type Copy = {
  subject: string;
  body: string;
};

/** `blocker.aging_48h` reads as `Blocker aging 48h`. */
export function eventInWords(event: string): string {
  const words = event.replace(/[._]/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function text(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value : '';
}

const NAMED: Readonly<Record<string, (payload: Record<string, unknown>) => Copy>> = {
  'triage.approved': () => ({
    subject: 'Your project is approved',
    body: 'Your project is approved and is now visible on the marketplace.',
  }),
  'triage.returned_to_scoped': (payload) => ({
    subject: 'Your project was returned to scoped',
    body: `Your project was returned to scoped. ${text(payload, 'reason')}`,
  }),
  'discovery.fit_declined': (payload) => ({
    subject: 'Discovery fit declined',
    body: `${text(payload, 'reshapingSuggestion')} ${text(payload, 'oversightSentence')}`,
  }),
  'discovery.fit_decline_review': (payload) => ({
    subject: 'Discovery decline to review',
    body: `A Discovery decline is ready for review. Cause: ${text(payload, 'declineCause')}.`,
  }),
  'discovery.decline_overturned': () => ({
    subject: 'Discovery has been reopened',
    body: 'The decline was overturned. Discovery is reopened.',
  }),
  'match.created': (payload) => ({
    subject: 'A project match is ready for your consent',
    body: `A project match is ready. ${text(payload, 'consentCta')}`,
  }),
  'match.consented': (payload) => ({
    subject: 'Your match consented',
    body: `The volunteer consented. ${text(payload, 'fundToKickOff')}`,
  }),
  'access.key_revoked': (payload) => ({
    subject: 'Your virtual key was revoked',
    body: `Your virtual key was revoked. ${text(payload, 'replacementOnDashboard')}`,
  }),
  'pm_item.status_auto_reverted': (payload) => ({
    subject: 'A status change was reversed',
    body: `A status change was reversed. ${text(payload, 'whatToDoInstead')}`,
  }),
  'leftover.released': () => ({
    subject: 'Leftover funds released',
    body: 'Leftover funds were released to your general balance.',
  }),
};

export function renderCopy(row: TaxonomyRow, payload: Record<string, unknown>): Copy {
  const named = NAMED[row.event];
  if (named) return named(payload);
  const carried = Object.values(payload)
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ');
  const lead = `${eventInWords(row.event)} notification.`;
  return {
    subject: eventInWords(row.event),
    body: carried ? `${lead} ${carried}` : lead,
  };
}
