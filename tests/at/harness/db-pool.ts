/**
 * The local database slot pool — a small number of standing Supabase stacks ("slots") so that
 * several items can verify at the same time without resetting each other's database.
 *
 * THE SHAPE, as ruled:
 *
 *   - Two standing slots. Concurrency is the pool size; a full pool REJECTS the next
 *     database-needing item at start rather than queueing it.
 *   - The stack on the 54321 block is the founder's personal stack. It is OUTSIDE the pool and
 *     untouchable, and `personalBlockProblems` below makes that a check in code rather than a
 *     convention: no slot may carry the repo's project id, a port in 54320–54329, or inspector
 *     port 8083, and the check runs before anything destructive, every time.
 *   - One claim file per slot, two states, three owners: the coordinator RESERVES a slot when an
 *     item starts, the harness runner OCCUPIES it for each verify window, the coordinator
 *     RELEASES the reservation at the item sweep.
 *   - STATE IS NEVER INHERITED. The first act of every occupancy is to copy the item tree's own
 *     `supabase/` directory into the slot and reset the database from it. The previous holder is
 *     never trusted, including a crashed one.
 *   - IDENTITY IS PERMANENT, EVERYTHING ELSE IS DATA. A slot permanently owns its project id and
 *     its port block; every other setting comes from the item tree's own `config.toml` on every
 *     occupancy, because auth flags and seed paths change per item and a stack started with a
 *     stale one would grade the wrong behaviour.
 *
 * WHY THE CONFIG IS REGENERATED RATHER THAN COPIED OR FROZEN: a frozen slot config drifts from
 * the item tree, and a copied one carries the personal stack's identity straight into the slot.
 * Regeneration takes the item tree's file verbatim and overlays ONLY the identity fields, so a
 * slot is always the item's own configuration wearing the slot's identity.
 *
 * WHY THIS FILE OWNS ALL THE TOML: the PowerShell helpers in `loop/work/db-slots.ps1` do file
 * operations only — reserve, release, list. If both sides generated configs, the overlay rule
 * could fork, and two rules for one identity is how a slot ends up on a personal port.
 *
 * The import of `runner.ts` is deliberate and the cycle it forms with the runner's own import of
 * this file is safe: neither module calls the other at module scope, and both sides export
 * hoisted function declarations.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

import { REPO_ROOT } from './check.ts';
import {
  acquireStackLock,
  childEnv,
  diagnostic,
  localStackProblems,
  parseStackStatus,
  proveMigrationsReplayed,
  readLocalConfig,
  readStackStatus,
  resetLocalDatabase,
  runSupabaseCli,
  stackLockPath,
  waitForReady,
  type CliResult,
  type CliTarget,
  type Holder,
  type LocalConfig,
  type MigrationProof,
  type SlotIdentityProof,
  type StackLock,
  type StackStatus,
} from './runner.ts';

/** Ruled: two standing slots. Concurrency IS the pool size. */
export const POOL_SIZE = 2;

/** The founder's personal stack. Nothing in the pool may carry any of these. */
const PERSONAL_PORT_LOW = 54320;
const PERSONAL_PORT_HIGH = 54329;
const PERSONAL_INSPECTOR_PORT = 8083;

/** The band a port must sit in for the slot overlay to know how to move it. */
const MAPPABLE_PORT_LOW = 54000;
const MAPPABLE_PORT_HIGH = 54999;

/* ------------------------------------------------------------------------------ pool locations */

/**
 * The pool lives beside the locks it cooperates with and OUTSIDE every worktree: a slot outlives
 * the item that used it, and a directory inside a worktree dies with the worktree.
 *
 * `AT_DB_POOL_ROOT` overrides it for the selftests, the same pattern as `AT_REPO_ROOT`.
 */
export function poolRoot(): string {
  const override = process.env.AT_DB_POOL_ROOT?.trim();
  const dir = override
    ? override
    : join(process.env.LOCALAPPDATA ?? process.env.XDG_CACHE_HOME ?? tmpdir(), 'ai4good-build', 'db-slots');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Slot numbers are 1..POOL_SIZE. Anything else is a caller error, named rather than clamped. */
export function assertSlotNumber(slot: number): number {
  if (!Number.isInteger(slot) || slot < 1 || slot > POOL_SIZE) {
    throw new Error(`"${slot}" is not a slot in this pool — the slots are 1 to ${POOL_SIZE}`);
  }
  return slot;
}

/** The directory that CONTAINS the slot's `supabase/` project folder — what `--workdir` names. */
export function slotDir(slot: number): string {
  return join(poolRoot(), `slot-${assertSlotNumber(slot)}`);
}

export function slotConfigPath(slot: number): string {
  return join(slotDir(slot), 'supabase', 'config.toml');
}

/** Written only after a successful start; see `prepare`. */
export function slotMarkerPath(slot: number): string {
  return join(slotDir(slot), '.last-start.json');
}

export function reservationPath(slot: number): string {
  return join(poolRoot(), 'reservations', `slot-${assertSlotNumber(slot)}.json`);
}

/** A distinct project id is what gives a slot distinct Docker containers and volumes. */
export function slotProjectId(slot: number): string {
  return `ai4good-slot-${assertSlotNumber(slot)}`;
}

/**
 * A slot's PERMANENT identity, used for one purpose: naming the occupancy claim file (ruling T6).
 *
 * The runner's claim path is built from a project id and an api port, and for a repository stack
 * both are permanent. A SLOT's ports are not: `prepare` lawfully rewrites them from the item
 * tree's own config on every occupancy, so two runs bracketing a port change would hold two
 * DIFFERENT claim files for one slot and neither would see the other. The claim therefore keys on
 * the slot's project id — which never changes — and on a fixed sentinel in place of the port.
 *
 * The sentinel is 0, which is not a port. It only has to be constant. The PowerShell helper globs
 * `at-verify-ai4good-slot-N-*.lock`, so it matches this and every earlier name unchanged.
 */
export function slotClaimKey(slot: number): LocalConfig {
  return { projectId: slotProjectId(slot), apiPort: 0, dbPort: 0 };
}

/* --------------------------------------------------------------------------- config.toml scan */

interface ConfigEntry {
  line: number;
  section: string;
  key: string;
  value: string;
}

/**
 * Every ACTIVE `key = value` in the file, with the section it sits in. Commented lines are not
 * settings and are skipped — which is the whole reason the scan is section-aware rather than a
 * set of regular expressions over the file: `port` appears in nine places and most of them are
 * examples in comments.
 *
 * Multi-line array values are not read as one value. Nothing in this repo's config uses one, and
 * a value this scanner cannot see is a value it never rewrites, so the failure mode is a config
 * that is copied verbatim rather than one that is silently mis-edited.
 */
export function scanConfig(text: string): ConfigEntry[] {
  const entries: ConfigEntry[] = [];
  let section = '';
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (line.startsWith('#') || line === '') continue;
    const header = /^\[([^\]]+)\]/.exec(line);
    if (header) {
      section = header[1];
      continue;
    }
    const setting = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (setting) entries.push({ line: index, section, key: setting[1], value: setting[2].trim() });
  }
  return entries;
}

function isPortKey(key: string): boolean {
  return key === 'port' || key.endsWith('_port');
}

/**
 * A PORT VALUE, PARSED WHOLE (audit ruling A5).
 *
 * The rule is the ENTIRE value token, never a prefix of it. TOML writes an integer with optional
 * underscores between digits, so `54_321` is a perfectly ordinary way to write a personal-block
 * port — and a prefix parse reads it as `54`, which is in no band anybody checks. That is a hole
 * in the wall's own guard, so the whole token must be an integer or this returns `null` and the
 * caller treats the value as a PROBLEM.
 *
 * A trailing `# comment` is not part of the value and is dropped before the token is judged;
 * anything else left beside the digits — quotes, an `env()` call, a second number — fails.
 */
function portValue(raw: string): number | null {
  const token = raw.split('#')[0].trim();
  if (!/^\d(?:_?\d)*$/.test(token)) return null;
  return Number(token.replace(/_/g, ''));
}

/**
 * THE LOCAL STACK'S OWN LISTENER PORTS — the only ports a slot's identity moves (ruling E4).
 *
 * A `config.toml` holds two kinds of port. A LISTENER port is a socket this machine opens for
 * this stack, so two stacks that share one collide, and the overlay must move it. A CLIENT port
 * is part of an address of somebody else's service — `[auth.email.smtp] port = 587` is Postmark's
 * port, not ours — so it is DATA, and moving it or refusing it would break a slot that is
 * configured exactly like the tree it grades.
 *
 * The list is exact section + key pairs, so `[api] port` moves while `[api.tls] port` (were one
 * added) does not silently inherit the rule.
 */
const LISTENER_PORTS: readonly { section: string; key: string }[] = [
  { section: 'api', key: 'port' },
  { section: 'db', key: 'port' },
  { section: 'db', key: 'shadow_port' },
  { section: 'db.pooler', key: 'port' },
  { section: 'studio', key: 'port' },
  { section: 'local_smtp', key: 'port' },
  { section: 'local_smtp', key: 'smtp_port' },
  { section: 'local_smtp', key: 'pop3_port' },
  { section: 'analytics', key: 'port' },
  { section: 'edge_runtime', key: 'inspector_port' },
];

function isListenerPort(section: string, key: string): boolean {
  return LISTENER_PORTS.some((listener) => listener.section === section && listener.key === key);
}

export interface PortMapping {
  section: string;
  key: string;
  line: number;
  from: number;
  to: number;
}

