/**
 * THE ONE CLIENT FOR THE RUNNING STACK — shared by the integration adapter and the
 * verify-ai4good drive. Five coordinates (api, db, anon, service role, mail). HTTP to
 * Auth and the edge functions, Mailpit read, SQL, redaction. No provenance. No
 * attestation.
 */

export type Stack = {
  apiUrl: string;
  dbUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  mailUrl: string;
};

/** Field to `AT_SUPABASE_*` name. `childCoordinates` writes through this; `stackFromEnv` reads it. */
export const STACK_ENV = {
  apiUrl: 'AT_SUPABASE_URL',
  dbUrl: 'AT_SUPABASE_DB_URL',
  anonKey: 'AT_SUPABASE_ANON_KEY',
  serviceRoleKey: 'AT_SUPABASE_SERVICE_ROLE_KEY',
  mailUrl: 'AT_SUPABASE_MAIL_URL',
} as const;

const SENSITIVE_KEY = /token|secret|password|apikey|api_key|jwt|nonce|otp|code$/i;
const JWT_SHAPE = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
const SB_KEY_SHAPE = /sb_(publishable|secret)_[A-Za-z0-9_-]+/g;

type HttpAnswer = { status: number; text: string };
type MailpitMessageSummary = { ID?: unknown; Subject?: unknown; To?: unknown };

interface BunSqlClient {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  close(): Promise<void>;
}
type BunSqlCtor = new (url: string) => BunSqlClient;

function stripSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function jsonBody(text: string): Record<string, unknown> {
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export async function readJson(url: string): Promise<HttpAnswer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  return { status: response.status, text: await response.text() };
}

function addressesOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (entry && typeof entry === 'object' ? String((entry as { Address?: unknown }).Address ?? '') : ''))
    .filter((address) => address.length > 0);
}

/** The five `AT_SUPABASE_*` values the runner hands the child. Never recomputed here. */
export function stackFromEnv(): Stack {
  const required = (field: 'apiUrl' | 'dbUrl' | 'anonKey' | 'serviceRoleKey'): string => {
    const name = STACK_ENV[field];
    const value = process.env[name];
    if (typeof value === 'string' && value.length > 0) return value;
    throw new Error(`the child environment is missing ${name}`);
  };
  return {
    apiUrl: required('apiUrl'),
    dbUrl: required('dbUrl'),
    anonKey: required('anonKey'),
    serviceRoleKey: required('serviceRoleKey'),
    mailUrl: process.env[STACK_ENV.mailUrl] ?? '',
  };
}

export async function authPost(
  stack: Stack,
  path: string,
  body: unknown,
  bearer?: string,
): Promise<{ url: string; status: number; json: Record<string, unknown> }> {
  const url = `${stripSlash(stack.apiUrl)}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: stack.anonKey,
      Authorization: `Bearer ${bearer ?? stack.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return { url, status: response.status, json: jsonBody(await response.text()) };
}

export async function functionPost(
  stack: Stack,
  name: string,
  body: unknown,
  bearer: string,
  ip?: string,
): Promise<{ url: string; status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    apikey: stack.anonKey,
    Authorization: `Bearer ${bearer}`,
    'Content-Type': 'application/json',
  };
  if (ip) headers['x-forwarded-for'] = ip;
  const url = `${stripSlash(stack.apiUrl)}/functions/v1/${name}`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { url, status: response.status, json: jsonBody(await response.text()) };
}

/**
 * The Mailpit `/api/v1/info` probe and its refusals. A URL is a string; the catcher is asked
 * what it is, and only an answer that identifies a catcher is accepted.
 */
