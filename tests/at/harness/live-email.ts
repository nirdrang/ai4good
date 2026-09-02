/**
 * THE LIVE MAIL CATCHER — the integration tier's `vendors.email`.
 *
 * WHAT IT IS AND IS NOT, first, because the name invites the wrong reading. This is NOT a real email
 * PROVIDER, and no green anywhere in this repository claims one. Nothing here sends mail through a
 * vendor at any tier. What the slot's stack really holds is the catcher every message the local
 * Supabase Auth emits lands in, and READING it is a genuine capability: the confirmation link a body
 * follows was produced by GoTrue on this run, in response to this run's signup, rather than minted
 * by a simulator the test armed. That is the difference between the sim and this, and it is the only
 * difference this file claims.
 *
 * WHERE THE ENDPOINT COMES FROM. The stack's own `supabase status -o json` reports `MAILPIT_URL`; the
 * runner checks it against `[local_smtp] port` and passes it into the child. It is NOT recomputed
 * from that port here: the status is the stack's one statement of the address, and a second copy of
 * a rule is how two copies come to disagree while both look right (the warning `vendors.ts` states
 * at its head).
 *
 * WHY IT IS PROBED BEFORE IT IS GRANTED. A URL is a string. `capabilities.ts` grants `vendors.email`
 * a `real` verdict on this value, so the grounds have to be positive: the catcher is asked what it
 * is, and only an answer that identifies a catcher earns the grant. An unreachable endpoint refuses
 * loudly here rather than turning into "no confirmation email arrived" three assertions later —
 * which is the failure AI4DEV-59's own proof script called out and solved the same way.
 *
 * WHICH CATCHER. Measured rather than remembered, exactly as that transcript did it: the Supabase
 * CLI has shipped Inbucket and, more recently, Mailpit, and their APIs differ. This item's
 * verify-first record measured Mailpit v1.30.2 behind slot 1's port and the Inbucket shape answering
 * 404. Both probes are still performed, so a CLI version that goes back is a named refusal instead
 * of a mystery.
 */

import { attestationOf, stampAttestation, SLOT_ATTESTATION_BRAND, type LiveAttestation } from './capabilities.ts';

export type LiveEmailMessage = {
  /** the catcher's own id for the message */
  id: string;
  /** every recipient address the catcher recorded */
  to: string[];
  subject: string;
  /** the message's text, as the catcher renders it — where a verification link is found */
  body: string;
};

/**
 * The seam an integration body reaches. READ-ONLY, and that is the point: there is no `rejectNext`
 * and no `acceptButLoseAck`, because nothing here can be told what to do. A capability that can be
 * commanded to fail is a simulator, and `capabilities.ts` would stamp it a stand-in on exactly that
 * evidence.
 */
export type LiveEmail = {
  /** every message the catcher holds for this address, newest first */
  messagesFor(address: string): Promise<LiveEmailMessage[]>;
  /** the catcher's own identification, as measured at construction — for a transcript, never a rule */
  readonly describedAs: string;
};

export type LiveVendors = { email: LiveEmail };

type MailpitMessageSummary = {
  ID?: unknown;
  Subject?: unknown;
  To?: unknown;
};

function addressesOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (entry && typeof entry === 'object' ? String((entry as { Address?: unknown }).Address ?? '') : ''))
    .filter((address) => address.length > 0);
}

type HttpAnswer = { status: number; text: string };

async function readJson(url: string): Promise<HttpAnswer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  return { status: response.status, text: await response.text() };
}

/**
 * Build the live mail-catcher capability, or refuse.
 *
 * The attestation is required and is not decoration: it is the same slot round trip every other live
 * capability is granted on, so the ledger can never carry a `real` mail catcher for a stack this run
 * did not prepare. It is VALIDATED here rather than merely typed (gate-2 ruling S1-2): a
 * `LiveAttestation` is two strings, so an object literal used to mint a live email capability, and
 * the brand — which only `attestSlot()` stamps — is what tells the two apart.
 *
 * `readAnswer` IS A SELFTEST SEAM and the harness passes it nowhere; `attestation.ts` states the
 * doctrine at length on its own seam and the same words apply here. It supplies an ANSWER and never
 * a verdict: whatever it returns goes through the SAME identification below as a real response, so
 * an answer that is not a catcher's still refuses. Without it the refusals below would be rules
 * nothing exercises, because this file's checks are about what an HTTP answer MEANS and the loop
 * tier has no catcher to ask.
 */
