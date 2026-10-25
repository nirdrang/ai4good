import type { Scope } from "../scope.ts";
import { storedTechnicalScope } from "./technical-scope.ts";

export type SectionStatement = {
  text: string;
  sources: string[];
};

export type SectionDocument = {
  statements: SectionStatement[];
  decisions: unknown[];
  technicalScope?: Scope | Record<string, never>;
};

export type SectionFile = {
  key: string;
  title: string;
  document: SectionDocument;
};

export type SectionParse<T> = { ok: true; file: T } | { ok: false; reason: string };
export type DocumentParse = { ok: true; document: SectionDocument } | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): boolean {
  if (value === null) return true;
  const kind = typeof value;
  if (kind === "string" || kind === "boolean") return true;
  if (kind === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (kind !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.values(value as Record<string, unknown>).every(isJsonValue);
}

function statementProblem(statement: unknown, index: number): string | null {
  const label = `statement ${index}`;
  if (!isRecord(statement)) return `${label} is not a statement`;
  const keys = Object.keys(statement);
  if (keys.some((key) => key !== "text" && key !== "sources")) {
    return `${label} must have only text and sources`;
  }
  if (typeof statement.text !== "string") return `${label} has no text`;
  const text = statement.text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (text === "") return `${label} is empty`;
  if (/\n[ ]*\n/.test(text)) return `${label} contains a blank line`;
  if (text.split("\n").some((line) => line.startsWith("<!--"))) {
    return `${label} has a line starting with <!--`;
  }
  if (!Array.isArray(statement.sources)) return `${label} has no sources`;
  if (statement.sources.some((source) => typeof source !== "string" || source.length === 0)) {
    return `${label} sources must be non-empty strings`;
  }
  return null;
}

export function parseSectionDocument(value: unknown): DocumentParse {
  if (!isRecord(value)) return { ok: false, reason: "the section document is not an object" };
  for (const key of Object.keys(value)) {
    if (key !== "statements" && key !== "decisions" && key !== "technicalScope") {
      return { ok: false, reason: `the section document has an unexpected field: ${key}` };
    }
  }
  if (!Object.hasOwn(value, "statements") || !Array.isArray(value.statements)) {
    return { ok: false, reason: "the section document has no statements" };
  }
  if (!Object.hasOwn(value, "decisions") || !Array.isArray(value.decisions)) {
    return { ok: false, reason: "the section document has no decisions" };
  }
  const statements: SectionStatement[] = [];
  for (let index = 0; index < value.statements.length; index += 1) {
    const statement = value.statements[index];
    const problem = statementProblem(statement, index + 1);
    if (problem !== null) return { ok: false, reason: problem };
    const record = statement as Record<string, unknown>;
    const text = (record.text as string).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    statements.push({ text, sources: [...(record.sources as string[])] });
  }
  for (let index = 0; index < value.decisions.length; index += 1) {
    if (!isJsonValue(value.decisions[index])) {
      return { ok: false, reason: `decision ${index + 1} is not JSON` };
    }
  }
  const document: SectionDocument = { statements, decisions: [...value.decisions] };
  if (Object.hasOwn(value, "technicalScope")) {
    const stored = storedTechnicalScope(value.technicalScope);
    if (stored === null) return { ok: false, reason: "the technical scope is not a scope" };
    document.technicalScope = stored.kind === "not-written" ? {} : stored.scope;
  }
  return { ok: true, document };
}

export function sectionPath(key: string): string {
  const slug = key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug === "") throw new Error(`the section key ${JSON.stringify(key)} has no file name`);
  return `prd/${slug}.md`;
}

export function renderSection(file: SectionFile): string {
  const matter: Record<string, unknown> = {
    key: file.key,
    title: file.title,
    decisions: file.document.decisions,
  };
  if (Object.hasOwn(file.document, "technicalScope")) {
    matter.technicalScope = file.document.technicalScope;
  }
  const paragraphs = file.document.statements.map(
    (statement) => `${statement.text}\n<!-- sources: ${JSON.stringify(statement.sources)} -->`,
  );
  const body = paragraphs.length === 0 ? "" : `${paragraphs.join("\n\n")}\n`;
  return `---\n${JSON.stringify(matter, null, 2)}\n---\n\n${body}`;
}

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

function contentLines(markdown: string): string[] {
  const normalized = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  if (normalized.endsWith("\n")) lines.pop();
  return lines;
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null;
  return value as string[];
}

function parseSectionText(markdown: string): SectionParse<SectionFile> {
  const lines = contentLines(markdown);
  if (lines[0] !== "---") return fail("the file has no front matter");
  let close = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === "---") {
      close = index;
      break;
    }
  }
  if (close < 0) return fail("the file has no front matter");
  let matter: unknown;
  try {
    matter = JSON.parse(lines.slice(1, close).join("\n"));
  } catch {
    return fail("the front matter is not valid JSON");
  }
  if (!isRecord(matter)) return fail("the front matter is not a JSON object");
  for (const key of Object.keys(matter)) {
    if (key !== "key" && key !== "title" && key !== "decisions" && key !== "technicalScope") {
      return fail(`the front matter has an unexpected key: ${key}`);
    }
  }
  for (const key of ["key", "title", "decisions"] as const) {
    if (!Object.hasOwn(matter, key)) return fail(`the front matter is missing ${key}`);
  }
  if (typeof matter.key !== "string") return fail("the front matter key is not text");
  if (matter.key === "") return fail("the front matter key is empty");
  if (typeof matter.title !== "string") return fail("the front matter title is not text");
  if (matter.title === "") return fail("the front matter title is empty");
  if (lines[close + 1] !== "") return fail("the front matter is not followed by a blank line");
  const body = lines.slice(close + 2);
  if (body.length > 0 && body[body.length - 1] === "")
    return fail("the file has an extra blank line");
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of body) {
    if (line !== "") {
      current.push(line);
      continue;
    }
    if (current.length === 0) return fail("the file has an extra blank line");
    blocks.push(current);
    current = [];
  }
  if (current.length > 0) blocks.push(current);
  const statements: { text: string; sources: string[] }[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index] ?? [];
    const last = block[block.length - 1] ?? "";
    const match = /^<!-- sources: (.*) -->$/.exec(last);
    if (match === null) return fail(`statement ${index + 1} has no sources line`);
    let sources: unknown;
    try {
      sources = JSON.parse(match[1] ?? "");
    } catch {
      return fail(`statement ${index + 1} sources are not a JSON string array`);
    }
    const parsedSources = stringArray(sources);
    if (parsedSources === null) {
      return fail(`statement ${index + 1} sources are not a JSON string array`);
    }
    statements.push({ text: block.slice(0, -1).join("\n"), sources: parsedSources });
  }
  const raw: Record<string, unknown> = {
    statements,
    decisions: matter.decisions,
  };
  if (Object.hasOwn(matter, "technicalScope")) raw.technicalScope = matter.technicalScope;
  const document = parseSectionDocument(raw);
  if (!document.ok) return document;
  return {
    ok: true,
    file: { key: matter.key, title: matter.title, document: document.document },
  };
}

export function parseSection(markdown: string): SectionParse<SectionFile> {
  try {
    return parseSectionText(markdown);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "the section file could not be parsed";
    return fail(reason);
  }
}
