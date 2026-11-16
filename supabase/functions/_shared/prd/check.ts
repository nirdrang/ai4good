import { generateText, jsonSchema, Output, type LanguageModelUsage } from "npm:ai@7.0.102";
import { isRecord, type SettleActResult, type SettleDatabase } from "../write-routes.ts";
import { ingestModelStep, prdModel, usageOf, type PrdTurnDeps } from "./turn.ts";

const CHECK_FAILED = "The completion check could not be read. Nothing was recorded, and the section is back where it was.";
const AI_NAME = "ai4good AI";

const checkSchema = jsonSchema({
  type: "object",
  additionalProperties: false,
  required: ["score", "coverageText", "gaps"],
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    coverageText: { type: "string" },
    gaps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sectionKey", "text"],
        properties: {
          sectionKey: { type: "string" },
          text: { type: "string", minLength: 1 },
        },
      },
    },
  },
});

export type StartedCheck = {
  turnId: string;
  sectionKey: string;
  priorState: string;
  priorChanged: string | null;
};

type SectionSource = {
  key: string;
  title: string;
  document: Record<string, unknown>;
};

type CheckSource = {
  chatId: string;
  revision: number;
  threshold: number;
  thresholdText: string;
  discovery: Record<string, unknown>;
  sections: SectionSource[];
};

type ModelGap = { sectionKey: string; text: string };

type Scored = { score: number; coverageText: string; gaps: ModelGap[] };

function whole(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

function textOf(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function sectionOf(value: unknown): SectionSource | null {
  if (!isRecord(value) || typeof value.key !== "string" || value.key.trim() === "") return null;
  if (typeof value.title !== "string") return null;
  const document = isRecord(value.document) ? value.document : {};
  return { key: value.key, title: value.title, document };
}

function sourceOf(value: Record<string, unknown>): CheckSource | null {
  const revision = whole(value.revision);
  const threshold = whole(value.threshold);
  const thresholdText = textOf(value.thresholdText);
  const chatId = textOf(value.chatId);
  if (revision === null || revision < 1 || threshold === null || threshold < 0 || threshold > 100) return null;
  if (thresholdText === null || thresholdText.trim() === "" || chatId === null || chatId === "") return null;
  if (!isRecord(value.discovery) || !Array.isArray(value.sections)) return null;
  const sections: SectionSource[] = [];
  for (const section of value.sections) {
    const parsed = sectionOf(section);
    if (parsed === null) return null;
    sections.push(parsed);
  }
  return {
    chatId,
    revision,
    threshold,
    thresholdText,
    discovery: value.discovery,
    sections,
  };
}

function scoredOf(value: unknown): Scored | null {
  if (!isRecord(value) || !Number.isInteger(value.score)) return null;
  const score = value.score as number;
  if (score < 0 || score > 100 || typeof value.coverageText !== "string") return null;
  if (!Array.isArray(value.gaps)) return null;
  const gaps: ModelGap[] = [];
  for (const gap of value.gaps) {
    if (!isRecord(gap) || typeof gap.sectionKey !== "string" || typeof gap.text !== "string") return null;
    const sectionKey = gap.sectionKey.trim();
    const text = gap.text.trim();
    if (sectionKey === "" || text === "") return null;
    gaps.push({ sectionKey, text });
  }
  return { score, coverageText: value.coverageText, gaps };
}

function lineOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!isRecord(value)) return "";
  const text = value.text;
  return typeof text === "string" ? text.trim() : "";
}

function discoveryLines(document: Record<string, unknown>): string[] {
  const lines = [`Need: ${lineOf(document.need) || "not recorded"}`];
  const users = lineOf(document.usersToday);
  if (users !== "") lines.push(`Who uses it today: ${users}`);
  const success = lineOf(document.successMeasure);
  if (success !== "") lines.push(`How it will be known to work: ${success}`);
  if (isRecord(document.topics)) {
    for (const [key, topic] of Object.entries(document.topics)) {
      if (!isRecord(topic)) continue;
      const state = isRecord(topic.state) ? topic.state : null;
      const answer = state !== null && state.kind === "agreed" ? lineOf(state.answer) : "";
      const title = typeof topic.title === "string" && topic.title.trim() !== "" ? topic.title.trim() : key;
      lines.push(answer === "" ? `Agreed answer for ${title}: not recorded` : `Agreed answer for ${title}: ${answer}`);
    }
  }
  if (isRecord(document.questions)) {
    for (const [key, question] of Object.entries(document.questions)) {
      if (!isRecord(question)) continue;
      const text = lineOf(question.text) || lineOf(question);
      if (text !== "") lines.push(`Open question ${key}: ${text}`);
    }
  }
  const tier = document.dataTier;
  if (isRecord(tier)) {
    const reason = lineOf(tier.reason);
    const kinds = Array.isArray(tier.kinds) ? tier.kinds.filter((kind) => typeof kind === "string").join(", ") : "";
    lines.push(
      `Data handling: tier ${String(tier.tier ?? "unknown")}${kinds === "" ? "" : ` (${kinds})`}. ${reason || "No reason recorded."}`,
    );
  } else {
    lines.push("Data handling: not recorded");
  }
  const fit = document.fit;
  if (isRecord(fit)) {
    lines.push(`Constraint: ${lineOf(fit.reason) || lineOf(fit) || "not recorded"}`);
  } else {
    lines.push("Constraint: not recorded");
  }
  return lines;
}

