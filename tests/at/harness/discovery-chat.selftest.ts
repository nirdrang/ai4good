import { describe, expect, it } from 'vitest';

import {
  messagesFromTurns,
  parseConversationBody,
  pollUntilTurnSettled,
  refusalFromResponseText,
  type Allowance,
  type ConversationRead,
  type DiscoveryTurn,
} from '../../../src/lib/discovery-chat.ts';

const ALLOWANCE: Allowance = {
  organizationId: 'org-1',
  utcDay: '2026-09-18',
  vetted: false,
  dailyGrant: 10,
  spentToday: 1,
  remaining: 9,
};

function turn(overrides: Partial<DiscoveryTurn> & Pick<DiscoveryTurn, 'id' | 'seq'>): DiscoveryTurn {
  return {
    status: 'settled',
    userMessage: 'Need reminders.',
    assistantMessage: 'Recorded.',
    ...overrides,
  };
}

function loaded(turns: DiscoveryTurn[], allowance: Allowance | null = ALLOWANCE): ConversationRead {
  return { kind: 'loaded', turns, allowance };
}

describe('messagesFromTurns', () => {
  it('maps a settled turn to a user message and an assistant message', () => {
    const messages = messagesFromTurns([
      turn({ id: 't1', seq: 1, status: 'settled', userMessage: 'Hello', assistantMessage: 'Hi there' }),
    ]);
    expect(messages).toEqual([
      { id: 't1:user', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
      { id: 't1:assistant', role: 'assistant', parts: [{ type: 'text', text: 'Hi there' }] },
    ]);
  });

  it('maps an open turn to the user message only', () => {
    const messages = messagesFromTurns([
      turn({ id: 't2', seq: 2, status: 'open', userMessage: 'Still going', assistantMessage: null }),
    ]);
    expect(messages).toEqual([
      { id: 't2:user', role: 'user', parts: [{ type: 'text', text: 'Still going' }] },
    ]);
  });

  it('maps a stopped turn with partial text to both messages', () => {
    const messages = messagesFromTurns([
      turn({
        id: 't3',
        seq: 3,
        status: 'settled',
        userMessage: 'Tell me more',
        assistantMessage: 'Got',
      }),
    ]);
    expect(messages).toEqual([
      { id: 't3:user', role: 'user', parts: [{ type: 'text', text: 'Tell me more' }] },
      { id: 't3:assistant', role: 'assistant', parts: [{ type: 'text', text: 'Got' }] },
    ]);
  });
});

describe('refusalFromResponseText', () => {
  it('reads kind and reason from a JSON refusal', () => {
    expect(
      refusalFromResponseText(
        JSON.stringify({ ok: false, kind: 'daily-allowance-exhausted', reason: 'no credits left today' }),
      ),
    ).toEqual({ kind: 'daily-allowance-exhausted', reason: 'no credits left today' });
  });

  it('reads a JSON body that has reason and no kind', () => {
    expect(refusalFromResponseText(JSON.stringify({ ok: false, reason: 'authenticate first' }))).toEqual({
      kind: null,
      reason: 'authenticate first',
    });
  });

  it('returns the raw text when the body is not JSON', () => {
    expect(refusalFromResponseText('Invalid JWT')).toEqual({ kind: null, reason: 'Invalid JWT' });
  });
});

describe('parseConversationBody', () => {
  const goodTurn = turn({ id: 't1', seq: 1, userMessage: 'Hello', assistantMessage: 'Hi' });

  it('loads a good body', () => {
    const text = JSON.stringify({
      ok: true,
      conversation: { projectId: 'p1', turns: [goodTurn] },
      allowance: ALLOWANCE,
    });
    expect(parseConversationBody(text)).toEqual({
      kind: 'loaded',
      turns: [goodTurn],
      allowance: ALLOWANCE,
    });
  });

  it('fails a body whose turn is malformed', () => {
    const text = JSON.stringify({
      ok: true,
      conversation: { turns: [{ id: 't1', seq: 1, status: 'settled' }] },
      allowance: ALLOWANCE,
    });
    expect(parseConversationBody(text)).toEqual({
      kind: 'failed',
      reason: 'the conversation read has an unexpected shape',
    });
  });

  it('loads a body whose allowance is malformed as allowance null', () => {
    const text = JSON.stringify({
      ok: true,
      conversation: { turns: [goodTurn] },
      allowance: { remaining: 'nine' },
    });
    expect(parseConversationBody(text)).toEqual({
      kind: 'loaded',
      turns: [goodTurn],
      allowance: null,
    });
  });
});

describe('pollUntilTurnSettled', () => {
  const open = turn({ id: 't2', seq: 2, status: 'open', userMessage: 'Go', assistantMessage: null });
  const settled = turn({ id: 't2', seq: 2, status: 'settled', userMessage: 'Go', assistantMessage: 'Got it' });

  it('reads until a later seq is not open', async () => {
    const answers: ConversationRead[] = [loaded([open]), loaded([open]), loaded([settled])];
    const result = await pollUntilTurnSettled(
      async () => {
        const next = answers.shift();
        if (!next) throw new Error('read past the scripted answers');
        return next;
      },
      1,
      { deadlineMs: 1000, intervalMs: 1 },
    );
    expect(result).toEqual(loaded([settled]));
    expect(answers).toEqual([]);
  });

  it('returns still-open when the turn never settles before the deadline', async () => {
    const result = await pollUntilTurnSettled(
      async () => loaded([open]),
      1,
      { deadlineMs: 15, intervalMs: 1 },
    );
    expect(result).toEqual({ kind: 'still-open', turns: [open], allowance: ALLOWANCE });
  });

  it('returns no-turn when no later seq ever appears before the deadline', async () => {
    const result = await pollUntilTurnSettled(
      async () => loaded([settled]),
      2,
      { deadlineMs: 15, intervalMs: 1 },
    );
    expect(result).toEqual({ kind: 'no-turn', turns: [settled], allowance: ALLOWANCE });
  });

  it('returns failed when a read throws', async () => {
    const result = await pollUntilTurnSettled(
      async () => {
        throw new Error('network down');
      },
      0,
      { deadlineMs: 1000, intervalMs: 1 },
    );
    expect(result).toEqual({ kind: 'failed', reason: 'network down' });
  });
});
