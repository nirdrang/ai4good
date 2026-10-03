import { readJson, stackFromEnv, type Stack } from '../../harness/live-stack.ts';

export type WitnessedMessage = {
  id: string;
  messageId: string;
  to: string[];
  subject: string;
  body: string;
  key: string | null;
  eventId: string | null;
  recipientId: string | null;
  channel: string | null;
};

type MailpitSummary = { ID?: unknown };

function stripSlash(url: string): string {
  return url.replace(/\/$/, '');
}

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