/**
 * The identity overlay's port rule (ruling E4).
 *
 *   - a LISTENER port (see `LISTENER_PORTS`) in 54000–54999 moves by 1000 per slot;
 *     `edge_runtime.inspector_port` set to EXACTLY 8083 moves by 10 per slot, because the ruled
 *     inspector value is 8083 and it is not in that band. Any OTHER inspector value falls to the
 *     generic rule below, so it maps when it is in band and refuses when it is not — a +10 applied
 *     to a value nobody ruled is a guess, and D2 forbids guesses.
 *   - a listener port outside those bands REFUSES loudly as unmappable. A guess here is a port
 *     collision with software nobody in this process knows about, so a person decides.
 *   - any OTHER port-valued key passes through unchanged: it addresses somebody else's service and
 *     is data, not identity.
 *   - except that a non-listener port sitting in 54000–54999 also REFUSES. It looks exactly like a
 *     local stack port and this rule does not recognise it, and treating an unrecognised local port
 *     as data would hand two slots the same socket. Fail closed, and a person decides.
 *
 * `personalBlockProblems` stays broad over EVERY port key regardless of this rule, so a port in the
 * founder's own block can never reach a slot by being classified as data.
 */
export function portMappings(text: string, slot: number): { mappings: PortMapping[]; problems: string[] } {
  assertSlotNumber(slot);
  const mappings: PortMapping[] = [];
  const problems: string[] = [];

  for (const entry of scanConfig(text)) {
    if (!isPortKey(entry.key)) continue;
    // WHOLE TOKEN, never a prefix (ruling A5): `54_321` is 54321 here, not 54.
    const parsed = portValue(entry.value);
    const from = parsed ?? NaN;
    const listener = isListenerPort(entry.section, entry.key);

    if (!listener) {
      if (Number.isFinite(from) && from >= MAPPABLE_PORT_LOW && from <= MAPPABLE_PORT_HIGH) {
        problems.push(
          `[${entry.section}] ${entry.key} = ${from} is not a listener port this rule knows, but it sits in the local ` +
            `stack's band ${MAPPABLE_PORT_LOW}–${MAPPABLE_PORT_HIGH} — decide by hand whether the slot moves it`,
        );
      }
      continue; // a client-connection port is data and travels unchanged
    }

    if (parsed === null) {
      problems.push(`[${entry.section}] ${entry.key} = ${entry.value} is not a plain port number, so the slot overlay cannot move it`);
      continue;
    }
    if (entry.section === 'edge_runtime' && entry.key === 'inspector_port' && from === PERSONAL_INSPECTOR_PORT) {
      mappings.push({ section: entry.section, key: entry.key, line: entry.line, from, to: from + slot * 10 });
      continue;
    }
    if (from >= MAPPABLE_PORT_LOW && from <= MAPPABLE_PORT_HIGH) {
      mappings.push({ section: entry.section, key: entry.key, line: entry.line, from, to: from + slot * 1000 });
      continue;
    }
    problems.push(
      `[${entry.section}] ${entry.key} = ${from} is outside ${MAPPABLE_PORT_LOW}–${MAPPABLE_PORT_HIGH}, so the slot ` +
        `overlay does not know where to move it — decide the slot's port for this setting by hand`,
    );
  }

  return { mappings, problems };
}

/**
 * The item tree's own config, wearing the slot's identity. Everything that is not an identity
 * field is returned byte for byte, including comments, blank lines and line endings — a
 * regenerated config differing anywhere else would mean the slot grades different behaviour from
 * the tree that asked for the run.
 */
export function generateSlotConfig(sourceText: string, slot: number): string {
  assertSlotNumber(slot);
  const { mappings, problems } = portMappings(sourceText, slot);
  if (problems.length) {
    throw new Error(`the slot ${slot} config cannot be generated from this supabase/config.toml — ${problems.join('; ')}`);
  }

  const projectIdEntry = scanConfig(sourceText).find((entry) => entry.section === '' && entry.key === 'project_id');
  if (!projectIdEntry) throw new Error('supabase/config.toml carries no top-level project_id, so a slot identity cannot be built from it');

  const lines = sourceText.split('\n');
  lines[projectIdEntry.line] = lines[projectIdEntry.line].replace(/^(\s*project_id\s*=\s*)"[^"]*"/, `$1"${slotProjectId(slot)}"`);
  for (const mapping of mappings) {
    // The digits AND any TOML underscores between them, so a value written `54_321` is replaced
    // whole. Replacing only the leading digits would leave the tail of the old value behind.
    const pattern = new RegExp(`^(\\s*${mapping.key}\\s*=\\s*)\\d(?:_?\\d)*`);
    lines[mapping.line] = lines[mapping.line].replace(pattern, `$1${mapping.to}`);
  }
  return lines.join('\n');
}

/* ------------------------------------------------------- the personal stack, refused in code */

/**
 * The "untouchable" ruling as an executable guard. Called before every destructive act and before
 * any env is emitted, because a convention that is only written down is one a later change can
 * step over without noticing.
 *
 * It scans EVERY active port-valued key, not a fixed list: the danger is a port in the personal
 * block reaching a slot, and it does not matter which setting carried it there.
 */
export function personalBlockProblems(slotConfigText: string, personalProjectId: string): string[] {
  const problems: string[] = [];
  const entries = scanConfig(slotConfigText);

  const projectId = entries.find((entry) => entry.section === '' && entry.key === 'project_id');
  const value = /^"([^"]*)"/.exec(projectId?.value ?? '')?.[1] ?? '';
  if (!value) problems.push('the slot config carries no project_id, so it cannot be told apart from the personal stack');
  else if (value === personalProjectId) problems.push(`the slot config carries the personal stack's project id "${personalProjectId}"`);

  for (const entry of entries) {
    if (!isPortKey(entry.key)) continue;
    // WHOLE TOKEN, AND AN UNPARSEABLE VALUE IS A PROBLEM (audit ruling A5). Two fail-opens sat
    // here: a prefix parse read `54_321` — a legal TOML spelling of a personal-block port — as
    // 54, and a value that did not parse at all was skipped in silence. A port this guard cannot
    // read cannot be shown to be outside the founder's block, so it refuses, named with its value.
    const port = portValue(entry.value);
    if (port === null) {
      problems.push(
        `[${entry.section}] ${entry.key} = ${entry.value} is not a plain port number, so it cannot be shown to be ` +
          `outside the personal stack's port block ${PERSONAL_PORT_LOW}–${PERSONAL_PORT_HIGH}`,
      );
      continue;
    }
    if (port >= PERSONAL_PORT_LOW && port <= PERSONAL_PORT_HIGH) {
      problems.push(`[${entry.section}] ${entry.key} = ${port} is inside the personal stack's port block ${PERSONAL_PORT_LOW}–${PERSONAL_PORT_HIGH}`);
    }
    if (entry.key === 'inspector_port' && port === PERSONAL_INSPECTOR_PORT) {
      problems.push(`[${entry.section}] inspector_port = ${port} is the personal stack's inspector port`);
    }
  }

  return problems;
}

/** The identity the pool must never wear. Read from the item tree, never hard-coded. */
export function personalProjectId(itemRoot: string = REPO_ROOT): string {
  return readLocalConfig(itemRoot).projectId;
}

function refusePersonal(slotConfigText: string, itemRoot: string, act: string): void {
  const problems = personalBlockProblems(slotConfigText, personalProjectId(itemRoot));
  if (problems.length) {
    throw new Error(
      `refusing to ${act}: this configuration is not provably outside the founder's personal stack. ` +
        `Failed checks: ${problems.join('; ')}. The personal stack is untouchable, so nothing was done.`,
    );
  }
}

/**
 * The same guard, over a slot's config AS IT SITS ON DISK (rulings T7 and F1).
 *
 * `occupy` and `prepare` run the guard over text they hold in hand. The other three entry points —
 * reset, stop and the env emitter — are exported and reachable directly, so each runs the guard
 * for itself over the file. A guard that only the usual caller runs is a convention, not a guard.
 */
function refusePersonalSlotConfig(slot: number, itemRoot: string, act: string): void {
  const configPath = slotConfigPath(slot);
  if (!existsSync(configPath)) {
    throw new Error(
      `refusing to ${act} slot ${slot}: it has no config at ${configPath}, so it cannot be shown to be outside the ` +
        `founder's personal stack. Run \`bun tests/at/harness/db-pool.ts setup\`. Nothing was done.`,
    );
  }
  refusePersonal(readFileSync(configPath, 'utf8'), itemRoot, `${act} slot ${slot}`);
}

/* ------------------------------------------------------------------------- the path closure */

/** Config settings whose value names a file or directory the stack has to be able to read. */
const PATH_KEYS = new Set([
  'sql_paths',
  'schema_paths',
  'content_path',
  'cert_path',
  'key_path',
  'signing_keys_path',
  'objects_path',
  'declarative_schema_path',
]);

function stringValues(raw: string): string[] {
  const array = /^\[(.*)\]$/.exec(raw);
  const body = array ? array[1] : raw;
  return [...body.matchAll(/"([^"]*)"/g)].map((match) => match[1]).filter((value) => value.trim() !== '');
}

