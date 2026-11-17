import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prdPort } from "../../../src/lib/prd-port.ts";
import {
  parsePrdSnapshot,
  parseRefusal,
  type ActionToken,
  type PrdUIMessage,
} from "../../../src/lib/prd-stream.ts";

const PROJECT = "11111111-1111-4111-8111-111111111111";

type SequenceHandler = (message: {
  payload?: { sequence?: unknown };
}) => Promise<unknown> | undefined;

const fake = vi.hoisted(() => {
  type Channel = {
    name: string;
    options: unknown;
    handler: SequenceHandler | null;
    removed: boolean;
    on: (type: string, filter: { event?: string }, handler: SequenceHandler) => Channel;
    subscribe: () => Channel;
  };
  const channels: Channel[] = [];
  const authTokens: Array<string | null> = [];
  const authListeners: Array<(event: string, session: { access_token: string } | null) => void> =
    [];
  let session: { access_token: string } | null = { access_token: "user-token" };

  const client = {
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange(callback: (event: string, next: { access_token: string } | null) => void) {
        authListeners.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe() {
                const index = authListeners.indexOf(callback);
                if (index >= 0) authListeners.splice(index, 1);
              },
            },
          },
        };
      },
    },
    realtime: {
      setAuth: async (token?: string | null) => {
        authTokens.push(token ?? null);
      },
    },
    channel(name: string, options: unknown) {
      const channel: Channel = {
        name,
        options,
        handler: null,
        removed: false,
        on(type, filter, handler) {
          if (type === "broadcast" && filter.event === "sequence") channel.handler = handler;
          return channel;
        },
        subscribe() {
          return channel;
        },
      };
      channels.push(channel);
      return channel;
    },
    removeChannel(channel: Channel) {
      channel.removed = true;
      return Promise.resolve("ok");
    },
  };

  return {
    channels,
    authTokens,
    authListeners,
    client,
    reset() {
      channels.length = 0;
      authTokens.length = 0;
      authListeners.length = 0;
      session = { access_token: "user-token" };
    },
    setSession(next: { access_token: string } | null) {
      session = next;
    },
  };
});

vi.mock("../../../src/lib/supabase", () => ({
  supabaseUrl: () => "http://localhost:54321",
  supabasePublishableKey: () => "public-key",
  getSupabase: () => fake.client,
}));

function snapshot(sequence: number) {
  return {
    sequence,
    revision: 1,
    viewer: { role: "dev" as const, name: "Priya Shah" },
    people: [{ role: "dev" as const, name: "Priya Shah", label: "Developer" }],
    project: { title: "Volunteer scheduling", organizationName: "Harbor Community Kitchen" },
    discoveryRevision: 1,
    topics: [],
    devQuestions: [],
    questions: [],
    chats: {},
    canWrite: { main: true },
    send: { main: { kind: "available" as const } },
    funds: {
      allocationMicros: 0,
      settledMicros: 0,
      pendingMicros: 0,
      replyHoldMicros: 0,
      availableMicros: 0,
      band: "green" as const,
      replyFunded: true,
    },
    check: null,
    close: {
      kind: "open" as const,
      remaining: [],
      path: "close" as const,
      close: { kind: "unavailable" as const, reason: "Not available yet." },
    },
    drafts: {},
  };
}

const STREAM =
  [
    'data: {"type":"start","messageId":"m1"}',
    'data: {"type":"text-start","id":"t1"}',
    'data: {"type":"text-delta","id":"t1","delta":"Hi"}',
    'data: {"type":"text-end","id":"t1"}',
    'data: {"type":"finish"}',
    "data: [DONE]",
  ].join("\n\n") + "\n\n";

function posted(call: unknown[]) {
  const init = call[1] as RequestInit;
  return {
    url: String(call[0]),
    headers: init.headers as Record<string, string>,
    body: JSON.parse(String(init.body)) as Record<string, unknown>,
  };
}

async function chunks(stream: ReadableStream<unknown>) {
  const reader = stream.getReader();
  const out: unknown[] = [];
  for (;;) {
    const step = await reader.read();
    if (step.done) return out;
    out.push(step.value);
  }
}

beforeEach(() => fake.reset());
afterEach(() => vi.unstubAllGlobals());

