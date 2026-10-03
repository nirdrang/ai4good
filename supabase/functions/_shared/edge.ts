import { callerFromAuthAnswer, type Caller } from './caller.ts';
import { staleBriefDetail } from './discovery-brief.ts';
import * as discoveryStream from './discovery-stream.ts';
import type { CallerReads, ReadResult } from './tenant-reads.ts';
import type { PublicProjectReads, PublicProjectSource } from './public-project.ts';
import {
  isRecord,
  parseWriteRefusalKind,
  parseWriteStanding,
  rpcRefusalStatus,
  writePipeline,
  WRITE_ROUTES,
  type WriteRouteInput,
  type WriteRouteSpec,
  type WriteStanding,
} from './write-routes.ts';

/**
 * A required environment variable, or a loud failure at first use.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` is accepted under either of its two names because the CLI has been
 * renaming its key vocabulary — newer versions inject `SUPABASE_SECRET_KEY` — and a function that
 * boots and then 500s on its first database call because it read `undefined` is much harder to
 * diagnose than one that says which variable it wanted.
 */
export function requireEnv(...names: string[]): string {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value && value.trim() !== '') return value;
  }
  throw new Error(`none of ${names.join(', ')} is set in this function's environment`);
}

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
};

export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

export function refusal(reason: string, status: number): Response {
  return json({ ok: false, reason }, status);
}

export function edgeHandler(
  name: string,
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    try {
      return await handler(request);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return refusal(`${name} could not complete the request: ${detail}`, 502);
    }
  };
}

export type { Caller };

export async function resolveCaller(request: Request, supabaseUrl: string, anonKey: string): Promise<Caller | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey },
  });

  const text = await response.text();
  let user: unknown = null;
  try {
    user = JSON.parse(text) as unknown;
  } catch {
    // Left as `null`, which `callerFromAuthAnswer` reads as no caller. Nothing is judged here.
  }
  return callerFromAuthAnswer(response.status, user);
}

function isIpv4(value: string): boolean {
  const parts = value.split('.');
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isIpv6(value: string): boolean {
  if (value.split('::').length > 2) return false;
  const abbreviated = value.includes('::');
  const groups = value.split(':').filter((group) => group !== '');
  if (groups.length === 0) return abbreviated;
  const last = groups[groups.length - 1];
  const trailingIpv4 = last.includes('.');
  if (trailingIpv4 && !isIpv4(last)) return false;
  const hexGroups = trailingIpv4 ? groups.slice(0, -1) : groups;
  if (!hexGroups.every((group) => /^[0-9a-fA-F]{1,4}$/.test(group))) return false;
  const count = hexGroups.length + (trailingIpv4 ? 2 : 0);
  return abbreviated ? count < 8 : count === 8;
}

export function callerIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  if (!first || first === '') return null;
  const candidate = first.startsWith('[') && first.endsWith(']') ? first.slice(1, -1) : first;
  return isIpv4(candidate) || isIpv6(candidate) ? candidate : null;
}

type RpcOutcome =
  | { ok: true; value: unknown }
  | { ok: false; status: number; message: string; details: string | null; hint: string | null; code: string | null };

async function callDatabaseFunction(name: string, args: Record<string, unknown>): Promise<RpcOutcome> {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(args),
  });

  const text = await response.text();
  if (!response.ok) {
    let message = text;
    let details: string | null = null;
    let hint: string | null = null;
    let code: string | null = null;
    try {
      const body = JSON.parse(text) as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
      if (typeof body.message === 'string') message = body.message;
      if (typeof body.details === 'string') details = body.details;
      if (typeof body.hint === 'string') hint = body.hint;
      if (typeof body.code === 'string') code = body.code;
    } catch {
      // A non-JSON body from PostgREST means something other than a raised exception went wrong;
      // the raw text is then the most informative thing available.
    }
    return { ok: false, status: response.status, message, details, hint, code };
  }

  return { ok: true, value: text === '' ? null : (JSON.parse(text) as unknown) };
}

