import { expect, it } from "vitest";
import { parseScope, type Scope } from "../../../supabase/functions/_shared/scope.ts";
import {
  parseSection,
  renderSection,
  sectionPath,
  type SectionDocument,
  type SectionFile,
} from "../../../supabase/functions/_shared/prd/file.ts";

const PIECES = [
  "a goal for the team",
  "line one\nline two",
  "use *bold* and _italic_ here",
  "a heading mark # stays text",
  "code `bun test` in the line",
  "a | pipe | stays",
  "> quoted text stays",
  "שלום עולם",
  "café — naïve",
  "a seedling 🌱 in the line",
];

const KEYS = ["goals", "usersToday", "technical-scope", "Who Uses It", "successMeasure"];
const TITLES = [
  "Goals",
  "Who uses it, and what they do today",
  "Technical scope",
  "How you will know it works",
];

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}

function fixtureScope(traced: boolean): Scope {
  const story: Scope["userStories"][number] = {
    story: "As a coordinator, I add a row.",
    acceptanceCriteria: ["The row is saved."],
  };
  if (traced) story.discoveryTopicId = "priority";
  const parsed = parseScope({
    summary: "A shared list of deadlines.",
    userStories: [story],
    suggestedStack: ["Supabase"],
    complexity: {
      tier: "small",
      rationale: "One list.",
      startSmallAdvice: "Start with the list.",
    },
    riskFlags: ["Email must arrive."],
    dataSensitivity: { tier: "tier0", rationale: "No personal records." },
    maintainabilityFit: { verdict: "fit", rationale: "Staff keep it by chat." },
    causeLabels: ["grant reporting"],
  });
  if (parsed === null) throw new Error("the fixture scope is not a scope");
  return parsed;
}

function randomText(random: () => number): string {
  const count = 1 + Math.floor(random() * 3);
  const parts: string[] = [];
  for (let index = 0; index < count; index += 1) parts.push(pick(random, PIECES));
  return parts.join(random() < 0.5 ? "\n" : " ");
}

function randomSources(random: () => number): string[] {
  const roll = random();
  if (roll < 0.2) return [];
  if (roll < 0.45) return ["Discovery revision 1", "notes.pdf"];
  if (roll < 0.6) return ['a "quoted" source', "back\\slash"];
  if (roll < 0.75) return ["שלום"];
  const sources: string[] = [];
  const count = 4 + Math.floor(random() * 4);
  for (let index = 0; index < count; index += 1) sources.push(`source ${index + 1}`);
  return sources;
}

function randomDecisions(random: () => number): unknown[] {
  if (random() < 0.35) return [];
  const values: unknown[] = [];
  const count = 1 + Math.floor(random() * 3);
  for (let index = 0; index < count; index += 1) {
    const kind = Math.floor(random() * 6);
    if (kind === 0) values.push(null);
    else if (kind === 1) values.push(random() < 0.5);
    else if (kind === 2) values.push(Math.floor(random() * 40));
    else if (kind === 3) values.push(pick(random, ["keep", "drop", 'a "quote"']));
    else if (kind === 4) values.push(["one", "two"]);
    else values.push({ id: "d1", note: "because" });
  }
  return values;
}

function randomFile(random: () => number, written: Scope, traced: Scope): SectionFile {
  const statements = [];
  const count = Math.floor(random() * 5);
  for (let index = 0; index < count; index += 1) {
    statements.push({ text: randomText(random), sources: randomSources(random) });
  }
  const document: SectionDocument = { statements, decisions: randomDecisions(random) };
  const scopeRoll = random();
  if (scopeRoll < 0.25) document.technicalScope = {};
  else if (scopeRoll < 0.5) document.technicalScope = random() < 0.5 ? written : traced;
  return { key: pick(random, KEYS), title: pick(random, TITLES), document };
}

function forced(written: Scope, traced: Scope): SectionFile[] {
  return [
    { key: "goals", title: "Goals", document: { statements: [], decisions: [] } },
    {
      key: "technical-scope",
      title: "Technical scope",
      document: { statements: [], decisions: [{ id: "none" }], technicalScope: {} },
    },
    {
      key: "Who Uses It",
      title: "Who uses it, and what they do today",
      document: {
        statements: [
          {
            text: "use *bold* and _italic_ here\na | pipe | and `code` and # mark\n> quoted",
            sources: ["Discovery revision 1", "notes.pdf", "a third", "a fourth"],
          },
          { text: "line one\nline two", sources: [] },
          { text: "שלום עולם\ncafé — naïve 🌱", sources: ["שלום"] },
        ],
        decisions: [null, true, 1, "keep", ["one"], { id: "d1" }],
        technicalScope: written,
      },
    },
    {
      key: "usersToday",
      title: "Users",
      document: {
        statements: [
          { text: "a goal for the team", sources: ['a "quoted" source', "back\\slash"] },
        ],
        decisions: [],
        technicalScope: traced,
      },
    },
  ];
}

