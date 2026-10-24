import type { UIMessage } from "ai";
import * as z from "zod";
import type {
  Action,
  ActionKind,
  ChatScope,
  CheckGap,
  Id,
  PrdMessageMeta,
  PrdRefusal,
  PrdSendBody,
  PrdSnapshotOf,
  QuestionId,
  TopicId,
} from "../../supabase/functions/_shared/prd/wire.ts";

export type {
  Action,
  ActionKind,
  ActionToken,
  Availability,
  ChatScope,
  CheckGap,
  ClosePath,
  CloseState,
  CompletionCheck,
  DevQuestion,
  Funds,
  FundsBand,
  FundsState,
  Id,
  NgoQuestion,
  Person,
  PrdIntent,
  PrdMessageMeta,
  PrdRefusal,
  PrdSendBody,
  QuestionCommon,
  QuestionId,
  RemainingItem,
  RemainingTarget,
  RequestId,
  Result,
  Role,
  SendAvailability,
  SendBlock,
  Topic,
  TopicId,
  TopicState,
  TurnId,
  Viewer,
} from "../../supabase/functions/_shared/prd/wire.ts";

export type PrdDataTypes = {
  "ngo-question": { questionId: QuestionId };
  "dev-questions": { ids: readonly string[] };
  "section-link": { topicId: TopicId };
  check: { checkId: string; gaps: readonly CheckGap[] };
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
export type PrdUIMessage = UIMessage<PrdMessageMeta, PrdDataTypes>;
export type PrdSnapshot = PrdSnapshotOf<PrdUIMessage>;

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
  changeSummary: z.string().nullable(),
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
  availableMicros: count,
  band: z.enum(["green", "yellow", "red"]),
  replyFunded: z.boolean(),
});

const sendSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("available") }),
  z.object({
    kind: z.literal("unavailable"),
    block: z.enum(["role", "closed", "busy", "funds"]),
    reason: z.string(),
  }),
]);

const closeStateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("open"),
    remaining: z.array(
      z.object({
        text: z.string(),
        target: z
          .discriminatedUnion("kind", [
            z.object({ kind: z.literal("topic"), topicId: topicIdSchema }),
            z.object({ kind: z.literal("questions") }),
            z.object({ kind: z.literal("turn"), turnId: turnIdSchema }),
          ])
          .nullable(),
      }),
    ),
    path: z.enum(["close", "check"]),
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

const messagePartSchema = z.discriminatedUnion("type", [
  textPart,
  dataPart("ngo-question", z.object({ questionId: questionIdSchema })),
  dataPart("dev-questions", z.object({ ids: z.array(identifier) })),
  dataPart("section-link", z.object({ topicId: topicIdSchema })),
  dataPart("check", z.object({ checkId: identifier, gaps: z.array(checkGapSchema) })),
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
  dataPart(
    "snapshot",
    z.lazy((): z.ZodType<PrdSnapshot, z.ZodTypeDef, unknown> => snapshotSchemaObject),
  ),
]);

const messageSchema = z.object({
  id: identifier,
  role: z.enum(["system", "user", "assistant"]),
  metadata: messageMetaSchema.optional(),
  parts: z.array(messagePartSchema),
});

const snapshotSchemaObject: z.ZodType<PrdSnapshot, z.ZodTypeDef, unknown> = z.object({
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
  send: z.record(z.string(), sendSchema),
  funds: fundsSchema,
  check: completionCheckSchema.nullable(),
  close: closeStateSchema,
  drafts: z.record(z.string(), z.string()),
});

const refusalSchema = z.object({
  kind: z.enum(["forbidden", "stale", "funds", "closed", "busy", "follow-up-open", "invalid"]),
  reason: z.string(),
});

const sendBodySchema = z.object({
  scope: chatScopeSchema,
  requestId: requestIdSchema,
  baseRevision: count,
  intent: intentSchema,
});

export function parsePrdSnapshot(input: unknown): PrdSnapshot {
  return snapshotSchemaObject.parse(input);
}

export function parseSendBody(input: unknown): PrdSendBody {
  return sendBodySchema.parse(input);
}

/** Reads a refusal at the boundary, or null when the input is not one. */
export function parseRefusal(input: unknown): PrdRefusal | null {
  const parsed = refusalSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
