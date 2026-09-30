/** The Givens a screen test may ask for, and how the fixture reports its model calls.
 * The fixture shell builds each Given in memory. No imports: the acceptance tests compile this file. */

const QUESTIONS = {
  priority: "What should improve first?",
  booking: "Who should book volunteers into shifts?",
} as const;

export const SCENARIOS = ["first-reply", "first-reply-three-files", "mid-interview", "mid-interview-paid"] as const;
export type ScreenScenario = (typeof SCENARIOS)[number];

export type Start = "chat" | "review";
export type Pace = "test" | "demo";

const INTERVIEW = {
  start: "chat" as Start,
  agreed: [
    { title: "Main priority", question: QUESTIONS.priority, answer: "Less coordination time" },
    { title: "Who books shifts", question: QUESTIONS.booking, answer: "Volunteers book themselves" },
  ],
  notSure: {
    title: "Success measure",
    question: "What weekly scheduling time would count as success?",
  },
  open: [
    {
      title: "Maintenance owner",
      question: "Who will look after the tool?",
      suggested: "Our operations lead",
      other: "Our coordinators",
    },
    {
      title: "Information handled",
      question: "What volunteer information will the tool keep?",
      suggested: "Name and phone only",
      other: "Name, phone and email",
    },
  ],
  next: {
    title: "Booking rules",
    question: "Which booking rules should the tool enforce?",
  },
} as const;

/** The visible inputs of each Given that a body refers to. Expected results stay in the body. */
export const GIVEN = {
  "first-reply": {
    start: "chat" as Start,
    questions: QUESTIONS,
    suggested: "Less coordination time",
    filePhrase: "files that show how you work today",
    fileKinds: ["rota", "sign-up sheet", "volunteer rules"],
  },
  "first-reply-three-files": {
    start: "chat" as Start,
    questions: QUESTIONS,
    files: ["volunteer-rota.xlsx", "sunday-gaps.csv", "kitchen-rules.docx"] as const,
  },
  "mid-interview": INTERVIEW,
  "mid-interview-paid": INTERVIEW,
} as const satisfies Record<ScreenScenario, { start: Start } & Record<string, unknown>>;

/** The fixture calls this, when it exists, once per model call it stands in for.
 * The screen test installs it with exposeFunction. Nothing in src/ calls it. */
export const MODEL_CALL_PROBE = "atFixtureModelCall";
export type ModelCall = "chat-turn" | "file-chat-turn" | "file-read";
