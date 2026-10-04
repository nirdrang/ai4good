import { DefaultChatTransport } from "ai";
import type { DiscoveryPort, Result, ServerChange } from "../components/discovery/port";
import type { DiscoveryFile, DiscoveryRefusal, DiscoveryState, DiscoveryUIMessage } from "./discovery-stream";
import { getSupabase, supabasePublishableKey, supabaseUrl } from "./supabase";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function discoveryRefusal(value: unknown): DiscoveryRefusal {
  if (record(value) && typeof value.kind !== "string" && typeof value.reason === "string") {
    try {
      const nested: unknown = JSON.parse(value.reason);
      if (record(nested) && typeof nested.kind === "string" && typeof nested.reason === "string") return discoveryRefusal(nested);
    } catch {}
  }
  if (record(value) && typeof value.reason === "string") {
    return { kind: typeof value.kind === "string" ? value.kind : "refused", reason: value.reason };
  }
  return { kind: "request-failed", reason: typeof value === "string" && value ? value : "Discovery did not respond as expected." };
}

export function parseDiscoveryResponse<T>(text: string, field: string, accepts: (value: unknown) => value is T): Result<T> {
  let body: unknown;
  try { body = JSON.parse(text); } catch { return { ok: false, refusal: discoveryRefusal(text) }; }
  if (!record(body) || body.ok !== true) return { ok: false, refusal: discoveryRefusal(body) };
  if (!accepts(body[field])) return { ok: false, refusal: discoveryRefusal(null) };
  return { ok: true, value: body[field] };
}

export function isDiscoveryState(value: unknown): value is DiscoveryState {
  return record(value) && record(value.project) && typeof value.project.title === "string"
    && typeof value.project.organizationName === "string" && typeof value.project.funded === "boolean"
    && record(value.brief) && typeof value.brief.revision === "number" && Array.isArray(value.brief.topics)
    && Array.isArray(value.brief.questions) && Array.isArray(value.transcript) && Array.isArray(value.files)
    && record(value.usage) && typeof value.usage.dailyLeft === "number"
    && ["free", "paid", "unavailable"].includes(String(value.usage.nextReply))
    && (value.confirmation === null || (record(value.confirmation) && typeof value.confirmation.revision === "number"));
}

export function filesReading(files: readonly DiscoveryFile[]): boolean {
  return files.some((file) => file.origin === "discovery" && file.status.kind === "reading");
}

export function discoveryPort(scope: { organizationId: string; projectId: string }): DiscoveryPort {
  const url = (name: string) => `${supabaseUrl().replace(/\/$/, "")}/functions/v1/${name}`;
  const listeners = new Set<(change: ServerChange) => void>();
  let state: DiscoveryState | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let loading: Promise<Result<DiscoveryState>> | null = null;

  async function headers(): Promise<Record<string, string>> {
    const { data } = await getSupabase().auth.getSession();
    if (!data.session) throw new Error(JSON.stringify({ kind: "signed-out", reason: "Sign in to open Discovery." }));
    return { Authorization: `Bearer ${data.session.access_token}`, apikey: supabasePublishableKey() };
  }

  async function request(name: string, body: Record<string, unknown> | FormData): Promise<Response> {
    const auth = await headers();
    return fetch(url(name), { method: "POST", headers: body instanceof FormData ? auth : { ...auth, "Content-Type": "application/json" },
      body: body instanceof FormData ? body : JSON.stringify({ ...body, ...scope }) });
  }

  function schedule() {
    clearTimeout(timer);
    timer = undefined;
    if (listeners.size > 0 && state && filesReading(state.files)) {
      timer = setTimeout(() => { void refresh(); }, 1_000);
    }
  }

  async function load(): Promise<Result<DiscoveryState>> {
    if (loading) return loading;
    loading = (async () => {
      let response = await request("discovery-conversation", {});
      let text = await response.text();
      const body: unknown = (() => { try { return JSON.parse(text); } catch { return null; } })();
      if (response.ok && record(body) && body.ok === true && body.brief === null) {
        const opening = await request("discovery-message", { mode: "opening", message: "", answers: [], expectedCharge: "free", userMessageId: `opening-${scope.projectId}` });
        const output = await opening.text();
        if (!opening.ok) return parseDiscoveryResponse(output, "state", isDiscoveryState);
        if (output.includes('"type":"error"')) return { ok: false, refusal: discoveryRefusal("The opening reply did not finish. Reload to try again.") } as Result<DiscoveryState>;
        response = await request("discovery-conversation", {});
        text = await response.text();
      }
      const result = parseDiscoveryResponse(text, "state", isDiscoveryState);
      if (result.ok) state = result.value;
      schedule();
      return result;
    })().catch((error: unknown): Result<DiscoveryState> => ({ ok: false, refusal: errorRefusal(error) }));
    try { return await loading; } finally { loading = null; }
  }

  async function refresh() {
    const result = await load();
    if (result.ok) for (const listener of listeners) listener(result.value);
    schedule();
  }

  async function write<T>(name: string, body: Record<string, unknown> | FormData, field: string): Promise<Result<T>> {
    try {
      const response = await request(name, body);
      const result = parseDiscoveryResponse<T>(await response.text(), field, (value): value is T => record(value));
      await refresh();
      return result;
    } catch (error) { return { ok: false, refusal: errorRefusal(error) }; }
  }

  return {
    load,
    chat: new DefaultChatTransport<DiscoveryUIMessage>({
      api: url("discovery-message"), headers,
      prepareSendMessagesRequest: ({ body, messages }) => ({ body: { ...body, ...scope, userMessageId: messages.at(-1)?.id } }),
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        if (!response.ok) {
          const result = parseDiscoveryResponse(await response.text(), "state", isDiscoveryState);
          if (!result.ok) throw new Error(JSON.stringify(result.refusal));
        }
        if (!response.body) return response;
        const body = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) { controller.enqueue(chunk); },
          flush() { void refresh(); },
        }));
        return new Response(body, { status: response.status, headers: response.headers });
      },
    }),
    addFile(file) {
      const form = new FormData();
      form.set("organizationId", scope.organizationId);
      form.set("projectId", scope.projectId);
      form.set("file", file);
      return write("discovery-file", form, "file");
    },
    subscribe(listener) {
      listeners.add(listener);
      schedule();
      return () => { listeners.delete(listener); schedule(); };
    },
    saveBriefEdit: (input) => write("discovery-brief", { action: "edit", ...input }, "brief"),
    acceptSuggestion: (input) => write("discovery-brief", { action: "accept", ...input }, "brief"),
    askTopic: (input) => write("discovery-brief", { action: "ask", ...input }, "brief"),
    removeCauseLabel: (input) => write("discovery-brief", { action: "remove-label", ...input }, "brief"),
    finish: (input) => write("discovery-brief", { action: "finish", ...input }, "confirmation"),
  };
}

function errorRefusal(error: unknown): DiscoveryRefusal {
  const text = error instanceof Error ? error.message : String(error);
  try { return discoveryRefusal(JSON.parse(text)); } catch { return discoveryRefusal(text); }
}
