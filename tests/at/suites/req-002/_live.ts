/**
 * REQ-002's LIVE adapter — the integration tier's binding of the organisation system under test to
 * the one local stack.
 *
 * Members this unit lands drive the deployed vetting route, operator SQL for the aggregate and its
 * audit rows, and the public signup path for an NGO. What an integration green means: the criterion
 * holds against a database this run rebuilt, the deployed edge function and the real Auth service.
 */

import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';
import { parseWriteRefusalKind } from '../../../../supabase/functions/_shared/write-routes.ts';
import type { Allowance, SpendRow } from '../../../../supabase/functions/_shared/discovery-allowance.ts';
import {
  discoveryMessageAllowed as decideDiscoveryMessage,
  emailVerifiedFromUser,
} from '../../../../supabase/functions/_shared/verification.ts';
import {
  publishingAllowed as decidePublishing,
  vettingAuditCurrentFromDetail,
  vettingRecordFromSql,
  type VettingSqlRow,
} from '../../../../supabase/functions/_shared/org-vetting.ts';
import {
  authPost,
  followLink,
  functionPost,
  functionPostRaw,
  mailIdentification,
  sqlClient,
  verifyLinksFor,
  type Stack,
} from '../../harness/live-stack.ts';
import type { NotificationState } from '../../../../supabase/functions/_shared/notifications.ts';
import type { Channel, Role } from '../../../../supabase/functions/_shared/notification-taxonomy.ts';
import type {
  AllowanceOutcome,
  DeliveryRow,
  NgoActor,
  OperatorWriteOutcome,
  OrganizationDashboard,
  OrganizationsSut,
  ProfileDefinerAttempt,
  ProfileDefinerOutcome,
  PublicProjectOutcome,
  PublicProjectView,
  Session,
  TenantReadOutcome,
  VettingAuditRow,
  VettingDefinerAttempt,
  VettingNotificationEvent,
  VettingOutcome,
  VettingRecord,
  VettingRequest,
  World,
  WriteRefusal,
} from './_contract.ts';

export const requirement = 'req-002' as const;

const PASSWORD = 'correct horse battery staple';
const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const CLIENT_IP = '203.0.113.7';
const SIGNER = {
  signerName: 'Dana Okonkwo',
  signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
} as const;

class OrganizationsLiveWorld implements World {
  constructor(private readonly namespace: string) {}

  email(local: string): string {
    return `${local}+${this.namespace}@example.test`;
  }

  async teardown(): Promise<void> {
    // The runner reset the database before the run; a world is a namespace, not a container.
  }
}

function notLanded(member: keyof OrganizationsSut): () => Promise<never> {
  return async () => {
    throw new Error(`REQ-002 live adapter: sut.organizations.${member} has not landed`);
  };
}

interface LiveSession {
  accessToken: string;
  refreshToken: string;
}

function databaseRefusal(error: unknown): { code: string; message: string; detail: string } {
  const carrier = error as Record<string, unknown> | null;
  let code = '';
  let detail = '';
  const walk = (value: unknown, depth: number): void => {
    if (value === null || typeof value !== 'object' || depth > 4) return;
    const record = value as Record<string, unknown>;
    if (code === '') {
      for (const field of ['errno', 'errcode', 'code'] as const) {
        const raw = record[field];
        if (typeof raw === 'string' && /^[0-9A-Z]{5}$/.test(raw)) {
          code = raw;
          break;
        }
      }
    }
    if (detail === '' && typeof record.detail === 'string' && record.detail.length > 0) {
      detail = record.detail;
    }
    walk(record.cause, depth + 1);
  };
  walk(error, 0);
  const message = typeof carrier?.message === 'string' ? carrier.message : String(error);
  return { code, message, detail };
}

function parseJson<T>(value: unknown): T {
  return (typeof value === 'string' ? JSON.parse(value) : value) as T;
}

function functionOutcome<T extends { ok: true }>(raw: { status: number; text: string }): TenantReadOutcome<T> {
  const answer = { status: raw.status, body: raw.text };
  if (raw.status !== 200) return { ok: false, answer };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.text) as unknown;
  } catch {
    return { ok: false, answer };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, answer };
  if ((parsed as { ok?: unknown }).ok !== true) return { ok: false, answer };
  return { ok: true, value: parsed as T, answer };
}