/**
 * Fail closed on what the config asks for but the mirror cannot deliver.
 *
 * `prepare` mirrors the item tree's whole `supabase/` directory into the slot, so every path
 * UNDER that directory is provided exactly as the item tree has it — present if present, absent
 * if absent. A configured path that is absent in the item tree is therefore not a problem: the
 * slot is then in the same state the repo-configured stack would be in, which is the state the
 * item asked for. (`[db.seed] sql_paths = ["./seed.sql"]` with no `seed.sql` in the tree is
 * exactly today's arrangement on the personal stack.)
 *
 * A path that points OUTSIDE `supabase/` is a different thing: the mirror cannot deliver it, so
 * the slot would start half-provisioned and grade against a file it does not have. That refuses
 * loudly and a person decides. The same applies to the two directories the mirror EXCLUDES
 * (`MIRROR_EXCLUSIONS`): a config that names a file inside the CLI's own runtime state is naming
 * something the slot will not have, so the closure stays honest about the exclusions.
 *
 * A VALUE THIS SCANNER CANNOT SEE REFUSES rather than passing. `scanConfig` reads one line per
 * setting, so a multi-line array — `sql_paths = [` on its own line — yields the value `[` and no
 * paths at all. For the OVERLAY an invisible value is harmless: it is copied verbatim. For the
 * CLOSURE it is a missed refusal, which is the failure this function exists to prevent.
 */
export function pathClosureProblems(configText: string, itemRoot: string): string[] {
  const problems: string[] = [];
  const base = resolve(join(itemRoot, 'supabase'));

  for (const entry of scanConfig(configText)) {
    if (!PATH_KEYS.has(entry.key)) continue;
    if (entry.value.startsWith('[') && !entry.value.includes(']')) {
      problems.push(
        `[${entry.section}] ${entry.key} opens an array that does not close on the same line, so this check ` +
          `cannot see the paths it names — write the value on one line (${entry.key} = ["./a.sql", "./b.sql"]) ` +
          `and run this again`,
      );
      continue;
    }
    for (const value of stringValues(entry.value)) {
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
        problems.push(`[${entry.section}] ${entry.key} names "${value}", which is a URL rather than a file the slot can be given`);
        continue;
      }
      if (isAbsolute(value)) {
        problems.push(`[${entry.section}] ${entry.key} names the absolute path "${value}", which the slot mirror cannot reproduce`);
        continue;
      }
      const target = resolve(base, value);
      const inside = relative(base, target);
      if (inside.startsWith('..')) {
        problems.push(
          `[${entry.section}] ${entry.key} names "${value}", which is outside supabase/ — the slot mirror copies supabase/ ` +
            `and nothing else, so this file would be missing from the slot`,
        );
        continue;
      }
      const first = inside.split(/[\\/]/)[0];
      if (MIRROR_EXCLUSIONS.includes(first)) {
        problems.push(
          `[${entry.section}] ${entry.key} names "${value}", which resolves into supabase/${first} — the slot mirror ` +
            `deliberately does not copy that directory (it is the CLI's own runtime state about another stack), so ` +
            `this file would be missing from the slot`,
        );
      }
    }
  }

  return problems;
}

/* -------------------------------------------------------------------------------- the mirror */

/**
 * What the mirror does NOT carry into a slot (rulings T3, F3 and T11). Top-level entries of
 * `supabase/` only, so the list cannot quietly grow into a filter on file names.
 *
 *   - `.temp` and `.branches` are the CLI's OWN RUNTIME STATE, not project source. `.temp` holds
 *     the CLI's record of the stack it last ran — the founder's personal one — and `.gitignore`
 *     itself says its `start-secrets/**` "must NEVER be committed". Copying it carries another
 *     stack's identity residue and its secrets into every slot.
 *   - `config.toml` is the slot's IDENTITY, and the item tree's copy carries the personal
 *     identity. Excluding it means no slot config ever holds that identity, not even for the
 *     instant between the mirror and the regenerated write — and a crash in that instant leaves
 *     NO config rather than a personal one.
 */
export const MIRROR_EXCLUSIONS: readonly string[] = ['.temp', '.branches', 'config.toml'];

/**
 * Every symlink under a directory tree. A pre-copy scan, because a symlink is not a file the
 * mirror can reproduce: `cpSync` would copy it as a link, and the link points wherever it likes —
 * including straight back at the personal stack's own directory.
 */
function symlinksUnder(dir: string): string[] {
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isSymbolicLink()) {
        found.push(full);
        continue; // never follow it — that is the whole point
      }
      if (entry.isDirectory()) walk(full);
    }
  };
  walk(dir);
  return found;
}

/**
 * Copy the item tree's `supabase/` into the slot, having first removed the slot's copy.
 *
 * DELETE THEN COPY, never merge: the previous holder's leftover migration or leftover function is
 * exactly the state this pool exists to make impossible.
 *
 * THE PROJECT SOURCE ENTIRE, and nothing else (ruling E3 as narrowed by T3, F3 and T11). Every
 * path the config names under `supabase/` arrives in the slot exactly as the item tree has it —
 * present if present, absent if absent — and `pathClosureProblems` refuses any config path that
 * names one of the three excluded entries, so the closure guarantee stays honest about them.
 * (`README.md` and `.gitkeep` therefore travel into the slot's `migrations/` too. The CLI reads
 * only `<timestamp>_name.sql` there, and the runner's migration proof counts exactly those.)
 *
 * A SYMLINK ANYWHERE UNDER `supabase/` REFUSES THE WHOLE MIRROR (ruling T13). The tree carries
 * none today, so nothing breaks; one smuggled in later refuses loudly instead of being copied as
 * a link into a directory the pool then resets.
 */
export function mirrorItemTree(itemRoot: string, slot: number): void {
  const source = join(itemRoot, 'supabase');
  const destination = join(slotDir(slot), 'supabase');
  if (!existsSync(source)) throw new Error(`${source} does not exist — there is no project to give the slot`);

  const links = symlinksUnder(source);
  if (links.length) {
    throw new Error(
      `refusing to mirror ${source} into slot ${slot}: it contains ${links.length} symlink(s) — ${links.join(', ')}. ` +
        `A symlink is not a file the mirror can reproduce, and a link copied into a slot points wherever it likes, ` +
        `including outside the pool. Replace them with real files, or decide by hand. Nothing was copied.`,
    );
  }

  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, {
    recursive: true,
    filter: (from: string) => {
      const inside = relative(source, from);
      if (inside === '') return true;
      return !MIRROR_EXCLUSIONS.includes(inside.split(/[\\/]/)[0]);
    },
  });
}

/* --------------------------------------------------------------------------- the reservation */

export interface Reservation {
  slot: number;
  item: string;
  branch: string;
  at: string;
  holder: string;
}

/**
 * The reservation as a VIEW reads it: anything this run cannot read is reported as nothing.
 *
 * This read is for rendering a picture of the pool, never for deciding whether a slot may be
 * taken. A view that refuses to render is no safety. Decision paths use `readReservationStrict`.
 */
export function readReservation(slot: number): Reservation | null {
  try {
    return JSON.parse(readFileSync(reservationPath(slot), 'utf8')) as Reservation;
  } catch {
    return null;
  }
}

/** One second of small steps — thousands of times the write window, and the same remedy T1 uses. */
const RESERVATION_READ_TRIES = 40;
const RESERVATION_READ_STEP_MS = 25;

/** Bounded synchronous pause, the same shape `acquireStackLock` uses for the same window. */
function pause(ms: number): void {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    /* spin */
  }
}

/** A parse result a decision path may act on: an object naming the item that holds the slot. */
function isReservation(value: unknown): value is Reservation {
  if (typeof value !== 'object' || value === null) return false;
  const item = (value as { item?: unknown }).item;
  return typeof item === 'string' && item.trim() !== '';
}

/**
 * THE RESERVATION AS A DECISION PATH MUST READ IT (audit ruling A2).
 *
 * Three outcomes, and the middle one is the whole point:
 *
 *   - the file is ABSENT — there is no reservation, and the caller proceeds;
 *   - the file EXISTS but this run cannot read or parse it — it waits out the write window and
 *     reads again, because `Reserve-DbSlot` creates the file exclusively and fills it a moment
 *     later, and in between the file exists and says nothing (measured on this machine, T10);
 *   - the file is STILL unreadable after the wait — it REFUSES, naming the file. A reservation
 *     nobody can read is not the same thing as no reservation, and treating it as absent lets a
 *     run take a slot another item holds.
 *
 * PARSING IS NOT READING (audit ruling B3). `null`, `42`, `"text"` and `[]` are all valid JSON and
 * none of them is a reservation. Handing one back made a present-but-garbage file indistinguishable
 * from ENOENT, and the `AT_DB_SLOT` override — which asks `if (reserved && ...)` — then read a
 * reservation file containing `null` as no reservation at all. So the parse result must have the
 * SHAPE of a reservation, and everything else takes the half-written path into the refusal below.
 * After this, a `null` return means ENOENT and nothing else.
 */
export function readReservationStrict(slot: number): Reservation | null {
  const path = reservationPath(slot);
  for (let attempt = 0; attempt < RESERVATION_READ_TRIES; attempt++) {
    if (attempt > 0) pause(RESERVATION_READ_STEP_MS);
    let raw: string;
    try {
      raw = readFileSync(path, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      continue; // present, and held by its writer — look again in a moment
    }
    if (raw.trim() === '') continue; // created, not yet filled
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue; // half written
    }
    if (isReservation(parsed)) return parsed;
    // parses, and says nothing a decision can use — half written, or not a reservation at all
  }
  throw new Error(
    `refusing to decide about slot ${slot}: it holds a reservation at ${path} that this run cannot read after ` +
      `${(RESERVATION_READ_TRIES * RESERVATION_READ_STEP_MS) / 1000} seconds of trying. A reservation nobody can read is ` +
      `NOT the same thing as no reservation, and reading it as absent would let this run take a slot another item ` +
      `holds. Nothing was done. Look at that file, and delete it by hand if no item holds this slot.`,
  );
}

