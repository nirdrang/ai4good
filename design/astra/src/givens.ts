/** The Givens a screen test may ask for, and how the fixture reports its model calls.
 * The fixture shell builds each Given in memory. No imports: the acceptance tests compile this file. */

const QUESTIONS = {
  priority: "What should improve first?",
  booking: "Who should book volunteers into shifts?",
} as const;

export const SCENARIOS = ["first-reply", "first-reply-three-files"] as const;
export type ScreenScenario = (typeof SCENARIOS)[number];

export type Start = "chat" | "review";
export type Pace = "test" | "demo";

/** The visible inputs of each Given that a body refers to. Expected results stay in the body. */
export const GIVEN = {
  "first-reply": {
    start: "chat" as Start,
    questions: QUESTIONS,
    suggested: "Less coordination time",
  },
  "first-reply-three-files": {
    start: "chat" as Start,
    questions: QUESTIONS,
    files: ["volunteer-rota.xlsx", "sunday-gaps.csv", "kitchen-rules.docx"] as const,
  },
} as const satisfies Record<ScreenScenario, { start: Start } & Record<string, unknown>>;

/** The fixture calls this, when it exists, once per model call it stands in for.
 * The screen test installs it with exposeFunction. Nothing in src/ calls it. */
export const MODEL_CALL_PROBE = "atFixtureModelCall";
export type ModelCall = "chat-turn" | "file-chat-turn" | "file-read";
