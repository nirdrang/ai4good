/** The Givens a screen test may ask for, and how the fixture reports its model calls.
 * The fixture shell builds each Given in memory. No imports: the acceptance tests compile this file. */

const QUESTIONS = {
  priority: "What should improve first?",
  booking: "Who should book volunteers into shifts?",
} as const;

export const SCENARIOS = [
  "first-reply",
  "first-reply-three-files",
  "mid-interview",
  "mid-interview-paid",
  "three-files-unfunded",
  "three-files-funded",
  "finish-open",
  "confirmed-tier-2",
  "confirmed-tier-1",
] as const;
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

const FINISH_NEED =
  "Harbor Community Kitchen runs three kitchens with 45 volunteers. Scheduling shifts takes the coordinators about four and a half hours a week, by phone and on a spreadsheet. We need a simple way for volunteers to book their own shifts, and for coordinators to book shifts for volunteers who call.";

const FINISH_USERS =
  "Volunteers call or text a coordinator to take a shift. Many are over 60, and some have no smartphone.\nCoordinators keep the rota in a spreadsheet and phone volunteers to fill empty shifts, mostly on Sundays.\nThe operations lead manages access to our other tools.";

const FINISH_OPEN = {
  start: "review" as Start,
  revision: 6,
  need: FINISH_NEED,
  users: FINISH_USERS,
  edit: "Volunteers book shifts themselves, and coordinators still take phone calls.",
  agreed: [
    { title: "Main priority", answer: "Less coordination time" },
    { title: "Who books shifts", answer: "Volunteers book themselves" },
  ],
  open: [
    {
      title: "Maintenance owner",
      question: "Who will look after the tool?",
      why: "Someone must manage access and small changes after handoff.",
      suggested: "Our operations lead",
    },
    {
      title: "Success measure",
      question: "What weekly scheduling time would count as success?",
      why: "You can use this target to check whether the first version helps.",
      suggested: "Two hours a week, down from four",
    },
    {
      title: "Booking rules",
      question: "Which booking rules should the tool enforce?",
      why: "The tool needs limits once volunteers book themselves.",
      suggested: "Weekly shift limit",
    },
    {
      title: "Information handled",
      question: "What volunteer information will the tool keep?",
      why: "Less personal information means less risk and simpler rules.",
      suggested: "Name and phone only",
    },
  ],
  label: "food security",
  files: [
    { name: "intake-notes.pdf", took: "three kitchens, 45 volunteers, the Sunday gaps" },
    { name: "volunteer-rota.xlsx", took: "38 volunteers booked at least one shift, and shifts are 4 hours" },
  ],
} as const;

const CONFIRMED = {
  start: "review" as Start,
  revision: 6,
  need: FINISH_NEED,
  users: FINISH_USERS,
  success: "Scheduling takes two hours a week, down from four and a half.",
  successRound: 4,
  agreed: [
    { title: "Main priority", answer: "Less coordination time", round: 2 },
    { title: "Who books shifts", answer: "Volunteers book themselves", round: 3 },
    { title: "Maintenance owner", answer: "Our operations lead", round: 5 },
  ],
  open: [
    {
      title: "Information handled",
      why: "This decides which volunteer details the tool keeps, and how carefully they must be protected.",
      importance: "needed" as const,
    },
    {
      title: "Booking rules",
      why: "Without a limit, one volunteer can take every shift.",
      importance: "suggested" as const,
    },
  ],
  files: [
    { name: "intake-notes.pdf", took: "three kitchens, 45 volunteers, and the Sunday gaps" },
    { name: "volunteer-rota.xlsx", took: "38 volunteers booked at least one shift, and shifts are 4 hours" },
  ],
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
  "three-files-unfunded": {
    start: "chat" as Start,
    intake: "intake-notes.pdf",
    files: ["volunteer-rota.xlsx", "sunday-gaps.csv", "kitchen-rules.docx"] as const,
    funded: false,
  },
  "three-files-funded": {
    start: "chat" as Start,
    intake: "intake-notes.pdf",
    files: ["volunteer-rota.xlsx", "sunday-gaps.csv", "kitchen-rules.docx"] as const,
    funded: true,
  },
  "finish-open": FINISH_OPEN,
  "confirmed-tier-2": {
    ...CONFIRMED,
    tier: 2 as const,
    labels: ["food security", "community meals"] as const,
  },
  "confirmed-tier-1": {
    ...CONFIRMED,
    tier: 1 as const,
    labels: [] as const,
  },
} as const satisfies Record<ScreenScenario, { start: Start } & Record<string, unknown>>;

/** The fixture calls this, when it exists, once per model call it stands in for.
 * The screen test installs it with exposeFunction. Nothing in src/ calls it. */
export const MODEL_CALL_PROBE = "atFixtureModelCall";
export type ModelCall = "chat-turn" | "file-read";
