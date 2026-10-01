import { z } from "zod";

export const questionId = z.enum([
  "priority",
  "booking",
  "owner",
  "measure",
  "rules",
  "training",
  "data",
]);
export type QuestionId = z.infer<typeof questionId>;
const answerSchema = z.object({ choice: z.string(), text: z.string(), certain: z.boolean() });
export type Answer = z.infer<typeof answerSchema>;
const answersSchema = z.record(questionId, answerSchema);
export type Answers = z.infer<typeof answersSchema>;

const stateSchema = z.object({
  version: z.literal(1),
  phase: z.enum(["intake", "discovery", "scoped", "under-review"]),
  intake: z.object({ title: z.string(), need: z.string(), users: z.string(), outcome: z.string() }),
  answers: answersSchema,
  drafts: answersSchema,
  needsReview: z.array(questionId).default([]),
  removedLabels: z.array(z.string()).default([]),
  regenerations: z
    .array(z.object({ reason: z.string(), at: z.string(), revision: z.number() }))
    .default([]),
  regenerationReview: z.object({ reason: z.string(), at: z.string() }).nullable().default(null),
  note: z.string(),
  files: z.array(
    z.object({ name: z.string(), size: z.number(), discoveryVisible: z.boolean().optional() }),
  ),
  history: z.array(
    z.object({
      id: z.number(),
      answers: answersSchema,
      questions: z.array(z.string()).default([]),
      note: z.string(),
      reply: z.string(),
      charge: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("free") }),
        z.object({ kind: z.literal("paid"), usage: z.number(), fee: z.number() }),
      ]),
    }),
  ),
  usage: z.object({
    day: z.string(),
    dailyUsed: z.number(),
    betaUsed: z.number(),
    allocation: z.number(),
    spent: z.number(),
    reserved: z.number(),
    nextGate: z.number(),
  }),
  revision: z.number(),
  summary: z.string().nullable(),
  confirmation: z.object({
    revision: z.number(),
    actor: z.string(),
    at: z.string(),
    openQuestions: z.array(z.object({
      id: z.enum([...questionId.options, "summary"]),
      title: z.string(),
      reason: z.string(),
    })).default([]),
  }).nullable(),
  condition: z.enum(["normal", "reply-fails", "declined", "reopened"]),
  declineDate: z.string().nullable().default(null),
  purchases: z.array(z.object({ id: z.number(), amount: z.number() })),
});
export type MockState = z.infer<typeof stateSchema>;
export const storageKey = "ai4good.astra.prototype.v1";
export const usd = (micros: number) =>
  `$${(micros / 1_000_000).toFixed(micros !== 0 && Math.abs(micros) < 1_000 ? 6 : micros % 10_000 === 0 ? 2 : 3)}`;
export const utcDay = () => new Date().toISOString().slice(0, 10);

export function initialState(): MockState {
  return {
    version: 1,
    phase: "intake",
    intake: {
      title: "Volunteer scheduling",
      need: "We coordinate 45 volunteers across three community kitchens using spreadsheets and messages. Filling shifts takes four hours every week, and last-minute gaps are easy to miss.",
      users: "Two coordinators and 45 volunteers across three kitchens.",
      outcome: "Spend less time coordinating and know which shifts still need help.",
    },
    answers: {},
    drafts: {},
    needsReview: [],
    removedLabels: [],
    regenerations: [],
    regenerationReview: null,
    note: "",
    files: [],
    history: [],
    usage: {
      day: utcDay(),
      dailyUsed: 0,
      betaUsed: 8,
      allocation: 10_000_000,
      spent: 0,
      reserved: 0,
      nextGate: 0,
    },
    revision: 1,
    summary: null,
    confirmation: null,
    condition: "normal",
    declineDate: null,
    purchases: [],
  };
}

export function refreshDay(state: MockState): MockState {
  return state.usage.day === utcDay()
    ? state
    : { ...state, usage: { ...state.usage, day: utcDay(), dailyUsed: 0 } };
}

export function readState(): { state: MockState; warning: string } {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return { state: initialState(), warning: "" };
    const result = stateSchema.safeParse(JSON.parse(saved));
    if (result.success) return { state: refreshDay(result.data), warning: "" };
    return {
      state: initialState(),
      warning: "This saved draft uses an older format. The sample project is open.",
    };
  } catch {
    return {
      state: initialState(),
      warning: "The saved draft could not be read. Changes may stay in this tab only.",
    };
  }
}

export function invalidateApproval(state: MockState): MockState {
  return {
    ...state,
    confirmation: null,
    phase: "discovery",
    revision: state.revision + 1,
    usage: {
      ...state.usage,
      allocation: state.usage.allocation + state.usage.nextGate,
      nextGate: 0,
    },
  };
}

