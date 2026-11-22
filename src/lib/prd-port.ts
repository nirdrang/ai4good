import { DefaultChatTransport, type ChatTransport } from "ai";
import type { PrdPort } from "../components/prd-workspace/port";
import {
  parsePrdSnapshot,
  parseRefusal,
  scopeKey,
  type Action,
  type ActionKind,
  type ChatScope,
  type PrdRefusal,
  type PrdSnapshot,
  type PrdUIMessage,
  type Result,
} from "./prd-stream";
import { getSupabase, supabasePublishableKey, supabaseUrl } from "./supabase";

const SIGNED_OUT: PrdRefusal = { kind: "invalid", reason: "Sign in to open the PRD." };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function refusalOf(value: unknown): PrdRefusal {
  if (typeof value === "string") {
    if (value === "") return { kind: "invalid", reason: "The PRD did not respond as expected." };
    try {
      return refusalOf(JSON.parse(value));
    } catch {
      return { kind: "invalid", reason: value };
    }
  }
  const parsed = parseRefusal(value);
  if (parsed) return parsed;
  if (isRecord(value) && typeof value.reason === "string" && value.reason !== "") {
    return { kind: "invalid", reason: value.reason };
  }
  return { kind: "invalid", reason: "The PRD did not respond as expected." };
}

function sequenceOf(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
  return value;
}

function payloadSequence(message: unknown): unknown {
  if (!isRecord(message) || !isRecord(message.payload)) return undefined;
  return message.payload.sequence;
}

function eventName(event: string): string | null {
  for (const line of event.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice("data:".length).trim();
    if (data === "[DONE]") return null;
    try {
      const parsed: unknown = JSON.parse(data);
      if (isRecord(parsed) && typeof parsed.type === "string") return parsed.type;
    } catch {
      return null;
    }
  }
  return null;
}

