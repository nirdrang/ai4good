import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  parseSection,
  renderSection,
  sectionPath,
} from "../../../supabase/functions/_shared/prd/file.ts";
import type { SectionDocument } from "../../../supabase/functions/_shared/prd/file.ts";
import { STACK_ENV, sqlClient, stackFromEnv, type Stack } from "./live-stack.ts";
import { madeSha, openWithoutGithub } from "./prd-git.ts";

type Sql = ReturnType<typeof sqlClient>;

const live = Boolean(process.env[STACK_ENV.dbUrl]) && "Bun" in globalThis;
const FIXTURE_KEYS = [
  "goals",
  "usersToday",
  "technical-scope",
  "Who Uses It",
  "successMeasure",
  "booking",
  "rules",
];

type Seed = { dev: string; ngo: string; stranger: string; org: string; project: string };
type Stamp = {
  state: string;
  revision: number;
  sequence: number;
  head: string | null;
  synced: string | null;
  versions: number;
  revisions: number;
};
type FactSection = {
  key: string;
  state: string;
  variant: string;
  problem: string | null;
  changedSinceConfirmed: string | null;
  document: { statements: Array<{ text: string }>; decisions: unknown[] };
};

function jsonValue(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function whole(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  throw new Error(`expected a whole number, got ${JSON.stringify(value)}`);
}

function textOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function repoName(name: string, project: string): string {
  const replaced = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const cut = replaced.slice(0, 60).replace(/^-+|-+$/g, "");
  const body = cut === "" ? "project" : cut;
  return `${body}-${project.replace(/-/g, "").toLowerCase().slice(0, 12)}`;
}

async function refusal(run: Promise<unknown>): Promise<{ detail: string; message: string }> {
  try {
    await run;
  } catch (error) {
    const err = error as { detail?: unknown; message?: unknown };
    return { detail: String(err.detail), message: String(err.message) };
  }
  throw new Error("expected a refusal");
}

async function account(stack: Stack, sql: Sql, kind: "volunteer" | "ngo", name: string) {
  const created = await fetch(`${stack.apiUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: stack.serviceRoleKey,
      Authorization: `Bearer ${stack.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: `${crypto.randomUUID()}@example.com`, email_confirm: true }),
  });
  if (created.status >= 400) throw new Error(`provisioning answered ${created.status}`);
  const id = String(((await created.json()) as { id?: string }).id ?? "");
  await sql`insert into public.accounts (id, account_type)
    values (${id}::uuid, ${kind}::public.account_type)`;
  await sql`insert into public.acknowledgments
    (account_id, kind, text_version, signer_name, signer_title, authority_attestation)
    values (${id}::uuid, 'platform_tos_and_promise', 'tos-1', ${name}, 'Coordinator', 'I may act')`;
  return id;
}

async function seed(stack: Stack, sql: Sql, brief: Record<string, unknown>): Promise<Seed> {
  const dev = await account(stack, sql, "volunteer", "Priya Shah");
  const ngo = await account(stack, sql, "ngo", "Maya Levi");
  const stranger = await account(stack, sql, "volunteer", "Someone Else");
  const orgs = (await sql`insert into public.organizations (name)
    values ('Harbor Community Kitchen') returning id`) as Array<{ id: string }>;
  const org = String(orgs[0].id);
  await sql`insert into public.org_memberships (org_id, account_id, role)
    values (${org}::uuid, ${ngo}::uuid, 'admin')`;
  const projects = (await sql`insert into public.projects (org_id, name, assigned_volunteer_id)
    values (${org}::uuid, 'Volunteer scheduling', ${dev}::uuid) returning id`) as Array<{
    id: string;
  }>;
  const project = String(projects[0].id);
  await sql`insert into public.brief_revisions (project_id, revision, document, created_by)
    values (${project}::uuid, 1, ${JSON.stringify(brief)}::text::jsonb, ${ngo}::uuid)`;
  await sql`insert into public.discovery_confirmations
    (project_id, revision, actor_id, actor_name, confirmed_at, accepted_gaps)
    values (${project}::uuid, 1, ${ngo}::uuid, 'Maya Levi', clock_timestamp(), '[]'::jsonb)`;
  return { dev, ngo, stranger, org, project };
}