/** The slot reserved for this item, or null. Derived from the file, never declared by a caller. */
export function slotForItem(item: string): number | null {
  for (let slot = 1; slot <= POOL_SIZE; slot++) {
    if (readReservation(slot)?.item === item) return slot;
  }
  return null;
}

/**
 * The item id a branch names — a pure function over the branch string, and it FAILS CLOSED.
 *
 * Exactly one id, or it refuses naming the condition. Never the first match of several: a branch
 * carrying two ids is a question about which item is being verified, and answering it by
 * position would attach a run, a reservation and a database to the wrong item silently.
 */
export function itemFromBranch(branch: string): string {
  const raw = String(branch ?? '').trim();
  if (raw === '') throw new Error('the branch name is empty, so no item id can be derived from it');
  if (raw === 'HEAD') throw new Error('HEAD is detached, so the branch names no item — check out the item branch, or set AT_DB_SLOT');

  const ids = [...new Set([...raw.matchAll(/\b(ai4dev|ai4pm)-(\d+)\b/gi)].map((match) => `${match[1].toUpperCase()}-${Number(match[2])}`))];
  if (ids.length === 0) throw new Error(`the branch "${raw}" names no item id, so no reserved slot can be found for it`);
  if (ids.length > 1) throw new Error(`the branch "${raw}" names ${ids.length} item ids (${ids.join(', ')}) — a person decides which one this run verifies`);
  return ids[0];
}

