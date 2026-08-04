/**
 * H5's email/notification provider stand-in — the one vendor seam with a consuming test today.
 *
 * ONE OBJECT, TWO FACES, and the split is the whole design. The TEST holds `sim`, which is
 * `EmailProviderSim` from `contracts.ts` exactly as that file already defines it: arm outcomes, read
 * the out-of-band trace. The SYSTEM UNDER TEST holds `port`, which can send and nothing else — the
 * adapter's half of this seam, beside its implementation, exactly as `AdapterFaultSeam` and
 * `AdapterSentinelSeam` are H3's.
 *
 * THE PORT DELIBERATELY CANNOT SEE `'ack_lost'`. A provider that physically accepted a send and then
 * lost the acknowledgment is, to the sender, indistinguishable from a timeout — and that
 * indistinguishability is the thing AT-016.11(c) is about. So `deliver()` answers `'no_ack'`, and a
 * fixture cannot shortcut the retry by asking the provider whether it "really" accepted. The trace
 * knows; the sender does not. Handing the sender the truth here would let a delivery be marked sent
 * on a lost ack and still look correct, which is precisely the defect the clause hunts.
 *
 * THE JUDGEMENT ABOUT WHAT COUNTS AS AN ARMING is not made here: `providerForceCountProblem` in
 * `guards.ts` owns it and both arming methods route through it, for the reason that file states —
 * two copies of a rule is how the two drift apart.
 *
 * NO `clear()` / reset surface, on purpose. `createHarness()` builds a fresh sim per harness and
 * `registry.ts` tears the harness down per test, so isolation is structural rather than something a
 * test has to remember to ask for — and `contracts.ts` offers a test no such method to call.
 */

import type { EmailProviderSim, ProviderAttempt, ProviderOutcome } from './contracts.ts';
import { providerForceCountProblem } from './guards.ts';

/** What a send looks like at the seam. The channel is the suite's own name for it, never validated here. */
export type ProviderSend = {
  recipientId: string;
  eventId: string;
  channel: string;
};

/**
 * The SUT-facing seam: `'accepted'` means the sender may durably mark the send done, and BOTH other
 * answers mean it may not. `'rejected'` is a refusal the provider stated; `'no_ack'` is silence.
 */
export type EmailProviderPort = {
  deliver(send: ProviderSend): 'accepted' | 'rejected' | 'no_ack';
};

/** The two faces, built from one piece of state. */
export type EmailProviderStandIn = {
  sim: EmailProviderSim;
  port: EmailProviderPort;
};

/**
 * `eventId:recipientId:channel` — the same pair identity AT-016.11(c) counts duplicates over, and
 * the identity a real provider's idempotency key would carry.
 */
function sendIdentity(send: ProviderSend): string {
  return `${send.eventId}:${send.recipientId}:${send.channel}`;
}

export function createEmailProviderSim(): EmailProviderStandIn {
  /*
   * ONE QUEUE, FILLED BY BOTH ARMING METHODS IN CALL ORDER. Two counters — one for rejections, one
   * for lost acks — would answer every single-kind test identically and still get the mixed case
   * wrong, serving whichever kind the implementation happened to prefer. Call order is the only
   * meaning `rejectNext(1); acceptButLoseAck(1)` can honestly have, so there is one queue and
   * `vendors.selftest.ts` drives both arming orders to prove it.
   */
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
      // FRESH COPIES, both of them. These arrays ARE the out-of-band evidence; handing a test the
      // live objects would let an assertion that sorts or splices its own result rewrite the record
      // the next assertion reads.
      attempts: () => attempts.map((attempt) => ({ ...attempt })),
      accepted: () => accepted.map((attempt) => ({ ...attempt })),
    },
    port: {
      deliver: (send) => {
        const identity = sendIdentity(send);

        /*
         * IDEMPOTENCY FIRST, and it is what makes "a lost ack mints no duplicate" provable rather
         * than assumed. A send whose identity the provider already accepted is a REPLAY: the
         * provider acks it (a real one returns the original result), it is recorded as an arrival
         * because it really did arrive, and it adds NOTHING to `accepted()` because nothing new was
         * accepted. It also consumes no forced outcome — a replay is not one of "the next N sends"
         * a test armed, and letting it eat one would silently disarm the case being set up.
         */
        if (acceptedIdentities.has(identity)) {
          attempts.push({ ...send, outcome: 'accepted' });
          return 'accepted';
        }

        const outcome = forced.shift() ?? 'accepted';
        attempts.push({ ...send, outcome });
        // A REJECTED identity is deliberately NOT protected: nothing was accepted, so its retry is a
        // first acceptance and must be able to succeed. Only a physical acceptance closes an identity.
        if (outcome === 'rejected') return 'rejected';

        accepted.push({ ...send, outcome });
        acceptedIdentities.add(identity);
        return outcome === 'ack_lost' ? 'no_ack' : 'accepted';
      },
    },
  };
}