function schedulingBrief(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    need: { text: "Schedule volunteers", source: { kind: "intake" } },
    usersToday: {
      text: "Coordinators fill a spreadsheet every week.",
      source: { kind: "intake" },
    },
    successMeasure: null,
    topicOrder: ["booking", "rules"],
    topics: {
      booking: {
        id: "booking",
        title: "Who books shifts",
        required: true,
        state: {
          kind: "agreed",
          answer: "Volunteers book themselves.",
          source: { kind: "chat", round: 1 },
        },
      },
      rules: { id: "rules", title: "Booking rules", required: true, state: { kind: "open" } },
    },
    dependsOn: { rules: ["booking"] },
  };
}

function collisionBrief(): Record<string, unknown> {
  const topic = (id: string) => ({
    id,
    title: id,
    required: true,
    state: { kind: "open" },
  });
  return {
    schemaVersion: 1,
    need: { text: "Schedule volunteers", source: { kind: "intake" } },
    usersToday: null,
    successMeasure: null,
    topicOrder: ["A B", "a-b", "a--b"],
    topics: {
      "A B": topic("A B"),
      "a-b": topic("a-b"),
      "a--b": topic("a--b"),
    },
    dependsOn: {},
  };
}

async function stamp(sql: Sql, project: string): Promise<Stamp> {
  const rows = (await sql`select r.state, r.current_revision, r.snapshot_sequence, r.head_commit,
      r.synced_at,
      (select count(*) from public.prd_section_versions v
        where v.project_id = r.project_id) as versions,
      (select count(*) from public.prd_revisions rev
        where rev.project_id = r.project_id) as revisions
    from public.prd_records r
    where r.project_id = ${project}::uuid`) as Array<Record<string, unknown>>;
  const row = rows[0];
  return {
    state: String(row.state),
    revision: whole(row.current_revision),
    sequence: whole(row.snapshot_sequence),
    head: textOrNull(row.head_commit),
    synced: textOrNull(row.synced_at),
    versions: whole(row.versions),
    revisions: whole(row.revisions),
  };
}

async function reconcile(sql: Sql, project: string, head: string | null, commits: unknown[]) {
  const rows = (await sql`select public.prd_reconcile(
    ${project}::uuid, ${head}, ${JSON.stringify(commits)}::text::jsonb) as result`) as Array<{
    result: unknown;
  }>;
  const result = jsonValue(rows[0].result);
  if (!isRecord(result)) throw new Error("prd_reconcile did not return a record");
  return result;
}

async function facts(sql: Sql, dev: string, project: string): Promise<FactSection[]> {
  const rows =
    (await sql`select public.prd_facts(${dev}::uuid, ${project}::uuid) as facts`) as Array<{
      facts: unknown;
    }>;
  const body = jsonValue(rows[0].facts);
  if (!isRecord(body) || !Array.isArray(body.sections)) {
    throw new Error("prd_facts has no sections");
  }
  return body.sections.map((section) => {
    const parsed = jsonValue(section);
    if (!isRecord(parsed)) throw new Error("a section is a record");
    return parsed as FactSection;
  });
}

function section(sections: FactSection[], key: string): FactSection {
  const found = sections.find((item) => item.key === key);
  if (!found) throw new Error(`missing section ${key}`);
  return found;
}

async function paths(sql: Sql, project: string): Promise<Record<string, string>> {
  const rows = (await sql`select stable_key, file_path from public.prd_sections
    where project_id = ${project}::uuid order by ordinal`) as Array<{
    stable_key: string;
    file_path: string;
  }>;
  const out: Record<string, string> = {};
  for (const row of rows) out[row.stable_key] = row.file_path;
  return out;
}

