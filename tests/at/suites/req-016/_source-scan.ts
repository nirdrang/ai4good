/**
 * REQ-016's SOURCE ARMS: three oracles that read the tree, not the system under test.
 *
 * `senders()` and `Delivery.emittedBy` are both produced by the component under test, so a rogue
 * direct sender could omit itself from the one and stamp the emitter's name on the other. These
 * oracles are the witnesses that are not the subject. They live in their own file, on the precedent
 * of `tests/at/suites/req-001/_source-scan.ts`: the arms run at BOTH tiers, the two bodies live in
 * different files, and a helper imported by both is one statement of each check. The file name
 * starts with an underscore and does not end in `.test.ts`, so `at:check` does not read it.
 *
 * THREE RULES, ONE SHAPE. Each oracle returns a list that the assertion expects to be exactly a
 * known value, and each THROWS rather than returning nothing when it could not read what it claims
 * to have read: a negative from a broken instrument is indistinguishable from a true absence unless
 * the instrument says so.
 *
 *   - `providerClientImporters()`: which components hold a send path or a provider credential.
 *     Exactly one may: the emitter. Files map to components through `NOTIFICATION_COMPONENTS`, the
 *     product's own statement of who owns which paths, and a file nobody declared is reported under
 *     its path, so a new sender is an unexpected entry rather than an invisible one.
 *   - `taxonomySeedProblems()`: where the migration's seeded event names and the product's TAXONOMY
 *     disagree. The wire names exist twice by design, once as the closed set in the database and once
 *     as the decision table in TypeScript; this is what keeps the two equal.
 *   - `strayNotificationWriters()`: any `insert into` one of the three outbox tables that is not
 *     inside `public.emit_notification`, in the migrations or in a product module. The worker updates
 *     rows that exist; only the emitter creates them.
 *
 * WHAT THESE ARE NOT. They are naming oracles over text. A sender that hides its client behind a
 * renamed import escapes the first one, exactly as it escapes any static check. The realistic
 * regression is somebody adding a mail client to a service module because a design asked for it,
 * and that is what these turn into a red in the same run.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TAXONOMY } from '../../../../supabase/functions/_shared/notification-taxonomy.ts';
import { NOTIFICATION_COMPONENTS } from '../../../../supabase/functions/_shared/notifications.ts';

/** The repository root, resolved from THIS file, so the answer never depends on the caller's cwd. */
const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** Where product source lives. Every root must be readable, or the oracle refuses. */
const PRODUCT_ROOTS = ['supabase/functions', 'supabase/migrations', 'src'] as const;

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.sql'];