function generated(count: number): SectionFile[] {
  const written = fixtureScope(true);
  const traced = fixtureScope(false);
  const files = forced(written, traced);
  const random = mulberry32(166);
  while (files.length < count) files.push(randomFile(random, written, traced));
  return files;
}

function wrapped(matter: string, body = ""): string {
  return `---\n${matter}\n---\n\n${body}`;
}

const READY = `{
  "key": "goals",
  "title": "Goals",
  "decisions": []
}`;

it("round-trips at least 500 generated section files", () => {
  const files = generated(500);
  expect(files).toHaveLength(500);
  const seen = {
    emptyStatements: false,
    lineBreak: false,
    noSources: false,
    manySources: false,
    emptyDecisions: false,
    decisions: false,
    emptyScope: false,
    writtenScope: false,
    markdown: false,
    unicode: false,
  };
  for (const [index, file] of files.entries()) {
    const rendered = renderSection(file);
    expect(parseSection(rendered), `file ${index}`).toEqual({ ok: true, file });
    expect(parseSection(rendered.replaceAll("\n", "\r\n")), `file ${index} crlf`).toEqual({
      ok: true,
      file,
    });
    if (file.document.statements.length === 0) seen.emptyStatements = true;
    if (file.document.decisions.length === 0) seen.emptyDecisions = true;
    else seen.decisions = true;
    if (Object.hasOwn(file.document, "technicalScope")) {
      const scope = file.document.technicalScope ?? {};
      if (Object.keys(scope).length === 0) seen.emptyScope = true;
      else seen.writtenScope = true;
    }
    for (const statement of file.document.statements) {
      if (statement.text.includes("\n")) seen.lineBreak = true;
      if (statement.sources.length === 0) seen.noSources = true;
      if (statement.sources.length >= 4) seen.manySources = true;
      if (/[*_#`|>]/.test(statement.text)) seen.markdown = true;
      if ([...statement.text].some((char) => (char.codePointAt(0) ?? 0) > 127)) seen.unicode = true;
    }
  }
  expect(seen).toEqual({
    emptyStatements: true,
    lineBreak: true,
    noSources: true,
    manySources: true,
    emptyDecisions: true,
    decisions: true,
    emptyScope: true,
    writtenScope: true,
    markdown: true,
    unicode: true,
  });
});

it("parses a sources line whose JSON has spaces", () => {
  const markdown = wrapped(READY, 'Hello\n<!-- sources: [ "Discovery revision 1" ] -->\n');
  expect(parseSection(markdown)).toEqual({
    ok: true,
    file: {
      key: "goals",
      title: "Goals",
      document: {
        statements: [{ text: "Hello", sources: ["Discovery revision 1"] }],
        decisions: [],
      },
    },
  });
});

it("refuses a section file that is not the format", () => {
  const cases = [
    ["hello", "the file has no front matter"],
    [wrapped("{"), "the front matter is not valid JSON"],
    [
      wrapped(`{
  "title": "Goals",
  "decisions": []
}`),
      "the front matter is missing key",
    ],
    [
      wrapped(`{
  "key": "goals",
  "title": "Goals",
  "decisions": [],
  "note": true
}`),
      "the front matter has an unexpected key: note",
    ],
    [
      wrapped(READY, 'First.\n<!-- sources: ["a"] -->\n\nSecond without a marker.\n'),
      "statement 2 has no sources line",
    ],
    [
      wrapped(READY, "Hello\n<!-- sources: [1] -->\n"),
      "statement 1 sources are not a JSON string array",
    ],
    [
      wrapped(READY, 'Hello\n<!-- note -->\n<!-- sources: ["a"] -->\n'),
      "statement 1 has a line starting with <!--",
    ],
  ] as const;
  for (const [markdown, reason] of cases) {
    expect(parseSection(markdown)).toEqual({ ok: false, reason });
  }
});

it("names a section file from its key", () => {
  expect(sectionPath("goals")).toBe("prd/goals.md");
  expect(sectionPath("technical-scope")).toBe("prd/technical-scope.md");
  expect(sectionPath("Who Uses It")).toBe("prd/who-uses-it.md");
  expect(sectionPath("usersToday")).toBe("prd/userstoday.md");
  expect(sectionPath("  A__B  ")).toBe("prd/a-b.md");
  expect(() => sectionPath("---")).toThrow(/no file name/);
  expect(() => sectionPath("***")).toThrow(/no file name/);
});
