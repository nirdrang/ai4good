import { afterEach, describe, expect, it, vi } from 'vitest';
import { discoveryPort, discoveryRefusal, filesReading, isDiscoveryState, parseDiscoveryResponse } from '../../../src/lib/discovery-port.ts';
import type { DiscoveryState } from '../../../src/lib/discovery-stream.ts';

vi.mock('../../../src/lib/supabase', () => ({
  supabaseUrl: () => 'http://localhost:54321',
  supabasePublishableKey: () => 'public-key',
  getSupabase: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'user-token' } } }) } }),
}));

const state: DiscoveryState = {
  project: { title: 'Scheduling', organizationName: 'Kitchen', funded: false },
  brief: { revision: 1, need: { text: 'Scheduling', source: { kind: 'intake' } }, usersToday: null, successMeasure: null,
    topics: [], questions: [], dataTier: null, fit: null, causeLabels: [] },
  transcript: [], files: [], confirmation: null,
  usage: { dailyLeft: 10, dailyGrant: 10, availableMicros: 0, reservedMicros: 0, allocationMicros: 0,
    settledMicros: 0, holdMicros: 0, nextResetAt: null, nextReply: 'free' },
};

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Discovery response parsing', () => {
  it('reads the complete screen state', () => {
    expect(parseDiscoveryResponse(JSON.stringify({ ok: true, state }), 'state', isDiscoveryState)).toEqual({ ok: true, value: state });
  });
  it.each(['stale-revision', 'file-limit', 'duplicate-file', 'daily-limit', 'finished', 'mode-changed', 'file-reading'])('preserves %s refusals', (kind) => {
    expect(parseDiscoveryResponse(JSON.stringify({ ok: false, kind, reason: 'Blocked' }), 'state', isDiscoveryState))
      .toEqual({ ok: false, refusal: { kind, reason: 'Blocked' } });
  });
  it.each(['<html>Gateway error</html>', '', 'null', '{"ok":true}', '{"ok":true,"state":{}}'])('refuses malformed response %s', (text) => {
    expect(parseDiscoveryResponse(text, 'state', isDiscoveryState).ok).toBe(false);
  });
  it('maps a refusal without a kind', () => {
    expect(discoveryRefusal({ reason: 'Sign in' })).toEqual({ kind: 'refused', reason: 'Sign in' });
  });
  it('unwraps a failed model turn refusal without losing its kind', () => {
    expect(discoveryRefusal({ ok: false, reason: JSON.stringify({ kind: 'invalid-request', reason: 'the reply could not be read' }) }))
      .toEqual({ kind: 'invalid-request', reason: 'the reply could not be read' });
  });
  it('only discovery files being read keep polling', () => {
    expect(filesReading([{ origin: 'intake', id: 'i', name: 'intake.pdf', sizeBytes: 4, tookFromIt: null }])).toBe(false);
    for (const status of [{ kind: 'reading', percent: 0 }, { kind: 'ready', facts: 2 }, { kind: 'failed', reason: 'Bad file' }] as const) {
      expect(filesReading([{ origin: 'discovery', id: 'f', name: 'file.txt', sizeBytes: 4, tookFromIt: null, status }])).toBe(status.kind === 'reading');
    }
  });
});

describe('Discovery polling and writes', () => {
  it('requests the edge stream with the signed-in token and screen answers', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('data: {"type":"finish"}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, state })));
    vi.stubGlobal('fetch', fetcher);
    const port = discoveryPort({ organizationId: 'org', projectId: 'project' });
    const stream = await port.chat.sendMessages({ trigger: 'submit-message', chatId: 'chat', messageId: undefined, abortSignal: undefined, messages: [{ id: 'answer', role: 'user', parts: [{ type: 'text', text: 'Yes' }] }],
      body: { mode: 'answer', answers: [], message: 'Yes', expectedCharge: 'free' } });
    expect(fetcher.mock.calls[0][1].headers).toMatchObject({ accept: 'text/event-stream', authorization: 'Bearer user-token', apikey: 'public-key' });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ organizationId: 'org', projectId: 'project', userMessageId: 'answer', mode: 'answer', message: 'Yes', expectedCharge: 'free' });
    const reader = stream.getReader();
    while (!(await reader.read()).done) {}
  });
  it('polls while reading, stops at ready, and stops when the last subscriber leaves', async () => {
    vi.useFakeTimers();
    const reading = { ...state, files: [{ origin: 'discovery', id: 'f', name: 'file.txt', sizeBytes: 4, tookFromIt: null, status: { kind: 'reading', percent: 0 } }] };
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, state: reading })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, state })));
    vi.stubGlobal('fetch', fetcher);
    const port = discoveryPort({ organizationId: 'org', projectId: 'project' });
    await port.load();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const listener = vi.fn();
    const unsubscribe = port.subscribe(listener);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(state);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('loads once after a write and sends only the signed-in token and public key', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, brief: state.brief })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, state })));
    vi.stubGlobal('fetch', fetcher);
    const port = discoveryPort({ organizationId: 'org', projectId: 'project' });
    const listener = vi.fn();
    const unsubscribe = port.subscribe(listener);
    await port.askTopic({ topicId: 'owner' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ organizationId: 'org', projectId: 'project', action: 'ask', topicId: 'owner' });
    expect(fetcher.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer user-token', apikey: 'public-key', 'Content-Type': 'application/json' });
    expect(listener).toHaveBeenCalledWith(state);
    unsubscribe();
  });
  it('refreshes a stale revision before returning its refusal', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, kind: 'stale-revision', reason: 'Reload' }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, state })));
    vi.stubGlobal('fetch', fetcher);
    const port = discoveryPort({ organizationId: 'org', projectId: 'project' });
    const listener = vi.fn();
    const unsubscribe = port.subscribe(listener);
    expect(await port.saveBriefEdit({ sectionId: 'need', text: 'Updated', baseRevision: 1 })).toEqual({ ok: false, refusal: { kind: 'stale-revision', reason: 'Reload' } });
    expect(listener).toHaveBeenCalledWith(state);
    unsubscribe();
  });
  it('does one free opening and reloads its saved state', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, brief: null })))
      .mockResolvedValueOnce(new Response('data: {"type":"finish"}\n\n'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, state })));
    vi.stubGlobal('fetch', fetcher);
    const port = discoveryPort({ organizationId: 'org', projectId: 'project' });
    const [first, second] = await Promise.all([port.load(), port.load()]);
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({ mode: 'opening', answers: [], expectedCharge: 'free', userMessageId: 'opening-project' });
  });
});
