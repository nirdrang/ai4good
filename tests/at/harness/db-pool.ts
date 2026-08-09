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
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

import { REPO_ROOT } from './check.ts';
import {
  acquireStackLock,
  bunExecutable,
  childEnv,
  diagnostic,
  localStackProblems,
  proveMigrationsReplayed,
  readLocalConfig,
  readStackStatus,
  resetLocalDatabase,
  stackLockPath,
  supabaseArgs,
  waitForReady,
  type Holder,
  type LocalConfig,
  type MigrationProof,
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

export interface PortMapping {
  section: string;
  key: string;
  line: number;
  from: number;
  to: number;
}

/**
 * The identity overlay's port rule, stated GENERALLY rather than as a list of seven keys: a list
 * goes stale the moment an item enables `local_smtp.smtp_port`, and a slot that inherits one
 * personal-block port is not isolated at all.
 *
 *   - `edge_runtime.inspector_port` moves by 10 per slot — the inspector is not in the 54xxx band.
 *   - every other active port-valued key in 54000–54999 moves by 1000 per slot.
 *   - anything else REFUSES loudly as unmappable. A guess here is a port collision with software
 *     nobody in this process knows about, so a person decides.
 */
export function portMappings(text: string, slot: number): { mappings: PortMapping[]; problems: string[] } {
  assertSlotNumber(slot);
  const mappings: PortMapping[] = [];
  const problems: string[] = [];

  for (const entry of scanConfig(text)) {
    if (!isPortKey(entry.key)) continue;
    const literal = /^(\d+)/.exec(entry.value);
    if (!literal) {
      problems.push(`[${entry.section}] ${entry.key} = ${entry.value} is not a plain port number, so the slot overlay cannot move it`);
      continue;
    }
    const from = Number(literal[1]);
    if (entry.section === 'edge_runtime' && entry.key === 'inspector_port') {
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
    const pattern = new RegExp(`^(\\s*${mapping.key}\\s*=\\s*)\\d+`);
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
    const port = Number(/^(\d+)/.exec(entry.value)?.[1] ?? NaN);
    if (!Number.isFinite(port)) continue;
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
 * loudly and a person decides.
 */
export function pathClosureProblems(configText: string, itemRoot: string): string[] {
  const problems: string[] = [];
  const base = resolve(join(itemRoot, 'supabase'));

  for (const entry of scanConfig(configText)) {
    if (!PATH_KEYS.has(entry.key)) continue;
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
      }
    }
  }

  return problems;
}

/* -------------------------------------------------------------------------------- the mirror */

/** The CLI's own migration identity: `<14-digit timestamp>_name.sql`. Nothing else is a migration. */
const MIGRATION_FILE = /^\d{14}_.*\.sql$/;

/**
 * Copy the item tree's `supabase/` into the slot, having first removed the slot's copy.
 *
 * DELETE THEN COPY, never merge: the previous holder's leftover migration or leftover function is
 * exactly the state this pool exists to make impossible. Copying the whole directory (rather than
 * a list of three subdirectories) is also what makes the path closure above provable — anything
 * the config names under `supabase/` is present in the slot because the whole directory is.
 *
 * `migrations/` is the one filtered part: the CLI reads timestamped `.sql` files there, and the
 * runner's migration proof counts exactly those, so `README.md` and `.gitkeep` are left behind.
 */
export function mirrorItemTree(itemRoot: string, slot: number): void {
  const source = join(itemRoot, 'supabase');
  const destination = join(slotDir(slot), 'supabase');
  if (!existsSync(source)) throw new Error(`${source} does not exist — there is no project to give the slot`);

  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, {
    recursive: true,
    filter: (from) => {
      const rel = relative(source, from).split(/[\\/]/);
      if (rel[0] !== 'migrations' || rel.length !== 2) return true;
      return MIGRATION_FILE.test(rel[1]);
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

export function readReservation(slot: number): Reservation | null {
  try {
    return JSON.parse(readFileSync(reservationPath(slot), 'utf8')) as Reservation;
  } catch {
    return null;
  }
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
    let occupiedBy: Holder | null = null;
    if (config) {
      try {
        occupiedBy = JSON.parse(readFileSync(stackLockPath(config), 'utf8')) as Holder;
      } catch {
        occupiedBy = null;
      }
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
 */
export function occupy(requirement: string, options: OccupyOptions = {}): Occupancy {
  let slot: number;
  let item: string | null = null;
  let via: 'reservation' | 'override';

  if (options.slot !== undefined) {
    slot = assertSlotNumber(options.slot);
    item = options.item ?? null;
    via = 'override';
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
    throw new Error(`slot ${slot} has no config at ${configPath} — the pool has not been set up on this machine. Run \`bun tests/at/harness/db-pool.ts setup\`.`);
  }
  refusePersonal(readFileSync(configPath, 'utf8'), REPO_ROOT, `occupy slot ${slot}`);

  const config = readLocalConfig(dir);
  const claim = acquireStackLock(config, requirement, { takeover: 'dead-pid-only' });

  // The reservation is re-read AFTER the claim. Between the lookup above and this line the
  // coordinator may have released the slot and given it to another item, and a run that resets a
  // database another item now owns is the exact collision this pool exists to prevent.
  if (via === 'reservation' && item !== null) {
    const still = readReservation(slot);
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

/** Run the pinned CLI against one slot. Raw output is never printed: `supabase start` prints keys. */
function runSlotCli(slot: number, args: string[], what: string): void {
  const res = spawnSync(bunExecutable(), supabaseArgs('--workdir', slotDir(slot), ...args), {
    cwd: REPO_ROOT,
    env: childEnv(),
    encoding: 'utf8',
  });
  if (res.error) {
    throw new Error(`could not launch the Supabase CLI to ${what} slot ${slot} (${diagnostic((res.error as Error).message)})`);
  }
  if (res.status !== 0) {
    throw new Error(`\`supabase ${args.join(' ')}\` could not ${what} slot ${slot} (exit ${res.status}): ${diagnostic(res.stderr) || diagnostic(res.stdout) || '(no error output)'}`);
  }
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

  mirrorItemTree(itemRoot, slot);

  const configPath = slotConfigPath(slot);
  if (!existsSync(configPath) || readFileSync(configPath, 'utf8') !== generated) {
    mkdirSync(join(dir, 'supabase'), { recursive: true });
    writeFileSync(configPath, generated, 'utf8');
  }

  const hash = hashConfig(generated);
  const marker = readMarker(slot);
  const restarted = marker?.configHash !== hash;
  if (restarted) {
    // The auth container reads config at START, not at reset, so a changed config that is not
    // restarted into would grade the previous item's auth behaviour.
    console.log(`at:verify — db slot ${slot} configuration changed since its last start; restarting the slot's stack`);
    runSlotCli(slot, ['stop'], 'stop');
    runSlotCli(slot, ['start'], 'start');
    const proven: StartMarker = { configHash: hash, at: new Date().toISOString(), pid: process.pid };
    writeFileSync(slotMarkerPath(slot), JSON.stringify(proven), 'utf8');
  }

  const status = readStackStatus(dir);
  const problems = localStackProblems(status, occupancy.config);
  if (problems.length) {
    throw new Error(
      `the stack that answered for slot ${slot} is not provably the local development stack, so nothing was reset ` +
        `and nothing was run. Failed checks: ${problems.join('; ')}. (Values are deliberately not printed.)`,
    );
  }

  await waitForReady(status, `before the slot ${slot} reset`);
  await resetLocalDatabase(dir);
  await waitForReady(status, `after the slot ${slot} reset`);
  const migrations = await proveMigrationsReplayed(status, itemRoot);

  return { status, migrations, restarted };
}

/* ------------------------------------------------------------------------------- env and evidence */

/**
 * The coordinates a suite is allowed to see. Nothing else about the slot travels into the child,
 * and the personal guard runs here too: env is how a stack reaches a test, so emitting the wrong
 * one is as destructive as resetting the wrong one.
 */
export function stackEnv(occupancy: Occupancy, status: StackStatus): Record<string, string> {
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
 * The one line the verify transcript carries about the database it ran against: which slot, that
 * the reset happened, and what the migration state was. A green that cannot name its reset ran
 * against unknown state.
 */
export function evidence(occupancy: Occupancy, result: PrepareResult): string {
  return (
    `at:verify — db slot ${occupancy.slot} (${occupancy.config.projectId}, api ${occupancy.config.apiPort}) — ` +
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

    console.log(`  starting slot ${slot} — this pulls container images on a first run`);
    runSlotCli(slot, ['start'], 'start');
    writeFileSync(slotMarkerPath(slot), JSON.stringify({ configHash: hashConfig(generated), at: new Date().toISOString(), pid: process.pid }), 'utf8');

    const status = readStackStatus(dir);
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

function usage(): void {
  console.error('usage: bun tests/at/harness/db-pool.ts <setup|status>');
}

async function main(argv: string[]): Promise<number> {
  const command = argv[0] ?? '';
  if (command === 'setup') return setup();
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
