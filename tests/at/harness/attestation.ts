/**
 * THE SLOT ATTESTATION — the round trip that turns four strings into positive evidence.
 *
 * WHAT WAS WRONG WITH WHAT CAME BEFORE. The child process receives four plain strings from
 * `db-pool.ts`'s `stackEnv()`: an API URL, a database URL, an anon key and a service-role key. The
 * runner checks their SHAPE — loopback host, the slot's own port, a JWT issued by the local
 * development issuer, no hosted project reference. Every one of those checks passes on strings a
 * caller typed, with no database answering anywhere. They are a GUARD, and a good one: their job is
 * to make the founder's personal stack unreachable, and they do it. They are not grounds for calling
 * anything real.
 *
 * WHAT THIS FILE ESTABLISHES INSTEAD. `prepare()` mints a nonce for THIS run and writes it into the
 * slot's database with operator authority, AFTER the reset — so the value cannot be a leftover from
 * a previous run, because the reset destroyed everything that was there. The child receives the same
 * nonce as `AT_SLOT_ATTESTATION`. `attestSlot()` below then reads the nonce back THROUGH THE
 * COORDINATES IT WAS HANDED and compares. The claim it can then make is small and exact:
 *
 *   "the database at the coordinates this child was given answered with the value this run's runner
 *    minted after its reset."
 *
 * A fabricated but well-formed set of coordinates fails it: the database at the other end either
 * does not answer, or answers with no row, or answers with a different nonce. All three refuse.
 *
 * WHERE IT IS WRITTEN, and why not in a migration. The table lives in its own `at_runtime` schema,
 * created by the runner, and no migration mentions it. That is deliberate twice over: the migration
 * set is what `proveMigrationsReplayed()` compares against `supabase/migrations`, so adding a
 * migration for test scaffolding would make the schema under test differ from the product's; and the
 * reset drops the whole database, so the schema is recreated per run rather than accumulating.
 *
 * WHAT IT DOES NOT ESTABLISH, said plainly. It does not prove the slot is not the personal stack —
 * `personalBlockProblems()` and `localStackProblems()` do that, they still run, and this file does
 * not replace them. It does not prove the schema is correct, or that anything in the product works.
 * It proves one thing: these coordinates reach the database this run prepared.
 */

import { stampAttestation, SLOT_ATTESTATION_BRAND, type LiveAttestation } from './capabilities.ts';

/** The env var the runner uses to carry the nonce into the child. */
export const ATTESTATION_ENV = 'AT_SLOT_ATTESTATION';

/** The schema and table the runner writes the nonce into. Never named by any migration. */
export const ATTESTATION_SCHEMA = 'at_runtime';
export const ATTESTATION_TABLE = 'slot_attestation';

interface BunSqlClient {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  close(): Promise<void>;
}
type BunSqlCtor = new (url: string) => BunSqlClient;

function sqlConstructor(): BunSqlCtor {
  const SQL = (globalThis as { Bun?: { SQL?: BunSqlCtor } }).Bun?.SQL;
  if (!SQL) throw new Error('this runtime has no SQL client (expected bun) — the slot attestation cannot be read back');
  return SQL;
}

/** A nonce with enough entropy that guessing it is not a strategy, and no meaning of its own. */
export function mintAttestationNonce(): string {
  return `at-${Date.now().toString(36)}-${crypto.randomUUID()}`;
}

/**
 * WHAT A WRITE OF THE ATTESTATION IS AIMED AT. A project id, exactly as a CLI target names one.
 *
 * It is a structural type rather than an import of `CliTarget`, so this file keeps its single
 * dependency on `capabilities.ts` and adds no cycle with the runner. A `CliTarget` satisfies it.
 */
export interface AttestationTarget {
  projectId: string;
}

/**
 * WHAT A PRE-DESTRUCTIVE IDENTITY READ PROVED, as this file needs it — the same object
 * `proveSlotTarget()` returns, described structurally for the reason above.
 *
 * The DATABASE URL COMES OUT OF THE READ, and that is the whole point of taking the read at all: an
 * importer cannot hand this function a proof of one database and the coordinates of another, because
 * there is no second parameter to disagree with the first.
 */
export interface ProvenSlotRead {
  /** the project id the identity read POSITIVELY proved, or null when it proved none */
  provenProjectId: string | null;
  /** the stack's own report, when a stack answered — the dbUrl is read from here and nowhere else */
  status: { dbUrl: string } | null;
}

/**
 * Write this run's nonce into the slot database with operator authority. Called by `prepare()`,
 * AFTER the reset and after the migration-set proof, so nothing it writes can be mistaken for
 * migrated schema and nothing that survived a reset can be mistaken for it.
 *
 * THE PROOF TRAVELS IN (gate-2 ruling S1-1, and the same idiom as `resetLocalDatabase`). This
 * function DELETES a table and writes a row, on whatever database it is pointed at. It used to take
 * a bare URL, so the guard that makes the aim safe — `prepare()` proving the slot first — lived at
 * the one call site rather than on the destructive path, and any importer could aim it at an
 * unproven database and still compile. Now the target demands the read that proved that target, and
 * the URL is read OUT of that proof: a proof naming another project, a proof naming none, and a read
 * where no stack answered are all named refusals here, before any connection is opened.
 */
