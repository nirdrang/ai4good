/**
 * REQ-016's LIVE adapter: the integration tier's binding of the notification core to the one
 * local stack.
 *
 * READ THIS BEFORE TRUSTING A GREEN FROM THE INTEGRATION TIER. `_fixture.ts` binds the same core to
 * memory, so a loop green says the product's DECISIONS are right. This file binds the same six
 * ports to the stack, so an integration green additionally says the schema, the definers, the
 * privileges and the SMTP path behave:
 *
 *   - the OUTBOX is `public.fixture_commit_transition_and_emit`, one call and one transaction,
 *     then `public.apply_delivery_results` for each worker pass, and three reads as the operator;
 *   - the PROVIDER is the product's own SMTP module, `notification-provider.ts`, pointed at the
 *     stack's mail catcher on the port `supabase/config.toml` states. Nothing here sends;
 *   - the DIRECTORY is SQL: the NGO is the seat holder of this world's organisation, the volunteer
 *     is the developer seat of this world's project, the administrator and the ex-volunteer are the
 *     world's own record because nothing in this schema stores either per scope;
 *   - the CLOCK is the wall clock and the PROCESS is an identity string a restart replaces.
 *
 * EVERY READ IS SCOPED TO THE OPEN WORLD'S ACTOR IDS, and that is not bookkeeping. One integration
 * run shares one database and the reliability id opens twenty-two worlds against it. Deliveries are
 * selected by recipient, events by the ids those deliveries name, ops items by those events, and
 * the worker's pending set the same way, so a fresh world observes nothing an earlier world wrote.
 * A crashed emit leaves no delivery and therefore no event, which is exactly the answer the
 * atomicity id reads.
 *
 * ============================================================================================
 * WHAT IS NOT BACKED YET, AND HOW IT SAYS SO
 * ============================================================================================
 *
 * This file's existence turns every id of the suite from the declared stand-in refusal into a
 * real run. The methods a later unit lands throw `CapabilityPending` naming themselves, one name
 * each, exactly as the auth suite's live adapter does, and `tests/at/expected/req-016.json`
 * declares each id red on exactly that name until its unit lands: arming the provider point.
 *
 * THE CRASH FAULT IS AN ARGUMENT OF THE PRODUCER'S OWN CALL. `append` reads the crash switch
 * immediately before the call and forwards it as `p_induce_fault`; nothing in the product reads a
 * control table or a session setting. The reach is counted by TWO WITNESSES that record on
 * different sides of the wire: the product takes `nextval` on a sequence immediately before it
 * raises, which the rollback cannot undo, and the adapter counts the refusals it received carrying
 * the raise's own `detail`. `triggerCount()` refuses when they differ. They can differ: a product
 * that took the sequence and then stopped raising, or an error swallowed between the database and
 * this file, advances the sequence with no refusal; a refusal that arrived without the sequence
 * moving was raised by something other than the product's fault point. Both are reads inside
 * `append`, because the harness calls `arm` and `triggerCount` synchronously and neither can await.
 *
 * The sentinel scope is registered and its read refuses by name. `AdapterSentinelSeam.read` is
 * synchronous and a SQL read is not, so a live scope cannot answer through that seam without a
 * harness change, which this item does not make. No body scans it; the bodies read delivery
 * bodies through `sut.deliveries()`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createSmtpProvider } from '../../../../supabase/functions/_shared/notification-provider.ts';
import {
  createNotifications,
  TAXONOMY_PORT,
  type DeliveryRow,
  type DirectoryPort,
  type GuardConfig,
  type NotificationEventRow,
  type NotificationState,
  type Notifications,
  type OpsItemRow,
  type OutboxPort,
  type RoleHolder,
  type ThreadCommentGuard,
} from '../../../../supabase/functions/_shared/notifications.ts';
import type { AdapterFaultSeam } from '../../harness/faults.ts';
import { mailIdentification, sqlClient, type Stack } from '../../harness/live-stack.ts';
import { CapabilityPending } from '../../harness/pending.ts';
import type { AdapterSentinelSeam } from '../../harness/sentinels.ts';
import type { EmitResult, NotificationsSut, World } from './_contract.ts';
import { createCrashSwitch } from './_fault-switch.ts';
import { producerPayload } from './_fixture-producers.ts';
import type { Channel, Role } from './taxonomy.ts';

/** THE SELF-DECLARATION the loader checks against the requirement it was asked for. */
export const requirement = 'req-016' as const;

