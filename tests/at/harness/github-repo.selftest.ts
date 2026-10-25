import { afterAll, expect, it } from "vitest";
import { githubRepo } from "../../../supabase/functions/_shared/github/repo.ts";
import {
  parseSection,
  renderSection,
  sectionPath,
  type SectionFile,
} from "../../../supabase/functions/_shared/prd/file.ts";
import { parseScope, type Scope } from "../../../supabase/functions/_shared/scope.ts";
import { cleanupRepos, loadGithubTest } from "./github.ts";

function stop(label: string, value: unknown): never {
  throw new Error(`${label}: ${JSON.stringify(value)}`);
}

function fixtureScope(): Scope {
  const parsed = parseScope({
    summary: "A shared list of deadlines.",
    userStories: [
      {
        story: "As a coordinator, I add a row.",
        acceptanceCriteria: ["The row is saved."],
        discoveryTopicId: "priority",
      },
    ],
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

function runPrefix(): string {
  const time = Date.now().toString(36);
  const noise = Math.floor(Math.random() * 36 ** 6)
    .toString(36)
    .padStart(6, "0");
  return `prd166${time}${noise}`;
}

const loaded = loadGithubTest();

if (!loaded.ok && loaded.skip) {
  it.skip(loaded.reason, () => {});
} else if (!loaded.ok) {
  it("reads the GitHub test configuration", () => {
    throw new Error(loaded.reason);
  });
} else {
  const { client, config } = loaded;
  const prefix = runPrefix();
  const repoName = `${prefix}-repo`;

  async function expectHead(sha: string): Promise<void> {
    let saw = "";
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const current = await client.head(repoName);
      if (!current.ok || !("sha" in current)) stop("head", current);
      saw = current.sha;
      if (saw === sha) return;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    expect(saw).toBe(sha);
  }

  afterAll(async () => {
    await cleanupRepos(prefix);
  }, 180_000);

  it("creates, protects, commits, and reads a repository", async () => {
    const created = await client.createRepo(repoName);
    if (!created.ok || created.result !== "created") stop("createRepo", created);
    expect(created.visibility).toBe(config.visibility);
    expect(created.id).toBeGreaterThan(0);
    expect(created.fullName).toContain(repoName);
    expect(created.url).toContain(repoName);

    const guard = await client.protection(repoName);
    if (!guard.ok) stop("protection", guard);
    expect(guard.forbidsForcePushes).toBe(true);
    expect(guard.forbidsDeletion).toBe(true);

    const again = await client.createRepo(repoName);
    if (!again.ok || again.result !== "exists") stop("createRepo again", again);
    expect(again.id).toBe(created.id);
    expect(again.fullName).toContain(repoName);
    expect(again.url).toContain(repoName);

    const base = await client.head(repoName);
    if (!base.ok || !("sha" in base)) stop("head", base);

    const added = await client.writeCommit(
      repoName,
      base.sha,
      [
        { path: "prd/goals.md", content: "goals\n" },
        { path: "prd/extra.md", content: "extra\n" },
      ],
      "Add two section files",
    );
    if (!added.ok) stop("writeCommit", added);
    expect(await client.advance(repoName, added.sha)).toEqual({ ok: true, result: "advanced" });
    await expectHead(added.sha);

    const side = await client.writeCommit(
      repoName,
      base.sha,
      [{ path: "prd/goals.md", content: "side\n" }],
      "Write beside main",
    );
    if (!side.ok) stop("side write", side);
    const rejected = await client.advance(repoName, side.sha);
    expect(rejected.ok && rejected.result).toBe("rejected");
    await expectHead(added.sha);

    const removed = await client.writeCommit(
      repoName,
      added.sha,
      [
        { path: "prd/extra.md", content: null },
        { path: "prd/goals.md", content: "goals kept\n" },
      ],
      "Remove a section file",
    );
    if (!removed.ok) stop("remove write", removed);
    expect(await client.advance(repoName, removed.sha)).toEqual({ ok: true, result: "advanced" });

    const tree = await client.prdTree(repoName, removed.sha);
    if (!tree.ok) stop("prdTree", tree);
    expect(tree.files.map((file) => file.path).sort()).toEqual(["prd/goals.md"]);
    const blobs = await client.readBlobs(
      repoName,
      tree.files.map((file) => file.sha),
    );
    if (!blobs.ok) stop("readBlobs", blobs);
    expect(blobs.blobs).toEqual([{ sha: tree.files[0]?.sha, text: "goals kept\n" }]);

    const since = await client.commitsSince(repoName, base.sha, removed.sha);
    if (!since.ok || since.result !== "commits") stop("commitsSince", since);
    expect(
      since.commits.map((commit) => ({
        sha: commit.sha,
        parents: commit.parents,
        message: commit.message,
      })),
    ).toEqual([
      { sha: added.sha, parents: [base.sha], message: "Add two section files" },
      { sha: removed.sha, parents: [added.sha], message: "Remove a section file" },
    ]);
    expect(
      since.commits.every(
        (commit) => commit.committerLogin === null || typeof commit.committerLogin === "string",
      ),
    ).toBe(true);
    expect(await client.commitsSince(repoName, added.sha, side.sha)).toEqual({
      ok: true,
      result: "diverged",
    });

    expect(await client.tag(repoName, "prd-close", removed.sha)).toEqual({
      ok: true,
      result: "tagged",
    });
    expect(await client.tag(repoName, "prd-close", removed.sha)).toEqual({
      ok: true,
      result: "tagged",
    });
    expect(await client.tag(repoName, "prd-close", side.sha)).toEqual({
      ok: true,
      result: "conflict",
      sha: removed.sha,
    });

    const section: SectionFile = {
      key: "Who Uses It",
      title: "Who uses it",
      document: {
        statements: [
          {
            text: "Staff keep a shared list.\nThe list is the whole tool.",
            sources: ["Discovery revision 1", "notes.pdf"],
          },
        ],
        decisions: [{ id: "keep" }],
        technicalScope: fixtureScope(),
      },
    };
    const written = await client.writeCommit(
      repoName,
      removed.sha,
      [{ path: sectionPath(section.key), content: renderSection(section) }],
      "Write a rendered section",
    );
    if (!written.ok) stop("rendered write", written);
    expect(await client.advance(repoName, written.sha)).toEqual({ ok: true, result: "advanced" });
    const renderedTree = await client.prdTree(repoName, written.sha);
    if (!renderedTree.ok) stop("rendered tree", renderedTree);
    const match = renderedTree.files.find((file) => file.path === "prd/who-uses-it.md");
    if (match === undefined) stop("rendered path", renderedTree.files);
    const renderedBlobs = await client.readBlobs(repoName, [match.sha]);
    if (!renderedBlobs.ok) stop("rendered blobs", renderedBlobs);
    expect(parseSection(renderedBlobs.blobs[0]?.text ?? "")).toEqual({ ok: true, file: section });
  }, 180_000);

  it("returns uncertain when the request cannot be sent", async () => {
    const offline = githubRepo(config, () => {
      throw new Error("network down");
    });
    const result = await offline.advance(repoName, "a".repeat(40));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("uncertain");
      expect(result.reason).toContain("network down");
    }
  });
}
