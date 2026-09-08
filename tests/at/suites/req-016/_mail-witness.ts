/**
 * THE OUT-OF-BAND SEND WITNESS at the integration tier: the mail catcher's own record, read by the
 * test body.
 *
 * At the loop tier the harness's provider simulator records every send at the seam, and the bodies
 * read that trace. Above loop there is no simulator; the product's SMTP provider sends to the local
 * Mailpit, and Mailpit's store is the record written by something other than the sender. This
 * module reads it. It is a plain reader over the catcher's HTTP API, reached through the same
 * `live-stack.ts` client the auth suite's live adapter uses.
 *
 * IT COUNTS PHYSICAL MESSAGES AND NEVER COLLAPSES DUPLICATES. Two messages carrying one
 * idempotency key are two entries in its result. The whole point of an out-of-band witness is to
 * catch the duplicate send, and a reader that de-duplicated by `Message-ID` on the way in could not
 * see the defect it exists to see. The one identity it keys on is Mailpit's own storage id, which
 * is the identity of a physical message and nothing the sender chose.
 *
 * IT IS SCOPED BY ADDRESS. One integration run shares one catcher, and every world namespaces its
 * recipients' addresses, so a body asks for the messages addressed to ITS world and never sees
 * another world's, or a previous run's, mail.
 */

import { readJson, stackFromEnv, type Stack } from '../../harness/live-stack.ts';

/** One physical message as the catcher holds it, with the headers the notification path stamps. */
export type WitnessedMessage = {
  /** the catcher's own id for this message: the identity of a physical message */
  id: string;
  messageId: string;
  to: string[];
  subject: string;
  body: string;
  /** the delivery's idempotency key, or null when the message was not sent by the notification path */
  key: string | null;
  eventId: string | null;
  recipientId: string | null;
  channel: string | null;
};

type MailpitSummary = { ID?: unknown };

function stripSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/** Header lines up to the first blank line, with folded continuations joined, keyed lower-case. */
function parseHeaders(raw: string): Map<string, string> {
  const headers = new Map<string, string>();
  const end = raw.search(/\r?\n\r?\n/);
  const block = end === -1 ? raw : raw.slice(0, end);
  const unfolded = block.replace(/\r?\n[ \t]+/g, ' ');
  for (const line of unfolded.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    headers.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
  }
  return headers;
}

function bodyOf(raw: string): string {
  const end = raw.search(/\r?\n\r?\n/);
  return end === -1 ? '' : raw.slice(end).replace(/^\r?\n\r?\n/, '');
}

/** `=?utf-8?B?...?=` back to text; anything else is already text. */
function decodeHeader(value: string): string {
  return value.replace(/=\?utf-8\?B\?([A-Za-z0-9+/=]+)\?=/gi, (_match, base64: string) => Buffer.from(base64, 'base64').toString('utf8'));
}

function addressList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .map((part) => /<([^>]+)>/.exec(part)?.[1] ?? part)
    .filter((part) => part.length > 0);
}

/**
 * Every physical message the catcher holds that is addressed to one of these addresses.
 *
 * The catcher is asked per address, with its own search, and answered per message with the raw
 * source, so what comes back is what arrived on the wire. A catcher that does not answer is a
 * refusal, never an empty list: this reader's empty means "the catcher was searched and holds
 * nothing for these addresses" and nothing else.
 */
export async function messagesAddressedTo(addresses: readonly string[], stack: Stack = stackFromEnv()): Promise<WitnessedMessage[]> {
  const base = stripSlash(stack.mailUrl);
  if (!base) throw new Error('the mail witness has no catcher URL to read: the stack reported none');

  const seen = new Set<string>();
  const messages: WitnessedMessage[] = [];
  for (const address of addresses) {
    const search = await readJson(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}&limit=200`);
    if (search.status !== 200) {
      throw new Error(`the mail catcher answered ${search.status} to a search for messages addressed to ${address}`);
    }
    const parsed = JSON.parse(search.text) as { messages?: MailpitSummary[] };
    for (const summary of Array.isArray(parsed.messages) ? parsed.messages : []) {
      const id = String(summary.ID ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const source = await readJson(`${base}/api/v1/message/${encodeURIComponent(id)}/raw`);
      if (source.status !== 200) throw new Error(`the mail catcher answered ${source.status} for the source of message ${id}`);
      const headers = parseHeaders(source.text);
      messages.push({
        id,
        messageId: headers.get('message-id') ?? '',
        to: addressList(headers.get('to') ?? ''),
        subject: decodeHeader(headers.get('subject') ?? ''),
        body: bodyOf(source.text),
        key: headers.get('x-notification-key') ?? null,
        eventId: headers.get('x-notification-event-id') ?? null,
        recipientId: headers.get('x-notification-recipient-id') ?? null,
        channel: headers.get('x-notification-channel') ?? null,
      });
    }
  }
  return messages;
}