const FAULT_POINT = 'notifications.between_transition_and_event_write';
const PROVIDER_FAULT_POINT = 'notifications.provider_send';
const SENTINEL_SCOPE = 'notifications.delivery_bodies';
const SENDER_ADDRESS = 'notifications@ai4good.local';
const SMTP_TIMEOUT_MS = 10_000;
const ROLES: readonly Role[] = ['ngo', 'volunteer', 'ex_volunteer', 'platform_admin'];

const CONFIG_TOML = fileURLToPath(new URL('../../../../supabase/config.toml', import.meta.url));

/**
 * THE CATCHER'S SMTP PORT, read from `supabase/config.toml` because the runner hands the adapter
 * only the five stack coordinates and the SMTP port is not one of them. It is read from the file
 * rather than remembered so there is one statement of the number in the tree. A config with no
 * `smtp_port` is a refusal: the stack then exposes no SMTP listener and nothing here could send.
 */
function smtpPortFromConfig(): number {
  const text = readFileSync(CONFIG_TOML, 'utf8');
  const section = /^\[local_smtp\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/m.exec(text)?.[1] ?? '';
  const port = /^\s*smtp_port\s*=\s*(\d+)\s*$/m.exec(section)?.[1];
  if (!port) {
    throw new Error(
      'refusing to build the live notification provider: supabase/config.toml states no [local_smtp] smtp_port, so the ' +
        'mail catcher exposes no SMTP listener to send to',
    );
  }
  return Number(port);
}

/** A Postgres array literal of uuids. The client binds a JavaScript array as a bare list, measured. */
function uuidArray(ids: readonly string[]): string {
  for (const id of ids) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error(`${JSON.stringify(id)} is not a uuid, so it cannot enter an array literal`);
  }
  return `{${ids.join(',')}}`;
}

function parseJson<T>(value: unknown): T {
  return (typeof value === 'string' ? JSON.parse(value) : value) as T;
}

/**
 * ONE SQL CLIENT PER PROCESS, shared by every adapter this file builds. The client opens a pool of
 * about ten connections as soon as it is used (measured on the stack: 27 sessions at idle with one
 * client, 73 with six), the atomicity id opens twenty-two adapters, and the registry tears them
 * down together after the body. Twenty-two pools against a hundred-slot database left the auth
 * service no slot to check an email with, and provisioning answered 500. The last adapter to tear
 * down closes the client.
 */
let sharedSql: { client: ReturnType<typeof sqlClient>; holders: number } | null = null;

function acquireSql(stack: Stack): ReturnType<typeof sqlClient> {
  if (!sharedSql) sharedSql = { client: sqlClient(stack), holders: 0 };
  sharedSql.holders += 1;
  return sharedSql.client;
}

async function releaseSql(): Promise<void> {
  if (!sharedSql) return;
  sharedSql.holders -= 1;
  if (sharedSql.holders > 0) return;
  const { client } = sharedSql;
  sharedSql = null;
  await client.close().catch(() => undefined);
}

/** What one open world holds: its scope for the transition ledger, its actors, and its sources. */
interface LiveWorldRecord {
  name: string;
  scopeId: string;
  actors: Record<Role, string>;
  addresses: Record<Role, string>;
  /** every account this world has ever seated, so a reassigned holder still appears in scoped reads */
  knownActorIds: string[];
  organizationId: string;
  projectId: string;
}

function accountTypeFor(role: Role): 'ngo' | 'volunteer' | 'platform_admin' {
  if (role === 'platform_admin') return 'platform_admin';
  if (role === 'ngo') return 'ngo';
  return 'volunteer';
}

/**
 * The live factory receives only `{ stack }`, so the pinned guard numbers reach it through the
 * world name `req-016/guard?cap=<n>&window=<ms>&coalesce=<bool>`. A name with no query carries no pin.
 */
function guardConfigFromWorldName(name: string): GuardConfig | null {
  const queryIndex = name.indexOf('?');
  if (queryIndex < 0) return null;
  const params = new URLSearchParams(name.slice(queryIndex + 1));
  const capText = params.get('cap');
  const windowText = params.get('window');
  const coalesceText = params.get('coalesce');
  if (capText === null || windowText === null || coalesceText === null) {
    throw new Error(
      `fixture world ${JSON.stringify(name)} names a guard pin but is missing cap, window or coalesce`,
    );
  }
  const cap = Number(capText);
  const windowMs = Number(windowText);
  if (!Number.isInteger(cap) || cap < 1 || !Number.isInteger(windowMs) || windowMs < 1) {
    throw new Error(`fixture world ${JSON.stringify(name)} carries a guard pin that is not a positive integer cap and window`);
  }
  if (coalesceText !== 'true' && coalesceText !== 'false') {
    throw new Error(`fixture world ${JSON.stringify(name)} carries a coalesce pin that is not true or false`);
  }
  return { cap, windowMs, coalesce: coalesceText === 'true' };
}

