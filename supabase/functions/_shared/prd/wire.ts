export type Id<K extends string> = string & { readonly __id: K };

export type TopicId = Id<"topic">;
export type QuestionId = Id<"question">;
export type TurnId = Id<"turn">;
export type RequestId = Id<"request">;
export type ActionToken = Id<"action">;

export type Role = "dev" | "ngo";
export type Person = Readonly<{ role: Role | "ai"; name: string; label: string }>;
export type Viewer = Readonly<{ role: Role; name: string }>;

export type ChatScope =
  | { readonly kind: "main" }
  | { readonly kind: "topic"; readonly topicId: TopicId }
  | { readonly kind: "side"; readonly questionId: QuestionId };

export type ActionKind =
  | "post-question"
  | "complete-answer"
  | "confirm-topic"
  | "reopen-topic"
  | "close"
  | "close-anyway"
  | "keep-working";
export type Action<K extends ActionKind> = Readonly<{ kind: K; token: ActionToken }>;
export type Availability<T> =
  | { readonly kind: "available"; readonly action: T }
  | { readonly kind: "unavailable"; readonly reason: string };

export type TopicState = "open" | "draft" | "ready" | "confirmed" | "needs-review";
export type Topic = Readonly<{
  id: TopicId;
  title: string;
  required: boolean;
  state: TopicState;
  statusText: string;
  blocker: string | null;
  statements: readonly string[];
  sources: readonly string[];
  stories: readonly string[] | null;
  changeSummary: string | null;
  confirm: Availability<Action<"confirm-topic">>;
  reopen: Availability<Action<"reopen-topic">>;
}>;

export type QuestionCommon = Readonly<{
  id: QuestionId;
  topicId: TopicId;
  text: string;
  why: string;
  blocking: boolean;
  introTurn: TurnId;
  options: readonly string[];
  impact: string;
  openPoint: string | null;
}>;
export type NgoQuestion = QuestionCommon &
  (
    | { readonly kind: "suggested"; readonly post: Availability<Action<"post-question">> }
    | { readonly kind: "posted" }
    | {
        readonly kind: "answering";
        readonly followUp: "pending" | "none";
        readonly complete: Availability<Action<"complete-answer">>;
      }
    | { readonly kind: "complete"; readonly answer: string; readonly canUse: boolean }
    | {
        readonly kind: "used";
        readonly answer: string;
        readonly briefTurn: TurnId;
        readonly changed: boolean;
      }
  );

export type DevQuestion = Readonly<{
  id: string;
  topicId: TopicId;
  text: string;
  why: string;
  options: readonly string[];
  suggested: string;
  answered: string | null;
}>;

export type CheckGap = Readonly<{ topicId: TopicId; title: string; text: string; fixed: boolean }>;
export type CompletionCheck = Readonly<{
  id: string;
  revision: number;
  passed: boolean;
  coverageText: string;
  thresholdText: string;
  gaps: readonly CheckGap[];
}>;

export type Funds = Readonly<{
  allocationMicros: number;
  settledMicros: number;
  pendingMicros: number;
  replyHoldMicros: number;
}>;

export type FundsBand = "green" | "yellow" | "red";
export type FundsState = Funds &
  Readonly<{ availableMicros: number; band: FundsBand; replyFunded: boolean }>;

export type SendBlock = "role" | "closed" | "busy" | "funds";
export type SendAvailability =
  | { readonly kind: "available" }
  | { readonly kind: "unavailable"; readonly block: SendBlock; readonly reason: string };

export type ClosePath = "close" | "check";

export type RemainingTarget =
  | { readonly kind: "topic"; readonly topicId: TopicId }
  | { readonly kind: "questions" }
  | { readonly kind: "turn"; readonly turnId: TurnId };
export type RemainingItem = Readonly<{ text: string; target: RemainingTarget | null }>;

export type CloseState =
  | {
      readonly kind: "open";
      readonly remaining: readonly RemainingItem[];
      readonly path: ClosePath;
      readonly close: Availability<Action<"close">>;
    }
  | { readonly kind: "closed"; readonly revision: number; readonly openPoints: number };

export type PrdMessageMeta = { actor: "ai" | Role | "system"; name: string; at: string };

/** A chat message as the server stores and sends it; the browser reads it as its UI-message type. */
export type PrdWireMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  parts: readonly Readonly<Record<string, unknown>>[];
  metadata?: PrdMessageMeta;
};

export type PrdSnapshotOf<M> = Readonly<{
  sequence: number;
  revision: number;
  viewer: Viewer;
  people: readonly Person[];
  project: Readonly<{ title: string; organizationName: string }>;
  discoveryRevision: number;
  topics: readonly Topic[];
  devQuestions: readonly DevQuestion[];
  questions: readonly NgoQuestion[];
  chats: Readonly<Record<string, readonly M[]>>;
  canWrite: Readonly<Record<string, boolean>>;
  send: Readonly<Record<string, SendAvailability>>;
  funds: FundsState;
  check: CompletionCheck | null;
  close: CloseState;
  drafts: Readonly<Record<string, string>>;
}>;
export type PrdWireSnapshot = PrdSnapshotOf<PrdWireMessage>;

export type PrdIntent =
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "answers";
      readonly picks: Readonly<Record<string, string>>;
      readonly text: string;
    }
  | {
      readonly kind: "use-answer";
      readonly questionId: QuestionId;
      readonly answer: string | null;
      readonly note: string;
    }
  | { readonly kind: "close-check" };
export type PrdSendBody = Readonly<{
  scope: ChatScope;
  requestId: RequestId;
  baseRevision: number;
  intent: PrdIntent;
}>;

export type PrdRefusal = Readonly<{
  kind: "forbidden" | "stale" | "funds" | "closed" | "busy" | "follow-up-open" | "invalid";
  reason: string;
}>;
export type Result<T> = { ok: true; value: T } | { ok: false; refusal: PrdRefusal };
