import type { UIMessage } from "ai";
import * as z from "zod";

type Id<K extends string> = string & { readonly __id: K };

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

export type CloseState =
  | {
      readonly kind: "open";
      readonly remaining: readonly string[];
      readonly close: Availability<Action<"close">>;
    }
  | { readonly kind: "closed"; readonly revision: number; readonly openPoints: number };

export type PrdDataTypes = {
  "ngo-question": { questionId: QuestionId };
  "dev-questions": { ids: readonly string[] };
  "section-link": { topicId: TopicId };
  check: { checkId: string };
  "close-ask": {
    checkId: string;
    revision: number;
    closeAnyway: Action<"close-anyway">;
    keepWorking: Action<"keep-working">;
  };
  recommendation: { revision: number; close: Action<"close"> };
  brief: { questionId: QuestionId; rows: readonly { label: string; text: string }[] };
  line: { text: string; topicId: TopicId | null };
  snapshot: PrdSnapshot;
};
export type PrdMessageMeta = { actor: "ai" | Role | "system"; name: string; at: string };
export type PrdUIMessage = UIMessage<PrdMessageMeta, PrdDataTypes>;

export type PrdSnapshot = Readonly<{
  sequence: number;
  revision: number;
  viewer: Viewer;
  people: readonly Person[];
  project: Readonly<{ title: string; organizationName: string }>;
  discoveryRevision: number;
  topics: readonly Topic[];
  devQuestions: readonly DevQuestion[];
  questions: readonly NgoQuestion[];
  chats: Readonly<Record<string, readonly PrdUIMessage[]>>;
  canWrite: Readonly<Record<string, boolean>>;
  funds: Funds;
  check: CompletionCheck | null;
  close: CloseState;
  drafts: Readonly<Record<string, string>>;
}>;

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

/** The chat key: `main`, `topic:<id>`, or `side:<id>`. */
export function scopeKey(scope: ChatScope): string {
  switch (scope.kind) {
    case "main":
      return "main";
    case "topic":
      return `topic:${scope.topicId}`;
    case "side":
      return `side:${scope.questionId}`;
  }
}

function idSchema<K extends string>() {
  return z
    .string()
    .min(1)
    .transform((value): Id<K> => value as Id<K>);
}

const topicIdSchema = idSchema<"topic">();
const questionIdSchema = idSchema<"question">();
const turnIdSchema = idSchema<"turn">();
const requestIdSchema = idSchema<"request">();
const actionTokenSchema = idSchema<"action">();
const count = z.number().int();
const identifier = z.string().min(1);

function actionSchema<const K extends ActionKind>(kind: K) {
  return z.object({ kind: z.literal(kind), token: actionTokenSchema });
}

function availabilitySchema<T extends z.ZodTypeAny>(action: T) {
  return z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("available"), action }),
    z.object({ kind: z.literal("unavailable"), reason: z.string() }),
  ]);
}

function dataPart<const Name extends string, Data extends z.ZodTypeAny>(name: Name, data: Data) {
  return z.object({
    type: z.literal(`data-${name}`),
    id: identifier.optional(),
    data,
  });
}

const questionShape = {
  id: questionIdSchema,
  topicId: topicIdSchema,
  text: z.string(),
  why: z.string(),
  blocking: z.boolean(),
  introTurn: turnIdSchema,
  options: z.array(z.string()),
  impact: z.string(),
  openPoint: z.string().nullable(),
};

const ngoQuestionSchema = z.discriminatedUnion("kind", [
  z.object({
    ...questionShape,
    kind: z.literal("suggested"),
    post: availabilitySchema(actionSchema("post-question")),
  }),
  z.object({ ...questionShape, kind: z.literal("posted") }),
  z.object({
    ...questionShape,
    kind: z.literal("answering"),
    followUp: z.enum(["pending", "none"]),
    complete: availabilitySchema(actionSchema("complete-answer")),
  }),
  z.object({
    ...questionShape,
    kind: z.literal("complete"),
    answer: z.string(),
    canUse: z.boolean(),
  }),
  z.object({
    ...questionShape,
    kind: z.literal("used"),
    answer: z.string(),
    briefTurn: turnIdSchema,
    changed: z.boolean(),
  }),
]);

const topicSchema = z.object({
  id: topicIdSchema,
  title: z.string(),
  required: z.boolean(),
  state: z.enum(["open", "draft", "ready", "confirmed", "needs-review"]),
  statusText: z.string(),
  blocker: z.string().nullable(),
  statements: z.array(z.string()),
  sources: z.array(z.string()),
  stories: z.array(z.string()).nullable(),
  confirm: availabilitySchema(actionSchema("confirm-topic")),
  reopen: availabilitySchema(actionSchema("reopen-topic")),
});

