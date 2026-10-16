/** The PRD workspace scenarios a screen test may open, with their default viewer, start view and reply hold.
 * No imports: the acceptance tests compile this file. */

export const PRD_SCENARIOS = [
  "first-entry",
  "prd-today",
  "answer-complete",
  "all-ready",
  "check-passed",
  "closed",
  "queue",
  "funds-out",
  "funds-79999",
  "funds-80",
  "funds-95",
  "funds-95001",
] as const;
export type PrdScenario = (typeof PRD_SCENARIOS)[number];

export type PrdPace = "test" | "demo";
export type PrdViewerRole = "dev" | "ngo";
export type PrdStartView = "main" | "questions";

export type PrdGiven = Readonly<{
  viewer: PrdViewerRole;
  start: PrdStartView;
  replyMs: Readonly<Record<PrdPace, number>>;
}>;

const ORDINARY = { test: 200, demo: 1800 } as const;
const MAIN = { viewer: "dev", start: "main", replyMs: ORDINARY } as const;

export const PRD_GIVEN = {
  "first-entry": MAIN,
  "prd-today": MAIN,
  "answer-complete": { viewer: "dev", start: "questions", replyMs: ORDINARY },
  "all-ready": MAIN,
  "check-passed": MAIN,
  closed: MAIN,
  queue: { viewer: "dev", start: "main", replyMs: { test: 6000, demo: 4000 } },
  "funds-out": MAIN,
  "funds-79999": MAIN,
  "funds-80": MAIN,
  "funds-95": MAIN,
  "funds-95001": MAIN,
} as const satisfies Record<PrdScenario, PrdGiven>;

/** The names the fixture reports to the model-call probe, once per paid generation. */
export type PrdModelCall = "prd-chat" | "prd-side-chat" | "prd-answer-write" | "prd-check";