function settledRefusal(value: unknown): string | null {
  if (!isRecord(value) || value.ok !== false || typeof value.kind !== 'string' || typeof value.reason !== 'string') return null;
  return JSON.stringify({ kind: value.kind, reason: value.reason });
}

export function discoveryFileWorker() {
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');
  const headers = { apikey: key, authorization: `Bearer ${key}` };
  const objectUrl = (projectId: string, fileId: string) => `${requireEnv('SUPABASE_URL')}/storage/v1/object/discovery-files/${projectId}/${fileId}`;
  return {
    commit: async (fileId: string, action: string, payload: Record<string, unknown>) => {
      const result = await callDatabaseFunction('discovery_file_read', { p_file_id: fileId, p_action: action, p_payload: payload });
      if (!result.ok) throw new Error(result.message);
      return result.value;
    },
    download: (projectId: string, fileId: string) => fetch(objectUrl(projectId, fileId), { headers }),
    upload: (projectId: string, fileId: string, file: File) => fetch(objectUrl(projectId, fileId), {
      method: 'POST', headers: { ...headers, 'content-type': file.type }, body: file,
    }),
    removeUpload: (projectId: string, fileId: string) => fetch(objectUrl(projectId, fileId), { method: 'DELETE', headers }),
  };
}

function rpcRefusal(outcome: Extract<RpcOutcome, { ok: false }>): Response {
  const status = rpcRefusalStatus(outcome);
  const kind = status === 409 ? parseWriteRefusalKind(outcome.details) : 'refused';
  const stale = kind === 'stale-revision' ? staleBriefDetail(outcome.hint) : null;
  return json({ ok: false, kind, reason: outcome.message, ...(stale ?? {}) }, status);
}