function withSnapshot(
  source: ReadableStream<Uint8Array>,
  read: () => Promise<PrdSnapshot | null>,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let pending = "";
  let held: string[] | null = null;

  function take(event: string, controller: TransformStreamDefaultController<Uint8Array>) {
    if (event === "") return;
    if (held === null && eventName(event) === "finish") held = [];
    if (held !== null) held.push(event);
    else controller.enqueue(encoder.encode(`${event}\n\n`));
  }

  async function release(controller: TransformStreamDefaultController<Uint8Array>) {
    if (held === null) return;
    const snapshot = await read().catch(() => null);
    if (snapshot) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "data-snapshot", data: snapshot, transient: true })}\n\n`,
        ),
      );
    }
    for (const event of held) controller.enqueue(encoder.encode(`${event}\n\n`));
    held = null;
  }

  return source.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        pending += decoder.decode(chunk, { stream: true });
        const events = pending.split("\n\n");
        pending = events.pop() ?? "";
        for (const event of events) take(event, controller);
      },
      async flush(controller) {
        pending += decoder.decode();
        if (pending !== "") take(pending, controller);
        await release(controller);
      },
    }),
  );
}

type ReadOutcome =
  | { kind: "snapshot"; snapshot: PrdSnapshot }
  | { kind: "empty" }
  | { kind: "refusal"; refusal: PrdRefusal };

export function prdPort(projectId: string): PrdPort {
  const url = (name: string) => `${supabaseUrl().replace(/\/$/, "")}/functions/v1/${name}`;
  const transports = new Map<string, ChatTransport<PrdUIMessage>>();
  let installed = -1;

  async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await getSupabase().auth.getSession();
    if (!data.session) throw new Error(JSON.stringify(SIGNED_OUT));
    return {
      Authorization: `Bearer ${data.session.access_token}`,
      apikey: supabasePublishableKey(),
    };
  }

  async function post(name: string, body: Record<string, unknown>): Promise<Response> {
    return fetch(url(name), {
      method: "POST",
      headers: { ...(await authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function readSnapshot(sinceSequence?: number): Promise<ReadOutcome> {
    const body: Record<string, unknown> = { projectId };
    if (sinceSequence !== undefined) body.sinceSequence = sinceSequence;
    const response = await post("prd-snapshot", body);
    if (response.status === 204) return { kind: "empty" };
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    if (!response.ok || (isRecord(parsed) && parsed.ok === false)) {
      return { kind: "refusal", refusal: refusalOf(parsed) };
    }
    try {
      return { kind: "snapshot", snapshot: parsePrdSnapshot(parsed) };
    } catch {
      return {
        kind: "refusal",
        refusal: { kind: "invalid", reason: "The PRD snapshot could not be read." },
      };
    }
  }

  async function load(): Promise<Result<PrdSnapshot>> {
    try {
      const read = await readSnapshot();
      if (read.kind === "snapshot") {
        if (read.snapshot.sequence > installed) installed = read.snapshot.sequence;
        return { ok: true, value: read.snapshot };
      }
      if (read.kind === "empty") {
        return { ok: false, refusal: { kind: "invalid", reason: "The PRD has nothing to show." } };
      }
      return { ok: false, refusal: read.refusal };
    } catch (error) {
      return { ok: false, refusal: refusalOf(error instanceof Error ? error.message : error) };
    }
  }

  function messageTransport(): ChatTransport<PrdUIMessage> {
    const inner = new DefaultChatTransport<PrdUIMessage>({
      api: url("prd-message"),
      headers: async () => ({ ...(await authHeaders()), Accept: "text/event-stream" }),
      prepareSendMessagesRequest: ({ body }) => ({ body: { projectId, ...(body ?? {}) } }),
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        if (!response.ok) throw new Error(JSON.stringify(refusalOf(await response.text())));
        if (!response.body) return response;
        const stream = withSnapshot(response.body, async () => {
          const result = await load();
          return result.ok ? result.value : null;
        });
        return new Response(stream, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      },
    });
    return {
      sendMessages: (options) => inner.sendMessages(options),
      reconnectToStream: () => Promise.resolve(null),
    };
  }

  return {
    load,
    chat(scope: ChatScope) {
      const key = scopeKey(scope);
      const existing = transports.get(key);
      if (existing) return existing;
      const created = messageTransport();
      transports.set(key, created);
      return created;
    },
    async act(action: Action<ActionKind>): Promise<Result<PrdSnapshot>> {
      try {
        const response = await post("prd-action", {
          projectId,
          kind: action.kind,
          token: action.token,
          requestId: crypto.randomUUID(),
        });
        const text = await response.text();
        let parsed: unknown = text;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
        if (!response.ok || (isRecord(parsed) && parsed.ok === false)) {
          return { ok: false, refusal: refusalOf(parsed) };
        }
        return load();
      } catch (error) {
        return { ok: false, refusal: refusalOf(error instanceof Error ? error.message : error) };
      }
    },
    async saveDraft(key, text) {
      try {
        const response = await post("prd-draft", { projectId, key, text });
        await response.text();
      } catch {
        return;
      }
    },
    subscribe(listener) {
      let stopped = false;
      let teardown = () => {};
      let chain = Promise.resolve();
      const browser = typeof window === "undefined" ? null : window;
      const page = typeof document === "undefined" ? null : document;
      browser?.addEventListener("focus", catchUp);
      page?.addEventListener("visibilitychange", onVisibilityChange);
      void listen();
      return () => {
        stopped = true;
        browser?.removeEventListener("focus", catchUp);
        page?.removeEventListener("visibilitychange", onVisibilityChange);
        teardown();
      };

      function catchUp() {
        void enqueue();
      }

      function onVisibilityChange() {
        if (page?.visibilityState === "visible") catchUp();
      }

      function enqueue(sequence?: number) {
        const run = chain.then(() => deliver(sequence));
        chain = run.then(
          () => undefined,
          () => undefined,
        );
        return run;
      }

      async function deliver(sequence?: number) {
        if (stopped || (sequence !== undefined && sequence <= installed)) return;
        const read = await readSnapshot(installed < 0 ? undefined : installed);
        if (stopped || read.kind !== "snapshot" || read.snapshot.sequence <= installed) return;
        installed = read.snapshot.sequence;
        listener(read.snapshot);
      }

      async function listen() {
        const client = getSupabase();
        const { data } = await client.auth.getSession();
        if (stopped) return;
        if (data.session?.access_token) await client.realtime.setAuth(data.session.access_token);
        if (stopped) return;
        const { data: auth } = client.auth.onAuthStateChange((_event, session) => {
          void client.realtime.setAuth(session?.access_token ?? null);
        });
        const channel = client.channel(`prd:${projectId}`, { config: { private: true } });
        channel.on("broadcast", { event: "sequence" }, (message) => {
          const sequence = sequenceOf(payloadSequence(message));
          return sequence === null ? undefined : enqueue(sequence);
        });
        teardown = () => {
          auth.subscription.unsubscribe();
          void client.removeChannel(channel);
        };
        if (stopped) {
          teardown();
          return;
        }
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") catchUp();
        });
      }
    },
  };
}
