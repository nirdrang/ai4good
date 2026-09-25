import { z } from "zod";
import { briefReady, currentQuestions, questions } from "./questions";

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

export const stateSchema = z.object({
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
  confirmation: z.object({ revision: z.number(), actor: z.string(), at: z.string() }).nullable(),
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
    if (result.success) {
      const state = refreshDay(result.data);
      return state.confirmation && !briefReady(state.answers)
        ? {
            state: invalidateApproval(state),
            warning:
              "The brief has a new data question. Review it before confirming this revision.",
          }
        : { state, warning: "" };
    }
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

export function funding(state: MockState) {
  const u = state.usage;
  const dailyLeft = Math.max(0, 10 - u.dailyUsed);
  const betaLeft = Math.max(0, 50 - u.betaUsed);
  const available = Math.max(0, u.allocation - u.spent - u.reserved);
  const free = dailyLeft > 0 && betaLeft > 0;
  const dailyPercent = (u.dailyUsed / 10) * 100;
  const betaPercent = (u.betaUsed / 50) * 100;
  const percent = free
    ? Math.max(dailyPercent, betaPercent)
    : u.allocation > 0
      ? (u.spent / u.allocation) * 100
      : 0;
  return {
    dailyLeft,
    betaLeft,
    available,
    free,
    canSend: free || available >= 250_000,
    percent: Math.min(100, percent),
    band: percent < 80 ? "green" : percent <= 95 ? "yellow" : "red",
    label: free
      ? dailyPercent >= betaPercent
        ? "Daily free turns used"
        : "Beta free turns used"
      : "Discovery fuel used",
  };
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

export function saveAnswer(state: MockState, id: QuestionId, answer: Answer): MockState {
  const next = invalidateApproval(state);
  const answers = { ...next.answers, [id]: answer };
  const dependents: QuestionId[] =
    id === "priority"
      ? ["measure"]
      : id === "booking"
        ? ["rules", "training"]
        : id === "rules"
          ? ["training"]
          : [];
  const needsReview = new Set(next.needsReview.filter((question) => question !== id));
  for (const dependent of dependents) {
    if (answers[dependent]) needsReview.add(dependent);
    delete answers[dependent];
  }
  return { ...next, answers, needsReview: [...needsReview], drafts: {}, summary: null };
}

export function completeReply(
  state: MockState,
  submitted: Answers,
  kind: "free" | "paid",
  reply = "",
): MockState {
  if (briefReady(state.answers) || state.confirmation || state.condition === "declined")
    return state;
  const answers = { ...state.answers, ...submitted };
  const uncertain = Object.values(submitted).some((answer) => !answer.certain);
  const usage = { ...state.usage };
  const charge: MockState["history"][number]["charge"] =
    kind === "free" ? { kind: "free" } : { kind: "paid", usage: 40_000, fee: 6_000 };
  if (kind === "free") {
    usage.dailyUsed += 1;
    usage.betaUsed += 1;
  } else usage.spent += 46_000;
  return {
    ...state,
    answers,
    needsReview: state.needsReview.filter((id) => !submitted[id]?.certain),
    drafts: Object.fromEntries(Object.entries(state.drafts).filter(([id]) => !(id in submitted))),
    note: "",
    usage,
    revision: state.revision + (Object.keys(submitted).length ? 1 : 0),
    history: [
      ...state.history,
      {
        id: state.history.length + 1,
        answers: submitted,
        questions: (Object.keys(submitted).length
          ? questions(state.answers).filter((question) => submitted[question.id])
          : currentQuestions(state.answers).slice(0, 1)
        ).map((question) => question.text),
        note: state.note,
        charge,
        reply:
          reply ||
          (briefReady(answers)
            ? "All required Discovery topics are agreed. I have stopped asking questions. Review your brief, then choose Finish Discovery."
            : uncertain
              ? "I have kept the uncertain answer open. You can return to it when your team knows more. The brief includes only confirmed decisions."
              : "I have added your answer to the brief. Let's work through the next decision."),
      },
    ],
  };
}

export function confirmBrief(state: MockState): MockState {
  if (
    !briefReady(state.answers) ||
    state.regenerationReview ||
    state.condition === "declined" ||
    state.summary?.trim() === ""
  )
    return state;
  if (state.confirmation?.revision === state.revision) return state;
  const carry = funding(state).available;
  return {
    ...state,
    phase: "scoped",
    confirmation: { revision: state.revision, actor: "Sam Taylor", at: new Date().toISOString() },
    usage: {
      ...state.usage,
      allocation: state.usage.allocation - carry,
      nextGate: state.usage.nextGate + carry,
    },
  };
}

export function regenerateScope(state: MockState, reason: string): MockState {
  if (!reason.trim() || state.regenerationReview) return state;
  const at = new Date().toISOString();
  if (state.regenerations.length >= 3)
    return { ...invalidateApproval(state), regenerationReview: { reason: reason.trim(), at } };
  const next = invalidateApproval(state);
  return {
    ...next,
    summary: [
      state.intake.need,
      state.answers.priority?.text,
      state.answers.booking?.text,
      state.answers.measure?.text,
    ]
      .filter(Boolean)
      .join("\n\n"),
    regenerations: [...state.regenerations, { reason: reason.trim(), at, revision: next.revision }],
  };
}

export const scenarios = [
  { id: "normal", label: "Free turns available" },
  { id: "almost-finished", label: "Discovery · one topic left" },
  { id: "ready-to-finish", label: "Discovery · ready to finish" },
  { id: "daily-paid", label: "Daily limit · paid reply" },
  { id: "beta-paid", label: "Beta limit · paid reply" },
  { id: "daily-empty", label: "Daily limit · no fuel" },
  { id: "beta-empty", label: "Beta limit · no fuel" },
  { id: "free-empty", label: "No fuel · free turns available" },
  { id: "pending", label: "Paid usage pending" },
  { id: "reply-fails", label: "Reply failure and retry" },
  { id: "declined", label: "Project fit declined" },
  { id: "reopened", label: "Decline overturned" },
  { id: "usage-79.99", label: "Gauge · 79.99% green" },
  { id: "usage-80", label: "Gauge · 80% yellow" },
  { id: "usage-95", label: "Gauge · 95% yellow" },
  { id: "usage-95.01", label: "Gauge · 95.01% red" },
  { id: "usage-100", label: "Gauge · 100% red" },
  { id: "reset-day", label: "Next UTC day · free first" },
  { id: "reference-file", label: "Reference file · not shared with AI" },
];

export function applyScenario(state: MockState, id: string): MockState {
  if (id === "almost-finished" || id === "ready-to-finish") {
    let sample = initialState();
    sample.phase = "discovery";
    const selected: Partial<Record<QuestionId, string>> = {
      priority: "time",
      booking: "self",
      owner: "operations",
      measure: "two",
      rules: "open",
      ...(id === "ready-to-finish" ? { data: "ordinary" } : {}),
    };
    for (let round = 0; round < 2; round++) {
      const submitted: Answers = {};
      for (const question of currentQuestions(sample.answers)) {
        const choice = question.options.find((option) => option.id === selected[question.id]);
        if (choice)
          submitted[question.id] = { choice: choice.id, text: choice.answer, certain: true };
      }
      sample = completeReply(sample, submitted, "free");
    }
    return sample;
  }
  if (id === "reference-file")
    return state.files.some((file) => file.name === "blank-shift-template.csv")
      ? state
      : {
          ...state,
          files: [
            ...state.files,
            { name: "blank-shift-template.csv", size: 74, discoveryVisible: false },
          ],
        };
  if (id === "reset-day")
    return refreshDay({ ...state, usage: { ...state.usage, day: "2000-01-01" } });
  const next = invalidateApproval(state);
  next.condition = id === "reply-fails" || id === "declined" || id === "reopened" ? id : "normal";
  if (id === "declined" || id === "reopened")
    next.declineDate = state.declineDate ?? new Date().toISOString();
  next.usage = {
    day: utcDay(),
    dailyUsed: 2,
    betaUsed: 8,
    allocation: 10_000_000,
    spent: 0,
    reserved: 0,
    nextGate: 0,
  };
  if (id.startsWith("daily") || id.startsWith("beta") || id === "pending")
    next.usage.dailyUsed = 10;
  if (id.startsWith("beta")) next.usage.betaUsed = 50;
  if (id.endsWith("empty") || id === "reopened") next.usage.allocation = 0;
  if (id === "pending") {
    next.usage.reserved = 250_000;
    next.usage.spent = 46_000;
  }
  if (id.startsWith("usage-")) {
    next.usage.dailyUsed = 10;
    next.usage.spent = Math.round((next.usage.allocation * Number(id.slice(6))) / 100);
  }
  return next;
}
