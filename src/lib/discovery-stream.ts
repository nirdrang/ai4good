import type { UIMessage } from "ai";

export type SuggestedAnswer = { id: string; label: string; answer: string };

export type Importance = "needed" | "suggested" | "later";

export type DiscoveryUsage = {
  dailyLeft: number;
  dailyGrant: number;
  betaLeft: number;
  betaGrant: number;
  availableMicros: number;
  reservedMicros: number;
  /** This gate's paid allocation, and what it has settled, for the paid gauge. */
  allocationMicros: number;
  settledMicros: number;
  /** The hold one paid reply reserves. */
  holdMicros: number;
  /** The next reset as an ISO instant, or null when no free reply returns (beta used up). */
  nextResetAt: string | null;
  nextReply: "free" | "paid" | "unavailable";
};

export type BriefSource =
  | { kind: "intake" }
  | { kind: "chat"; round: number }
  | { kind: "accepted-suggestion" }
  | { kind: "edit"; revision: number }
  | { kind: "file"; fileId: string; fileName: string };

export type BriefQuestion = {
  id: string;
  topicId: string;
  text: string;
  reason: string;
  options: SuggestedAnswer[];
  /** Exactly one option is Suggested. */
  suggestedId: string;
  importance: Importance;
  recommendation: string;
  uncertaintyHelp: string;
  askedInRound: number;
};

export type BriefTopic = {
  id: string;
  title: string;
  required: boolean;
  importance: Importance;
  /** Present from the start, so a review at zero coverage can show it. */
  why: string;
  suggestion: string | null;
  /** The question text shown as Coming next before it is asked. */
  plannedQuestion: string;
  state:
    | { kind: "open" }
    | { kind: "not-sure"; questionId: string; help: string }
    | { kind: "agreed"; answer: string; source: BriefSource; answerMessageId: string | null };
  /** An earlier answer this topic depends on changed. The old answer stays visible. */
  needsReview?: boolean;
};

export type BriefSnapshot = {
  revision: number;
  need: { text: string; source: BriefSource };
  usersToday: { text: string; source: BriefSource } | null;
  successMeasure: { text: string; source: BriefSource } | null;
  topics: BriefTopic[];
  questions: BriefQuestion[];
  dataTier: { tier: 0 | 1 | 2; reason: string } | null;
  fit: { verdict: "fits" | "declined"; reason: string } | null;
  /** Zero to three. The NGO may remove one, never type one. */
  causeLabels: string[];
};

export type FileStatus =
  | { kind: "reading"; percent: number }
  | { kind: "ready"; facts: number }
  | { kind: "failed"; reason: string };

export type DiscoveryFile =
  | { origin: "intake"; id: string; name: string; sizeBytes: number; tookFromIt: string | null }
  | {
      origin: "discovery";
      id: string;
      name: string;
      sizeBytes: number;
      status: FileStatus;
      tookFromIt: string | null;
    };

export type Confirmation = {
  revision: number;
  approver: string;
  at: string;
  acceptedGaps: { topicId: string; title: string; importance: Importance; reason: string }[];
};

export type DiscoveryDataTypes = {
  /** A question the AI asks next, with its reason and suggested answers. One part per question. */
  question: {
    id: string;
    topicId: string;
    text: string;
    reason: string;
    suggestions: SuggestedAnswer[];
    suggestedId: string;
    importance: Importance;
    /** The approach the AI suggests, with its reason. The NGO still makes the decision. */
    recommendation: string;
    /** How the NGO can find the missing fact when the answer is "not sure". */
    uncertaintyHelp: string;
  };
  /** The brief topics this reply saved from the NGO's answers. */
  filed: { topics: { id: string; title: string }[] };
  /** What this reply cost. */
  charge: { kind: "free" } | { kind: "paid"; usageMicros: number; feeMicros: number };
  /** Every required topic is agreed; the AI has stopped asking. */
  ready: { agreed: number; total: number };
  /** Usage after this reply. Sent transient: it updates the usage card, not the transcript. */
  usage: DiscoveryUsage;
  /** The brief after this reply. Sent transient: state, not transcript. */
  brief: BriefSnapshot;
};

export type DiscoveryUIMessage = UIMessage<never, DiscoveryDataTypes>;

export type DiscoveryState = {
  project: { title: string; organizationName: string; funded: boolean };
  transcript: DiscoveryUIMessage[];
  brief: BriefSnapshot;
  files: DiscoveryFile[];
  usage: DiscoveryUsage;
  confirmation: Confirmation | null;
};

/** One structured answer. `choice` is a suggestion id, "custom", or "uncertain". */
export type DiscoveryAnswer = {
  questionId: string;
  choice: string;
  text: string;
  certain: boolean;
};

/** The request body beside the NGO's message. The charge is the mode the Send button showed. */
export type DiscoveryRequestBody = {
  organizationId: string;
  projectId: string;
  message: string;
  mode: "answer";
  expectedCharge: "free" | "paid";
  answers: DiscoveryAnswer[];
};

/** A refusal arrives as an error whose message is this JSON, as the send route answers today. */
export type DiscoveryRefusal = { kind: string; reason: string };