function sectionLines(section: SectionSource): string[] {
  const document = section.document;
  const lines = [`Section ${section.key} (${section.title})`];
  const statements = Array.isArray(document.statements) ? document.statements : [];
  if (statements.length === 0) lines.push("Statements: none");
  for (const statement of statements) lines.push(`Statement: ${lineOf(statement) || "empty"}`);
  const decisions = Array.isArray(document.decisions) ? document.decisions : [];
  if (decisions.length === 0) lines.push("Decisions: none");
  for (const decision of decisions) lines.push(`Decision: ${lineOf(decision) || "empty"}`);
  if (!Object.hasOwn(document, "technicalScope")) return lines;
  const scope = document.technicalScope;
  if (!isRecord(scope) || !Array.isArray(scope.userStories) || scope.userStories.length === 0) {
    lines.push("Technical scope: no user story and no acceptance criterion.");
    return lines;
  }
  for (const story of scope.userStories) {
    if (!isRecord(story)) continue;
    const criteria = Array.isArray(story.acceptanceCriteria)
      ? story.acceptanceCriteria.filter((item) => typeof item === "string" && item.trim() !== "")
      : [];
    lines.push(
      `Story: ${lineOf(story.story) || "empty"}. Acceptance criteria: ${criteria.length === 0 ? "none" : criteria.join("; ")}`,
    );
  }
  return lines;
}

function promptOf(source: CheckSource): string {
  const keys = source.sections.map((section) => section.key).join(", ");
  return [
    "Score this PRD against the approved Discovery document.",
    "The score is an integer from 0 to 100.",
    "coverageText is a short sentence about what the PRD covers.",
    "A gap is one missing item. Give each missing item its own gap.",
    "sectionKey must be copied from the section list. Each gap text says what is missing.",
    "Check the technical scope for user stories, and check that each story has nested acceptance criteria. A missing story and a missing acceptance criterion are two gaps.",
    "A Discovery data-handling decision that no section records is its own gap.",
    "A Discovery constraint that no section records is its own gap.",
    `Sections: ${keys}`,
    "",
    "Discovery",
    ...discoveryLines(source.discovery),
    "",
    "PRD",
    ...source.sections.flatMap(sectionLines),
  ].join("\n");
}

function keptGaps(
  gaps: readonly ModelGap[],
  sections: readonly SectionSource[],
): { kept: Array<{ topicId: string; title: string; text: string; fixed: false }>; dropped: string[] } {
  const titles = new Map(sections.map((section) => [section.key, section.title]));
  const seen = new Set<string>();
  const kept: Array<{ topicId: string; title: string; text: string; fixed: false }> = [];
  const dropped: string[] = [];
  for (const gap of gaps) {
    const title = titles.get(gap.sectionKey);
    if (title === undefined) {
      if (!dropped.includes(gap.sectionKey)) dropped.push(gap.sectionKey);
      continue;
    }
    const mark = `${gap.sectionKey}\n${gap.text}`;
    if (seen.has(mark)) continue;
    seen.add(mark);
    kept.push({ topicId: gap.sectionKey, title, text: gap.text, fixed: false });
  }
  return { kept, dropped };
}

function messageText(input: {
  revision: number;
  score: number;
  thresholdText: string;
  passed: boolean;
  coverageText: string;
  gaps: ReadonlyArray<{ title: string; text: string }>;
  dropped: readonly string[];
}): string {
  const verdict = input.passed ? "passes." : "does not pass yet.";
  const lines = [
    `Completion check on revision ${input.revision}: the PRD covers ${input.score}% of the confirmed Discovery document. The configured threshold is ${input.thresholdText}, so it ${verdict}`,
  ];
  const coverage = input.coverageText.trim();
  if (coverage !== "") lines.push(coverage);
  for (const gap of input.gaps) lines.push(`${gap.title}: ${gap.text}`);
  if (input.dropped.length > 0) {
    lines.push(`These section keys are not in this PRD and were not recorded: ${input.dropped.join(", ")}.`);
  }
  return lines.join("\n");
}