export async function mailIdentification(stack: Stack): Promise<string> {
  const base = stripSlash(stack.mailUrl);
  if (!base) {
    throw new Error(
      'refusing to build the live mail reader: the stack reported no mail catcher URL, so there is ' +
        'nothing to read.',
    );
  }

  let info: HttpAnswer;
  try {
    info = await readJson(`${base}/api/v1/info`);
  } catch (err) {
    throw new Error(
      `refusing to build the live mail reader: the mail catcher at ${base} did not answer its identification ` +
        `probe (${(err as Error).message}). An endpoint nothing answers is not positive evidence.`,
    );
  }
  if (info.status !== 200) {
    const inbucket = await readJson(`${base}/api/v1/mailbox/probe`).catch(() => ({ status: 0, text: '' }));
    throw new Error(
      `refusing to build the live mail reader: the endpoint at ${base} answered ${info.status} to the Mailpit ` +
        `identification probe and ${inbucket.status} to the Inbucket one, so this harness cannot say what is behind ` +
        'it. The catcher shape is measured on every run rather than remembered, because the Supabase CLI has ' +
        'shipped both and their APIs differ.',
    );
  }

  let identification: { Version?: unknown };
  try {
    identification = JSON.parse(info.text) as { Version?: unknown };
  } catch {
    throw new Error(
      `refusing to build the live mail reader: the endpoint at ${base} answered 200 to the Mailpit ` +
        'identification probe with something that is not JSON, so this harness cannot say what is behind it.',
    );
  }
  const version = typeof identification?.Version === 'string' ? identification.Version.trim() : '';
  if (!version) {
    throw new Error(
      `refusing to build the live mail reader: the endpoint at ${base} answered 200 to the Mailpit ` +
        'identification probe with JSON that carries no string `Version`, which is the field a Mailpit identifies ' +
        'itself with. A 200 from an unidentified endpoint is not positive evidence.',
    );
  }
  return `Mailpit ${version} at ${base}`;
}

export async function mailMessagesFor(
  stack: Stack,
  address: string,
): Promise<{ id: string; to: string[]; subject: string; body: string }[]> {
  const base = stripSlash(stack.mailUrl);
  const search = await readJson(`${base}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}&limit=50`);
  if (search.status !== 200) {
    throw new Error(`the mail catcher answered ${search.status} to a search for messages addressed to ${address}`);
  }
  const parsed = JSON.parse(search.text) as { messages?: MailpitMessageSummary[] };
  const summaries = Array.isArray(parsed.messages) ? parsed.messages : [];
  const messages: { id: string; to: string[]; subject: string; body: string }[] = [];
  for (const summary of summaries) {
    const id = String(summary.ID ?? '');
    if (!id) continue;
    const source = await readJson(`${base}/api/v1/message/${encodeURIComponent(id)}/raw`);
    messages.push({
      id,
      to: addressesOf(summary.To),
      subject: String(summary.Subject ?? ''),
      body: source.status === 200 ? source.text : '',
    });
  }
  return messages;
}

/**
 * The links a raw message carries, in the order they appear. Quoted-printable is decoded in
 * full: soft breaks first (a break can sit in the middle of an escape), then `=XX`, then `&amp;`.
 */
export function verifyLinksIn(raw: string, kind: 'signup' | 'recovery'): string[] {
  const body = raw
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&amp;/g, '&');
  const links: string[] = [];
  for (const match of body.matchAll(/https?:\/\/[^\s"'<>)\]]+/g)) {
    const url = match[0].replace(/[.,;]+$/, '');
    if (!url.includes('/auth/v1/verify')) continue;
    if (!url.includes(`type=${kind}`)) continue;
    links.push(url);
  }
  return links;
}

/** The same read, waited for up to 20 seconds. Sending mail is not synchronous with the request. */
export async function verifyLinksFor(
  stack: Stack,
  address: string,
  kind: 'signup' | 'recovery',
): Promise<string[]> {
  const deadline = Date.now() + 20_000;
  for (;;) {
    const messages = await mailMessagesFor(stack, address);
    const links = messages.flatMap((message) => verifyLinksIn(message.body, kind));
    if (links.length > 0 || Date.now() >= deadline) return links;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

export async function followLink(url: string): Promise<{ status: number; location: string }> {
  const response = await fetch(url, { redirect: 'manual' });
  return { status: response.status, location: response.headers.get('location') ?? '' };
}

export function sqlClient(stack: Stack): BunSqlClient {
  const SQL = (globalThis as { Bun?: { SQL?: BunSqlCtor } }).Bun?.SQL;
  if (!SQL) throw new Error('this runtime has no SQL client (expected bun) — the live adapter reads the stack directly');
  return new SQL(stack.dbUrl);
}

export function redactString(s: string): string {
  return s.replace(JWT_SHAPE, '[REDACTED-JWT]').replace(SB_KEY_SHAPE, '[REDACTED-KEY]');
}

export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? '[REDACTED]' : redactValue(v);
    }
    return out;
  }
  return value;
}

/** A URL with its fragment cut and every query VALUE replaced; parameter names survive. */
export function redactUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = '';
    for (const name of [...u.searchParams.keys()]) u.searchParams.set(name, 'REDACTED');
    return u.toString();
  } catch {
    return '[UNPARSEABLE-URL-REDACTED]';
  }
}