function isoDay(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function allowanceFromJson(json: Record<string, unknown>, organizationId: string): Allowance {
  return {
    organizationId: typeof json.organizationId === 'string' ? json.organizationId : organizationId,
    utcDay: typeof json.utcDay === 'string' ? json.utcDay.slice(0, 10) : '',
    vetted: json.vetted === true,
    dailyGrant: Number(json.dailyGrant),
    spentToday: Number(json.spentToday),
    remaining: Number(json.remaining),
  };
}

function claimsOf(token: string): { sub?: unknown; session_id?: unknown } {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as {
    sub?: unknown;
    session_id?: unknown;
  };
}

export async function createLiveAdapter(opts: { stack: Stack }): Promise<{
  sut: { organizations: OrganizationsSut };
  fixtures: { world(name: string): Promise<OrganizationsLiveWorld> };
  teardown(): Promise<void>;
}> {
  const { stack } = opts;
  const api = stack.apiUrl.replace(/\/$/, '');
  await mailIdentification(stack);
  const sql = sqlClient(stack);
  const sessions = new Map<string, LiveSession>();

  const rows = async <T>(query: Promise<unknown>): Promise<T[]> => (await query) as T[];

  const tokensOf = (session: Session, act: string): LiveSession => {
    const held = session.sessionId ? sessions.get(session.sessionId) : undefined;
    if (!held) {
      throw new Error(`refusing to ${act}: this handle names account ${session.accountId} and holds NO session`);
    }
    return held;
  };

  const postWrite = async (
    name: string,
    session: Session | null,
    body: Record<string, unknown>,
  ): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; json: Record<string, unknown>; refusal: WriteRefusal }> => {
    const bearer = session === null ? stack.anonKey : tokensOf(session, `call the deployed ${name}`).accessToken;
    const { status, json } = await functionPost(stack, name, body, bearer, CLIENT_IP);
    if (status < 400 && json.ok !== false) return { ok: true, json };
    const reason = String(json.reason ?? json.msg ?? json.message ?? `the deployed ${name} answered ${status}`);
    const kind = status === 401 ? 'unauthenticated' : parseWriteRefusalKind(json.kind);
    return { ok: false, json, refusal: { ok: false, kind, status, reason } };
  };

  const storePasswordGrant = async (email: string): Promise<Session> => {
    const signedIn = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password: PASSWORD });
    const accessToken = String(signedIn.json.access_token ?? '');
    if (!accessToken) throw new Error(`password grant for ${email} answered with no access token`);
    const claims = claimsOf(accessToken);
    const sessionId = String(claims.session_id ?? '');
    const accountId = String(claims.sub ?? '');
    sessions.set(sessionId, { accessToken, refreshToken: String(signedIn.json.refresh_token ?? '') });
    return { accountId, email, sessionId };
  };

  const sut: OrganizationsSut = {
    provisionNgo: async (email, opts): Promise<NgoActor> => {
      const { status, json } = await authPost(stack, '/auth/v1/signup', { email, password: PASSWORD });
      if (status >= 400) throw new Error(`the live signup for ${email} answered ${status}`);
      const accountId = String((json.id as string | undefined) ?? (json.user as { id?: string } | undefined)?.id ?? '');
      if (!accountId) throw new Error('the live signup answered 200 but named no user id');
      if (!opts.emailVerified) {
        const completed = await rows<{ organization_id: string | null }>(
          sql`
            select (public.complete_signup(
              ${accountId}::uuid,
              ${'ngo'},
              ${`Riverside ${email}`},
              ${TEXT_VERSION},
              ${CLIENT_IP}::inet,
              ${null},
              ${null},
              ${null},
              ${null},
              ${SIGNER.signerName},
              ${SIGNER.signerTitle},
              ${SIGNER.authorityAttestation}
            ))->>'organization_id' as organization_id
          `,
        );
        const organizationId = String(completed[0]?.organization_id ?? '');
        if (!organizationId) {
          throw new Error(`REQ-002 live adapter: operator NGO completion for ${email} named no organisation`);
        }
        return { session: { accountId, email, sessionId: '' }, accountId, organizationId, email };
      }
      const link = (await verifyLinksFor(stack, email, 'signup'))[0] ?? null;
      if (link === null) throw new Error(`no confirmation email reached the stack's mail catcher for ${email}`);
      const used = await followLink(link);
      if (used.status >= 400) throw new Error(`following the confirmation link for ${email} answered ${used.status}`);
      const session = await storePasswordGrant(email);
      const answer = await postWrite('complete-signup', session, {
        accountType: 'ngo',
        organizationName: `Riverside ${email}`,
        acknowledgmentTextVersion: TEXT_VERSION,
        ...SIGNER,
      });
      if (!answer.ok) throw new Error(`NGO completion for ${email} was refused: ${answer.refusal.reason}`);
      const organizationId = String(answer.json.organizationId ?? '');
      if (!organizationId) throw new Error(`NGO completion for ${email} named no organisation`);
      return { session, accountId: session.accountId, organizationId, email };
    },
    provisionVolunteer: async (email): Promise<Session> => {
      const { status, json } = await authPost(stack, '/auth/v1/signup', { email, password: PASSWORD });
      if (status >= 400) throw new Error(`the live volunteer signup for ${email} answered ${status}`);
      const accountId = String((json.id as string | undefined) ?? (json.user as { id?: string } | undefined)?.id ?? '');
      if (!accountId) throw new Error('the live volunteer signup answered 200 but named no user id');
      const link = (await verifyLinksFor(stack, email, 'signup'))[0] ?? null;
      if (link === null) throw new Error(`no confirmation email reached the stack's mail catcher for ${email}`);
      const used = await followLink(link);
      if (used.status >= 400) throw new Error(`following the confirmation link for ${email} answered ${used.status}`);
      const session = await storePasswordGrant(email);
      const githubHandle = `vol-${accountId.replace(/-/g, '').slice(0, 20)}`;
      const identityId = crypto.randomUUID();
      await sql`
        insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        values (
          ${identityId}::uuid,
          ${githubHandle},
          ${accountId}::uuid,
          ${JSON.stringify({ sub: githubHandle, user_name: githubHandle, provider_id: githubHandle })}::text::jsonb,
          'github',
          now(), now(), now()
        )
      `;
      const answer = await postWrite('complete-signup', session, {
        accountType: 'volunteer',
        acknowledgmentTextVersion: TEXT_VERSION,
        ...SIGNER,
      });
      if (!answer.ok) throw new Error(`volunteer completion for ${email} was refused: ${answer.refusal.reason}`);
      if (answer.json.organizationId) {
        throw new Error(`volunteer completion for ${email} created an organisation`);
      }
      return session;
    },
    provisionPlatformAdmin: async (email): Promise<Session> => {
      const created = await fetch(`${api}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          apikey: stack.serviceRoleKey,
          Authorization: `Bearer ${stack.serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
      });
      if (created.status >= 400) throw new Error(`provisioning a platform administrator answered ${created.status}`);
      const user = (await created.json()) as { id?: string };
      const accountId = String(user.id ?? '');
      if (!accountId) throw new Error('the admin user API answered 200 but named no user id');
      await sql`insert into public.accounts (id, account_type) values (${accountId}::uuid, 'platform_admin')`;
      return storePasswordGrant(email);
    },
    deactivateAccountAsOperator: async (accountId) => {
      const updated = await rows<{ id: string }>(
        sql`update public.accounts set lifecycle = 'deactivated' where id = ${accountId}::uuid returning id`,
      );
      if (updated.length !== 1) {
        throw new Error(`REQ-002 live adapter: no account ${accountId} to deactivate`);
      }
    },

    setProfile: async (session, request) => {
      const answer = await postWrite('set-organization-profile', session, request);
      if (!answer.ok) return answer.refusal;
      return { ok: true, organizationId: String(answer.json.organizationId ?? request.organizationId) };
    },
    profile: async (organizationId) => {
      const found = await rows<{
        id: string;
        name: string;
        mission: string | null;
        country: string | null;
        website: string | null;
        logo: string | null;
      }>(
        sql`select id, name, mission, country, website, logo from public.organizations where id = ${organizationId}::uuid`,
      );
      if (found.length !== 1) return null;
      return {
        id: String(found[0].id),
        name: found[0].name,
        mission: found[0].mission ?? null,
        country: found[0].country ?? null,
        website: found[0].website ?? null,
        logo: found[0].logo ?? null,
      };
    },
    organizationDashboard: async (session, organizationId): Promise<TenantReadOutcome<OrganizationDashboard>> => {
      const bearer = session === null ? null : tokensOf(session, 'call the deployed organization-dashboard').accessToken;
      const raw = await functionPostRaw(stack, 'organization-dashboard', { organizationId }, bearer);
      return functionOutcome<OrganizationDashboard>(raw);
    },
    attemptProfileDefinerAsOperator: async (input: ProfileDefinerAttempt): Promise<ProfileDefinerOutcome> => {
      const request = input.request;
      try {
        await sql`
          select public.set_organization_profile(
            ${input.accountId}::uuid,
            ${request.organizationId}::uuid,
            ${request.name},
            ${request.mission},
            ${request.country},
            ${request.website},
            ${request.logo}
          )
        `;
        return { ok: true, organizationId: request.organizationId };
      } catch (error) {
        const { message, detail } = databaseRefusal(error);
        return { ok: false, kind: parseWriteRefusalKind(detail), reason: message };
      }
    },
    setMembershipRoleAsOperator: async (organizationId, accountId, role) => {
      const updated = await rows<{ account_id: string }>(
        sql`update public.org_memberships
               set role = ${role}::public.org_role
             where org_id = ${organizationId}::uuid
               and account_id = ${accountId}::uuid
         returning account_id`,
      );
      if (updated.length !== 1) {
        throw new Error(`REQ-002 live adapter: no membership for ${accountId} in ${organizationId} to change`);
      }
    },

    setVetting: async (session, request: VettingRequest & Record<string, unknown>): Promise<VettingOutcome> => {
      const answer = await postWrite('set-organization-vetting', session, request);
      if (!answer.ok) return answer.refusal;
      const notificationEventId = answer.json.notificationEventId;
      return {
        ok: true,
        organizationId: String(answer.json.organizationId ?? request.organizationId),
        vetted: answer.json.vetted === true,
        changed: answer.json.changed === true,
        notificationEventId: typeof notificationEventId === 'string' ? notificationEventId : null,
      };
    },
    vettingRecord: async (organizationId): Promise<VettingRecord | null> => {
      const found = await rows<VettingSqlRow>(
        sql`select org_id, vetted, vetted_by_account_id, vetted_at, organization_name, public_reference_url,
                   contact_name, contact_title, authority_attestation, evidence_type, note,
                   registration_received_at, registration_document_count, registration_copies_deleted
              from public.org_vetting where org_id = ${organizationId}::uuid`,
      );
      if (found.length !== 1) return null;
      return vettingRecordFromSql(found[0]);
    },
    attemptVettingRowAsOperator: async (row): Promise<OperatorWriteOutcome> => {
      try {
        await sql`
          insert into public.org_vetting (
            org_id, vetted, vetted_by_account_id, vetted_at,
            organization_name, public_reference_url, contact_name, contact_title,
            authority_attestation, evidence_type, note,
            registration_received_at, registration_document_count, registration_copies_deleted
          ) values (
            ${row.organizationId}::uuid,
            ${row.vetted}::boolean,
            ${row.vettedByAccountId}::uuid,
            ${row.vettedAt}::timestamptz,
            ${row.organizationName},
            ${row.publicReferenceUrl},
            ${row.contactName},
            ${row.contactTitle},
            ${row.authorityAttestation},
            ${row.evidenceType},
            ${row.note},
            ${row.registrationReceivedAt ?? null}::timestamptz,
            ${row.registrationDocumentCount ?? null}::integer,
            ${row.registrationCopiesDeleted ?? null}::boolean
          )
        `;
        return { ok: true };
      } catch (error) {
        const { message } = databaseRefusal(error);
        return { ok: false, reason: message };
      }
    },
    removeOrganizationSeatAsOperator: async (organizationId) => {
      await sql`delete from public.org_memberships where org_id = ${organizationId}::uuid`;
      await sql`create unique index if not exists org_memberships_one_seat_per_org_idx on public.org_memberships (org_id)`;
    },
    addOrganizationSeatAsOperator: async (organizationId, accountId) => {
      await sql`drop index if exists public.org_memberships_one_seat_per_org_idx`;
      await sql`insert into public.org_memberships (org_id, account_id, role)
                values (${organizationId}::uuid, ${accountId}::uuid, 'admin'::public.org_role)`;
    },
    clearAccountEmailAsOperator: async (accountId) => {
      await sql`update auth.users set email = null where id = ${accountId}::uuid`;
    },
    attemptVettingDefinerAsOperator: async (input: VettingDefinerAttempt): Promise<OperatorWriteOutcome> => {
      const request = input.request;
      const notice = JSON.stringify(input.notice);
      const name = request.action === 'vet' ? request.organizationName : null;
      const url = request.action === 'vet' ? request.publicReferenceUrl : null;
      const contactName = request.action === 'vet' ? request.contactName : null;
      const contactTitle = request.action === 'vet' ? request.contactTitle : null;
      const attestation = request.action === 'vet' ? request.authorityAttestation : null;
      const evidenceType = request.action === 'vet' ? request.evidenceType : null;
      const receivedAt = request.action === 'vet' ? (request.registrationReceivedAt ?? null) : null;
      const documentCount = request.action === 'vet' ? (request.registrationDocumentCount ?? null) : null;
      const copiesDeleted = request.action === 'vet' ? (request.registrationCopiesDeleted ?? null) : null;
      try {
        await sql`
          select public.set_organization_vetting(
            ${input.accountId}::uuid,
            ${request.organizationId}::uuid,
            ${request.action},
            ${notice}::text::jsonb,
            ${name},
            ${url},
            ${contactName},
            ${contactTitle},
            ${attestation},
            ${evidenceType},
            ${request.note},
            ${receivedAt}::timestamptz,
            ${documentCount}::integer,
            ${copiesDeleted}::boolean
          )
        `;
        return { ok: true };
      } catch (error) {
        const { message } = databaseRefusal(error);
        return { ok: false, reason: message };
      }
    },

    vettingAuditEvents: async (organizationId): Promise<VettingAuditRow[]> => {
      const found = await rows<{
        id: string;
        occurred_at: string | Date;
        actor_account_id: string | null;
        actor_label: string;
        subject_org_id: string | null;
        reason: string;
        detail: unknown;
      }>(
        sql`select id, occurred_at, actor_account_id, actor_label, subject_org_id, reason, detail
              from public.audit_events
             where event_kind = 'org_vetting_changed'
               and subject_org_id = ${organizationId}::uuid
             order by occurred_at, id`,
      );
      return found.map((event) => {
        const detail = (typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail) as Record<string, unknown>;
        const current = vettingAuditCurrentFromDetail(detail);
        if (current === null) {
          throw new Error(`audit row ${event.id} has no current vetting snapshot`);
        }
        return {
          id: String(event.id),
          occurredAt: new Date(event.occurred_at).toISOString(),
          actorAccountId: event.actor_account_id === null ? null : String(event.actor_account_id),
          actorLabel: event.actor_label,
          subjectOrgId: String(event.subject_org_id ?? organizationId),
          reason: event.reason,
          detail: {
            action: detail.action === 'unvet' ? 'unvet' : 'vet',
            previousVetted: detail.previous_vetted === true,
            current,
          },
        };
      });
    },

    notificationEvents: async (filter): Promise<VettingNotificationEvent[]> => {
      const event = filter.event ?? null;
      const recipientId = filter.recipientId ?? null;
      const found = await rows<{
        id: string;
        event: string;
        actor_account_id: string | null;
        payload: unknown;
        recipients: unknown;
        state: NotificationState;
        attempts: number;
      }>(
        sql`select id, event, actor_account_id, payload, recipients, state, attempts
              from public.notification_events
             where (${event}::text is null or event = ${event}::text)
             order by created_at, id`,
      );
      return found
        .map((row): VettingNotificationEvent => {
          const recipients = parseJson<{ role: Role; recipientId: string; channels: Channel[] }[]>(row.recipients);
          if (!Array.isArray(recipients)) {
            throw new Error(`notification event ${row.id} recipients are not an array`);
          }
          return {
            id: String(row.id),
            type: row.event,
            actorAccountId: row.actor_account_id === null ? null : String(row.actor_account_id),
            payload: parseJson<Record<string, unknown>>(row.payload ?? {}),
            recipients: recipients.map((recipient) => ({
              role: recipient.role,
              recipientId: String(recipient.recipientId),
              channels: [...recipient.channels],
            })),
            state: row.state,
            attempts: Number(row.attempts),
          };
        })
        .filter((row) => recipientId === null || row.recipients.some((recipient) => recipient.recipientId === recipientId));
    },
    notificationDeliveries: async (filter): Promise<DeliveryRow[]> => {
      const eventId = filter.eventId ?? null;
      const recipientId = filter.recipientId ?? null;
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
             where (${eventId}::uuid is null or event_id = ${eventId}::uuid)
               and (${recipientId}::uuid is null or recipient_id = ${recipientId}::uuid)
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
          payload: parseJson<Record<string, unknown>>(row.payload ?? {}),
          body: row.body,
        }),
      );
    },

    readAllowance: async (session, organizationId): Promise<AllowanceOutcome> => {
      const answer = await postWrite('discovery-allowance', session, { organizationId, action: 'read' });
      if (!answer.ok) return answer.refusal;
      return { ok: true, allowance: allowanceFromJson(answer.json, organizationId) };
    },
    debitAllowance: async (session, organizationId, credits): Promise<AllowanceOutcome> => {
      const answer = await postWrite('discovery-allowance', session, { organizationId, action: 'debit', credits });
      if (!answer.ok) return answer.refusal;
      return { ok: true, allowance: allowanceFromJson(answer.json, organizationId) };
    },
    spendRows: async (organizationId): Promise<SpendRow[]> => {
      const found = await rows<{ org_id: string; utc_day: string; spent: number; granted: number }>(
        sql`select org_id, utc_day::text as utc_day, spent, granted
              from public.discovery_spend
             where org_id = ${organizationId}::uuid
             order by utc_day, org_id`,
      );
      return found.map((row) => ({
        organizationId: String(row.org_id),
        utcDay: isoDay(row.utc_day),
        spent: Number(row.spent),
        granted: Number(row.granted),
      }));
    },
    writeSpendRowAsOperator: async (row) => {
      await sql`
        delete from public.discovery_spend
         where org_id = ${row.organizationId}::uuid
           and utc_day = (clock_timestamp() at time zone 'utc')::date
           and utc_day is distinct from ${row.utcDay}::date
      `;
      await sql`
        insert into public.discovery_spend (org_id, utc_day, spent, granted)
        values (
          ${row.organizationId}::uuid,
          ${row.utcDay}::date,
          ${row.spent}::integer,
          ${row.granted}::integer
        )
        on conflict (org_id, utc_day) do update
          set spent = excluded.spent,
              granted = excluded.granted
      `;
    },

    publishingAllowed: async (organizationId) => {
      const found = await rows<{ vetted: boolean }>(
        sql`select vetted from public.org_vetting where org_id = ${organizationId}::uuid`,
      );
      return decidePublishing(found[0]?.vetted === true);
    },
    fundingAllowed: notLanded('fundingAllowed'),
    discoveryMessageAllowed: async (session) => {
      const found = await rows<{ email_confirmed_at: string | Date | null; email: string }>(
        sql`select email, email_confirmed_at from auth.users where id = ${session.accountId}::uuid`,
      );
      if (found.length !== 1) return decideDiscoveryMessage({ emailVerified: false });
      const confirmedAt = found[0].email_confirmed_at;
      const emailVerified = emailVerifiedFromUser({
        id: session.accountId,
        email: found[0].email,
        email_confirmed_at: confirmedAt === null ? null : new Date(confirmedAt).toISOString(),
      });
      return decideDiscoveryMessage({ emailVerified });
    },

    createProjectAsOperator: async (organizationId, name): Promise<{ id: string }> => {
      const created = await rows<{ id: string }>(
        sql`insert into public.projects (org_id, name) values (${organizationId}::uuid, ${name}) returning id`,
      );
      if (created.length !== 1) throw new Error(`the operator insert of project ${JSON.stringify(name)} returned no row`);
      return { id: String(created[0].id) };
    },
    publicProjectPage: async (projectId, session): Promise<PublicProjectOutcome> => {
      const bearer = session ? tokensOf(session, 'call the deployed public-project').accessToken : null;
      const raw = await functionPostRaw(stack, 'public-project', { projectId }, bearer);
      const outcome = functionOutcome<{ ok: true } & PublicProjectView>(raw);
      if (!outcome.ok) return { ok: false, answer: outcome.answer };
      return {
        ok: true,
        page: {
          projectId: outcome.value.projectId,
          projectName: outcome.value.projectName,
          organizationName: outcome.value.organizationName,
        },
        answer: outcome.answer,
      };
    },
  };

  return {
    sut: { organizations: sut },
    fixtures: {
      world: async (name: string) => {
        const namespace = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        return new OrganizationsLiveWorld(namespace);
      },
    },
    teardown: async () => {
      await sql.close().catch(() => undefined);
    },
  };
}