async function loadWriteStanding(
  accountId: string,
  organizationId: string | null,
  subjectAccountId: string | null,
): Promise<WriteStanding> {
  const outcome = await callDatabaseFunction('write_standing', {
    p_account_id: accountId,
    p_org_id: organizationId,
    p_subject_account_id: subjectAccountId,
  });
  if (!outcome.ok) return { kind: 'unreadable', detail: `write_standing answered ${outcome.status}: ${outcome.message}` };
  return parseWriteStanding(outcome.value);
}

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function writeRoute<Args extends Record<string, unknown>, Input extends WriteRouteInput = WriteRouteInput>(
  spec: WriteRouteSpec<Args, Input>,
): (request: Request) => Promise<Response> {
  if (!(spec.name in WRITE_ROUTES)) throw new Error(`${spec.name} is not a row of WRITE_ROUTES, so it cannot be served`);
  const route = WRITE_ROUTES[spec.name];
  if (route.surface.kind !== 'edge') throw new Error(`${spec.name} is a stand-in row of WRITE_ROUTES and has no deployed function`);
  const rpc = route.surface.rpc;
  const SUPABASE_URL = requireEnv('SUPABASE_URL');
  const ANON_KEY = requireEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');

  return edgeHandler(spec.name, async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return refusal(`${spec.name} accepts POST only`, 405);

    const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
    if (!caller) return refusal(`authenticate before calling ${spec.name}`, 401);

    const body = spec.readBody ? await spec.readBody(request) : await readJsonBody(request);
    if (!body.ok) return json({ ok: false, kind: 'kind' in body ? body.kind : 'invalid-request', reason: body.reason }, 'status' in body ? body.status ?? 400 : 400);

    const target = spec.target ? spec.target(body.value) : null;
    const subject = spec.subject ? spec.subject(body.value) : null;
    const from = spec.from ? spec.from(body.value) : null;
    for (const [what, value] of [['organisation', target], ['account', subject], ['from', from]] as const) {
      if (value !== null && !UUID_SHAPE.test(value)) {
        return json({ ok: false, kind: 'invalid-request', reason: `the ${what} id ${JSON.stringify(value)} is not a well-formed id` }, 400);
      }
    }

    const standing = await loadWriteStanding(caller.id, target, subject);
    let decision = writePipeline(spec, { caller, standing, body: body.value, target, subject, ip: callerIp(request) });
    if (decision.ok && spec.prepare) {
      decision = await spec.prepare(caller, decision.args, callerReads(SUPABASE_URL, ANON_KEY, request.headers.get('Authorization')!));
    }
    if (!decision.ok) {
      return json({ ok: false, kind: decision.kind, reason: decision.reason }, decision.status);
    }

    let outcome = await callDatabaseFunction(rpc, decision.args);
    if (!outcome.ok) {
      await spec.commitRefused?.(decision.args);
      return rpcRefusal(outcome);
    }

    if (spec.settle?.stream && discoveryStream.wantsEventStream(request.headers.get('Accept'))) {
      const settle = spec.settle;
      const streamAct = settle.stream!;
      const reserved = outcome.value;
      const args = decision.args;
      const head = settle.streamHead?.(reserved, args) ?? null;
      const abort = new AbortController();
      let cancelled = false;
      let work: Promise<void>;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder();
          const emit = (line: string) => { if (!cancelled) controller.enqueue(encoder.encode(line)); };
          work = (async () => {
            const messageId = head?.messageId ?? crypto.randomUUID();
            const textId = head?.textId ?? messageId;
            emit(discoveryStream.start(messageId));
            emit(discoveryStream.textStart(textId));
            try {
              if (head?.replay) {
                if (head.replay.text.length > 0) emit(discoveryStream.textDelta(textId, head.replay.text));
                emit(discoveryStream.textEnd(textId));
                for (const part of head.replay.parts) emit(discoveryStream.dataPart(part));
              } else {
                if (head?.prefix) emit(discoveryStream.textDelta(textId, head.prefix));
                const acted = await streamAct(reserved, args, (delta) => emit(discoveryStream.textDelta(textId, delta)), abort.signal);
                if (acted.suffix) emit(discoveryStream.textDelta(textId, acted.suffix));
                emit(discoveryStream.textEnd(textId));
                if (acted.failure !== null) emit(discoveryStream.error(acted.failure));
                if (!acted.skipSettle && acted.args !== null) {
                  const settled = await callDatabaseFunction(settle.rpc, acted.args);
                  if (!settled.ok) emit(discoveryStream.error(settled.message));
                  else {
                    const refused = settledRefusal(settled.value);
                    if (refused !== null) emit(discoveryStream.error(refused));
                    else if (acted.failure === null && acted.tail) {
                      for (const part of acted.tail) emit(discoveryStream.dataPart(part));
                    } else if (acted.failure === null) emit(discoveryStream.dataTurn({ ok: true, ...(spec.render ? spec.render(settled.value) : {}) }));
                  }
                } else if (acted.failure === null) emit(discoveryStream.error('the provider outcome is uncertain'));
              }
            } catch (error) {
              emit(discoveryStream.error(error instanceof Error ? error.message : String(error)));
            } finally {
              emit(discoveryStream.finish());
              emit(discoveryStream.done());
              if (!cancelled) controller.close();
            }
          })();
        },
        cancel() {
          cancelled = true;
          abort.abort();
          EdgeRuntime.waitUntil(work);
        },
      });
      return new Response(body, { headers: { ...CORS_HEADERS, ...discoveryStream.DISCOVERY_STREAM_HEADERS } });
    }
    if (spec.settle) {
      const acted = await spec.settle.act(outcome.value, decision.args);
      if (acted.skipSettle) {
        const reserved = isRecord(outcome.value) ? { ...outcome.value, allowance: outcome.value.allowance ?? null } : {};
        return json({ ok: true, ...(spec.render ? spec.render(reserved) : {}) }, 200);
      }
      if (acted.args === null) return refusal(acted.failure ?? 'the provider outcome is uncertain', 502);
      outcome = await callDatabaseFunction(spec.settle.rpc, acted.args);
      if (!outcome.ok) return rpcRefusal(outcome);
      if (acted.failure !== null) return refusal(acted.failure, 502);
    }
    return json({ ok: true, ...(spec.render ? spec.render(outcome.value) : {}) }, 200);
  });
}

