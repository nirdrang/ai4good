import { TEXT } from "../../../src/components/discovery/a11y";
import type {
  BriefQuestion,
  BriefSnapshot,
  BriefTopic,
  DiscoveryFile,
  DiscoveryState,
  DiscoveryUIMessage,
  DiscoveryUsage,
  SuggestedAnswer,
} from "../../../src/lib/discovery-stream";
import { GIVEN, type ScreenScenario } from "./givens";

const NEED =
  "We coordinate 45 volunteers across three community kitchens using spreadsheets and messages. Filling shifts takes four hours every week, and last-minute gaps are easy to miss.";

const THANKS =
  "Thanks, I read your intake. We need to agree six topics before a volunteer developer can start. I will ask the questions that do not depend on each other together.";

// The acceptance text says "how the NGO works today". The approved canvas says "how you work today".
const FILE_REQUEST =
  "Before we start: do you have files that show how the NGO works today? A rota, a sign-up sheet, or your volunteer rules would help this need. Add a file in Your files. Attaching is free, and you can also add files later.";

const QUESTIONS_INTRO = "Here are the first two questions. Each has my suggestion, but you decide.";

export const FILE_SCRIPTS = [
  {
    id: "volunteer-rota",
    name: "volunteer-rota.xlsx",
    size: "48 KB",
    facts: 4,
    chips: [
      "Our August rota. Look at who books which shifts",
      "It shows where Sundays stay empty",
      "It has phone numbers. Leave them out",
    ],
    pause: {
      text: "Some rows have only a first name. Are two rows with the same first name the same volunteer?",
      chips: ["Yes, usually the same person", "No, count them apart", "Not sure"],
    },
  },
  {
    id: "sunday-gaps",
    name: "sunday-gaps.csv",
    size: "6 KB",
    facts: 3,
    chips: ["These are the shifts we could not fill", "Look at which kitchen is short"],
    pause: {
      text: "Some rows have no kitchen name. Should I count them as the harbor kitchen?",
      chips: ["Yes", "No, leave them out", "Not sure"],
    },
  },
  {
    id: "kitchen-rules",
    name: "kitchen-rules.docx",
    size: "31 KB",
    facts: 5,
    chips: ["Our volunteer rules. Look at who may take a shift", "Look at how shifts are cancelled"],
    pause: null,
  },
] as const;

export function replyKind(
  usage: Pick<DiscoveryUsage, "dailyLeft" | "betaLeft" | "availableMicros" | "reservedMicros" | "holdMicros">,
): DiscoveryUsage["nextReply"] {
  if (usage.dailyLeft > 0 || usage.betaLeft > 0) return "free";
  if (usage.availableMicros - usage.reservedMicros >= usage.holdMicros) return "paid";
  return "unavailable";
}

export function questionPart(question: BriefQuestion): DiscoveryUIMessage["parts"][number] {
  return {
    type: "data-question",
    data: {
      id: question.id,
      topicId: question.topicId,
      text: question.text,
      reason: question.reason,
      suggestions: question.options,
      suggestedId: question.suggestedId,
      importance: question.importance,
      recommendation: question.recommendation,
      uncertaintyHelp: question.uncertaintyHelp,
    },
  };
}

function option(id: string, label: string): SuggestedAnswer {
  return { id, label, answer: label };
}

function topic(input: {
  id: string;
  title: string;
  plannedQuestion: string;
  why: string;
  suggestion: string;
}): BriefTopic {
  return {
    id: input.id,
    title: input.title,
    required: true,
    importance: "needed",
    why: input.why,
    suggestion: input.suggestion,
    plannedQuestion: input.plannedQuestion,
    state: { kind: "open" },
  };
}

function asked(
  topicId: string,
  text: string,
  reason: string,
  options: SuggestedAnswer[],
  suggestedId: string,
  recommendation: string,
  uncertaintyHelp: string,
): BriefQuestion {
  return {
    id: topicId,
    topicId,
    text,
    reason,
    options,
    suggestedId,
    importance: "needed",
    recommendation,
    uncertaintyHelp,
    askedInRound: 1,
  };
}

function kilobytes(size: string): number {
  const match = /^(\d+) KB$/.exec(size);
  return match ? Number(match[1]) * 1024 : 0;
}

function openingText(discoveryCount: number): string {
  const paragraphs = [THANKS];
  if (discoveryCount < 3) paragraphs.push(FILE_REQUEST);
  paragraphs.push(QUESTIONS_INTRO);
  return paragraphs.join("\n\n");
}

function intakeFile(): DiscoveryFile {
  return {
    origin: "intake",
    id: "intake-notes",
    name: "intake-notes.pdf",
    sizeBytes: 120 * 1024,
    tookFromIt: null,
  };
}