class NotificationLiveWorld implements World {
  readonly actors: Record<Role, string>;
  readonly addresses: Record<Role, string>;

  constructor(
    readonly record: LiveWorldRecord,
    private readonly core: Notifications,
    private readonly transitionOf: (scopeId: string, event: string) => Promise<boolean>,
    private readonly moveRole: (world: NotificationLiveWorld, role: Role, label: string) => Promise<string>,
    private readonly commentGuard: ThreadCommentGuard | null,
  ) {
    this.actors = record.actors;
    this.addresses = record.addresses;
  }

  async fire(event: string, params: Record<string, unknown> = {}): Promise<{ eventId: string }> {
    const outcome = await this.core.emit({ event, actor: null, params: producerPayload(event, params) });
    if (!outcome.accepted) throw new Error(`fixture cannot fire unregistered notification event ${JSON.stringify(event)}: ${outcome.reason}`);
    return { eventId: outcome.eventId };
  }

  async transitionCommitted(event: string): Promise<boolean> {
    return this.transitionOf(this.record.scopeId, event);
  }

  async reassignRole(role: Role, toActorId: string): Promise<string> {
    return this.moveRole(this, role, toActorId);
  }

  async burstThreadComments(count: number): Promise<void> {
    if (!this.commentGuard) {
      throw new Error(
        `fixture world ${JSON.stringify(this.record.name)} has no thread-comment guard pin in its name, so a burst cannot run`,
      );
    }
    for (let index = 0; index < count; index++) {
      if (this.commentGuard.allow()) await this.fire('thread.comment');
    }
  }

  async teardown(): Promise<void> {
    // The runner reset the database before the run; a world is a namespace, not a container.
  }
}

