import { expect, it } from "vitest";
import type { GithubCommit, GithubRepo } from "../../../supabase/functions/_shared/github/repo.ts";
import { renderSection } from "../../../supabase/functions/_shared/prd/file.ts";
import { commitTurn, type GitDeps } from "../../../supabase/functions/_shared/prd/git.ts";
import type { SettleDatabase } from "../../../supabase/functions/_shared/write-routes.ts";

const PROJECT = "55555555-5555-4555-8555-555555555555";
const GRANT = "44444444-4444-4444-8444-444444444444";
const TURN = "33333333-3333-4333-8333-333333333333";
const REPO = "harbor-prd";
const BASE = "1".padStart(40, "0");
const OTHER = "2".padStart(40, "0");
const SEEDED = "9".padStart(40, "0");
const DOCUMENT = {
  statements: [{ text: "Volunteers book themselves.", sources: ["Discovery revision 1"] }],
  decisions: [] as unknown[],
};
const SECTION = {
  key: "booking",
  title: "Who books shifts",
  path: "prd/booking.md",
  document: DOCUMENT,
};

type Advance = "advanced" | "rejected" | "uncertain" | "uncertain-land" | "uncertain-move";
type Seed = "prepared" | "written" | "published" | "finalized";

function hex(n: number): string {
  return n.toString(16).padStart(40, "0");
}