function readableChange(
  path: string,
  key: string,
  title: string,
  document: SectionDocument,
  label: string,
  change: "added" | "modified",
) {
  const content = renderSection({ key, title, document });
  const parsed = parseSection(content);
  if (!parsed.ok) throw new Error(parsed.reason);
  return {
    path,
    change,
    blobSha: madeSha(label),
    file: {
      variant: "readable" as const,
      key: parsed.file.key,
      title: parsed.file.title,
      document: parsed.file.document,
    },
  };
}

function commit(sha: string, parent: string, login: string | null, changes: unknown[]) {
  return { sha, parents: [parent], login, message: "Edit the PRD", changes };
}

describe.skipIf(!live)("PRD git on the local stack", () => {
  let stack: Stack;
  let sql: Sql;

  beforeAll(() => {
    stack = stackFromEnv();
    sql = sqlClient(stack);
  });

  afterAll(async () => {
    await sql?.close();
  });

  it("agrees with sectionPath and the repository name rule", async () => {
    for (const key of FIXTURE_KEYS) {
      const rows = (await sql`select public.prd_file_path(${key}) as path`) as Array<{
        path: string;
      }>;
      expect(rows[0].path, key).toBe(sectionPath(key));
    }
    const project = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const names = ["Volunteer scheduling", "***", "A".repeat(80)];
    for (const name of names) {
      const rows =
        (await sql`select public.prd_repo_name(${name}, ${project}::uuid) as name`) as Array<{
          name: string;
        }>;
      expect(rows[0].name, name).toBe(repoName(name, project));
    }
  });

  it("suffixes colliding opening paths in ordinal order", async () => {
    const seeded = await seed(stack, sql, collisionBrief());
    await sql`select public.prd_open_begin(
      ${seeded.dev}::uuid, ${seeded.org}::uuid, ${seeded.project}::uuid)`;
    const stored = await paths(sql, seeded.project);
    expect(sectionPath("A B")).toBe("prd/a-b.md");
    expect(sectionPath("a-b")).toBe("prd/a-b.md");
    expect(sectionPath("a--b")).toBe("prd/a-b.md");
    expect(stored["A B"]).toBe("prd/a-b.md");
    expect(stored["a-b"]).toBe("prd/a-b-2.md");
    expect(stored["a--b"]).toBe("prd/a-b-3.md");
    expect(stored["technical-scope"]).toBe(sectionPath("technical-scope"));
  });

  it("finalizes the open once and applies repository edits", async () => {
    const seeded = await seed(stack, sql, schedulingBrief());
    const { dev, project } = seeded;
    await openWithoutGithub(sql, dev, seeded.org, project);
    const opened = await stamp(sql, project);
    expect(opened.state).toBe("open");
    expect(opened.revision).toBe(1);
    expect(opened.sequence).toBe(1);
    expect(opened.revisions).toBe(1);
    expect(opened.versions).toBe(4);
    expect(opened.head).toBe(madeSha(`${project}:open`));
    const named = (await sql`select repo_name from public.prd_records
      where project_id = ${project}::uuid`) as Array<{ repo_name: string }>;
    expect(named[0].repo_name).toBe(repoName("Volunteer scheduling", project));
    const authors = (await sql`select author_kind, author_login, variant
      from public.prd_section_versions where project_id = ${project}::uuid`) as Array<{
      author_kind: string;
      author_login: string | null;
      variant: string;
    }>;
    expect(authors).toHaveLength(4);
    for (const author of authors) {
      expect(author).toMatchObject({
        author_kind: "open",
        author_login: null,
        variant: "readable",
      });
    }
    const openedFacts = await facts(sql, dev, project);
    expect(section(openedFacts, "booking").document.statements.map((item) => item.text)).toEqual([
      "Volunteers book themselves.",
    ]);

    await openWithoutGithub(sql, dev, seeded.org, project);
    const replay = await reconcile(sql, project, opened.head, [
      commit(opened.head ?? "", madeSha(`${project}:base`), null, []),
    ]);
    expect(replay.stale).toBe(false);
    expect(whole(replay.applied)).toBe(0);
    expect(await stamp(sql, project)).toEqual(opened);

    const staleCommit = madeSha(`${project}:stale`);
    const stale = await reconcile(sql, project, madeSha(`${project}:wrong-head`), [
      commit(staleCommit, opened.head ?? "", "octocat", []),
    ]);
    expect(stale).toEqual({ stale: true });
    expect(await stamp(sql, project)).toEqual(opened);

    await sql`update public.prd_sections set state = 'confirmed'
      where project_id = ${project}::uuid and stable_key = 'booking'`;
    const filePaths = await paths(sql, project);
    const edited = readableChange(
      filePaths.booking,
      "booking",
      "Who books shifts",
      {
        statements: [
          { text: "Volunteers book themselves in the app.", sources: ["a coordinator"] },
        ],
        decisions: [],
      },
      `${project}:booking-edit`,
      "modified",
    );
    const editSha = madeSha(`${project}:edit`);
    const edit = await reconcile(sql, project, opened.head, [
      commit(editSha, opened.head ?? "", "octocat", [edited]),
    ]);
    expect(edit.stale).toBe(false);
    expect(whole(edit.applied)).toBe(1);
    expect(whole(edit.revision)).toBe(2);
    const afterEdit = await stamp(sql, project);
    expect(afterEdit.revision).toBe(2);
    expect(afterEdit.sequence).toBe(2);
    expect(afterEdit.head).toBe(editSha);
    const credited = (await sql`select author_kind, author_login, variant
      from public.prd_section_versions
      where project_id = ${project}::uuid and commit_sha = ${editSha}`) as Array<{
      author_kind: string;
      author_login: string | null;
      variant: string;
    }>;
    expect([...credited].map((row) => ({ ...row }))).toEqual([
      { author_kind: "repository", author_login: "octocat", variant: "readable" },
    ]);
    const reviewed = section(await facts(sql, dev, project), "booking");
    expect(reviewed.state).toBe("needs-review");
    expect(reviewed.changedSinceConfirmed).toBe("the file changed in the repository");
    expect(reviewed.document.statements.map((item) => item.text)).toEqual([
      "Volunteers book themselves in the app.",
    ]);

    const raw = "not a section";
    const unreadable = parseSection(raw);
    if (unreadable.ok) throw new Error("expected the removed file text to fail parsing");
    const damageSha = madeSha(`${project}:damage`);
    await reconcile(sql, project, editSha, [
      commit(damageSha, editSha, "octocat", [
        {
          path: filePaths.rules,
          change: "modified",
          blobSha: madeSha(`${project}:rules-raw`),
          file: { variant: "unreadable", raw, error: unreadable.reason },
        },
        { path: filePaths.usersToday, change: "removed" },
      ]),
    ]);
    const damaged = await facts(sql, dev, project);
    const rules = section(damaged, "rules");
    const users = section(damaged, "usersToday");
    expect(rules.variant).toBe("unreadable");
    expect(rules.problem).toBe(unreadable.reason);
    expect(rules.document).toEqual({ statements: [], decisions: [] });
    expect(users.variant).toBe("missing");
    expect(users.problem).toBe("the file was removed from the repository");
    expect(users.document).toEqual({ statements: [], decisions: [] });
    expect((await stamp(sql, project)).revision).toBe(3);

    const renamedPath = "prd/booking-rules.md";
    const renameSha = madeSha(`${project}:rename`);
    await reconcile(sql, project, damageSha, [
      commit(renameSha, damageSha, "octocat", [
        { path: filePaths.rules, change: "removed" },
        readableChange(
          renamedPath,
          "rules",
          "Booking rules",
          {
            statements: [{ text: "A swap needs a coordinator.", sources: ["Maya"] }],
            decisions: [],
          },
          `${project}:rules-renamed`,
          "added",
        ),
      ]),
    ]);
    expect((await paths(sql, project)).rules).toBe(renamedPath);
    const renamed = section(await facts(sql, dev, project), "rules");
    expect(renamed.variant).toBe("readable");
    expect(renamed.document.statements.map((item) => item.text)).toEqual([
      "A swap needs a coordinator.",
    ]);

    const beforeUnknown = await stamp(sql, project);
    const bookingVersion = (await sql`select rev.manifest->>'booking' as version
      from public.prd_revisions rev
      join public.prd_records rec
        on rec.project_id = rev.project_id and rec.current_revision = rev.revision
      where rev.project_id = ${project}::uuid`) as Array<{ version: string }>;
    const unknownSha = madeSha(`${project}:unknown`);
    await reconcile(sql, project, renameSha, [
      commit(unknownSha, renameSha, "octocat", [
        readableChange(
          "prd/notes.md",
          "mystery",
          "Notes",
          { statements: [], decisions: [] },
          `${project}:mystery`,
          "added",
        ),
        readableChange(
          "prd/booking-copy.md",
          "booking",
          "Who books shifts",
          { statements: [], decisions: [] },
          `${project}:booking-copy`,
          "added",
        ),
      ]),
    ]);
    const unknown = (await sql`select file_path, reason from public.prd_unknown_files
      where project_id = ${project}::uuid and commit_sha = ${unknownSha}
      order by file_path`) as Array<{ file_path: string; reason: string }>;
    expect([...unknown].map((row) => ({ ...row }))).toEqual([
      { file_path: "prd/booking-copy.md", reason: "the file key belongs to another section" },
      { file_path: "prd/notes.md", reason: "the file key is not a section" },
    ]);
    const afterUnknown = await stamp(sql, project);
    expect(afterUnknown.revision).toBe(beforeUnknown.revision);
    expect(afterUnknown.sequence).toBe(beforeUnknown.sequence);
    expect(afterUnknown.versions).toBe(beforeUnknown.versions);
    expect(afterUnknown.head).toBe(unknownSha);
    expect((await paths(sql, project)).booking).toBe(filePaths.booking);
    const bookingStill = (await sql`select rev.manifest->>'booking' as version
      from public.prd_revisions rev
      join public.prd_records rec
        on rec.project_id = rev.project_id and rec.current_revision = rev.revision
      where rev.project_id = ${project}::uuid`) as Array<{ version: string }>;
    expect(bookingStill[0].version).toBe(bookingVersion[0].version);
    const keys = (await sql`select stable_key from public.prd_sections
      where project_id = ${project}::uuid order by ordinal`) as Array<{ stable_key: string }>;
    expect(keys.map((row) => row.stable_key)).toEqual([
      "usersToday",
      "booking",
      "rules",
      "technical-scope",
    ]);

    const again = await reconcile(sql, project, unknownSha, [
      commit(opened.head ?? "", madeSha(`${project}:base`), null, []),
      commit(editSha, opened.head ?? "", "octocat", [edited]),
      commit(unknownSha, renameSha, "octocat", []),
    ]);
    expect(whole(again.applied)).toBe(0);
    expect(await stamp(sql, project)).toEqual(afterUnknown);
  });

  it("refuses a pending record, keeps the first sha, and refuses a new repository id", async () => {
    const seeded = await seed(stack, sql, schedulingBrief());
    const { dev, ngo, stranger, org, project } = seeded;
    const blocked = await refusal(
      sql`select public.prd_open_begin(${ngo}::uuid, ${org}::uuid, ${project}::uuid)`,
    );
    expect(blocked.detail).toBe("forbidden");
    const outsider = await refusal(
      sql`select public.prd_open_begin(${stranger}::uuid, ${org}::uuid, ${project}::uuid)`,
    );
    expect(outsider.detail).toBe("forbidden");
    const none = (await sql`select count(*) as records from public.prd_records
      where project_id = ${project}::uuid`) as Array<{ records: unknown }>;
    expect(whole(none[0].records)).toBe(0);

    const begun = (await sql`select public.prd_open_begin(
      ${dev}::uuid, ${org}::uuid, ${project}::uuid) as begun`) as Array<{ begun: unknown }>;
    const first = jsonValue(begun[0].begun);
    if (!isRecord(first) || first.kind !== "publish" || !isRecord(first.op)) {
      throw new Error("prd_open_begin did not return the opening operation");
    }
    const op = String(first.op.id);
    const again = (await sql`select public.prd_open_begin(
      ${dev}::uuid, ${org}::uuid, ${project}::uuid) as begun`) as Array<{ begun: unknown }>;
    const second = jsonValue(again[0].begun);
    if (!isRecord(second) || !isRecord(second.op)) throw new Error("the repeat lost the operation");
    expect(second.op.id).toBe(op);
    const ngoPending = await refusal(
      sql`select public.prd_open_begin(${ngo}::uuid, ${org}::uuid, ${project}::uuid)`,
    );
    expect(ngoPending.detail).toBe("forbidden");

    const pending = async (run: Promise<unknown>) => {
      const error = await refusal(run);
      expect(error.detail).toBe("not-yet");
      expect(error.message).toContain("the PRD is still being set up");
    };
    await pending(sql`select public.prd_snapshot(${dev}::uuid, ${project}::uuid, null)`);
    await pending(
      sql`select public.prd_save_draft(${dev}::uuid, ${project}::uuid, 'main', 'hello')`,
    );
    await pending(sql`select public.prd_turn_reserve(${dev}::uuid, ${project}::uuid, 'main',
      'request-1', 0, '{"kind":"send"}'::jsonb, 'hash')`);
    await pending(sql`select public.prd_action(${dev}::uuid, ${project}::uuid, 'confirm-topic',
      'confirm-topic|booking|1|1', 'request-2')`);

    const base = madeSha(`${project}:base`);
    const firstSha = madeSha(`${project}:first-sha`);
    const secondSha = madeSha(`${project}:second-sha`);
    const wrote = (await sql`select public.prd_git_op_written(
      ${op}::uuid, ${base}, ${firstSha}) as sha`) as Array<{ sha: string }>;
    const kept = (await sql`select public.prd_git_op_written(
      ${op}::uuid, ${base}, ${secondSha}) as sha`) as Array<{ sha: string }>;
    expect(wrote[0].sha).toBe(firstSha);
    expect(kept[0].sha).toBe(firstSha);
    const opRow = (await sql`select commit_sha, base_commit, status from public.prd_git_ops
      where id = ${op}::uuid`) as Array<{
      commit_sha: string;
      base_commit: string;
      status: string;
    }>;
    expect(opRow[0]).toEqual({ commit_sha: firstSha, base_commit: base, status: "written" });

    const firstUrl = "https://github.com/example/one";
    const secondUrl = "https://github.com/example/two";
    await sql`select public.prd_git_bind_repo(${project}::uuid, ${1001}::bigint, ${firstUrl})`;
    await sql`select public.prd_git_bind_repo(${project}::uuid, ${1001}::bigint, ${secondUrl})`;
    const bound = (await sql`select repo_id, repo_url from public.prd_records
      where project_id = ${project}::uuid`) as Array<{ repo_id: unknown; repo_url: string }>;
    expect(String(bound[0].repo_id)).toBe("1001");
    expect(bound[0].repo_url).toBe(firstUrl);
    const clash = await refusal(
      sql`select public.prd_git_bind_repo(${project}::uuid, ${1002}::bigint, ${secondUrl})`,
    );
    expect(clash.detail).toBe("invalid-request");
    expect(clash.message).toContain("never changes");
    const still = (await sql`select repo_id from public.prd_records
      where project_id = ${project}::uuid`) as Array<{ repo_id: unknown }>;
    expect(String(still[0].repo_id)).toBe("1001");
  });
});