const devQuestionSchema = z.object({
  id: identifier,
  topicId: topicIdSchema,
  text: z.string(),
  why: z.string(),
  options: z.array(z.string()),
  suggested: z.string(),
  answered: z.string().nullable(),
});

const checkGapSchema = z.object({
  topicId: topicIdSchema,
  title: z.string(),
  text: z.string(),
  fixed: z.boolean(),
});

const completionCheckSchema = z.object({
  id: identifier,
  revision: count,
  passed: z.boolean(),
  coverageText: z.string(),
  thresholdText: z.string(),
  gaps: z.array(checkGapSchema),
});

const fundsSchema = z.object({
  allocationMicros: count,
  settledMicros: count,
  pendingMicros: count,
  replyHoldMicros: count,
});

const closeStateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("open"),
    remaining: z.array(z.string()),
    close: availabilitySchema(actionSchema("close")),
  }),
  z.object({ kind: z.literal("closed"), revision: count, openPoints: count }),
]);

const personSchema = z.object({
  role: z.enum(["dev", "ngo", "ai"]),
  name: z.string(),
  label: z.string(),
});

const viewerSchema = z.object({
  role: z.enum(["dev", "ngo"]),
  name: z.string(),
});

const messageMetaSchema = z.object({
  actor: z.enum(["ai", "dev", "ngo", "system"]),
  name: z.string(),
  at: z.string(),
});

const chatScopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("main") }),
  z.object({ kind: z.literal("topic"), topicId: topicIdSchema }),
  z.object({ kind: z.literal("side"), questionId: questionIdSchema }),
]);

const intentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string() }),
  z.object({
    kind: z.literal("answers"),
    picks: z.record(z.string(), z.string()),
    text: z.string(),
  }),
  z.object({
    kind: z.literal("use-answer"),
    questionId: questionIdSchema,
    answer: z.string().nullable(),
    note: z.string(),
  }),
  z.object({ kind: z.literal("close-check") }),
]);

const textPart = z.object({
  type: z.literal("text"),
  text: z.string(),
  state: z.enum(["streaming", "done"]).optional(),
});

const installed: { snapshot?: z.ZodType<PrdSnapshot, z.ZodTypeDef, unknown> } = {};

function snapshotSchema(): z.ZodType<PrdSnapshot, z.ZodTypeDef, unknown> {
  const schema = installed.snapshot;
  if (!schema) throw new Error("The snapshot schema is not installed.");
  return schema;
}

const messagePartSchema = z.discriminatedUnion("type", [
  textPart,
  dataPart("ngo-question", z.object({ questionId: questionIdSchema })),
  dataPart("dev-questions", z.object({ ids: z.array(identifier) })),
  dataPart("section-link", z.object({ topicId: topicIdSchema })),
  dataPart("check", z.object({ checkId: identifier })),
  dataPart(
    "close-ask",
    z.object({
      checkId: identifier,
      revision: count,
      closeAnyway: actionSchema("close-anyway"),
      keepWorking: actionSchema("keep-working"),
    }),
  ),
  dataPart("recommendation", z.object({ revision: count, close: actionSchema("close") })),
  dataPart(
    "brief",
    z.object({
      questionId: questionIdSchema,
      rows: z.array(z.object({ label: z.string(), text: z.string() })),
    }),
  ),
  dataPart("line", z.object({ text: z.string(), topicId: topicIdSchema.nullable() })),
  dataPart("snapshot", z.lazy(snapshotSchema)),
]);

const messageSchema = z.object({
  id: identifier,
  role: z.enum(["system", "user", "assistant"]),
  metadata: messageMetaSchema.optional(),
  parts: z.array(messagePartSchema),
});

const snapshotSchemaObject = z.object({
  sequence: count,
  revision: count,
  viewer: viewerSchema,
  people: z.array(personSchema),
  project: z.object({ title: z.string(), organizationName: z.string() }),
  discoveryRevision: count,
  topics: z.array(topicSchema),
  devQuestions: z.array(devQuestionSchema),
  questions: z.array(ngoQuestionSchema),
  chats: z.record(z.string(), z.array(messageSchema)),
  canWrite: z.record(z.string(), z.boolean()),
  funds: fundsSchema,
  check: completionCheckSchema.nullable(),
  close: closeStateSchema,
  drafts: z.record(z.string(), z.string()),
});

installed.snapshot = snapshotSchemaObject;

const sendBodySchema = z.object({
  scope: chatScopeSchema,
  requestId: requestIdSchema,
  baseRevision: count,
  intent: intentSchema,
});

/** Reads a snapshot at the boundary. Rejects a wrong shape or an unknown kind. */
export function parsePrdSnapshot(input: unknown): PrdSnapshot {
  return snapshotSchemaObject.parse(input);
}

/** Reads a chat send at the boundary. Rejects a wrong shape or an unknown kind. */
export function parseSendBody(input: unknown): PrdSendBody {
  return sendBodySchema.parse(input);
}