function drive(script: { seed?: Seed; plans?: Array<"ok" | "stale">; advances?: Advance[]; stale?: unknown } = {}) {
  const calls: string[] = [];
  const writes: { parent: string; message: string; files: { path: string; content: string | null }[] }[] = [];
  const advances: { sha: string; landed: boolean }[] = [];
  const landed = new Set<string>();
  const commits = new Map<string, GithubCommit>();
  commits.set(OTHER, { sha: OTHER, parents: [BASE], committerLogin: "someone", message: `PRD-Turn: ${TURN}` });
  let githubHead = BASE;
  let dbHead = BASE;
  let nextSha = 11;
  let opCount = 0;
  let op: { id: string; status: string; base: string; sha: string | null; attempt: number } | null = null;
  if (script.seed !== undefined) {
    op = {
      id: "00000000-0000-4000-8000-000000000099",
      status: script.seed,
      base: BASE,
      sha: script.seed === "prepared" ? null : SEEDED,
      attempt: 1,
    };
    if (script.seed !== "prepared") {
      commits.set(SEEDED, { sha: SEEDED, parents: [BASE], committerLogin: null, message: "earlier" });
    }
  }
  const plans = [...(script.plans ?? [])];
  const advanceQueue = [...(script.advances ?? [])];
  const staleSections = script.stale ?? [{ key: "booking" }];

  function refusal(detail: string, hint: Record<string, unknown>) {
    return { ok: false as const, message: "database text", details: detail, hint: JSON.stringify(hint) };
  }

  const rpc: SettleDatabase = async (name, args) => {
    calls.push(name);
    if (name === "commit_prepare") {
      if (op !== null && op.status === "finalized") {
        return refusal("turn-committed", { turn: TURN, repo: REPO, sha: op.sha, status: "finalized" });
      }
      if (op !== null && op.status !== "failed") {
        const detail =
          op.status === "prepared"
            ? "attempt-prepared"
            : op.status === "written"
              ? "attempt-written"
              : "attempt-published";
        return refusal(detail, {
          op: op.id,
          status: op.status,
          base: op.base,
          sha: op.sha,
          turn: TURN,
          repo: REPO,
          attempt: op.attempt,
        });
      }
      if ((plans.shift() ?? "ok") === "stale") {
        return { ok: true, value: { ok: false, reason: "stale", sections: staleSections } };
      }
      opCount += 1;
      op = {
        id: `00000000-0000-4000-8000-${String(opCount).padStart(12, "0")}`,
        status: "prepared",
        base: dbHead,
        sha: null,
        attempt: (op?.attempt ?? 0) + 1,
      };
      return {
        ok: true,
        value: {
          ok: true,
          op: op.id,
          attempt: op.attempt,
          base: op.base,
          turn: TURN,
          repo: REPO,
          sections: [SECTION],
          effects: [],
        },
      };
    }
    if (name === "prd_git_op_written") {
      if (op === null || op.id !== args.p_op) return { ok: false, message: "missing", details: "invalid-request" };
      op.sha = String(args.p_sha).toLowerCase();
      op.base = String(args.p_base).toLowerCase();
      op.status = "written";
      return { ok: true, value: op.sha };
    }
    if (name === "prd_git_op_fail") {
      if (op === null || op.id !== args.p_op) return { ok: false, message: "missing", details: "invalid-request" };
      if (op.status === "published" || op.status === "finalized") {
        return { ok: false, message: "kept", details: "invalid-request" };
      }
      op.status = "failed";
      return { ok: true, value: null };
    }
    if (name === "prd_git_sync_state") {
      return {
        ok: true,
        value: { state: "open", repoName: REPO, repoId: 1, headCommit: dbHead, sections: [] },
      };
    }
    if (name === "prd_reconcile") {
      if (String(args.p_expected_head).toLowerCase() !== dbHead) return { ok: true, value: { stale: true } };
      const list = Array.isArray(args.p_commits) ? args.p_commits : [];
      for (const commit of list) {
        if (typeof commit !== "object" || commit === null) continue;
        const sha = String((commit as { sha?: unknown }).sha).toLowerCase();
        if (sha === dbHead) continue;
        if (op !== null && op.sha === sha && (op.status === "written" || op.status === "published")) {
          op.status = "finalized";
        }
        dbHead = sha;
      }
      return { ok: true, value: { stale: false } };
    }
    throw new Error(`unexpected rpc ${name}`);
  };

  const github = {
    async head() {
      calls.push("head");
      return { ok: true as const, sha: githubHead };
    },
    async writeCommit(_repo: string, parent: string, files: { path: string; content: string | null }[], message: string) {
      calls.push("writeCommit");
      const sha = hex(nextSha);
      nextSha += 1;
      commits.set(sha, { sha, parents: [parent], committerLogin: null, message });
      writes.push({ parent, message, files });
      return { ok: true as const, sha };
    },
    async advance(_repo: string, sha: string) {
      calls.push("advance");
      if (landed.has(sha.toLowerCase())) throw new Error(`advanced ${sha} after it landed`);
      const behavior = advanceQueue.shift() ?? "advanced";
      const lands = behavior === "advanced" || behavior === "uncertain-land";
      advances.push({ sha, landed: lands });
      if (lands) {
        githubHead = sha;
        landed.add(sha.toLowerCase());
      }
      if (behavior === "rejected" || behavior === "uncertain-move") githubHead = OTHER;
      if (behavior === "uncertain" || behavior === "uncertain-land" || behavior === "uncertain-move") {
        return { ok: false as const, kind: "uncertain" as const, reason: "the branch move was not confirmed" };
      }
      if (behavior === "rejected") return { ok: true as const, result: "rejected" as const, reason: "not a fast-forward" };
      return { ok: true as const, result: "advanced" as const };
    },
    async commitsSince(_repo: string, from: string, to: string) {
      calls.push("commitsSince");
      if (from.toLowerCase() === to.toLowerCase()) return { ok: true as const, result: "commits" as const, commits: [] };
      const found: GithubCommit[] = [];
      let cursor = to.toLowerCase();
      const seen = new Set<string>();
      while (cursor !== from.toLowerCase()) {
        if (seen.has(cursor)) return { ok: true as const, result: "diverged" as const };
        seen.add(cursor);
        const commit = commits.get(cursor);
        if (commit === undefined || commit.parents[0] === undefined) {
          return { ok: true as const, result: "diverged" as const };
        }
        found.push(commit);
        cursor = commit.parents[0].toLowerCase();
      }
      found.reverse();
      return { ok: true as const, result: "commits" as const, commits: found };
    },
    async prdTree() {
      calls.push("prdTree");
      return { ok: true as const, files: [] };
    },
    async readBlobs() {
      throw new Error("readBlobs");
    },
    async createRepo() {
      throw new Error("createRepo");
    },
    async protection() {
      throw new Error("protection");
    },
    async readCommit() {
      throw new Error("readCommit");
    },
    async tag() {
      throw new Error("tag");
    },
  } as GithubRepo;

  const deps: GitDeps = { github, rpc };
  return {
    calls,
    writes,
    advances,
    run: () => commitTurn(PROJECT, GRANT, deps),
  };
}

const HAPPY = [
  "commit_prepare",
  "writeCommit",
  "prd_git_op_written",
  "advance",
  "prd_git_sync_state",
  "head",
  "commitsSince",
  "prdTree",
  "prdTree",
  "prd_reconcile",
];

it("advances a prepared turn and syncs that sha once", async () => {
  const world = drive();
  const result = await world.run();
  expect(world.calls).toEqual(HAPPY);
  const sha = world.advances[0]?.sha;
  expect(result).toEqual({ ok: true, result: "committed", sha });
  expect(world.writes).toHaveLength(1);
  expect(world.writes[0]?.parent).toBe(BASE);
  expect(world.writes[0]?.message).toBe(`Update the PRD\n\nPRD-Turn: ${TURN}\n`);
  expect(world.writes[0]?.files).toEqual([
    { path: SECTION.path, content: renderSection({ key: SECTION.key, title: SECTION.title, document: DOCUMENT }) },
  ]);
  expect(world.advances).toEqual([{ sha, landed: true }]);
});

