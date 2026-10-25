import { createHash } from "node:crypto";
import {
  parseSection,
  parseSectionDocument,
  renderSection,
  type SectionDocument,
} from "../../../supabase/functions/_shared/prd/file.ts";
import { sqlClient } from "./live-stack.ts";

type Sql = ReturnType<typeof sqlClient>;

type OpeningSection = {
  key: string;
  title: string;
  path: string;
  document: SectionDocument;
};

function jsonValue(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function madeSha(label: string): string {
  return createHash("sha256").update(label).digest("hex").slice(0, 40);
}

function readSections(value: unknown): OpeningSection[] {
  const parsed = jsonValue(value);
  if (!Array.isArray(parsed)) throw new Error("the opening operation has no sections");
  return parsed.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.key !== "string" ||
      typeof entry.title !== "string" ||
      typeof entry.path !== "string"
    ) {
      throw new Error("an opening section is missing its file");
    }
    const document = parseSectionDocument(entry.document);
    if (!document.ok) throw new Error(document.reason);
    return { key: entry.key, title: entry.title, path: entry.path, document: document.document };
  });
}

/** Opens a PRD through the SQL functions, with made-up commit shas instead of GitHub. */
export async function openWithoutGithub(
  sql: Sql,
  dev: string,
  org: string,
  project: string,
): Promise<void> {
  const rows = (await sql`select public.prd_open_begin(
    ${dev}::uuid, ${org}::uuid, ${project}::uuid) as begun`) as Array<{ begun: unknown }>;
  const begun = jsonValue(rows[0]?.begun);
  if (!isRecord(begun) || (begun.kind !== "publish" && begun.kind !== "facts")) {
    throw new Error("prd_open_begin did not return an opening result");
  }
  if (begun.kind === "facts") return;
  const op = begun.op;
  if (!isRecord(op) || typeof op.id !== "string" || typeof op.repoName !== "string") {
    throw new Error("prd_open_begin did not return the opening operation");
  }
  const sections = readSections(op.sections);
  const base = madeSha(`${project}:base`);
  const commit = madeSha(`${project}:open`);
  const url = `https://github.com/example/${op.repoName}`;
  await sql`select public.prd_git_bind_repo(${project}::uuid, ${1001}::bigint, ${url})`;
  await sql`select public.prd_git_op_written(${op.id}::uuid, ${base}, ${commit})`;
  const changes = sections.map((section) => {
    const content = renderSection({
      key: section.key,
      title: section.title,
      document: section.document,
    });
    const parsed = parseSection(content);
    if (!parsed.ok) {
      throw new Error(`the opening file for ${section.key} did not parse: ${parsed.reason}`);
    }
    return {
      path: section.path,
      change: "added",
      blobSha: madeSha(`${project}:blob:${section.path}`),
      file: {
        variant: "readable",
        key: parsed.file.key,
        title: parsed.file.title,
        document: parsed.file.document,
      },
    };
  });
  const commits = [
    {
      sha: commit,
      parents: [base],
      login: null,
      message: "Open the PRD",
      changes,
    },
  ];
  await sql`select public.prd_reconcile(
    ${project}::uuid,
    ${base},
    ${JSON.stringify(commits)}::jsonb
  )`;
}
