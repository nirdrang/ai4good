import type { OutgoingMessage, ProviderPort } from '../../../../supabase/functions/_shared/notifications.ts';
import type { Stack } from '../../harness/live-stack.ts';
import { createCrashSwitch, type CrashSwitch } from './_fault-switch.ts';
import { messagesAddressedTo } from './_mail-witness.ts';

export const PROVIDER_FAULT_POINT = 'notifications.provider_send';

export type ProviderFaultLedger = {
  forced: 'reject' | 'lose_ack';
  remaining: number;
  reaches: number;
};

export type RecordedAttempt = {
  recipientId: string;
  eventId: string;
  channel: string;
  outcome: 'accepted' | 'rejected' | 'ack_lost';
};

const attempts: RecordedAttempt[] = [];
const accepted: RecordedAttempt[] = [];
const acceptedIdentities = new Set<string>();

export function recordedProviderAttempts(): RecordedAttempt[] {
  return attempts.map((attempt) => ({ ...attempt }));
}

export function recordedProviderAccepted(): RecordedAttempt[] {
  return accepted.map((attempt) => ({ ...attempt }));
}

function identityOf(message: OutgoingMessage): string {
  return JSON.stringify([message.eventId, message.recipientId, message.channel]);
}

function recordAttempt(message: OutgoingMessage, outcome: RecordedAttempt['outcome']): void {
  attempts.push({
    recipientId: message.recipientId,
    eventId: message.eventId,
    channel: message.channel,
    outcome,
  });
}

function rememberAccepted(message: OutgoingMessage, outcome: 'accepted' | 'ack_lost'): void {
  const identity = identityOf(message);
  if (acceptedIdentities.has(identity)) return;
  acceptedIdentities.add(identity);
  accepted.push({
    recipientId: message.recipientId,
    eventId: message.eventId,
    channel: message.channel,
    outcome,
  });
}

function resetLogs(): void {
  attempts.length = 0;
  accepted.length = 0;
  acceptedIdentities.clear();
}

/**
 * SMTP has no idempotency key, so the live binding asks the catcher before it sends. A key
 * that already arrived is answered `accepted` and is not sent again.
 */
export function withIdempotentReplay(inner: ProviderPort, stack: Stack): ProviderPort {
  return {
    deliver: async (message) => {
      if (message.to) {
        const existing = (await messagesAddressedTo([message.to], stack)).filter((row) => row.key === message.key);
        if (existing.length > 0) {
          return { outcome: 'accepted', receipt: { replayed: true, key: message.key } };
        }
      }
      return inner.deliver(message);
    },
  };
}

export function bindProviderFaults(inner: ProviderPort): {
  provider: ProviderPort;
  faults: CrashSwitch<ProviderFaultLedger>;
} {
  resetLogs();
  const faults = createCrashSwitch<ProviderFaultLedger>(
    PROVIDER_FAULT_POINT,
    (kind) => ({ forced: kind === 'lose_ack' ? 'lose_ack' : 'reject', remaining: 1, reaches: 0 }),
    (ledger) => ledger.reaches,
    ['reject', 'lose_ack'],
  );
  const provider: ProviderPort = {
    deliver: async (message) => {
      const armed = faults.armed();
      if (armed && armed.remaining > 0) {
        armed.remaining -= 1;
        armed.reaches += 1;
        if (armed.forced === 'reject') {
          recordAttempt(message, 'rejected');
          return { outcome: 'rejected', receipt: null };
        }
        const innerAnswer = await inner.deliver(message);
        recordAttempt(message, 'ack_lost');
        if (innerAnswer.outcome === 'accepted') rememberAccepted(message, 'ack_lost');
        return { outcome: 'no_ack', receipt: null };
      }
      const answer = await inner.deliver(message);
      if (answer.outcome === 'rejected') {
        recordAttempt(message, 'rejected');
        return answer;
      }
      if (answer.outcome === 'no_ack') {
        recordAttempt(message, 'ack_lost');
        return answer;
      }
      recordAttempt(message, 'accepted');
      rememberAccepted(message, 'accepted');
      return answer;
    },
  };
  return { provider, faults };
}