it("commits on the second round after a rejected advance", async () => {
  const world = drive({ advances: ["rejected", "advanced"] });
  const result = await world.run();
  expect(world.calls).toEqual([
    ...HAPPY.slice(0, 4),
    "prd_git_op_fail",
    "prd_git_sync_state",
    "head",
    "commitsSince",
    "prdTree",
    "prdTree",
    "prd_reconcile",
    ...HAPPY,
  ]);
  expect(world.writes[1]?.parent).toBe(OTHER);
  expect(result).toEqual({ ok: true, result: "committed", sha: world.advances[1]?.sha });
  expect(result).not.toEqual({ ok: true, result: "committed", sha: OTHER });
  expect(world.advances.filter((item) => item.landed)).toEqual([{ sha: world.advances[1]?.sha, landed: true }]);
});

it("returns the current sections when the second prepare is stale", async () => {
  const sections = [{ key: "booking", title: "Who books shifts" }];
  const world = drive({ advances: ["rejected"], plans: ["ok", "stale"], stale: sections });
  const result = await world.run();
  expect(world.writes).toHaveLength(1);
  expect(world.calls.filter((call) => call === "writeCommit")).toHaveLength(1);
  expect(result).toEqual({ ok: true, result: "stale", sections });
});

it("returns committed when an uncertain advance has already landed", async () => {
  const world = drive({ advances: ["uncertain-land"] });
  const result = await world.run();
  expect(world.calls).toEqual([...HAPPY, "commit_prepare"]);
  const sha = world.advances[0]?.sha;
  expect(result).toEqual({ ok: true, result: "committed", sha });
  expect(world.advances).toEqual([{ sha, landed: true }]);
});

it("advances the same sha again when main is still the base", async () => {
  const world = drive({ advances: ["uncertain", "advanced"] });
  const result = await world.run();
  expect(world.calls).toEqual([
    "commit_prepare",
    "writeCommit",
    "prd_git_op_written",
    "advance",
    "prd_git_sync_state",
    "head",
    "prd_reconcile",
    "commit_prepare",
    "head",
    "advance",
    "prd_git_sync_state",
    "head",
    "commitsSince",
    "prdTree",
    "prdTree",
    "prd_reconcile",
  ]);
  const sha = world.writes[0] ? world.advances[0]?.sha : "";
  expect(world.advances.map((item) => item.sha)).toEqual([sha, sha]);
  expect(world.advances.filter((item) => item.landed)).toHaveLength(1);
  expect(result).toEqual({ ok: true, result: "committed", sha });
});

it("fails the attempt and prepares again when main moved during an uncertain advance", async () => {
  const world = drive({ advances: ["uncertain-move", "advanced"] });
  const result = await world.run();
  expect(world.calls).toEqual([
    "commit_prepare",
    "writeCommit",
    "prd_git_op_written",
    "advance",
    "prd_git_sync_state",
    "head",
    "commitsSince",
    "prdTree",
    "prdTree",
    "prd_reconcile",
    "commit_prepare",
    "head",
    "prd_git_op_fail",
    "commit_prepare",
    "writeCommit",
    "prd_git_op_written",
    "advance",
    "prd_git_sync_state",
    "head",
    "commitsSince",
    "prdTree",
    "prdTree",
    "prd_reconcile",
  ]);
  expect(world.writes[1]?.parent).toBe(OTHER);
  expect(result).toEqual({ ok: true, result: "committed", sha: world.advances[1]?.sha });
  expect(world.advances[0]?.landed).toBe(false);
  expect(world.advances[1]?.landed).toBe(true);
});

it("fails a prepared attempt left by an earlier call and prepares again", async () => {
  const world = drive({ seed: "prepared" });
  const result = await world.run();
  expect(world.calls.slice(0, 4)).toEqual(["commit_prepare", "prd_git_op_fail", "commit_prepare", "writeCommit"]);
  expect(result).toEqual({ ok: true, result: "committed", sha: world.advances[0]?.sha });
});

it("syncs a written attempt before advancing its sha", async () => {
  const world = drive({ seed: "written" });
  const result = await world.run();
  expect(world.calls).toEqual([
    "commit_prepare",
    "prd_git_sync_state",
    "head",
    "prd_reconcile",
    "commit_prepare",
    "head",
    "advance",
    "prd_git_sync_state",
    "head",
    "commitsSince",
    "prdTree",
    "prdTree",
    "prd_reconcile",
  ]);
  expect(world.writes).toHaveLength(0);
  expect(world.advances).toEqual([{ sha: SEEDED, landed: true }]);
  expect(result).toEqual({ ok: true, result: "committed", sha: SEEDED });
});

it("returns the committed sha when the turn is already committed", async () => {
  const world = drive({ seed: "finalized" });
  const result = await world.run();
  expect(world.calls).toEqual(["commit_prepare"]);
  expect(world.writes).toHaveLength(0);
  expect(world.advances).toHaveLength(0);
  expect(result).toEqual({ ok: true, result: "committed", sha: SEEDED });
});