export async function createLiveEmail(opts: {
  catcherUrl: string;
  attestation: LiveAttestation;
  readAnswer?: (url: string) => Promise<HttpAnswer>;
}): Promise<LiveVendors> {
  const base = opts.catcherUrl.replace(/\/$/, '');
  const read = opts.readAnswer ?? readJson;
  const attested = attestationOf(opts.attestation, SLOT_ATTESTATION_BRAND);
  if (!attested) {
    throw new Error(
      'refusing to build the live email capability: the attestation handed in carries no slot brand, so it is a ' +
        'plain object with two strings on it rather than the record of a round trip that happened. A live mail ' +
        'catcher is granted `real` on this evidence, so the evidence has to be the real article.',
    );
  }
  if (!base) {
    throw new Error(
      "refusing to build the live email capability: the slot's status reported no mail catcher URL, so there is " +
        'nothing to read and nothing to attest.',
    );
  }

  let info: HttpAnswer;
  try {
    info = await read(`${base}/api/v1/info`);
  } catch (err) {
    throw new Error(
      `refusing to build the live email capability: the mail catcher at ${base} did not answer its identification ` +
        `probe (${(err as Error).message}). An endpoint nothing answers is not positive evidence.`,
    );
  }
  if (info.status !== 200) {
    const inbucket = await read(`${base}/api/v1/mailbox/probe`).catch(() => ({ status: 0, text: '' }));
    throw new Error(
      `refusing to build the live email capability: the endpoint at ${base} answered ${info.status} to the Mailpit ` +
        `identification probe and ${inbucket.status} to the Inbucket one, so this harness cannot say what is behind ` +
        'it. The catcher shape is measured on every run rather than remembered, because the Supabase CLI has ' +
        'shipped both and their APIs differ.',
    );
  }

  /*
   * A 200 IS NOT AN IDENTIFICATION (gate-2 ruling S1-6). Any HTTP server answers 200 to something,
   * and the version used to fall back to "an unstated version" — so a web page, a proxy, or the
   * wrong service on a reused port passed identification and the ledger then called it a real mail
   * catcher. What identifies Mailpit is its own answer shape: parseable JSON carrying a non-empty
   * string `Version`. Anything else refuses, and the refusal names what was expected rather than
   * printing the body, which is somebody's mail.
   */
  let identification: { Version?: unknown };
  try {
    identification = JSON.parse(info.text) as { Version?: unknown };
  } catch {
    throw new Error(
      `refusing to build the live email capability: the endpoint at ${base} answered 200 to the Mailpit ` +
        'identification probe with something that is not JSON, so this harness cannot say what is behind it.',
    );
  }
  const version = typeof identification?.Version === 'string' ? identification.Version.trim() : '';
  if (!version) {
    throw new Error(
      `refusing to build the live email capability: the endpoint at ${base} answered 200 to the Mailpit ` +
        'identification probe with JSON that carries no string `Version`, which is the field a Mailpit identifies ' +
        'itself with. A 200 from an unidentified endpoint is not positive evidence.',
    );
  }
  const describedAs = `Mailpit ${version} at ${base}`;

  const email: LiveEmail = {
    describedAs,
    messagesFor: async (address: string): Promise<LiveEmailMessage[]> => {
      const search = await read(`${base}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}&limit=50`);
      if (search.status !== 200) {
        throw new Error(`the mail catcher answered ${search.status} to a search for messages addressed to ${address}`);
      }
      const parsed = JSON.parse(search.text) as { messages?: MailpitMessageSummary[] };
      const summaries = Array.isArray(parsed.messages) ? parsed.messages : [];
      const messages: LiveEmailMessage[] = [];
      for (const summary of summaries) {
        const id = String(summary.ID ?? '');
        if (!id) continue;
        // The SOURCE, not the rendered HTML: a verification link survives verbatim in the raw
        // message, while a renderer is free to rewrite what it displays.
        const source = await read(`${base}/api/v1/message/${encodeURIComponent(id)}/raw`);
        messages.push({
          id,
          to: addressesOf(summary.To),
          subject: String(summary.Subject ?? ''),
          body: source.status === 200 ? source.text : '',
        });
      }
      return messages;
    },
  };

  return {
    email: stampAttestation(email, {
      evidence: `${describedAs} answered its identification probe — ${attested.evidence}`,
      constructedFor: 'vendors.email',
    }),
  };
}
