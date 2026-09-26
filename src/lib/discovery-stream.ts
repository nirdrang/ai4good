import type { UIMessage } from "ai";

// The Discovery chat stream: what one reply carries beside its text.
// Screen design: design/discovery-ui-contract.md. The Astra mock's fixture transport emits
// exactly these parts today; the discovery-message function must emit them for the wired screen.
// Amounts are integer millionths of a US dollar.

export type SuggestedAnswer = { id: string; label: string; answer: string };

export type DiscoveryUsage = {
  dailyLeft: number;
  dailyGrant: number;
  betaLeft: number;
  betaGrant: number;
  availableMicros: number;
  reservedMicros: number;
  nextReply: "free" | "paid" | "unavailable";
};

export type DiscoveryDataTypes = {
  /** A question the AI asks next, with its reason and suggested answers. One part per question. */
  question: { id: string; text: string; reason: string; suggestions: SuggestedAnswer[] };
  /** The brief topics this reply saved from the NGO's answers. */
  filed: { topics: { id: string; title: string }[] };
  /** What this reply cost. */
  charge: { kind: "free" } | { kind: "paid"; usageMicros: number; feeMicros: number };
  /** Every required topic is agreed; the AI has stopped asking. */
  ready: { agreed: number; total: number };
  /** Usage after this reply. Sent transient: it updates the usage card, not the transcript. */
  usage: DiscoveryUsage;
};

export type DiscoveryUIMessage = UIMessage<never, DiscoveryDataTypes>;

/** One structured answer. `choice` is a suggestion id, "custom", or "uncertain". */
export type DiscoveryAnswer = {
  questionId: string;
  choice: string;
  text: string;
  certain: boolean;
};

/** The request body beside the NGO's message. "ask" asks the AI about the open question and answers nothing. */
export type DiscoveryRequestBody = {
  organizationId: string;
  projectId: string;
  message: string;
  mode: "answer" | "ask";
  answers: DiscoveryAnswer[];
};

/** A refusal arrives as an error whose message is this JSON, as the send route answers today. */
export type DiscoveryRefusal = { kind: string; reason: string };