export async function writeAttestation(target: AttestationTarget, read: ProvenSlotRead, nonce: string): Promise<void> {
  if (read.provenProjectId !== target.projectId) {
    throw new Error(
      `REFUSING TO WRITE THE ATTESTATION INTO ${target.projectId}: the identity read handed to this write ` +
        `${read.provenProjectId ? `proves ${read.provenProjectId}` : 'proves no project at all'}, not ${target.projectId}. ` +
        `This write deletes and rewrites a table, so it is only permitted on the read that proved that target. ` +
        `Nothing was done.`,
    );
  }
  if (!read.status?.dbUrl.trim()) {
    throw new Error(
      `REFUSING TO WRITE THE ATTESTATION INTO ${target.projectId}: the identity read carries no stack report, so it ` +
        `names no database to write into. Nothing was done.`,
    );
  }
  const SQL = sqlConstructor();
  const sql = new SQL(read.status.dbUrl);
  try {
    await sql`create schema if not exists at_runtime`;
    await sql`create table if not exists at_runtime.slot_attestation (nonce text primary key, minted_at timestamptz not null default now())`;
    // ONE ROW, ALWAYS. A table that accumulated nonces would let a stale one satisfy a later run's
    // read, which is exactly the leftover this whole mechanism exists to exclude.
    await sql`delete from at_runtime.slot_attestation`;
    await sql`insert into at_runtime.slot_attestation (nonce) values (${nonce})`;
  } finally {
    await sql.close().catch(() => undefined);
  }
}

export interface AttestationCoordinates {
  /** the database URL the child was handed — the coordinates under test, never a second copy */
  dbUrl: string;
  /** the nonce the child was handed */
  nonce: string;
  /** what to call the slot in the evidence line; never a credential */
  label: string;
  /**
   * A SELFTEST SEAM, and the harness passes it nowhere.
   *
   * `live-ledger.selftest.ts` runs under vitest at the loop tier, in CI, with no database anywhere.
   * Every refusal below is a rule about what an answer means, and a rule nothing exercises is a rule
   * nobody knows works — this seam is how the four refusals are driven without a container.
   *
   * IT CANNOT BE A WAY ROUND THE ROUND TRIP. Whatever it returns is put through the SAME comparison
   * as a real read, so the only thing it can do is supply an answer; it cannot supply a verdict, and
   * an answer that does not carry this run's nonce still refuses. The seam substitutes the database,
   * never the judgement — the same split `oracles.ts` draws for its transport.
   */
  readNonce?: (dbUrl: string) => Promise<string[]>;
}

/**
 * Read the nonce back through the supplied coordinates, or REFUSE.
 *
 * Every refusal names the check that failed and never the value that failed it — the same rule the
 * runner's own validation follows, because a connection string is a credential.
 */
export async function attestSlot(coordinates: AttestationCoordinates): Promise<LiveAttestation> {
  const { dbUrl, nonce, label } = coordinates;
  if (!dbUrl.trim()) throw new Error('refusing to attest the slot: no database URL reached this child');
  if (!nonce.trim()) {
    throw new Error(
      `refusing to attest the slot: this child received no ${ATTESTATION_ENV}, so there is no runner-minted value ` +
        'to read back and no positive evidence can exist. Run the suite through `at:verify --tier integration`.',
    );
  }

  const read =
    coordinates.readNonce ??
    (async (url: string): Promise<string[]> => {
      const SQL = sqlConstructor();
      const sql = new SQL(url);
      try {
        const rows = (await sql`select nonce from at_runtime.slot_attestation`) as { nonce?: unknown }[];
        return rows.map((row) => String(row?.nonce ?? ''));
      } finally {
        await sql.close().catch(() => undefined);
      }
    });

  let rows: string[];
  try {
    rows = await read(dbUrl);
  } catch (err) {
    throw new Error(
      `refusing to attest the slot: the database at the supplied coordinates did not answer the attestation read ` +
        `(${(err as Error).message.split('\n')[0]}). Well-formed coordinates that nothing answers are not evidence.`,
    );
  }

  if (rows.length !== 1) {
    throw new Error(
      `refusing to attest the slot: the attestation table held ${rows.length} rows, not the single row this run's ` +
        'prepare step writes after its reset.',
    );
  }
  if (rows[0] !== nonce) {
    throw new Error(
      'refusing to attest the slot: the database at the supplied coordinates answered with a value that is not the ' +
        "one this run's runner minted. Those coordinates address a different database, or one this run did not prepare.",
    );
  }

  const attestation: LiveAttestation = {
    evidence: `${label}: the database at the supplied coordinates answered with this run's runner-minted attestation nonce`,
    constructedFor: SLOT_ATTESTATION_BRAND,
  };
  return stampAttestation({ ...attestation }, attestation);
}

/** The coordinates a child was handed, read off its own environment. Absent values stay empty. */
export function attestationCoordinatesFromEnv(): { dbUrl: string; nonce: string } {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  return { dbUrl: env.AT_SUPABASE_DB_URL ?? '', nonce: env[ATTESTATION_ENV] ?? '' };
}