/** A send path: a call to a provider port, a reference to the port type, or a mail client import. */
const SEND_PATH_PATTERNS: readonly RegExp[] = [
  /\bdeliver\b\s*\(/,
  /\bProviderPort\b/,
  /from\s+['"](?:node:net|node:tls|nodemailer|resend|postmark|@sendgrid\/[a-z-]+|mailgun(?:-js|\.js)?|smtp[a-z-]*)['"]/,
];

/** A provider credential, by the names the hosted providers document for it. */
const CREDENTIAL_PATTERNS: readonly RegExp[] = [
  /\bRESEND_API_KEY\b/,
  /\bSENDGRID_API_KEY\b/,
  /\bPOSTMARK_SERVER_TOKEN\b/,
  /\bMAILGUN_API_KEY\b/,
  /\bSMTP_PASSWORD\b/,
  /\bSMTP_PASS\b/,
];

const OUTBOX_TABLES = ['notification_events', 'notification_deliveries', 'notification_ops_items'] as const;
const OUTBOX_INSERT = new RegExp(`insert\\s+into\\s+public\\.(${OUTBOX_TABLES.join('|')})\\b`, 'gi');
const CLIENT_OUTBOX_INSERT = new RegExp(`\\.from\\(\\s*['"](${OUTBOX_TABLES.join('|')})['"]\\s*\\)\\s*\\.(?:insert|upsert)\\b`, 'g');

type SourceFile = { path: string; text: string };

/** Every source file under a root, recursively, with its path relative to the repository root. */
function sourceFilesUnder(root: string): SourceFile[] {
  const found: SourceFile[] = [];
  const walk = (dir: string, relative: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules') continue;
      const full = join(dir, name);
      const rel = `${relative}${name}`;
      if (statSync(full).isDirectory()) {
        walk(full, `${rel}/`);
      } else if (SOURCE_EXTENSIONS.some((extension) => name.endsWith(extension))) {
        found.push({ path: rel, text: readFileSync(full, 'utf8') });
      }
    }
  };
  walk(join(REPO_ROOT, root), `${root}/`);
  return found;
}

function productFiles(oracle: string): SourceFile[] {
  const files: SourceFile[] = [];
  for (const root of PRODUCT_ROOTS) {
    try {
      files.push(...sourceFilesUnder(root));
    } catch (error) {
      throw new Error(
        `${oracle} could not read ${root}/ under ${REPO_ROOT}. The absence it would report would be the instrument's, ` +
          `not the product's: ${(error as Error).message}`,
      );
    }
  }
  if (files.length === 0) {
    throw new Error(`${oracle} found no product source under ${PRODUCT_ROOTS.join(', ')}, which no checkout of this tree is. Refusing to report an absence.`);
  }
  return files;
}

/** The component that owns a path, by the product's own declaration, or a path-derived id. */
function componentOf(path: string): string {
  for (const [component, prefixes] of Object.entries(NOTIFICATION_COMPONENTS)) {
    if (prefixes.some((prefix) => path === prefix || path.startsWith(prefix))) return component;
  }
  return `undeclared:${path}`;
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

/**
 * Components whose SOURCE holds a send path or a provider credential.
 *
 * The assertion both AT-016.01 bodies make is that this is exactly `['notifications.emitter']`. The
 * oracle throws when it finds NO hit at all: the product provider module exists and sends, so an
 * empty answer means the instrument stopped seeing, not that the tree stopped sending.
 */
export function providerClientImporters(): string[] {
  const components = new Set<string>();
  for (const file of productFiles('providerClientImporters')) {
    const hit = [...SEND_PATH_PATTERNS, ...CREDENTIAL_PATTERNS].some((pattern) => pattern.test(file.text));
    if (hit) components.add(componentOf(file.path));
  }
  if (components.size === 0) {
    throw new Error(
      'providerClientImporters found no send path anywhere in the product tree, while the product provider module ' +
        'exists and sends. The instrument stopped seeing; refusing to report an absence.',
    );
  }
  return [...components].sort();
}

/** The event names the migration seeds into `public.notification_event_types`, in seed order. */
function seededEventNames(): { file: string; names: string[] } {
  const migrations = productFiles('taxonomySeedProblems').filter((file) => file.path.startsWith('supabase/migrations/'));
  for (const file of migrations) {
    const seed = /insert\s+into\s+public\.notification_event_types\s*\(\s*event\s*\)\s*values\s*([^;]+);/i.exec(file.text);
    if (!seed) continue;
    const names = [...seed[1].matchAll(/\(\s*'([^']+)'\s*\)/g)].map((match) => match[1]);
    return { file: file.path, names };
  }
  throw new Error(
    'taxonomySeedProblems found no migration that seeds public.notification_event_types, so there is no seed to compare ' +
      'the product taxonomy against. Refusing to report agreement.',
  );
}

/** Where the migration's seeded event names and the product's TAXONOMY disagree. Empty is the assertion. */
export function taxonomySeedProblems(): string[] {
  const { file, names } = seededEventNames();
  const problems: string[] = [];
  if (names.length === 0) {
    throw new Error(`taxonomySeedProblems parsed zero names out of the seed in ${file}. Refusing to report agreement.`);
  }
  const seeded = new Set(names);
  const declared = new Set(TAXONOMY.map((row) => row.event));
  for (const name of names) {
    if (names.indexOf(name) !== names.lastIndexOf(name)) problems.push(`${file} seeds ${name} more than once`);
  }
  for (const name of seeded) {
    if (!declared.has(name)) problems.push(`${file} seeds ${name}, which the product taxonomy does not declare`);
  }
  for (const name of declared) {
    if (!seeded.has(name)) problems.push(`the product taxonomy declares ${name}, which ${file} does not seed`);
  }
  return [...new Set(problems)].sort();
}

/** The character span of `create function public.emit_notification(...)` up to the end of its body. */
function emitterSpan(text: string): { start: number; end: number } | null {
  const head = /create\s+function\s+public\.emit_notification\s*\(/i.exec(text);
  if (!head) return null;
  const open = text.indexOf('$$', head.index);
  if (open === -1) return null;
  const close = text.indexOf('$$', open + 2);
  if (close === -1) return null;
  return { start: head.index, end: close + 2 };
}

/**
 * Every writer of the outbox tables that is not the emitter. Empty is the assertion.
 *
 * In the migrations an `insert into` one of the three tables is allowed only inside the body of
 * `public.emit_notification`. In product modules it is never allowed, whether as SQL text or as a
 * client insert. The oracle throws when no migration defines the emitter, because a rule about
 * "outside the emitter" measured against a tree with no emitter is a rule about nothing.
 */
export function strayNotificationWriters(): string[] {
  const files = productFiles('strayNotificationWriters');
  const problems: string[] = [];
  let emitterDefined = false;

  for (const file of files) {
    if (file.path.startsWith('supabase/migrations/')) {
      const span = emitterSpan(file.text);
      if (span) emitterDefined = true;
      for (const match of file.text.matchAll(OUTBOX_INSERT)) {
        const inside = span !== null && match.index >= span.start && match.index < span.end;
        if (!inside) {
          problems.push(`${file.path}:${lineOf(file.text, match.index)} inserts into public.${match[1]} outside public.emit_notification`);
        }
      }
      continue;
    }
    for (const match of file.text.matchAll(OUTBOX_INSERT)) {
      problems.push(`${file.path}:${lineOf(file.text, match.index)} inserts into public.${match[1]} from a product module`);
    }
    for (const match of file.text.matchAll(CLIENT_OUTBOX_INSERT)) {
      problems.push(`${file.path}:${lineOf(file.text, match.index)} writes ${match[1]} through a client insert`);
    }
  }

  if (!emitterDefined) {
    throw new Error(
      'strayNotificationWriters found no migration defining public.emit_notification, so "outside the emitter" names ' +
        'nothing. Refusing to report an absence.',
    );
  }
  return problems.sort();
}