async function restJson<Row>(url: string, init: RequestInit): Promise<ReadResult<Row>> {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) {
    console.error(`restJson ${response.status} ${url}: ${text}`);
    return { ok: false, detail: text };
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return { ok: false, detail: text };
    return { ok: true, rows: parsed as Row[] };
  } catch {
    return { ok: false, detail: text };
  }
}

export function callerReads(supabaseUrl: string, anonKey: string, authorization: string): CallerReads {
  const headers = { apikey: anonKey, Authorization: authorization, Accept: 'application/json' };
  const base = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  return {
    discoveryFilesOf: async (projectId) => {
      const response = await fetch(`${base}/rpc/viewer_discovery_files`, {
        method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ p_project_id: projectId }),
      });
      const text = await response.text();
      if (!response.ok) return { ok: false, detail: text };
      try { return { ok: true, rows: JSON.parse(text) }; }
      catch { return { ok: false, detail: text }; }
    },
    discoveryTurnsOf: (projectId) =>
      restJson(`${base}/discovery_turns?project_id=eq.${encodeURIComponent(projectId)}&order=seq`, { headers }),
    discoveryScopesOf: (projectId) =>
      restJson(`${base}/discovery_scopes?project_id=eq.${encodeURIComponent(projectId)}&order=version`, { headers }),
    discoveryBriefOf: async (projectId) => {
      const response = await fetch(`${base}/rpc/viewer_discovery_brief`, {
        method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ p_project_id: projectId }),
      });
      const text = await response.text();
      if (!response.ok) return { ok: false, detail: text };
      try { return { ok: true, value: JSON.parse(text) }; }
      catch { return { ok: false, detail: text }; }
    },
    discoveryAllowance: async (organizationId) => {
      const response = await fetch(`${base}/rpc/viewer_discovery_allowance`, {
        method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ p_organization_id: organizationId }),
      });
      const text = await response.text();
      if (!response.ok) return { ok: false, detail: text };
      try { return { ok: true, value: JSON.parse(text) }; }
      catch { return { ok: false, detail: text }; }
    },
    need: (projectId) =>
      restJson(
        `${base}/need_intakes?project_id=eq.${encodeURIComponent(projectId)}&select=project_id,description,urgency,stage,cause_labels,reference_files,tier2_classified_at,submitted_at,updated_at`,
        { headers },
      ),
    organization: (organizationId) =>
      restJson(
        `${base}/organizations?id=eq.${encodeURIComponent(organizationId)}&select=id,name,mission,country,website,logo`,
        { headers },
      ),
    seatsOf: (organizationId) =>
      restJson(
        `${base}/org_memberships?org_id=eq.${encodeURIComponent(organizationId)}&select=account_id,role`,
        { headers },
      ),
    projectsOf: (organizationId) =>
      restJson(
        `${base}/projects?org_id=eq.${encodeURIComponent(organizationId)}&select=id,name,assigned_volunteer_id`,
        { headers },
      ),
    project: (projectId) =>
      restJson(
        `${base}/projects?id=eq.${encodeURIComponent(projectId)}&select=id,name,org_id,assigned_volunteer_id,funded_at`,
        { headers },
      ),
    discoveryUsage: async (accountId: string, organizationId: string, projectId: string): Promise<unknown> => {
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY');
      if (!serviceKey) return null;
      try {
        const response = await fetch(`${base}/rpc/discovery_usage`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'content-type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            p_account_id: accountId,
            p_organization_id: organizationId,
            p_project_id: projectId,
          }),
        });
        if (!response.ok) return null;
        return JSON.parse(await response.text()) as unknown;
      } catch {
        return null;
      }
    },
  };
}

export function publicProjectReads(): PublicProjectReads {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/read_public_project`;
  const headers = {
    'content-type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
  return {
    source: (projectId) =>
      restJson<PublicProjectSource>(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_project_id: projectId }),
      }),
  };
}

export async function readJsonBody(request: Request): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; reason: string }> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, reason: 'the request body could not be read' };
  }
  if (text.trim() === '') return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, reason: 'the request body must be a JSON object' };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, reason: 'the request body is not valid JSON' };
  }
}