function messageParts(
  checkId: string,
  text: string,
  gaps: ReadonlyArray<{ topicId: string; title: string; text: string; fixed: false }>,
): unknown[] {
  return [
    { type: "text", text },
    { type: "data-check", data: { checkId, gaps } },
  ];
}

async function undo(database: SettleDatabase, started: StartedCheck): Promise<SettleActResult> {
  await database("prd_check_revert", {
    p_turn: started.turnId,
    p_section_key: started.sectionKey,
    p_prior_state: started.priorState,
    p_prior_changed: started.priorChanged,
  });
  await database("prd_turn_ingest", {
    p_turn: started.turnId,
    p_event: { kind: "end", outcome: "rejected" },
  });
  return { args: null, failure: CHECK_FAILED, status: 502 };
}

async function settleSteps(
  database: SettleDatabase,
  turnId: string,
  steps: ReadonlyArray<{ stepNumber?: number; usage: LanguageModelUsage }>,
): Promise<boolean> {
  const seen = new Set<string>();
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (step === undefined) continue;
    const usage = usageOf(step.usage);
    if (usage === null) continue;
    const settled = await ingestModelStep(
      database,
      turnId,
      typeof step.stepNumber === "number" ? step.stepNumber : index,
      usage,
      seen,
    );
    if (settled === null) return false;
  }
  return true;
}

/** Runs the completion check for a turn the confirm already started. Close PRD calls this too. */
export async function runCompletionCheck(
  deps: PrdTurnDeps,
  project: string,
  started: StartedCheck,
): Promise<SettleActResult> {
  const database = deps.rpc;
  const read = await database("prd_check_source", { p_project: project, p_turn: started.turnId });
  if (!read.ok || !isRecord(read.value)) return undo(database, started);
  const body = read.value;
  if (body.recorded !== null && body.recorded !== undefined) {
    if (body.state === "admitted" || body.state === "uncertain") {
      const ended = await database("prd_turn_ingest", {
        p_turn: started.turnId,
        p_event: { kind: "end", outcome: "answered" },
      });
      if (!ended.ok) return { args: null, failure: CHECK_FAILED, status: 502 };
    }
    return { args: null, failure: null, skipSettle: true };
  }
  if (body.state !== "admitted") return { args: null, failure: CHECK_FAILED, status: 502 };
  const source = sourceOf(body);
  if (source === null) return undo(database, started);
  const model = deps.model ?? (deps.settings === null ? null : prdModel(source.chatId, deps.settings));
  if (model === null) return undo(database, started);
  if (deps.settings !== null) {
    const recorded = await database("prd_turn_settings_record", {
      p_turn: started.turnId,
      p_model: deps.settings.modelId,
      p_settings: {
        baseURL: deps.settings.baseURL.trim().replace(/\/+$/, ""),
        model: deps.settings.modelId,
      },
    });
    if (!recorded.ok) return undo(database, started);
  }

  let steps: Array<{ stepNumber?: number; usage: LanguageModelUsage }> = [];
  let scored: Scored | null = null;
  try {
    const result = await generateText({
      model,
      output: Output.object({
        schema: checkSchema,
        name: "CompletionCheck",
        description: "Score the PRD against Discovery from 0 to 100 and name each missing item as its own gap.",
      }),
      prompt: promptOf(source),
      maxRetries: 0,
    });
    steps = result.steps.map((step) => ({ stepNumber: step.stepNumber, usage: step.usage }));
    scored = scoredOf(result.output);
  } catch {
    return undo(database, started);
  }
  const settled = await settleSteps(database, started.turnId, steps);
  if (!settled || scored === null) return undo(database, started);

  const { kept, dropped } = keptGaps(scored.gaps, source.sections);
  const passed = scored.score >= source.threshold;
  const text = messageText({
    revision: source.revision,
    score: scored.score,
    thresholdText: source.thresholdText,
    passed,
    coverageText: scored.coverageText,
    gaps: kept,
    dropped,
  });
  const checkId = crypto.randomUUID();
  const recorded = await database("prd_check_record", {
    p_project: project,
    p_turn: started.turnId,
    p_check: checkId,
    p_score: scored.score,
    p_coverage: scored.coverageText,
    p_gaps: scored.gaps,
    p_parts: messageParts(checkId, text, kept),
  });
  if (!recorded.ok) return undo(database, started);
  const ended = await database("prd_turn_ingest", {
    p_turn: started.turnId,
    p_event: { kind: "end", outcome: "answered" },
  });
  if (!ended.ok) return { args: null, failure: CHECK_FAILED, status: 502 };
  return { args: null, failure: null, skipSettle: true };
}