function discoveryFiles(): DiscoveryFile[] {
  return GIVEN["first-reply-three-files"].files.map((name) => {
    const script = FILE_SCRIPTS.find((item) => item.name === name);
    if (!script) throw new Error(`missing file script ${name}`);
    return {
      origin: "discovery",
      id: script.id,
      name: script.name,
      sizeBytes: kilobytes(script.size),
      status: { kind: "ready", facts: script.facts },
      tookFromIt: null,
    };
  });
}

function usage(): DiscoveryUsage {
  const value: DiscoveryUsage = {
    dailyLeft: 10,
    dailyGrant: 10,
    betaLeft: 42,
    betaGrant: 50,
    availableMicros: 5_000_000,
    reservedMicros: 0,
    allocationMicros: 10_000_000,
    settledMicros: 0,
    holdMicros: 250_000,
    nextResetAt: "2026-09-30T00:00:00.000Z",
    nextReply: "free",
  };
  value.nextReply = replyKind(value);
  return value;
}

function brief(): BriefSnapshot {
  const priorityOptions = [option("time", GIVEN["first-reply"].suggested), option("coverage", "Fewer unfilled shifts")];
  const bookingOptions = [option("self", "Volunteers book themselves"), option("coordinators", "Coordinators book shifts")];
  const topics: BriefTopic[] = [
    topic({
      id: "priority",
      title: "Main priority",
      plannedQuestion: GIVEN["first-reply"].questions.priority,
      why: "A clear priority keeps the first version small and useful.",
      suggestion: GIVEN["first-reply"].suggested,
    }),
    topic({
      id: "booking",
      title: "Who books shifts",
      plannedQuestion: GIVEN["first-reply"].questions.booking,
      why: "This decides who needs access and which rules we ask about next.",
      suggestion: "Volunteers book themselves",
    }),
    topic({
      id: "measure",
      title: "Success measure",
      plannedQuestion: "What weekly scheduling time would count as success?",
      why: "You can use this target to check whether the first version helps.",
      suggestion: "Two hours a week, down from four",
    }),
    topic({
      id: "owner",
      title: "Maintenance owner",
      plannedQuestion: "Who will look after the tool?",
      why: "Someone must manage access and small changes after handoff.",
      suggestion: "Our operations lead",
    }),
    topic({
      id: "info",
      title: "Information handled",
      plannedQuestion: "What volunteer information will the tool keep?",
      why: "Less personal information means less risk and simpler rules.",
      suggestion: "Name and phone only",
    }),
    topic({
      id: "rules",
      title: "Booking rules",
      plannedQuestion: "Which booking rules should the tool enforce?",
      why: "You said volunteers book themselves, so the tool needs limits.",
      suggestion: "Weekly shift limit",
    }),
  ];
  const questions: BriefQuestion[] = [
    asked(
      "priority",
      GIVEN["first-reply"].questions.priority,
      "A clear priority keeps the first version small and useful.",
      priorityOptions,
      "time",
      "Suggested: less coordination time. Your intake says scheduling takes four hours each week.",
      "To find out: ask your coordinators which problem causes the most work.",
    ),
    asked(
      "booking",
      GIVEN["first-reply"].questions.booking,
      "This decides who needs access and which rules we ask about next.",
      bookingOptions,
      "self",
      "Suggested: volunteers book themselves, and coordinators handle exceptions.",
      "To find out: check whether your volunteers can book online.",
    ),
  ];
  return {
    revision: 1,
    need: { text: NEED, source: { kind: "intake" } },
    usersToday: null,
    successMeasure: null,
    topics,
    questions,
    suggestions: [],
    dataTier: null,
    fit: null,
    causeLabels: [],
  };
}

export function seedState(scenario: ScreenScenario): DiscoveryState {
  const snapshot = brief();
  const files = scenario === "first-reply-three-files" ? [intakeFile(), ...discoveryFiles()] : [intakeFile()];
  const discoveryCount = files.filter((file) => file.origin === "discovery").length;
  const opening: DiscoveryUIMessage = {
    id: "opening",
    role: "assistant",
    parts: [
      { type: "text", text: openingText(discoveryCount) },
      ...snapshot.questions.map(questionPart),
      { type: "data-charge", data: { kind: "free" } },
    ],
  };
  const intake: DiscoveryUIMessage = {
    id: "intake",
    role: "user",
    parts: [{ type: "text", text: `${TEXT.source.intake}\n\n${NEED}` }],
  };
  return {
    project: { title: "Volunteer scheduling", organizationName: "Harbor Community Kitchen", funded: false },
    transcript: [intake, opening],
    fileChats: {},
    brief: snapshot,
    files,
    usage: usage(),
    confirmation: null,
  };
}