/** The branch this tree is on. A git failure refuses; it never falls back to a guess. */
export function currentBranch(root: string = REPO_ROOT): string {
  const res = spawnSync('git', ['-C', root, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8', env: childEnv() });
  if (res.error) throw new Error(`git could not be run to read the current branch (${diagnostic((res.error as Error).message)})`);
  if (res.status !== 0) throw new Error(`git could not report the current branch (exit ${res.status}): ${diagnostic(res.stderr) || '(no error output)'}`);
  return (res.stdout ?? '').trim();
}

/* ------------------------------------------------------------------------------- the pool view */

export interface PoolSlotView {
  slot: number;
  dir: string;
  configured: boolean;
  projectId: string | null;
  apiPort: number | null;
  dbPort: number | null;
  reservation: Reservation | null;
  occupiedBy: Holder | null;
}

/** What the pool looks like right now — for the setup report, the helpers, and a person asking. */
export function readPool(): PoolSlotView[] {
  const views: PoolSlotView[] = [];
  for (let slot = 1; slot <= POOL_SIZE; slot++) {
    const dir = slotDir(slot);
    let config: LocalConfig | null = null;
    try {
      config = readLocalConfig(dir);
    } catch {
      config = null;
    }
    // The claim is keyed on the slot's PERMANENT identity (ruling T6), so this read finds it even
    // when the slot has no config yet and even after `prepare` has moved the slot's ports.
    let occupiedBy: Holder | null = null;
    try {
      occupiedBy = JSON.parse(readFileSync(stackLockPath(slotClaimKey(slot)), 'utf8')) as Holder;
    } catch {
      occupiedBy = null;
    }
    views.push({
      slot,
      dir,
      configured: config !== null,
      projectId: config?.projectId ?? null,
      apiPort: config?.apiPort ?? null,
      dbPort: config?.dbPort ?? null,
      reservation: readReservation(slot),
      occupiedBy,
    });
  }
  return views;
}

/* ---------------------------------------------------------------------------------- occupancy */

export interface Occupancy {
  slot: number;
  dir: string;
  config: LocalConfig;
  /** The item this occupancy belongs to, or `null` when it came from the AT_DB_SLOT override. */
  item: string | null;
  via: 'reservation' | 'override';
  claim: StackLock;
  release(): void;
}

export interface OccupyOptions {
  /** The item id. Derived from the branch when absent. */
  item?: string;
  /** The AT_DB_SLOT override — for runs outside an item: the founder, the evidence gate, a spike. */
  slot?: number;
}

/**
 * Take a slot for one verify window.
 *
 * ADMISSION CONTROL IS THE COORDINATOR'S, NOT THE RUNNER'S. A run whose item holds no reservation
 * refuses and names the helper that makes one; it never falls back onto a free slot, because a
 * silent fallback is how a pool of two quietly becomes a pool of one shared stack.
 *
 * The claim is the runner's existing stack lock, with the takeover policy the ruled text asks
 * for: a DEAD holder pid is broken loudly, a live holder is never displaced at any age.
 *
 * THE OVERRIDE SKIPS ADMISSION CONTROL, NOT OWNERSHIP (ruling T5). `AT_DB_SLOT` is ruled — the
 * founder, the evidence gate and the spike all use it — and slot STATE is disposable by design, so
 * the reservation is not what protects a slot; the occupancy claim is, and the override keeps it.
 * But taking a slot another item is holding is a silent collision and costs nothing to refuse, so
 * an override run refuses loudly when the target slot's reservation names a DIFFERENT item than
 * this run can derive. A run that can derive no item at all treats ANY reservation as foreign.
 */
export function occupy(requirement: string, options: OccupyOptions = {}): Occupancy {
  let slot: number;
  let item: string | null = null;
  let via: 'reservation' | 'override';

  if (options.slot !== undefined) {
    slot = assertSlotNumber(options.slot);
    item = options.item ?? null;
    via = 'override';

    let derived: string | null = options.item ?? null;
    if (derived === null) {
      try {
        derived = itemFromBranch(currentBranch());
      } catch {
        derived = null; // no item derivable — every reservation is then somebody else's
      }
    }
    // STRICT (ruling A2): an unreadable reservation refuses here rather than reading as absent.
    const reserved = readReservationStrict(slot);
    if (reserved && reserved.item !== derived) {
      throw new Error(
        `refusing to take slot ${slot} with AT_DB_SLOT: it is reserved for ${reserved.item} ` +
          `(branch ${reserved.branch || 'unrecorded'}, taken ${reserved.at}, holder ${reserved.holder}) and this run ` +
          `${derived === null ? 'can derive no item of its own' : `belongs to ${derived}`}. Every occupancy resets the ` +
          `slot's database from its own tree, so this run would rebuild that item's database under it. Use a slot the ` +
          `pool shows free, or release that reservation first.`,
      );
    }
  } else {
    item = options.item ?? itemFromBranch(currentBranch());
    const reserved = slotForItem(item);
    if (reserved === null) {
      throw new Error(
        `no database slot is reserved for ${item}. The coordinator reserves a slot when the item starts — ` +
          `run \`Reserve-DbSlot -Item ${item}\` from loop/work/db-slots.ps1, or set AT_DB_SLOT=<n> for a run ` +
          `outside an item. There is deliberately no fallback onto a free slot: admission control belongs to ` +
          `the coordinator, not to this run.`,
      );
    }
    slot = reserved;
    via = 'reservation';
  }

  const dir = slotDir(slot);
  const configPath = slotConfigPath(slot);
  if (!existsSync(configPath)) {
    // TWO CAUSES, and the repair is the same one command (ruling T11). Either the pool was never
    // set up on this machine, or a `prepare` died between the mirror — which removes the slot's
    // config on purpose, so no slot ever holds the personal identity — and the regenerated write
    // that immediately follows it. A missing config is the safe end of that window, never a wrong
    // one, and it is not permanent.
    throw new Error(
      `slot ${slot} has no config at ${configPath}. Either the pool was never set up on this machine, or a ` +
        `previous run stopped between the mirror and the write that follows it — the mirror removes the slot's ` +
        `config on purpose, so a slot never carries the personal identity even for an instant. Either way the ` +
        `repair is one command: \`bun tests/at/harness/db-pool.ts setup\`.`,
    );
  }
  refusePersonal(readFileSync(configPath, 'utf8'), REPO_ROOT, `occupy slot ${slot}`);

  const config = readLocalConfig(dir);
  // Keyed on the slot's PERMANENT identity, never on the config's current ports (ruling T6).
  const claim = acquireStackLock(slotClaimKey(slot), requirement, { takeover: 'dead-pid-only' });

  // The reservation is re-read AFTER the claim. Between the lookup above and this line the
  // coordinator may have released the slot and given it to another item, and a run that resets a
  // database another item now owns is the exact collision this pool exists to prevent.
  if (via === 'reservation' && item !== null) {
    // STRICT here too (ruling A2), so `nobody` below means the file is GONE and never means the
    // file could not be read. The claim is released before the refusal travels, exactly as the
    // refusal below does it: a refusal that strands a claim locks the slot against everyone.
    let still: Reservation | null;
    try {
      still = readReservationStrict(slot);
    } catch (err) {
      claim.release();
      throw err;
    }
    if (still?.item !== item) {
      claim.release();
      throw new Error(
        `slot ${slot} was reserved for ${item} when this run started and now names ${still?.item ?? 'nobody'} — ` +
          `the reservation changed under the run, so nothing was reset and nothing was run.`,
      );
    }
  }

  return {
    slot,
    dir,
    config,
    item,
    via,
    claim,
    release: () => claim.release(),
  };
}

/** Release an occupancy. Null-safe so it can sit in a `finally` beside a claim that never happened. */
export function release(occupancy: Occupancy | null | undefined): void {
  occupancy?.release();
}

/* ----------------------------------------------------------------------------------- prepare */

export interface PrepareResult {
  status: StackStatus;
  migrations: MigrationProof;
  /** True when the slot's stack had to be restarted because its configuration changed. */
  restarted: boolean;
}

interface StartMarker {
  configHash: string;
  at: string;
  pid: number;
}

function hashConfig(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function readMarker(slot: number): StartMarker | null {
  try {
    return JSON.parse(readFileSync(slotMarkerPath(slot), 'utf8')) as StartMarker;
  } catch {
    return null;
  }
}

/**
 * Run the pinned CLI against one slot. Raw output is never printed: `supabase start` prints keys.
 *
 * THIS IS THE ONE HELPER (ruling E1, decision D13). No role hand-writes a slot CLI command: the
 * incident of 2026-08-09 was a hand-written spike script that closed neither route the identity
 * override travels by, and it destroyed the founder's database. Everything the wall is made of
 * lives in `supabaseInvocation` in runner.ts — the positive `SUPABASE_PROJECT_ID`, the refusal of
 * any other `SUPABASE_*`, `bun --no-env-file`, and the working directory equal to `--workdir` —
 * and `slotTarget` is the only thing this file has to get right.
 *
 * It is for commands that must EXIT ZERO. `status` does not (the config disables imgproxy and the
 * pooler), so the identity read below runs the CLI through the same seam and parses the result
 * with the runner's own parser instead.
 */
function runSlotCli(slot: number, args: string[], what: string): void {
  const res = runSupabaseCli(slotTarget(slot), args);
  if (res.error) {
    throw new Error(`could not launch the Supabase CLI to ${what} slot ${slot} (${diagnostic(res.error.message)})`);
  }
  if (res.status !== 0) {
    throw new Error(`\`supabase ${args.join(' ')}\` could not ${what} slot ${slot} (exit ${res.status}): ${diagnostic(res.stderr) || diagnostic(res.stdout) || '(no error output)'}`);
  }
}

/** Both halves of a slot's identity, in the shape the shared CLI seam takes. */
export function slotTarget(slot: number): CliTarget {
  return { workdir: slotDir(slot), projectId: slotProjectId(slot) };
}

/**
 * The Supabase container names in a piece of CLI output that do NOT belong to this slot.
 *
 * The CLI names its containers `supabase_<service>_<project id>`, and it prints them: a healthy
 * `supabase status` opens with `Stopped services: [supabase_imgproxy_<id> supabase_pooler_<id>]`,
 * and its error paths say things like `No such container: supabase_db_<id>`. That line is the
 * CLI's own statement of WHICH PROJECT it resolved, and it is the instrument that would have
 * caught the incident: on 2026-08-10 a hybrid invocation reported the slot's ports beside
 * `supabase_imgproxy_poancmeitlmxejofwzuu` — the personal project — in the same output.
 *
 * The rule is a suffix match and it is deliberately strict: a `supabase_…` token that does not end
 * in this slot's project id is reported, whatever it is. A false report costs a loud refusal on a
 * read; a missed one costs a database.
 */
export function foreignContainerNames(text: string, slotProject: string): string[] {
  const names = [...String(text ?? '').matchAll(/\bsupabase_[A-Za-z0-9][A-Za-z0-9_.-]*/g)].map((match) => match[0]);
  return [...new Set(names.filter((name) => !name.endsWith(`_${slotProject}`)))];
}

/**
 * The Supabase container names in a piece of CLI output that DO belong to this slot — the positive
 * half of the same instrument (ruling T2).
 *
 * MEASURED BEFORE THIS WAS WRITTEN, 2026-08-10, read-only, both slots: `status -o json` through the
 * shared helper prints exactly two such tokens on stderr —
 * `Stopped services: [supabase_imgproxy_ai4good-slot-N supabase_pooler_ai4good-slot-N]` — and zero
 * tokens that belong to any other project. So the evidence this check demands is evidence the CLI
 * really does produce.
 *
 * Absence is not innocence: `foreignContainerNames` finds nothing in an output that names no
 * container at all, which is exactly the hybrid shape the 2026-08-09 incident wore (the slot's
 * ports beside another project's containers). A destructive act therefore requires at least one
 * name that IS this slot's, never merely the lack of one that is not.
 *
 * Residual, recorded rather than hidden: those two tokens exist because the tracked config disables
 * imgproxy and the pooler. A config that enables both would print no "Stopped services" line, this
 * check would find no evidence, and the destructive act would REFUSE. That is the fail-closed
 * direction (ruling E7) and it is loud, but it is a real coupling to the config and to the pinned
 * CLI's output shape (residual F4 in the plan).
 */
export function ownContainerNames(text: string, slotProject: string): string[] {
  const names = [...String(text ?? '').matchAll(/\bsupabase_[A-Za-z0-9][A-Za-z0-9_.-]*/g)].map((match) => match[0]);
  return [...new Set(names.filter((name) => name.endsWith(`_${slotProject}`)))];
}

/**
 * DOCKER'S OWN ANSWER, on the destructive path, every time (ruling T2).
 *
 * The CLI's status output is one instrument and it is coupled to the CLI's version. Docker is a
 * second, independent one: before a reset, docker must show this slot's OWN database container
 * running. A docker read is the only interaction anything here is permitted to have with the
 * founder's stack, and it is unrestricted on slots.
 *
 * It fails closed. If docker cannot be run, or reports no container of this slot's own, the reset
 * refuses: an instrument that cannot answer is not an answer of "yes".
 */
export function slotDbContainers(slot: number): string[] {
  const project = slotProjectId(slot);
  const res = spawnSync('docker', ['ps', '--filter', `name=supabase_db_${project}`, '--format', '{{.Names}}'], {
    env: childEnv(),
    encoding: 'utf8',
  });
  if (res.error) throw new Error(`docker could not be run to confirm slot ${slot}'s database container (${diagnostic((res.error as Error).message)})`);
  if (res.status !== 0) throw new Error(`\`docker ps\` exited ${res.status} while confirming slot ${slot}'s database container: ${diagnostic(res.stderr) || '(no error output)'}`);
  return (res.stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function proveSlotDbContainer(slot: number, act: string): void {
  const project = slotProjectId(slot);
  const names = slotDbContainers(slot);
  const own = names.filter((name) => name.includes(project));
  if (own.length !== names.length || own.length === 0) {
    throw new Error(
      `REFUSING TO ${act.toUpperCase()} SLOT ${slot}: docker does not confirm this slot's own database container. ` +
        `\`docker ps\` named ${names.length ? names.join(', ') : 'no running container'} for ${project}. ` +
        `Start the slot (\`bun tests/at/harness/db-pool.ts setup\`) and try again. Nothing was done.`,
    );
  }
  console.log(`db-pool — docker confirms slot ${slot}'s own database container before the ${act}: ${own.join(', ')}`);
}

export interface SlotIdentityRead extends SlotIdentityProof {
  /** The stack's own report, when a stack answered. */
  status: StackStatus | null;
  /** Why no stack answered, when none did. Never a mismatch — a mismatch throws. */
  notRunning: string | null;
  /**
   * The project id this read POSITIVELY proved, or `null` when it proved none (audit ruling B2).
   *
   * Positive evidence means the CLI's own output named a container belonging to this slot. The
   * other three checks can all hold over an output that names no container at all, and that is the
   * exact shape the 2026-08-09 hybrid produced. A destructive read always carries the id, because a
   * destructive read with no own container refuses above; a non-running or merely informational
   * read carries `null`, and `resetLocalDatabase` refuses on it.
   */
  provenProjectId: string | null;
}

/**
 * THE PRE-DESTRUCTIVE IDENTITY READ (ruling E1, decision D13).
 *
 * Before anything destructive, the CLI is asked — through the same helper, so the read and the
 * destructive act resolve identically — to say what it resolves. Three things must hold, and any
 * one of them failing refuses loudly and does nothing:
 *
 *   1. every Supabase container name in the output belongs to this slot's project;
 *   2. the founder's personal project id appears nowhere in the output;
 *   3. the ports and keys the stack reports are the slot's own, loopback, locally issued
 *      (`localStackProblems`, against the SLOT's config).
 *
 * A DESTRUCTIVE act adds a fourth, and it is the one that closes the vacuous pass (ruling T2):
 *
 *   4. at least one Supabase container name in the output IS this slot's own.
 *
 * The first three can all hold over an output that names no container at all, and an output that
 * names no container is precisely what the 2026-08-09 hybrid produced when it reported the slot's
 * ports while resolving another project. Absence of contrary evidence is not identity.
 *
 * A stack that is simply not running is not a mismatch: it is reported as `notRunning` so the
 * caller can decide (there is nothing to stop), and only a real disagreement throws.
 */
export function proveSlotTarget(slot: number, act: string, itemRoot: string = REPO_ROOT, destructive = false): SlotIdentityRead {
  const project = slotProjectId(slot);
  const res: CliResult = runSupabaseCli(slotTarget(slot), ['status', '-o', 'json']);
  if (res.error) {
    throw new Error(`refusing to ${act} slot ${slot}: the Supabase CLI could not be launched to read its identity (${diagnostic(res.error.message)})`);
  }

  const raw = `${res.stdout}\n${res.stderr}`;
  const personal = personalProjectId(itemRoot);
  const foreign = foreignContainerNames(raw, project);
  const carriesPersonal = personal !== '' && raw.includes(personal);
  if (foreign.length || carriesPersonal) {
    throw new Error(
      `REFUSING TO ${act.toUpperCase()} SLOT ${slot}: the identity read did not resolve to ${project}. ` +
        (foreign.length ? `The CLI named ${foreign.join(', ')}. ` : '') +
        (carriesPersonal ? `The founder's personal project id appears in the output. ` : '') +
        `Nothing was done.`,
    );
  }

  let status: StackStatus;
  try {
    status = parseStackStatus(res);
  } catch (err) {
    return { status: null, notRunning: diagnostic((err as Error).message), provenProjectId: null };
  }

  const config = readLocalConfig(slotDir(slot));
  const problems = localStackProblems(status, config);
  if (problems.length) {
    throw new Error(
      `REFUSING TO ${act.toUpperCase()} SLOT ${slot}: the stack that answered is not provably slot ${slot}'s own. ` +
        `Failed checks: ${problems.join('; ')}. (Values are deliberately not printed.) Nothing was done.`,
    );
  }

  const own = ownContainerNames(raw, project);
  if (destructive && own.length === 0) {
    throw new Error(
      `REFUSING TO ${act.toUpperCase()} SLOT ${slot}: the identity read names no container belonging to ${project}, ` +
        `so it carries no positive evidence of which project the CLI resolved. The ports alone are not identity — ` +
        `the 2026-08-09 incident reported the right ports while resolving another project. Nothing was done.`,
    );
  }

  console.log(
    `db-pool — slot ${slot} identity proven before the ${act}: project ${project}, api ${config.apiPort}, db ${config.dbPort}` +
      (own.length ? `, containers ${own.join(', ')}` : ''),
  );
  return { status, notRunning: null, provenProjectId: own.length ? project : null };
}

/**
 * `db reset` on a slot. THE IDENTITY READ IS INSIDE, so no caller can reach the reset without it —
 * that is what "structurally on the destructive path" means, as opposed to a rule someone follows.
 */
export async function resetSlotDatabase(slot: number, itemRoot: string = REPO_ROOT): Promise<StackStatus> {
  // The BROAD guard first (rulings T7 and F1). D5's ruled sentence names "occupy, prepare, reset or
  // emit env", and this is an exported entry point a caller reaches directly — the spike does — so
  // it runs the guard itself instead of trusting whoever called it to have run it.
  refusePersonalSlotConfig(slot, itemRoot, 'reset');
  const read = proveSlotTarget(slot, 'reset', itemRoot, true);
  if (!read.status) {
    throw new Error(
      `refusing to reset slot ${slot}: it reported no running stack, so its identity could not be proven ` +
        `(${read.notRunning}). Start the slot first; nothing was reset.`,
    );
  }
  proveSlotDbContainer(slot, 'reset');
  // THE READ TRAVELS INTO THE RESET (audit ruling B2). The proof is a parameter, so this call site
  // cannot be bypassed by an importer that aims the reset at a slot without reading it first.
  await resetLocalDatabase(slotTarget(slot), read);
  return read.status;
}

/** `stop` on a slot, behind the same guard and the same read. A slot with no stack has nothing to stop. */
export function stopSlotStack(slot: number, itemRoot: string = REPO_ROOT): void {
  refusePersonalSlotConfig(slot, itemRoot, 'stop');
  const read = proveSlotTarget(slot, 'stop', itemRoot, true);
  if (!read.status) {
    console.log(`db-pool — slot ${slot} reported no running stack (${read.notRunning}); there is nothing to stop`);
    return;
  }
  runSlotCli(slot, ['stop'], 'stop');
}

/** `start` on a slot. Not destructive, and a stack that is down cannot be asked who it is first. */
export function startSlotStack(slot: number): void {
  runSlotCli(slot, ['start'], 'start');
}

/**
 * Make the slot's database be the item tree's database, and prove it.
 *
 * The order is load-bearing: mirror the tree, regenerate the identity-overlaid config, restart the
 * stack IF the configuration it was started with has changed, then read the stack, prove it is
 * local, wait for readiness, reset, wait again, and prove the migration set replayed.
 *
 * WHY A MARKER RATHER THAN THE FILE ITSELF decides the restart: the file says what the slot SHOULD
 * be running; only a marker written after a successful start says what it IS running. A crash
 * between writing the config and restarting would otherwise leave equal text over a stack still
 * serving the old auth behaviour, and the next occupancy would trust it.
 */
export async function prepare(occupancy: Occupancy, itemRoot: string = REPO_ROOT): Promise<PrepareResult> {
  const { slot, dir } = occupancy;
  const sourceText = readFileSync(join(itemRoot, 'supabase', 'config.toml'), 'utf8');
  const generated = generateSlotConfig(sourceText, slot);

  refusePersonal(generated, itemRoot, `prepare slot ${slot}`);

  const closure = pathClosureProblems(generated, itemRoot);
  if (closure.length) {
    throw new Error(
      `slot ${slot} would start half-provisioned: ${closure.join('; ')}. No stack was started and nothing was reset.`,
    );
  }

  // THE MIRROR AND THE CONFIG WRITE ARE ONE STEP (ruling T11). The mirror excludes `config.toml`
  // and removes the slot's copy, so between these two statements the slot has NO config — never the
  // item tree's one, which carries the personal identity. A crash in the window leaves a slot with
  // nothing, which `occupy` refuses loudly and one `setup` repairs. The write is unconditional:
  // the mirror has just deleted whatever was there.
  mirrorItemTree(itemRoot, slot);
  const configPath = slotConfigPath(slot);
  mkdirSync(join(dir, 'supabase'), { recursive: true });
  writeFileSync(configPath, generated, 'utf8');

  const hash = hashConfig(generated);
  const marker = readMarker(slot);
  const restarted = marker?.configHash !== hash;
  if (restarted) {
    // The auth container reads config at START, not at reset, so a changed config that is not
    // restarted into would grade the previous item's auth behaviour.
    console.log(`at:verify — db slot ${slot} configuration changed since its last start; restarting the slot's stack`);
    stopSlotStack(slot, itemRoot);
    startSlotStack(slot);
    const proven: StartMarker = { configHash: hash, at: new Date().toISOString(), pid: process.pid };
    writeFileSync(slotMarkerPath(slot), JSON.stringify(proven), 'utf8');
  }

  // The identity read doubles as the prove-local check against the SLOT's config, and it is the
  // same read the reset performs again for itself immediately before acting.
  const read = proveSlotTarget(slot, 'prepare', itemRoot);
  if (!read.status) {
    throw new Error(`slot ${slot} reported no running stack (${read.notRunning}), so nothing was reset and nothing was run`);
  }
  const status = read.status;

  await waitForReady(status, `before the slot ${slot} reset`);
  await resetSlotDatabase(slot, itemRoot);
  await waitForReady(status, `after the slot ${slot} reset`);
  const migrations = await proveMigrationsReplayed(status, itemRoot);

  return { status, migrations, restarted };
}

/* ------------------------------------------------------------------------------- env and evidence */

/**
 * The coordinates a suite is allowed to see. Nothing else about the slot travels into the child,
 * and the personal guard runs here too: env is how a stack reaches a test, so emitting the wrong
 * one is as destructive as resetting the wrong one.
 *
 * TWO CHECKS, and they see different things (rulings T7 and F1). The broad guard reads the slot's
 * CONFIG, which is where a personal identity would arrive from; the inline checks below read the
 * STATUS, which is what actually answered, and the config guard cannot see that.
 */
export function stackEnv(occupancy: Occupancy, status: StackStatus, itemRoot: string = REPO_ROOT): Record<string, string> {
  refusePersonalSlotConfig(occupancy.slot, itemRoot, 'emit the coordinates of');

  for (const [label, raw] of [
    ['AT_SUPABASE_URL', status.apiUrl],
    ['AT_SUPABASE_DB_URL', status.dbUrl],
  ] as const) {
    const port = Number(new URL(raw).port);
    if (port >= PERSONAL_PORT_LOW && port <= PERSONAL_PORT_HIGH) {
      throw new Error(`refusing to emit ${label}: it points at port ${port}, inside the founder's personal stack's port block`);
    }
  }
  if (occupancy.config.projectId === personalProjectId()) {
    throw new Error(`refusing to emit slot ${occupancy.slot}'s coordinates: its project id is the personal stack's`);
  }
  return {
    AT_SUPABASE_URL: status.apiUrl,
    AT_SUPABASE_DB_URL: status.dbUrl,
    AT_SUPABASE_ANON_KEY: status.anonKey,
    AT_SUPABASE_SERVICE_ROLE_KEY: status.serviceRoleKey,
  };
}

/**
 * The api port THAT ANSWERED, read from the post-prepare status (audit ruling A3).
 *
 * The status is proven before this is called, so the parse cannot fail in practice; if it ever
 * does, the line carries what the status said verbatim rather than a number from somewhere else.
 */
function statusApiPort(status: StackStatus): string {
  try {
    const port = new URL(status.apiUrl).port;
    if (port) return port;
  } catch {
    /* not a URL this run can parse — fall through and print what the status actually said */
  }
  return status.apiUrl || 'unknown';
}

/**
 * The one line the verify transcript carries about the database it ran against: which slot, that
 * the reset happened, and what the migration state was. A green that cannot name its reset ran
 * against unknown state.
 *
 * THE PORT COMES FROM THE STATUS, NOT FROM THE OCCUPANCY (ruling A3). The occupancy's config is
 * read when the slot is taken, and `prepare` then regenerates that config from the item tree — so
 * under a port change the occupancy names the OLD port while the suite runs against the new one.
 * The project id is the slot's permanent identity (ruling T6) and cannot drift that way.
 */
export function evidence(occupancy: Occupancy, result: PrepareResult): string {
  return (
    `at:verify — db slot ${occupancy.slot} (${occupancy.config.projectId}, api ${statusApiPort(result.status)}) — ` +
    `reset OK — migrations: ${result.migrations.expected} expected, ${result.migrations.applied} applied`
  );
}

/* --------------------------------------------------------------------------------- setup CLI */

/**
 * The one-time bring-up: create both slot directories, generate both configs from the current
 * tree, start both stacks, and report. It never resets and never touches the personal stack — the
 * personal report at the end is a plain read, printed so the transcript shows the stack that must
 * stay untouched was still on its own ports afterwards.
 */
async function setup(): Promise<number> {
  const sourceText = readFileSync(join(REPO_ROOT, 'supabase', 'config.toml'), 'utf8');
  console.log(`db-pool setup — pool root ${poolRoot()}`);
  console.log(`db-pool setup — source configuration ${join(REPO_ROOT, 'supabase', 'config.toml')}`);
  console.log(`db-pool setup — personal stack project id ${personalProjectId()} (read only; never started, stopped or reset here)`);

  for (let slot = 1; slot <= POOL_SIZE; slot++) {
    const dir = slotDir(slot);
    console.log('');
    console.log(`db-pool setup — slot ${slot} at ${dir}`);
    const generated = generateSlotConfig(sourceText, slot);
    refusePersonal(generated, REPO_ROOT, `set up slot ${slot}`);

    const { mappings } = portMappings(sourceText, slot);
    for (const mapping of mappings) console.log(`  port  [${mapping.section}] ${mapping.key}: ${mapping.from} -> ${mapping.to}`);

    mirrorItemTree(REPO_ROOT, slot);
    mkdirSync(join(dir, 'supabase'), { recursive: true });
    writeFileSync(slotConfigPath(slot), generated, 'utf8');
    mkdirSync(join(poolRoot(), 'reservations'), { recursive: true });
    console.log(`  wrote ${slotConfigPath(slot)} (project_id ${slotProjectId(slot)})`);

    // STOP BEFORE START (ruling F6). The marker written below means "the stack was started with
    // exactly this config", and S2's own transcript measured that `supabase start` on an
    // already-running project exits zero having started nothing. A no-op start would write a
    // marker that says the slot runs a config it has never read. Stopping first removes the
    // condition instead of measuring around it; on a slot that is down this only prints a line.
    console.log(`  stopping slot ${slot} first, so the start below is a real one`);
    stopSlotStack(slot, REPO_ROOT);
    console.log(`  starting slot ${slot} — this pulls container images on a first run`);
    startSlotStack(slot);
    writeFileSync(slotMarkerPath(slot), JSON.stringify({ configHash: hashConfig(generated), at: new Date().toISOString(), pid: process.pid }), 'utf8');

    const read = proveSlotTarget(slot, 'status report', REPO_ROOT);
    if (!read.status) throw new Error(`slot ${slot} started but reported no running stack: ${read.notRunning}`);
    const status = read.status;
    console.log(`  slot ${slot} API_URL ${status.apiUrl}`);
    console.log(`  slot ${slot} DB_URL  ${redactDbUrl(status.dbUrl)}`);
    console.log(`  slot ${slot} keys    issued (values deliberately not printed)`);
  }

  console.log('');
  console.log('db-pool setup — reading the personal stack (a read; nothing is written to it)');
  try {
    const personal = readStackStatus();
    console.log(`  personal API_URL ${personal.apiUrl}`);
    console.log(`  personal DB_URL  ${redactDbUrl(personal.dbUrl)}`);
  } catch (err) {
    console.log(`  personal stack did not report: ${diagnostic((err as Error).message)}`);
  }

  console.log('');
  for (const view of readPool()) {
    console.log(
      `db-pool setup — slot ${view.slot}: ${view.configured ? `${view.projectId}, api ${view.apiPort}, db ${view.dbPort}` : 'NOT CONFIGURED'}` +
        `, reservation ${view.reservation ? view.reservation.item : 'none'}, occupancy ${view.occupiedBy ? `pid ${view.occupiedBy.pid}` : 'none'}`,
    );
  }
  return 0;
}

/** The database URL carries the password. Print the coordinates, never the credential. */
function redactDbUrl(url: string): string {
  return url.replace(/(postgres(?:ql)?:\/\/)[^@\s/]+@/i, '$1<redacted>@');
}

/* ---------------------------------------------------------------------------------- spike CLI */

/**
 * THE ISOLATION SPIKE, step S3 as amended by ruling E5 — a CLI entry of this module, never a
 * hand-written script. The first spike WAS a hand-written script; it closed neither route the
 * identity override travels by, and it destroyed the founder's personal database. So the thing
 * that proves the wall is now the thing that IS the wall: every CLI call below goes through the
 * same helper the runner uses.
 *
 * IT TOUCHES THE PERSONAL STACK NOT AT ALL. Its instrument for the personal stack is a docker-level
 * identity snapshot — a read — taken before and after, and compared on identity fields only. The
 * breach signature was RECREATION (a new container id, a new volume timestamp), so identity-field
 * equality is the direct negative of the breach. Run state is excluded on purpose: one container
 * (`vector`) restart-loops on all three stacks by itself.
 *
 * THE HOSTILE CONDITION IS MANDATORY. The spike refuses to run unless its own process carries
 * `SUPABASE_PROJECT_ID=<the personal project id>` — the exact override that caused the incident.
 * A pass therefore proves the helper closes the route WHILE the route is loaded, rather than
 * proving the route happened to be empty that day.
 */

/** bun's SQL client. Described here rather than imported: the runner keeps its own private copy. */
interface BunSqlClient {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  close(): Promise<void>;
}
type BunSqlCtor = new (url: string) => BunSqlClient;

/** A canary connection may only ever reach a slot; the personal block is refused at the socket. */
async function withSlotSql<T>(slot: number, status: StackStatus, fn: (sql: BunSqlClient) => Promise<T>): Promise<T> {
  const port = Number(new URL(status.dbUrl).port);
  if (!Number.isFinite(port) || (port >= PERSONAL_PORT_LOW && port <= PERSONAL_PORT_HIGH)) {
    throw new Error(`refusing to open a connection for slot ${slot}: port ${port} is inside the founder's personal port block`);
  }
  const SQL = (globalThis as { Bun?: { SQL?: BunSqlCtor } }).Bun?.SQL;
  if (!SQL) throw new Error('this runtime has no SQL client (expected bun)');
  const sql = new SQL(status.dbUrl);
  try {
    return await fn(sql);
  } finally {
    await sql.close().catch(() => undefined);
  }
}

/**
 * DROP AND RECREATE, never `create table if not exists`: the first spike left a `spike_canary`
 * table of its own shape in slot 1, and an insert against somebody else's columns fails on a
 * constraint rather than writing the canary. The canary has to be this run's own table.
 */
async function writeCanary(slot: number, status: StackStatus, note: string): Promise<void> {
  await withSlotSql(slot, status, async (sql) => {
    await sql`drop table if exists public.spike_canary`;
    await sql`create table public.spike_canary (note text)`;
    await sql`insert into public.spike_canary (note) values (${note})`;
  });
}

/** The canary's note, or null when the table or the row is gone — which is what a reset does. */
async function readCanary(slot: number, status: StackStatus): Promise<string | null> {
  return withSlotSql(slot, status, async (sql) => {
    try {
      const rows = (await sql`select note from public.spike_canary`) as { note?: unknown }[];
      return rows.length ? String(rows[0].note) : null;
    } catch (err) {
      const message = (err as Error).message ?? '';
      if (/spike_canary/.test(message) && /does not exist/i.test(message)) return null;
      throw err;
    }
  });
}

function dockerLines(args: string[]): string[] {
  const res = spawnSync('docker', args, { env: childEnv(), encoding: 'utf8' });
  if (res.error) throw new Error(`docker could not be run (${diagnostic((res.error as Error).message)})`);
  if (res.status !== 0) throw new Error(`\`docker ${args.slice(0, 2).join(' ')}\` exited ${res.status}: ${diagnostic(res.stderr) || '(no error output)'}`);
  return (res.stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

interface DockerSnapshot {
  containers: string[];
  volumes: string[];
}

/**
 * A READ-ONLY identity record of the personal stack's docker objects. Only `ps`, `inspect`,
 * `volume ls` and `volume inspect` are used, and only identity fields are recorded: container id,
 * created timestamp, image and port bindings; volume name and CreatedAt. No run state.
 */
function personalDockerSnapshot(personal: string): DockerSnapshot {
  const containerNames = dockerLines(['ps', '-a', '--filter', `name=${personal}`, '--format', '{{.Names}}']).sort();
  const containers = containerNames.length
    ? dockerLines([
        'inspect',
        '--format',
        '{{.Name}} | id {{.Id}} | created {{.Created}} | image {{.Config.Image}} | ports {{json .HostConfig.PortBindings}}',
        ...containerNames,
      ]).sort()
    : [];
  const volumeNames = dockerLines(['volume', 'ls', '--filter', `name=${personal}`, '--format', '{{.Name}}']).sort();
  const volumes = volumeNames.length
    ? dockerLines(['volume', 'inspect', '--format', '{{.Name}} | created {{.CreatedAt}}', ...volumeNames]).sort()
    : [];
  return { containers, volumes };
}

function snapshotDifferences(before: DockerSnapshot, after: DockerSnapshot): string[] {
  const differences: string[] = [];
  const pairs = [
    ['container', before.containers, after.containers],
    ['volume', before.volumes, after.volumes],
  ] as const;
  for (const [what, first, second] of pairs) {
    for (const line of first) if (!second.includes(line)) differences.push(`${what} recorded BEFORE and not after: ${line}`);
    for (const line of second) if (!first.includes(line)) differences.push(`${what} recorded AFTER and not before: ${line}`);
  }
  return differences;
}

function gitHead(): string {
  const res = spawnSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8', env: childEnv() });
  return (res.stdout ?? '').trim() || '(git could not report the head)';
}

async function spike(): Promise<number> {
  const personal = personalProjectId();
  const hostile = process.env.SUPABASE_PROJECT_ID ?? '';

  console.log('');
  console.log('AI4DEV-79 (parallel DB slot pool) - step S3 as amended by ruling E5, the isolation re-proof.');
  console.log('');
  console.log('REDACTION: database passwords and any key-shaped token are replaced before printing.');
  console.log('Container names, project ids and ports are kept: they are the evidence.');
  console.log('');
  console.log(`date      : ${new Date().toISOString()}`);
  console.log(`machine   : ${hostname()}`);
  console.log(`worktree  : ${REPO_ROOT}`);
  console.log(`branch    : ${(() => { try { return currentBranch(); } catch { return '(unreadable)'; } })()}`);
  console.log(`head      : ${gitHead()}`);
  console.log(`pool root : ${poolRoot()}`);
  console.log('');

  console.log('=== the hostile condition, mandatory ===');
  if (hostile !== personal) {
    console.log(`REFUSING TO RUN. The parent process carries SUPABASE_PROJECT_ID="${hostile}" and the proof needs "${personal}".`);
    console.log('Run this entry so the tracked .env loads into the parent, or set the variable in the parent shell.');
    console.log('A pass under a clean environment would prove nothing: the route this helper closes would not be loaded.');
    return 2;
  }
  console.log(`SUPABASE_PROJECT_ID IS PRESENT IN THIS PROCESS: "${hostile}".`);
  console.log('That is the founder\'s personal project id, and it is the exact override that destroyed the personal');
  console.log('database on 2026-08-09. It stays in this process for the whole run. Every CLI call below is made');
  console.log('through the shared helper, which states the slot identity positively in the child environment.');
  console.log('');

  console.log('=== (a) BEFORE: docker identity snapshot of the personal stack (a READ; nothing is written) ===');
  const before = personalDockerSnapshot(personal);
  for (const line of before.containers) console.log(`  ${line}`);
  for (const line of before.volumes) console.log(`  ${line}`);
  console.log(`  ${before.containers.length} containers, ${before.volumes.length} volumes recorded`);
  console.log('');

  let failure: string | null = null;
  let slot1Canary: string | null = null;
  let slot2Canary: string | null = null;
  let preReadShown = false;
  let resetDone = false;
  let held1: Occupancy | null = null;
  let held2: Occupancy | null = null;

  try {
    // THE SPIKE TAKES BOTH SLOTS FIRST (ruling T4). D6's own sentence — "the occupancy claim still
    // applies" for override runs — binds this run too: it writes to slot 1 and resets slot 2, so a
    // verify window opening on either one under it would be exactly the collision the pool exists
    // to prevent. Both claims are released in the `finally` below.
    console.log('=== (a2) occupying both slots, dead-pid-only, before anything is touched ===');
    held1 = occupy('spike', { slot: 1 });
    held2 = occupy('spike', { slot: 2 });
    console.log(`  slot 1 claim ${held1.claim.file}`);
    console.log(`  slot 2 claim ${held2.claim.file}`);
    console.log('');

    console.log('=== (b) preflight: both slots answer on their own port block, through the helper ===');
    const statuses = new Map<number, StackStatus>();
    for (const slot of [1, 2]) {
      let read = proveSlotTarget(slot, `preflight of slot ${slot}`);
      if (!read.status) {
        console.log(`  slot ${slot} reported no running stack (${read.notRunning}); starting it — slots are pool property`);
        startSlotStack(slot);
        read = proveSlotTarget(slot, `preflight of slot ${slot}`);
      }
      if (!read.status) throw new Error(`slot ${slot} still reports no running stack: ${read.notRunning}`);
      statuses.set(slot, read.status);
      console.log(`  slot ${slot}  API ${read.status.apiUrl}  DB ${redactDbUrl(read.status.dbUrl)}`);
    }
    const slot1 = statuses.get(1) as StackStatus;
    const slot2 = statuses.get(2) as StackStatus;
    console.log('');

    console.log('=== (c) canary row in slot 1 — the bystander that must SURVIVE ===');
    await writeCanary(1, slot1, 'slot-1 canary');
    console.log(`  slot 1 canary written: ${JSON.stringify(await readCanary(1, slot1))}`);
    console.log('');

    console.log('=== (d) canary row in slot 2 — the row the reset must DESTROY ===');
    await writeCanary(2, slot2, 'slot-2 canary');
    console.log(`  slot 2 canary written: ${JSON.stringify(await readCanary(2, slot2))}`);
    console.log('');

    console.log('=== (e) the pre-destructive identity read on slot 2 ===');
    const read = proveSlotTarget(2, 'reset', REPO_ROOT, true);
    if (!read.status) throw new Error(`slot 2 reported no running stack: ${read.notRunning}`);
    preReadShown = true;
    console.log('  the line above is the helper stating which project the CLI resolved, before anything destructive.');
    console.log('');

    console.log('=== (f) supabase db reset, aimed at slot 2, through the helper, hostile variable present ===');
    await resetSlotDatabase(2);
    resetDone = true;
    console.log('  the reset exited zero.');
    console.log('');

    console.log('=== (g) the canaries after the reset ===');
    slot1Canary = await readCanary(1, slot1);
    slot2Canary = await readCanary(2, slot2);
    console.log(`  slot 1 canary: ${JSON.stringify(slot1Canary)}`);
    console.log(`  slot 2 canary: ${JSON.stringify(slot2Canary)}`);
    console.log('');
  } catch (err) {
    failure = diagnostic((err as Error).message, 2000);
    console.log('');
    console.log(`STOPPED: ${failure}`);
    console.log('');
  } finally {
    release(held2);
    release(held1);
    console.log('=== both slot claims released ===');
    console.log('');
  }

  console.log('=== (h) AFTER: the same docker identity snapshot, compared on identity fields only ===');
  const after = personalDockerSnapshot(personal);
  for (const line of after.containers) console.log(`  ${line}`);
  for (const line of after.volumes) console.log(`  ${line}`);
  const differences = snapshotDifferences(before, after);
  if (differences.length === 0) console.log('  IDENTICAL: same container ids, created timestamps, images, port bindings, volumes and volume CreatedAt.');
  else for (const line of differences) console.log(`  DIFFERENT: ${line}`);
  console.log('');

  const criteria: [string, boolean][] = [
    ['the hostile variable was present in the parent process', hostile === personal],
    // Ruling F2: without this, a slot 2 canary READ that throws after a good reset is swallowed by
    // the catch, and every remaining criterion passes with the canary never read at all.
    ['the spike body completed without an exception', failure === null],
    ['the identity pre-read named slot 2 before the reset', preReadShown],
    ['the reset ran through the helper and exited zero', resetDone],
    ['the slot 2 canary is GONE — the reset acted on slot 2', resetDone && slot2Canary === null],
    ['the slot 1 canary SURVIVES — the reset acted on nothing else', slot1Canary === 'slot-1 canary'],
    // Ruling T12: two empty docker queries compare EQUAL, so the central instrument would report
    // IDENTICAL while having observed nothing at all.
    [
      'the BEFORE snapshot recorded at least one personal container and one personal volume',
      before.containers.length > 0 && before.volumes.length > 0,
    ],
    ['the personal docker snapshots are equal on every identity field', differences.length === 0],
  ];
  console.log('=== the done-criterion, item by item ===');
  for (const [what, met] of criteria) console.log(`  ${met ? 'PASS' : 'FAIL'}  ${what}`);
  const passed = criteria.every(([, met]) => met);
  console.log('');
  console.log(passed ? 'THE SPIKE PASSED: the wall holds under the exact condition that broke it.' : 'THE SPIKE FAILED. The wall is NOT proven.');
  console.log('');
  console.log('Residue: slot 1 keeps a public.spike_canary table until its next occupancy, which resets it.');
  console.log('END OF S3 TRANSCRIPT (re-proof)');
  return passed ? 0 : 1;
}

function usage(): void {
  console.error('usage: bun tests/at/harness/db-pool.ts <setup|status|spike>');
}

async function main(argv: string[]): Promise<number> {
  const command = argv[0] ?? '';
  if (command === 'setup') return setup();
  if (command === 'spike') return spike();
  if (command === 'status') {
    for (const view of readPool()) {
      console.log(
        `slot ${view.slot}: ${view.configured ? `${view.projectId}, api ${view.apiPort}` : 'NOT CONFIGURED'}` +
          `, reservation ${view.reservation ? `${view.reservation.item} (${view.reservation.at})` : 'none'}` +
          `, occupancy ${view.occupiedBy ? `pid ${view.occupiedBy.pid} for ${view.occupiedBy.requirement}` : 'none'}`,
      );
    }
    return 0;
  }
  usage();
  return 2;
}

if (import.meta.main) {
  try {
    process.exit(await main(process.argv.slice(2)));
  } catch (err) {
    console.error(`db-pool — ${(err as Error).message}`);
    process.exit(3);
  }
}