describe("PRD port", () => {
  it("parses a snapshot and maps a refusal", async () => {
    const raw = snapshot(4);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(raw), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: false, kind: "forbidden", reason: "No role." }), {
          status: 409,
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const port = prdPort(PROJECT);
    expect(await port.load()).toEqual({ ok: true, value: parsePrdSnapshot(raw) });
    const read = posted(fetcher.mock.calls[0] ?? []);
    expect(read.url).toBe("http://localhost:54321/functions/v1/prd-snapshot");
    expect(read.body).toEqual({ projectId: PROJECT });
    expect(read.headers).toEqual({
      Authorization: "Bearer user-token",
      apikey: "public-key",
      "Content-Type": "application/json",
    });
    expect(await port.load()).toEqual({
      ok: false,
      refusal: { kind: "forbidden", reason: "No role." },
    });
  });

  it("refuses a signed-out session", async () => {
    fake.setSession(null);
    vi.stubGlobal("fetch", vi.fn());
    expect(await prdPort(PROJECT).load()).toEqual({
      ok: false,
      refusal: { kind: "invalid", reason: "Sign in to open the PRD." },
    });
  });

  it("posts an action, then reads the snapshot, and returns a refused action", async () => {
    const raw = snapshot(3);
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/prd-action")) return new Response(JSON.stringify({ ok: true }));
      return new Response(JSON.stringify(raw));
    });
    vi.stubGlobal("fetch", fetcher);
    const port = prdPort(PROJECT);
    const action = { kind: "close" as const, token: "action-token" as ActionToken };
    expect(await port.act(action)).toEqual({ ok: true, value: parsePrdSnapshot(raw) });
    expect(await port.act(action)).toEqual({ ok: true, value: parsePrdSnapshot(raw) });
    const actions = fetcher.mock.calls
      .filter((call) => String(call[0]).endsWith("/prd-action"))
      .map((call) => posted(call).body);
    expect(actions).toHaveLength(2);
    expect(actions[0]).toMatchObject({ projectId: PROJECT, kind: "close", token: "action-token" });
    expect(actions[1]).toMatchObject({ projectId: PROJECT, kind: "close", token: "action-token" });
    expect(actions[0]?.requestId).toEqual(expect.any(String));
    expect(actions[0]?.requestId).not.toBe(actions[1]?.requestId);
    expect(fetcher.mock.calls.map((call) => String(call[0]).split("/").at(-1))).toEqual([
      "prd-action",
      "prd-snapshot",
      "prd-action",
      "prd-snapshot",
    ]);

    const refused = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false, kind: "stale", reason: "Reload the PRD." }), {
        status: 409,
      }),
    );
    vi.stubGlobal("fetch", refused);
    expect(await prdPort(PROJECT).act(action)).toEqual({
      ok: false,
      refusal: { kind: "stale", reason: "Reload the PRD." },
    });
    expect(refused).toHaveBeenCalledTimes(1);
  });

  it("posts the screen body to the message stream and puts a snapshot before finish", async () => {
    const raw = snapshot(7);
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/prd-message")) {
        return new Response(STREAM, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }
      return new Response(JSON.stringify(raw));
    });
    vi.stubGlobal("fetch", fetcher);
    const port = prdPort(PROJECT);
    const transport = port.chat({ kind: "main" });
    expect(port.chat({ kind: "main" })).toBe(transport);
    expect(await transport.reconnectToStream({ chatId: "main" })).toBeNull();
    const stream = await transport.sendMessages({
      trigger: "submit-message",
      chatId: "main",
      messageId: undefined,
      abortSignal: undefined,
      messages: [] as PrdUIMessage[],
      body: {
        scope: { kind: "main" },
        requestId: "req-1",
        baseRevision: 2,
        intent: { kind: "text", text: "Hello" },
      },
    });
    const sent = posted(fetcher.mock.calls[0] ?? []);
    expect(sent.url).toBe("http://localhost:54321/functions/v1/prd-message");
    expect(sent.headers).toMatchObject({
      accept: "text/event-stream",
      authorization: "Bearer user-token",
      apikey: "public-key",
    });
    expect(sent.body).toEqual({
      projectId: PROJECT,
      scope: { kind: "main" },
      requestId: "req-1",
      baseRevision: 2,
      intent: { kind: "text", text: "Hello" },
    });
    const received = await chunks(stream);
    const finishAt = received.findIndex((chunk) => (chunk as { type?: string }).type === "finish");
    const snapshotAt = received.findIndex(
      (chunk) => (chunk as { type?: string }).type === "data-snapshot",
    );
    expect(snapshotAt).toBeGreaterThanOrEqual(0);
    expect(finishAt).toBeGreaterThan(snapshotAt);
    expect(received[snapshotAt]).toEqual({
      type: "data-snapshot",
      data: parsePrdSnapshot(raw),
      transient: true,
    });
  });

  it("reads the snapshot only after the server ends the turn and closes the stream", async () => {
    const encoder = new TextEncoder();
    let server: ReadableStreamDefaultController<Uint8Array> | null = null;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        server = controller;
      },
    });
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/prd-message")) {
        return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
      }
      return new Response(JSON.stringify(snapshot(9)));
    });
    vi.stubGlobal("fetch", fetcher);
    const stream = await prdPort(PROJECT).chat({ kind: "main" }).sendMessages({
      trigger: "submit-message",
      chatId: "main",
      messageId: undefined,
      abortSignal: undefined,
      messages: [] as PrdUIMessage[],
      body: { scope: { kind: "main" }, requestId: "req-2", baseRevision: 2, intent: { kind: "text", text: "Hi" } },
    });
    const received = chunks(stream);
    server!.enqueue(encoder.encode('data: {"type":"start","messageId":"m1"}\n\ndata: {"type":"finish"}\n\n'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    const reads = () => fetcher.mock.calls.filter((call) => String(call[0]).endsWith("/prd-snapshot"));
    expect(reads()).toHaveLength(0);
    server!.enqueue(encoder.encode("data: [DONE]\n\n"));
    server!.close();
    const types = (await received).map((chunk) => (chunk as { type?: string }).type);
    expect(reads()).toHaveLength(1);
    expect(types.indexOf("data-snapshot")).toBeLessThan(types.indexOf("finish"));
  });

  it("surfaces a refused send as a refusal the screen can parse", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: false, kind: "forbidden", reason: "Not allowed." }), {
          status: 403,
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    const transport = prdPort(PROJECT).chat({ kind: "main" });
    const error = await transport
      .sendMessages({
        trigger: "submit-message",
        chatId: "main",
        messageId: undefined,
        abortSignal: undefined,
        messages: [] as PrdUIMessage[],
        body: {
          scope: { kind: "main" },
          requestId: "req-2",
          baseRevision: 1,
          intent: { kind: "text", text: "No" },
        },
      })
      .then(
        () => null,
        (caught: unknown) => caught,
      );
    expect(error).toBeInstanceOf(Error);
    expect(parseRefusal(JSON.parse((error as Error).message))).toEqual({
      kind: "forbidden",
      reason: "Not allowed.",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reads a newer broadcast with sinceSequence, ignores the rest, and drops the channel", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { sinceSequence?: number };
      if (body.sinceSequence === 5) return new Response(null, { status: 204 });
      if (body.sinceSequence === 4) return new Response(JSON.stringify(snapshot(5)));
      return new Response(JSON.stringify(snapshot(4)));
    });
    vi.stubGlobal("fetch", fetcher);
    const port = prdPort(PROJECT);
    expect((await port.load()).ok).toBe(true);
    const heard: number[] = [];
    const unsubscribe = port.subscribe((next) => heard.push(next.sequence));
    await vi.waitFor(() => expect(fake.channels).toHaveLength(1));
    const channel = fake.channels[0];
    if (!channel) throw new Error("the port did not open a channel");
    expect(channel.name).toBe(`prd:${PROJECT}`);
    expect(channel.options).toEqual({ config: { private: true } });
    expect(fake.authTokens).toEqual(["user-token"]);
    const handler = channel.handler;
    if (!handler) throw new Error("the channel is not listening for sequence");
    await handler({ payload: { sequence: 4 } });
    await handler({ payload: { sequence: 3 } });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await handler({ payload: { sequence: 5 } });
    expect(posted(fetcher.mock.calls[1] ?? []).body).toEqual({
      projectId: PROJECT,
      sinceSequence: 4,
    });
    expect(heard).toEqual([5]);
    await handler({ payload: { sequence: 5 } });
    expect(fetcher).toHaveBeenCalledTimes(2);
    await handler({ payload: { sequence: 6 } });
    expect(posted(fetcher.mock.calls[2] ?? []).body).toEqual({
      projectId: PROJECT,
      sinceSequence: 5,
    });
    expect(heard).toEqual([5]);
    fake.authListeners[0]?.("TOKEN_REFRESHED", { access_token: "next-token" });
    await vi.waitFor(() => expect(fake.authTokens).toContain("next-token"));
    unsubscribe();
    expect(channel.removed).toBe(true);
    expect(fake.authListeners).toHaveLength(0);
  });

  it("posts a draft and swallows a failed save", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", fetcher);
    await prdPort(PROJECT).saveDraft("main", "draft text");
    const saved = posted(fetcher.mock.calls[0] ?? []);
    expect(saved.url).toBe("http://localhost:54321/functions/v1/prd-draft");
    expect(saved.body).toEqual({ projectId: PROJECT, key: "main", text: "draft text" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    await expect(prdPort(PROJECT).saveDraft("main", "later")).resolves.toBeUndefined();
  });
});