export async function createLiveAdapter(opts: { stack: Stack }): Promise<{
  sut: { notifications: NotificationsSut };
  fixtures: { world(name: string): Promise<NotificationLiveWorld> };
  faults: AdapterFaultSeam;
  sentinels: AdapterSentinelSeam;
  teardown(): Promise<void>;
}> {
  const { stack } = opts;
  const api = stack.apiUrl.replace(/\/$/, '');
  await mailIdentification(stack);
  const sql = acquireSql(stack);

  const rows = async <T>(query: Promise<unknown>): Promise<T[]> => (await query) as T[];

  const openedWorlds: NotificationLiveWorld[] = [];
  let currentWorld: NotificationLiveWorld | null = null;
  const scopedActors = (): string => uuidArray([...new Set(openedWorlds.flatMap((world) => world.record.knownActorIds))]);
  const requireWorld = (act: string): NotificationLiveWorld => {
    if (!currentWorld) throw new Error(`no fixture world is open, so there is no scope to ${act}`);
    return currentWorld;
  };

  let processEpoch = `delivery-process-${crypto.randomUUID()}`;

  /* ------------------------------------------------------------------------ the crash switch */

  const crash = createCrashSwitch(
    FAULT_POINT,
    () => ({ sequenceAdvances: 0, refusals: 0 }),
    (ledger) => {
      if (ledger.sequenceAdvances !== ledger.refusals) {
        throw new Error(
          `the two witnesses of the fault at ${JSON.stringify(FAULT_POINT)} disagree: the product's sequence advanced ` +
            `${ledger.sequenceAdvances} time(s) while the adapter received ${ledger.refusals} induced refusal(s), so one ` +
            `of them counted a reach the other never saw`,
        );
      }
      return ledger.sequenceAdvances;
    },
  );

  // `pg_sequence_last_value` answers null for a sequence never called, hence the coalesce; it is
  // read from the relation, not the session, so a value taken on another connection is visible.
  const faultTriggers = async (): Promise<number> => {
    const found = await rows<{ triggers: unknown }>(
      sql`select coalesce(pg_sequence_last_value('public.notification_fault_triggers'::regclass), 0)::bigint as triggers`,
    );
    return Number(found[0]?.triggers ?? 0);
  };

  const inducedRefusal = (error: unknown): boolean =>
    (error as { detail?: unknown } | null)?.detail === `induced-fault:${FAULT_POINT}`;

  /* ------------------------------------------------------------------------- the outbox port */

  const outbox: OutboxPort = {
    /**
     * ONE CALL, ONE TRANSACTION. The fixture producer performs this world's transition, reaches the
     * fault point, and calls `public.emit_notification` with the whole write set. The third
     * argument is the crash switch, read here and nowhere else. While it is armed the sequence is
     * read on both sides of the call, so a reach the product recorded is counted whether or not the
     * call refused; the refusal is counted only when it carries the raise's own detail.
     */
    append: async (write) => {
      const world = requireWorld('commit a transition against');
      const armed = crash.armed();
      const triggersBefore = armed ? await faultTriggers() : 0;
      let minted: { event_id: string }[];
      try {
        minted = await rows<{ event_id: string }>(
          sql`select public.fixture_commit_transition_and_emit(${world.record.scopeId}, ${JSON.stringify(write)}::text::jsonb, ${armed !== null}::boolean) as event_id`,
        );
      } catch (error) {
        if (armed && inducedRefusal(error)) armed.refusals += 1;
        throw error;
      } finally {
        if (armed) armed.sequenceAdvances += (await faultTriggers()) - triggersBefore;
      }
      const eventId = String(minted[0]?.event_id ?? '');
      if (!eventId) throw new Error('the fixture producer returned no event id');
      return { eventId };
    },

    pending: async () => {
      const found = await rows<{
        id: string;
        event_id: string;
        recipient_id: string;
        recipient_address: string | null;
        channel: Channel;
        subject: string;
        body: string;
        idempotency_key: string;
      }>(
        sql`select id, event_id, recipient_id, recipient_address, channel, subject, body, idempotency_key
              from public.notification_deliveries
             where recipient_id = any(${scopedActors()}::uuid[]) and state <> 'sent'
             order by created_at, id`,
      );
      return found.map((row) => ({
        id: String(row.id),
        eventId: String(row.event_id),
        recipientId: String(row.recipient_id),
        address: row.recipient_address === null ? null : String(row.recipient_address),
        channel: row.channel,
        subject: row.subject,
        body: row.body,
        idempotencyKey: row.idempotency_key,
      }));
    },

    applyPassResults: async (results, epoch) => {
      await sql`select public.apply_delivery_results(${JSON.stringify(results)}::text::jsonb, ${epoch})`;
    },

    events: async (filter) => {
      const type = filter?.type ?? null;
      const found = await rows<{ id: string; event: string; recipients: unknown; state: NotificationState; attempts: number }>(
        sql`select id, event, recipients, state, attempts
              from public.notification_events
             where id in (select event_id from public.notification_deliveries where recipient_id = any(${scopedActors()}::uuid[]))
               and (${type}::text is null or event = ${type}::text)
             order by created_at, id`,
      );
      return found.map(
        (row): NotificationEventRow => ({
          id: String(row.id),
          type: row.event,
          recipients: parseJson<{ role: Role; recipientId: string; channels: Channel[] }[]>(row.recipients).map((recipient) => ({
            role: recipient.role,
            recipientId: recipient.recipientId,
            channels: [...recipient.channels],
          })),
          state: row.state,
          attempts: Number(row.attempts),
        }),
      );
    },

    deliveries: async (filter) => {
      const type = filter?.type ?? null;
      const found = await rows<{
        event_id: string;
        event: string;
        role: Role;
        recipient_id: string;
        channel: Channel;
        state: NotificationState;
        emitted_by: string;
        delivered_by_process: string | null;
        payload: unknown;
        body: string;
      }>(
        sql`select event_id, event, role, recipient_id, channel, state, emitted_by, delivered_by_process, payload, body
              from public.notification_deliveries
             where recipient_id = any(${scopedActors()}::uuid[])
               and (${type}::text is null or event = ${type}::text)
             order by created_at, id`,
      );
      return found.map(
        (row): DeliveryRow => ({
          eventId: String(row.event_id),
          type: row.event,
          role: row.role,
          recipientId: String(row.recipient_id),
          channel: row.channel,
          state: row.state,
          emittedBy: row.emitted_by,
          deliveredByProcess: row.delivered_by_process === null ? null : String(row.delivered_by_process),
          payload: parseJson<Record<string, unknown>>(row.payload),
          body: row.body,
        }),
      );
    },

    opsItems: async (filter) => {
      const linked = filter?.linkedEventId ?? null;
      const found = await rows<{ id: string; kind: string; linked_event_id: string | null }>(
        sql`select id, kind, linked_event_id
              from public.notification_ops_items
             where linked_event_id in (select event_id from public.notification_deliveries where recipient_id = any(${scopedActors()}::uuid[]))
               and (${linked}::uuid is null or linked_event_id = ${linked}::uuid)
             order by created_at, id`,
      );
      return found.map(
        (row): OpsItemRow => ({
          id: String(row.id),
          kind: row.kind,
          linkedEventId: row.linked_event_id === null ? null : String(row.linked_event_id),
        }),
      );
    },
  };

  /* ---------------------------------------------------------------------- the directory port */

  const directory: DirectoryPort = {
    resolve: async (roles) => {
      const world = requireWorld('resolve recipients in');
      const seat = await rows<{ account_id: string }>(
        sql`select account_id from public.org_memberships where org_id = ${world.record.organizationId}::uuid`,
      );
      const developer = await rows<{ assigned_volunteer_id: string | null }>(
        sql`select assigned_volunteer_id from public.projects where id = ${world.record.projectId}::uuid`,
      );
      const ids: Partial<Record<Role, string>> = {
        ngo: seat[0]?.account_id === undefined ? undefined : String(seat[0].account_id),
        volunteer: developer[0]?.assigned_volunteer_id ? String(developer[0].assigned_volunteer_id) : undefined,
        platform_admin: world.record.actors.platform_admin,
        ex_volunteer: world.record.actors.ex_volunteer,
      };
      const wanted = roles.map((role) => ids[role]).filter((id): id is string => id !== undefined);
      const users = wanted.length
        ? await rows<{ id: string; email: string | null }>(sql`select id, email from auth.users where id = any(${uuidArray(wanted)}::uuid[])`)
        : [];
      const addressOf = new Map(users.map((user) => [String(user.id), user.email === null ? null : String(user.email)]));
      const holders: Partial<Record<Role, RoleHolder>> = {};
      for (const role of roles) {
        const id = ids[role];
        if (id === undefined) continue;
        holders[role] = { recipientId: id, address: addressOf.get(id) ?? null };
      }
      return holders;
    },
  };

  /* ------------------------------------------------------------------------------ the core */

  const core = createNotifications({
    taxonomy: TAXONOMY_PORT,
    outbox,
    provider: createSmtpProvider({
      host: new URL(stack.mailUrl).hostname,
      port: smtpPortFromConfig(),
      sender: SENDER_ADDRESS,
      timeoutMs: SMTP_TIMEOUT_MS,
    }),
    directory,
    clock: { now: () => Date.now() },
    process: { epoch: () => processEpoch },
  });

  const sut: NotificationsSut = {
    senders: async () => core.senders(),
    taxonomy: async () => core.taxonomy(),
    documentedDefaults: async () => core.documentedDefaults(),
    runtimeRegistrationSurface: async () => core.runtimeRegistrationSurface(),
    emit: async (request): Promise<EmitResult> =>
      core.emit({ event: request.type, actor: null, params: producerPayload(request.type, request.ctx) }),
    events: (filter) => core.events(filter),
    deliveries: (filter) => core.deliveries(filter),
    opsItems: (filter) => core.opsItems(filter),
    drainDeliveries: (opts) => core.drain(opts),
  };

  /* ------------------------------------------------------------------------------ the seams */

  const faults: AdapterFaultSeam = {
    points: () => [FAULT_POINT, PROVIDER_FAULT_POINT],
    arm: (point, kind) => {
      if (point !== FAULT_POINT) throw new CapabilityPending(['faults.at']);
      return crash.arm(kind);
    },
    processEpoch: () => processEpoch,
    processRestart: () => {
      processEpoch = `delivery-process-${crypto.randomUUID()}`;
    },
  };

  const sentinels: AdapterSentinelSeam = {
    scopes: () => [SENTINEL_SCOPE],
    read: () => {
      throw new CapabilityPending(['sentinels.scan']);
    },
  };

  /* ------------------------------------------------------------------------------ the world */

  const transitionOf = async (scopeId: string, event: string): Promise<boolean> => {
    const found = await rows<{ committed: boolean }>(
      sql`select committed from public.notification_fixture_transitions where scope_id = ${scopeId} and event = ${event}`,
    );
    return found[0]?.committed === true;
  };

  /**
   * AN AUTH USER, CREATED CONFIRMED, and its account row written by the operator. The admin API
   * with `email_confirm: true` sends no mail, so provisioning never touches the auth service's
   * per-hour mail limit, which matters for an id that opens twenty-two worlds. The account row is
   * written over the database connection, as the operator, which is the authority the auth suite's
   * `provisionPlatformAdmin` already uses and narrower than the service role.
   */
  const provisionAccount = async (email: string, accountType: 'ngo' | 'volunteer' | 'platform_admin'): Promise<string> => {
    const created = await fetch(`${api}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: stack.serviceRoleKey,
        Authorization: `Bearer ${stack.serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: `world-${crypto.randomUUID()}`, email_confirm: true }),
    });
    if (created.status >= 400) throw new Error(`provisioning the auth user ${email} answered ${created.status}`);
    const user = (await created.json()) as { id?: string };
    const accountId = String(user.id ?? '');
    if (!accountId) throw new Error(`the admin user API answered 200 for ${email} but named no user id`);
    await sql`insert into public.accounts (id, account_type) values (${accountId}::uuid, ${accountType}::public.account_type)`;
    return accountId;
  };

  /**
   * Mint a successor account, move the seat the directory actually reads, and keep the old holder
   * in knownActorIds so deliveries already addressed to them remain visible after the move.
   */
  const moveRole = async (world: NotificationLiveWorld, role: Role, label: string): Promise<string> => {
    const local = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const namespace = world.record.scopeId.replace(/[^a-z0-9]+/gi, '-');
    const email = `${local}+${namespace}@example.test`;
    const successor = await provisionAccount(email, accountTypeFor(role));
    world.record.knownActorIds.push(successor);
    if (role === 'ngo') {
      await sql`update public.org_memberships set account_id = ${successor}::uuid where org_id = ${world.record.organizationId}::uuid`;
    } else if (role === 'volunteer') {
      await sql`update public.projects set assigned_volunteer_id = ${successor}::uuid where id = ${world.record.projectId}::uuid`;
    }
    world.record.actors[role] = successor;
    world.record.addresses[role] = email;
    return successor;
  };

  /**
   * A FIXTURE WORLD: four real accounts, one organisation with the NGO in its seat, one project
   * with the volunteer in its seat. Addresses are namespaced per world so the catcher can be read
   * per world; the transition ledger is keyed by the same namespace so a fresh world reads its own
   * transitions and nobody else's.
   */
  const world = async (name: string): Promise<NotificationLiveWorld> => {
    const guardPin = guardConfigFromWorldName(name);
    const namespace = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const addresses = {} as Record<Role, string>;
    for (const role of ROLES) addresses[role] = `${role.replace('_', '-')}+${namespace}@example.test`;

    const actors: Record<Role, string> = {
      ngo: await provisionAccount(addresses.ngo, 'ngo'),
      volunteer: await provisionAccount(addresses.volunteer, 'volunteer'),
      ex_volunteer: await provisionAccount(addresses.ex_volunteer, 'volunteer'),
      platform_admin: await provisionAccount(addresses.platform_admin, 'platform_admin'),
    };

    const organisation = await rows<{ id: string }>(sql`insert into public.organizations (name) values (${`Fixture NGO ${namespace}`}) returning id`);
    const organizationId = String(organisation[0]?.id ?? '');
    if (!organizationId) throw new Error('the operator insert of the world organisation returned no row');
    await sql`insert into public.org_memberships (org_id, account_id, role) values (${organizationId}::uuid, ${actors.ngo}::uuid, 'admin'::public.org_role)`;

    const project = await rows<{ id: string }>(
      sql`insert into public.projects (org_id, name) values (${organizationId}::uuid, ${`Fixture project ${namespace}`}) returning id`,
    );
    const projectId = String(project[0]?.id ?? '');
    if (!projectId) throw new Error('the operator insert of the world project returned no row');
    await sql`update public.projects set assigned_volunteer_id = ${actors.volunteer}::uuid where id = ${projectId}::uuid`;

    const opened = new NotificationLiveWorld(
      {
        name,
        scopeId: `req-016/${namespace}`,
        actors,
        addresses,
        knownActorIds: Object.values(actors),
        organizationId,
        projectId,
      },
      core,
      transitionOf,
      moveRole,
      guardPin === null ? null : core.threadCommentGuard(guardPin),
    );
    openedWorlds.push(opened);
    currentWorld = opened;
    return opened;
  };

  return {
    sut: { notifications: sut },
    fixtures: { world },
    faults,
    sentinels,
    teardown: async () => {
      await releaseSql();
    },
  };
}
