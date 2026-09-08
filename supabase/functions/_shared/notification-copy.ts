/**
 * The copy a recipient receives, rendered from a taxonomy row and the producer's payload.
 *
 * One general template. The subject is the event name in words, the body leads with the same
 * words and then carries every string the payload holds, so a value the producer names reaches the
 * recipient's copy rather than sitting in a field nobody renders. Rows whose payload keys the
 * requirement names get their own wording where a general sentence cannot carry the meaning; until
 * then this template carries the value itself.
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

export function renderCopy(row: TaxonomyRow, payload: Record<string, unknown>): Copy {
  const carried = Object.values(payload)
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ');
  const lead = `${eventInWords(row.event)} notification.`;
  return {
    subject: eventInWords(row.event),
    body: carried ? `${lead} ${carried}` : lead,
  };
}
