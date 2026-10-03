import type { EmailProviderSim, ProviderAttempt, ProviderOutcome } from './contracts.ts';
import { providerForceCountProblem } from './guards.ts';
import type { AnthropicMessagesPort, AnthropicMessagesSim, ModelRequestRecord, ScriptedReply } from './contracts.ts';
import { DISCOVERY_REQUEST_SETTINGS } from '../../../supabase/functions/_shared/discovery-metering.ts';
export type { AnthropicMessagesPort } from './contracts.ts';

function foldedInputTokens(usage: {
  inputTokens: number; cacheCreationInputTokens?: number; cacheReadInputTokens?: number;
}): number {
  return usage.inputTokens + (usage.cacheCreationInputTokens ?? 0) + (usage.cacheReadInputTokens ?? 0);
}

function countedRequestTokens(messages: unknown): number {
  return Math.ceil(JSON.stringify(messages).length / 4);
}

export function createAnthropicMessagesSim(): { sim: AnthropicMessagesSim; port: AnthropicMessagesPort } {
  let replies: ScriptedReply[] = [];
  const requests: ModelRequestRecord[] = [];
  return {
    sim: {
      script: (next) => { replies = structuredClone([...next]); },
      requests: () => structuredClone(requests),
    },
    port: {
      model: DISCOVERY_REQUEST_SETTINGS.model,
      countTokens: async (request) => replies[0]?.inputTokens ??
        (replies[0]?.kind !== 'error' ? replies[0]?.usage.inputTokens : undefined) ??
        countedRequestTokens(request.messages),
      create: async (request) => {
        const reply = replies.shift();
        if (reply === undefined) throw new Error('Anthropic Messages request exceeded its scripted replies');
        requests.push(structuredClone(request));
        if (reply.kind === 'error') return { ok: false, status: reply.status, reason: reply.reason };
        const capped = reply.usage.outputTokens > request.maxTokens;
        return {
          ok: true, text: reply.text ?? '', model: request.model,
          stopReason: capped ? 'max_tokens' : reply.kind === 'tool' ? 'tool_use' : reply.stopReason ?? 'end_turn',
          usage: {
            inputTokens: foldedInputTokens(reply.usage),
            outputTokens: Math.min(reply.usage.outputTokens, request.maxTokens),
          },
          toolUse: reply.kind === 'tool' ? { name: reply.name, input: reply.input } : null,
        };
      },
      async stream(request, onDelta, signal) {
        if (signal.aborted) {
          return { ok: false, status: 499, reason: 'the client cancelled before the provider answered' };
        }
        const answer = await this.create(request);
        if (!answer.ok) return answer;
        let text = '';
        for (let index = 0; index < answer.text.length && !signal.aborted; index += 20) {
          const delta = answer.text.slice(index, index + 20);
          text += delta;
          onDelta(delta);
          await Promise.resolve();
        }
        return signal.aborted ? { ...answer, text, stopReason: 'user_stopped',
          usage: { ...answer.usage, outputTokens: countedRequestTokens([{ role: 'assistant', content: text }]) },
          toolUse: null } : answer;
      },
    },
  };
}

export type ProviderSend = {
  recipientId: string;
  eventId: string;
  channel: string;
};

export type EmailProviderPort = {
  deliver(send: ProviderSend): 'accepted' | 'rejected' | 'no_ack';
};

export type EmailProviderStandIn = {
  sim: EmailProviderSim;
  port: EmailProviderPort;
};

function sendIdentity(send: ProviderSend): string {
  return JSON.stringify([send.eventId, send.recipientId, send.channel]);
}

export function createEmailProviderSim(): EmailProviderStandIn {
  const forced: ProviderOutcome[] = [];
  const attempts: ProviderAttempt[] = [];
  const accepted: ProviderAttempt[] = [];
  const acceptedIdentities = new Set<string>();

  const arm = (method: string, count: number, outcome: ProviderOutcome): void => {
    const problem = providerForceCountProblem(count);
    if (problem !== null) throw new Error(`refusing to arm the email provider with ${method}(): ${problem}`);
    for (let armed = 0; armed < count; armed++) forced.push(outcome);
  };

  return {
    sim: {
      rejectNext: (count) => arm('rejectNext', count, 'rejected'),
      acceptButLoseAck: (count) => arm('acceptButLoseAck', count, 'ack_lost'),
      attempts: () => attempts.map((attempt) => ({ ...attempt })),
      accepted: () => accepted.map((attempt) => ({ ...attempt })),
    },
    port: {
      deliver: (send) => {
        const identity = sendIdentity(send);

        if (acceptedIdentities.has(identity)) {
          attempts.push({ ...send, outcome: 'accepted' });
          return 'accepted';
        }

        const outcome = forced.shift() ?? 'accepted';
        attempts.push({ ...send, outcome });
        if (outcome === 'rejected') return 'rejected';

        accepted.push({ ...send, outcome });
        acceptedIdentities.add(identity);
        return outcome === 'ack_lost' ? 'no_ack' : 'accepted';
      },
    },
  };
}
