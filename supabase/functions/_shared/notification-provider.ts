/**
 * The one product module that speaks to a mail provider: `ProviderPort` over SMTP.
 *
 * THIS FILE IS THE DOCUMENTED EXCEPTION to the `_shared` rule that `edge.ts` is the only I/O
 * module. AT-016.01's source oracle asserts that exactly one component holds a send path, and a
 * send path that lived in the test tree would make that assertion count a type mention. So the
 * product owns the sending code, here, and the live acceptance adapter constructs it pointed at the
 * local mail catcher rather than reimplementing it. The file the scan names is the file that sends.
 *
 * WHAT IT READS AND DOES NOT READ. Host, port, sender address and timeout arrive as constructor
 * arguments. Nothing here reads an environment variable at module level, so the pure acceptance
 * program can import it, and nothing here reaches a database. It uses `node:net`, which both the
 * edge runtime and Bun serve, and it type-checks under `tests/at/tsconfig.json`.
 *
 * THE THREE ANSWERS. A final 250 after the message body is `accepted`, and the receipt is the
 * provider's own reply line. A 4xx or 5xx reply to any command is `rejected`, a refusal the
 * provider stated. A timeout, a refused connection or a connection that closes before the reply
 * is `no_ack`: the sender does not know whether the message was taken, and it must not pretend to.
 *
 * THE KEY TRAVELS ON THE MESSAGE. `X-Notification-Key` carries the delivery's idempotency key
 * verbatim, and `Message-ID` carries the same key with the characters a message id cannot hold
 * replaced by dots, so the catcher holds one identity per delivery whichever header a reader
 * chooses.
 */

import { Buffer } from 'node:buffer';
import { createConnection, type Socket } from 'node:net';

import type { OutgoingMessage, ProviderAnswer, ProviderPort } from './notifications.ts';

export type SmtpProviderOptions = {
  host: string;
  port: number;
  /** the envelope and header sender */
  sender: string;
  /** the budget for the whole exchange, after which the answer is `no_ack` */
  timeoutMs: number;
};

type Reply = { code: number; lines: string[] };

/** A refusal the provider stated, as an SMTP reply of class 4 or 5. */
class SmtpRefusal extends Error {
  constructor(
    readonly code: number,
    readonly reply: string,
  ) {
    super(`the SMTP provider answered ${code}: ${reply}`);
    this.name = 'SmtpRefusal';
  }
}

/** One connection, one message. Replies are read one at a time, in the order commands were sent. */
class SmtpSession {
  private buffer = '';
  private readonly waiting: { resolve(reply: Reply): void; reject(err: Error): void }[] = [];
  private failure: Error | null = null;

  constructor(private readonly socket: Socket) {
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      this.buffer += chunk;
      this.drain();
    });
    socket.on('error', (err: Error) => this.fail(err));
    socket.on('close', () => this.fail(new Error('the SMTP connection closed before the reply arrived')));
  }

  fail(err: Error): void {
    if (this.failure) return;
    this.failure = err;
    for (const waiter of this.waiting.splice(0)) waiter.reject(err);
    this.socket.destroy();
  }

  nextReply(): Promise<Reply> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      this.waiting.push({ resolve, reject });
      this.drain();
    });
  }

  async command(line: string): Promise<Reply> {
    if (this.failure) throw this.failure;
    this.socket.write(`${line}\r\n`);
    return this.nextReply();
  }

  close(): void {
    this.socket.end();
    this.socket.destroy();
  }

  private drain(): void {
    while (this.waiting.length > 0) {
      const reply = this.takeReply();
      if (!reply) return;
      this.waiting.shift()?.resolve(reply);
    }
  }

  /** A reply is complete at the first line whose fourth character is a space. */
  private takeReply(): Reply | null {
    const lines: string[] = [];
    let consumed = 0;
    for (;;) {
      const end = this.buffer.indexOf('\r\n', consumed);
      if (end === -1) return null;
      const line = this.buffer.slice(consumed, end);
      consumed = end + 2;
      lines.push(line);
      if (/^\d{3}( |$)/.test(line)) {
        this.buffer = this.buffer.slice(consumed);
        return { code: Number(line.slice(0, 3)), lines };
      }
    }
  }
}

function connect(options: SmtpProviderOptions): Promise<SmtpSession> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: options.host, port: options.port });
    socket.once('error', reject);
    socket.once('connect', () => {
      socket.off('error', reject);
      resolve(new SmtpSession(socket));
    });
  });
}

function expectReply(reply: Reply, ...accepted: number[]): Reply {
  if (accepted.includes(reply.code)) return reply;
  throw new SmtpRefusal(reply.code, reply.lines.join(' '));
}

function encodedHeader(value: string): string {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?utf-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function messageIdFor(key: string): string {
  return `<${key.replace(/[^A-Za-z0-9.-]/g, '.')}@notifications.ai4good.local>`;
}

/** The message as bytes on the wire: CRLF line ends, and a line that starts with a dot is doubled. */
function renderMessage(sender: string, message: OutgoingMessage, date: string): string {
  const headers = [
    `From: <${sender}>`,
    `To: <${message.to}>`,
    `Subject: ${encodedHeader(message.subject)}`,
    `Message-ID: ${messageIdFor(message.key)}`,
    `X-Notification-Key: ${message.key}`,
    `X-Notification-Event-Id: ${message.eventId}`,
    `X-Notification-Recipient-Id: ${message.recipientId}`,
    `X-Notification-Channel: ${message.channel}`,
    `Date: ${date}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
  ];
  const body = message.body
    .split(/\r?\n/)
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');
  return `${headers.join('\r\n')}\r\n\r\n${body}`;
}

async function exchange(session: SmtpSession, options: SmtpProviderOptions, message: OutgoingMessage): Promise<Record<string, unknown>> {
  expectReply(await session.nextReply(), 220);
  expectReply(await session.command('EHLO notifications.ai4good.local'), 250);
  expectReply(await session.command(`MAIL FROM:<${options.sender}>`), 250);
  expectReply(await session.command(`RCPT TO:<${message.to}>`), 250, 251);
  expectReply(await session.command('DATA'), 354);
  const final = expectReply(await session.command(`${renderMessage(options.sender, message, new Date().toUTCString())}\r\n.`), 250);
  session.command('QUIT').catch(() => undefined);
  return { code: final.code, reply: final.lines.join(' '), messageId: messageIdFor(message.key) };
}

async function deliverOverSmtp(options: SmtpProviderOptions, message: OutgoingMessage): Promise<ProviderAnswer> {
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no reply from the SMTP provider within ${options.timeoutMs}ms`)), options.timeoutMs);
  });
  const connecting = connect(options);
  // A connection that opens after the deadline already answered is closed rather than leaked.
  connecting.then(
    (opened) => {
      if (settled) opened.close();
    },
    () => undefined,
  );
  let session: SmtpSession | null = null;
  try {
    session = await Promise.race([connecting, deadline]);
    const receipt = await Promise.race([exchange(session, options, message), deadline]);
    return { outcome: 'accepted', receipt };
  } catch (err) {
    if (err instanceof SmtpRefusal) return { outcome: 'rejected', receipt: { code: err.code, reply: err.reply } };
    return { outcome: 'no_ack', receipt: { error: err instanceof Error ? err.message : String(err) } };
  } finally {
    settled = true;
    if (timer) clearTimeout(timer);
    session?.close();
  }
}

export function createSmtpProvider(options: SmtpProviderOptions): ProviderPort {
  return {
    deliver: (message) => deliverOverSmtp(options, message),
  };
}
