import { githubConfig, type GithubFetch } from "../github/app.ts";
import { githubRepo, type GithubCommit, type GithubRepo } from "../github/repo.ts";
import type { SettleActResult, SettleDatabase } from "../write-routes.ts";
import { parseSection, parseSectionDocument, renderSection, type SectionDocument } from "./file.ts";
import type { PrdOpenArgs } from "./routes.ts";

export const OPEN_STEPS = ["create", "bind", "write", "register", "advance"] as const;
export type OpenStep = (typeof OPEN_STEPS)[number];

export type OpenSection = {
  key: string;
  title: string;
  path: string;
  document: SectionDocument;
};

export type OpenOperation = {
  projectId: string;
  id: string;
  repoName: string;
  repoId: number | null;
  baseCommit: string | null;
  commitSha: string | null;
  status: string;
  sections: OpenSection[];
};

export type GitDeps = {
  github: GithubRepo;
  rpc: SettleDatabase;
};

export type PublishResult =
  | { ok: true; sha: string | null; known?: string }
  | { ok: false; reason: string };

type SyncState = {
  state: string;
  repoName: string;
  repoId: number | null;
  repoUrl: string | null;
  headCommit: string | null;
  opId: string | null;
  baseCommit: string | null;
  commitSha: string | null;
  status: string | null;
  sections: OpenSection[];
};

type FileChange = {
  path: string;
  change: "added" | "modified" | "removed";
  blobSha?: string;
  file?:
    | { variant: "readable"; key: string; title: string; document: SectionDocument }
    | { variant: "unreadable"; raw: string; error: string };
};

const SHA = /^[0-9a-f]{40}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function shaOf(value: unknown): string | null {
  return typeof value === "string" && SHA.test(value) ? value.toLowerCase() : null;
}

function repoIdOf(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

function sectionsOf(value: unknown): OpenSection[] | null {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const sections: OpenSection[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const key = text(entry.key);
    const title = text(entry.title);
    const path = text(entry.path);
    if (key === null || title === null || path === null) return null;
    const document = parseSectionDocument(entry.document);
    if (!document.ok) return null;
    sections.push({ key, title, path, document: document.document });
  }
  return sections;
}

export function parseOpenOperation(value: unknown): OpenOperation | null {
  if (!isRecord(value)) return null;
  const projectId = text(value.projectId);
  const id = text(value.id);
  const repoName = text(value.repoName);
  const status = text(value.status);
  if (
    projectId === null ||
    !UUID.test(projectId) ||
    id === null ||
    !UUID.test(id) ||
    repoName === null ||
    status === null
  ) {
    return null;
  }
  const repoId = repoIdOf(value.repoId);
  if (repoId === undefined) return null;
  const baseCommit =
    value.baseCommit === null || value.baseCommit === undefined ? null : shaOf(value.baseCommit);
  const commitSha =
    value.commitSha === null || value.commitSha === undefined ? null : shaOf(value.commitSha);
  if ((value.baseCommit !== null && value.baseCommit !== undefined && baseCommit === null) ||
      (value.commitSha !== null && value.commitSha !== undefined && commitSha === null)) {
    return null;
  }
  const sections = sectionsOf(value.sections);
  if (sections === null) return null;
  return { projectId, id, repoName, repoId, baseCommit, commitSha, status, sections };
}

function runs(through: OpenStep | undefined, step: OpenStep): boolean {
  if (through === undefined) return true;
  return OPEN_STEPS.indexOf(step) <= OPEN_STEPS.indexOf(through);
}

async function called(
  deps: GitDeps,
  name: string,
  args: Record<string, unknown>,
): Promise<{ ok: true; value: unknown } | { ok: false; reason: string }> {
  const call = deps.rpc;
  const result = await call(name, args);
  if (!result.ok) return { ok: false, reason: result.message };
  return { ok: true, value: result.value };
}

async function loadState(
  project: string,
  deps: GitDeps,
): Promise<({ ok: true } & SyncState) | { ok: false; reason: string }> {
  const loaded = await called(deps, "prd_git_sync_state", { p_project: project });
  if (!loaded.ok) return loaded;
  if (!isRecord(loaded.value)) return { ok: false, reason: "the PRD record could not be read" };
  const state = text(loaded.value.state);
  const repoName = text(loaded.value.repoName);
  if (state === null || repoName === null) {
    return { ok: false, reason: "the PRD record could not be read" };
  }
  const repoId = repoIdOf(loaded.value.repoId);
  if (repoId === undefined) return { ok: false, reason: "the PRD record could not be read" };
  const headCommit =
    loaded.value.headCommit === null || loaded.value.headCommit === undefined
      ? null
      : shaOf(loaded.value.headCommit);
  if (
    loaded.value.headCommit !== null &&
    loaded.value.headCommit !== undefined &&
    headCommit === null
  ) {
    return { ok: false, reason: "the PRD record could not be read" };
  }
  const baseCommit =
    loaded.value.baseCommit === null || loaded.value.baseCommit === undefined
      ? null
      : shaOf(loaded.value.baseCommit);
  const commitSha =
    loaded.value.commitSha === null || loaded.value.commitSha === undefined
      ? null
      : shaOf(loaded.value.commitSha);
  const sections = sectionsOf(loaded.value.sections);
  if (sections === null) return { ok: false, reason: "the opening operation could not be read" };
  const opId =
    loaded.value.opId === null || loaded.value.opId === undefined ? null : text(loaded.value.opId);
  return {
    ok: true,
    state,
    repoName,
    repoId,
    repoUrl: typeof loaded.value.repoUrl === "string" ? loaded.value.repoUrl : null,
    headCommit,
    opId,
    baseCommit,
    commitSha,
    status: typeof loaded.value.status === "string" ? loaded.value.status : null,
    sections,
  };
}

function rendered(
  sections: readonly OpenSection[],
): { ok: true; files: { path: string; content: string }[] } | { ok: false; reason: string } {
  const files: { path: string; content: string }[] = [];
  for (const section of sections) {
    files.push({
      path: section.path,
      content: renderSection({
        key: section.key,
        title: section.title,
        document: section.document,
      }),
    });
  }
  return { ok: true, files };
}

async function reusableRoot(
  github: GithubRepo,
  repo: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const head = await github.head(repo);
  if (!head.ok) return { ok: false, reason: head.reason };
  if ("missing" in head) return { ok: false, reason: "the existing repository has no main branch" };
  const commit = await github.readCommit(repo, head.sha);
  if (!commit.ok) return { ok: false, reason: commit.reason };
  if (commit.parents.length !== 0) {
    return { ok: false, reason: "the existing repository is not an empty project repository" };
  }
  const tree = await github.prdTree(repo, head.sha);
  if (!tree.ok) return { ok: false, reason: tree.reason };
  if (tree.files.length !== 0) {
    return { ok: false, reason: "the existing repository already has prd files" };
  }
  return { ok: true };
}

async function onMain(
  github: GithubRepo,
  repo: string,
  sha: string,
): Promise<{ ok: true; on: boolean; head: string | null } | { ok: false; reason: string }> {
  const head = await github.head(repo);
  if (!head.ok) return { ok: false, reason: head.reason };
  if ("missing" in head) return { ok: true, on: false, head: null };
  if (head.sha === sha) return { ok: true, on: true, head: head.sha };
  const range = await github.commitsSince(repo, sha, head.sha);
  if (!range.ok) return { ok: false, reason: range.reason };
  return { ok: true, on: range.result === "commits", head: head.sha };
}

async function diffPrd(
  github: GithubRepo,
  repo: string,
  commit: GithubCommit,
): Promise<{ ok: true; changes: FileChange[] } | { ok: false; reason: string }> {
  const next = await github.prdTree(repo, commit.sha);
  if (!next.ok) return { ok: false, reason: next.reason };
  let previous: { path: string; sha: string }[] = [];
  const parent = commit.parents[0];
  if (parent !== undefined) {
    const prior = await github.prdTree(repo, parent);
    if (!prior.ok) return { ok: false, reason: prior.reason };
    previous = prior.files;
  }
  const before = new Map(previous.map((file) => [file.path, file.sha]));
  const after = new Map(next.files.map((file) => [file.path, file.sha]));
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort();
  const pending: FileChange[] = [];
  const needed: string[] = [];
  for (const path of paths) {
    const oldSha = before.get(path);
    const newSha = after.get(path);
    if (oldSha === newSha) continue;
    if (newSha === undefined) {
      pending.push({ path, change: "removed" });
      continue;
    }
    pending.push({ path, change: oldSha === undefined ? "added" : "modified", blobSha: newSha });
    needed.push(newSha);
  }
  if (needed.length > 0) {
    const blobs = await github.readBlobs(repo, needed);
    if (!blobs.ok) return { ok: false, reason: blobs.reason };
    const textOf = new Map(blobs.blobs.map((blob) => [blob.sha, blob.text]));
    for (const change of pending) {
      if (change.blobSha === undefined) continue;
      const raw = textOf.get(change.blobSha);
      if (raw === undefined) return { ok: false, reason: "a changed prd file had no blob text" };
      const parsed = parseSection(raw);
      change.file = parsed.ok
        ? {
            variant: "readable",
            key: parsed.file.key,
            title: parsed.file.title,
            document: parsed.file.document,
          }
        : { variant: "unreadable", raw, error: parsed.reason };
    }
  }
  return { ok: true, changes: pending };
}

async function syncOnce(
  project: string,
  deps: GitDeps,
  known: string | undefined,
): Promise<{ ok: true; stale: boolean } | { ok: false; reason: string }> {
  const state = await loadState(project, deps);
  if (!state.ok) return state;
  if (state.state === "diverged") {
    return { ok: false, reason: "the repository diverged and an operator has to repair it" };
  }
  if (state.repoId === null) return { ok: false, reason: "the repository is not bound" };
  if (state.headCommit === null) return { ok: false, reason: "the read copy has no commit" };
  const head = await deps.github.head(state.repoName);
  if (!head.ok) return { ok: false, reason: head.reason };
  if ("missing" in head) return { ok: false, reason: "main is not a branch" };
  let end = head.sha;
  if (known !== undefined && known !== end) {
    // GitHub's read of a branch can lag the move advance just confirmed.
    const between = await deps.github.commitsSince(state.repoName, known, end);
    if (!between.ok) return { ok: false, reason: between.reason };
    if (between.result !== "commits") end = known;
  }
  let commits: Record<string, unknown>[] = [];
  if (state.headCommit !== end) {
    const range = await deps.github.commitsSince(state.repoName, state.headCommit, end);
    if (!range.ok) return { ok: false, reason: range.reason };
    if (range.result === "diverged") {
      const marked = await called(deps, "prd_mark_diverged", {
        p_project: project,
        p_reason: "the repository left the fast-forward line",
      });
      if (!marked.ok) return marked;
      return { ok: false, reason: "the repository diverged and an operator has to repair it" };
    }
    for (const commit of range.commits) {
      const changes = await diffPrd(deps.github, state.repoName, commit);
      if (!changes.ok) return changes;
      commits.push({
        sha: commit.sha,
        parents: commit.parents,
        login: commit.committerLogin,
        message: commit.message,
        changes: changes.changes,
      });
    }
  }
  const reconciled = await called(deps, "prd_reconcile", {
    p_project: project,
    p_expected_head: state.headCommit,
    p_commits: commits,
  });
  if (!reconciled.ok) return reconciled;
  const stale = isRecord(reconciled.value) && reconciled.value.stale === true;
  return { ok: true, stale };
}

export async function syncRepo(
  project: string,
  deps: GitDeps,
  known?: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const once = await syncOnce(project, deps, known);
    if (!once.ok) return once;
    if (!once.stale) return { ok: true };
  }
  return { ok: false, reason: "the read copy changed while syncing" };
}

function settledOpen(state: SyncState): PublishResult | null {
  if (state.state === "pending") return null;
  if (state.headCommit === null) return { ok: true, sha: null };
  return { ok: true, sha: state.headCommit, known: state.headCommit };
}

async function markPublished(
  deps: GitDeps,
  opId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const marked = await called(deps, "prd_git_op_published", { p_op: opId });
  if (!marked.ok) return marked;
  return { ok: true };
}

export async function publishOpen(
  op: OpenOperation,
  deps: GitDeps,
  through?: OpenStep,
): Promise<PublishResult> {
  const project = op.projectId;
  let identity: { id: number; url: string } | null = null;
  let pending: { base: string; sha: string } | null = null;

  if (runs(through, "create")) {
    const state = await loadState(project, deps);
    if (!state.ok) return state;
    const settled = settledOpen(state);
    if (settled) return settled;
    if (state.repoId === null) {
      const made = await deps.github.createRepo(state.repoName);
      if (!made.ok) return { ok: false, reason: made.reason };
      if (made.result === "exists") {
        const again = await loadState(project, deps);
        if (!again.ok) return again;
        const settledAgain = settledOpen(again);
        if (settledAgain) return settledAgain;
        if (again.repoId !== null && again.repoId !== made.id) {
          return { ok: false, reason: "the existing repository is not the one bound to this PRD" };
        }
        if (again.repoId === null) {
          const reusable = await reusableRoot(deps.github, state.repoName);
          if (!reusable.ok) return reusable;
        }
      }
      identity = { id: made.id, url: made.url };
    }
  }
  if (through === "create") return { ok: true, sha: null };

  if (runs(through, "bind")) {
    const state = await loadState(project, deps);
    if (!state.ok) return state;
    const settled = settledOpen(state);
    if (settled) return settled;
    if (state.repoId === null) {
      if (identity === null) return { ok: false, reason: "the repository was not created" };
      const bound = await called(deps, "prd_git_bind_repo", {
        p_project: project,
        p_repo_id: identity.id,
        p_repo_url: identity.url,
      });
      if (!bound.ok) return bound;
    }
  }
  if (through === "bind") return { ok: true, sha: null };

  if (runs(through, "write")) {
    const state = await loadState(project, deps);
    if (!state.ok) return state;
    const settled = settledOpen(state);
    if (settled) return settled;
    if (state.commitSha === null && state.status !== "published" && state.status !== "finalized") {
      const head = await deps.github.head(state.repoName);
      if (!head.ok) return { ok: false, reason: head.reason };
      if ("missing" in head) return { ok: false, reason: "main is not a branch" };
      const files = rendered(state.sections);
      if (!files.ok) return files;
      const written = await deps.github.writeCommit(
        state.repoName,
        head.sha,
        files.files,
        "Open the PRD",
      );
      if (!written.ok) return { ok: false, reason: written.reason };
      pending = { base: head.sha, sha: written.sha };
    }
  }
  if (through === "write") return { ok: true, sha: null };

  if (runs(through, "register")) {
    const state = await loadState(project, deps);
    if (!state.ok) return state;
    const settled = settledOpen(state);
    if (settled) return settled;
    if (state.commitSha === null) {
      if (pending === null || state.opId === null) {
        return { ok: false, reason: "the opening commit was not written" };
      }
      const registered = await called(deps, "prd_git_op_written", {
        p_op: state.opId,
        p_base: pending.base,
        p_sha: pending.sha,
      });
      if (!registered.ok) return registered;
    }
  }
  if (through === "register") return { ok: true, sha: null };

  const state = await loadState(project, deps);
  if (!state.ok) return state;
  const settled = settledOpen(state);
  if (settled) return settled;
  if (state.status === "published" || state.status === "finalized") {
    return {
      ok: true,
      sha: state.commitSha,
      known: state.status === "published" && state.commitSha !== null ? state.commitSha : undefined,
    };
  }
  if (state.commitSha === null || state.opId === null) {
    return { ok: false, reason: "the opening commit is not registered" };
  }
  const sha = state.commitSha;
  const moved = await deps.github.advance(state.repoName, sha);
  if (!moved.ok && moved.kind === "uncertain") {
    const synced = await syncRepo(project, deps);
    if (!synced.ok) return synced;
    const seen = await onMain(deps.github, state.repoName, sha);
    if (!seen.ok) return seen;
    if (seen.on) {
      const marked = await markPublished(deps, state.opId);
      if (!marked.ok) return marked;
      return { ok: true, sha, known: sha };
    }
    if (seen.head !== null && seen.head === state.baseCommit) {
      const again = await deps.github.advance(state.repoName, sha);
      if (!again.ok) return { ok: false, reason: again.reason };
      if (again.result !== "advanced") return { ok: false, reason: again.reason };
      const marked = await markPublished(deps, state.opId);
      if (!marked.ok) return marked;
      return { ok: true, sha, known: sha };
    }
    return { ok: false, reason: moved.reason };
  }
  if (!moved.ok) return { ok: false, reason: moved.reason };
  if (moved.result === "rejected") {
    const synced = await syncRepo(project, deps);
    if (!synced.ok) return synced;
    const seen = await onMain(deps.github, state.repoName, sha);
    if (!seen.ok) return seen;
    if (seen.on) {
      const marked = await markPublished(deps, state.opId);
      if (!marked.ok) return marked;
      return { ok: true, sha, known: sha };
    }
    if (seen.head === null) return { ok: false, reason: "main is not a branch" };
    const fresh = await loadState(project, deps);
    if (!fresh.ok) return fresh;
    if (fresh.opId === null) return { ok: false, reason: "the opening operation is missing" };
    const files = rendered(fresh.sections);
    if (!files.ok) return files;
    const rewritten = await deps.github.writeCommit(
      fresh.repoName,
      seen.head,
      files.files,
      "Open the PRD",
    );
    if (!rewritten.ok) return { ok: false, reason: rewritten.reason };
    const registered = await called(deps, "prd_git_op_written", {
      p_op: fresh.opId,
      p_base: seen.head,
      p_sha: rewritten.sha,
    });
    if (!registered.ok) return registered;
    const winning = shaOf(registered.value) ?? rewritten.sha;
    const advanced = await deps.github.advance(fresh.repoName, winning);
    if (!advanced.ok) return { ok: false, reason: advanced.reason };
    if (advanced.result !== "advanced") return { ok: false, reason: advanced.reason };
    const marked = await markPublished(deps, fresh.opId);
    if (!marked.ok) return marked;
    return { ok: true, sha: winning, known: winning };
  }
  const marked = await markPublished(deps, state.opId);
  if (!marked.ok) return marked;
  return { ok: true, sha, known: sha };
}

export function openAct(env: Record<string, string | undefined>, fetchImpl: GithubFetch) {
  return async (
    reserved: unknown,
    args: PrdOpenArgs,
    database?: SettleDatabase,
  ): Promise<SettleActResult> => {
    const settle = { p_actor: args.p_actor, p_project: args.p_project };
    if (!isRecord(reserved) || reserved.kind !== "publish") return { args: settle, failure: null };
    const configured = githubConfig(env);
    if (!configured.ok) return { args: null, failure: configured.reason, status: 503 };
    if (database === undefined) {
      return { args: null, failure: "the database call is missing", status: 502 };
    }
    const op = parseOpenOperation(reserved.op);
    if (op === null) {
      return { args: null, failure: "the opening operation could not be read", status: 502 };
    }
    const deps: GitDeps = { github: githubRepo(configured.config, fetchImpl), rpc: database };
    const published = await publishOpen(op, deps);
    if (!published.ok) return { args: null, failure: published.reason, status: 502 };
    const synced = await syncRepo(op.projectId, deps, published.known);
    if (!synced.ok) return { args: null, failure: synced.reason, status: 502 };
    const state = await loadState(op.projectId, deps);
    if (!state.ok) return { args: null, failure: state.reason, status: 502 };
    if (state.state === "pending") {
      return { args: null, failure: "the opening commit is not on main yet", status: 502 };
    }
    if (state.state === "diverged") {
      return {
        args: null,
        failure: "the repository diverged and an operator has to repair it",
        status: 502,
      };
    }
    return { args: settle, failure: null };
  };
}

const COMMIT_ROUNDS = 3;

export type CommitTurnResult =
  | { ok: true; result: "committed"; sha: string }
  | { ok: true; result: "stale"; sections: unknown }
  | { ok: true; result: "busy" }
  | { ok: false; reason: string };

type PreparedCommit = {
  op: string;
  attempt: number;
  base: string;
  turn: string;
  repo: string;
  sections: OpenSection[];
};

type WrittenAttempt = {
  op: string;
  status: "prepared" | "written" | "published";
  base: string;
  sha: string | null;
  turn: string;
  repo: string;
};

type PrepareRead =
  | { kind: "prepared"; prepared: PreparedCommit }
  | { kind: "inflight"; attempt: WrittenAttempt }
  | { kind: "done"; result: CommitTurnResult };

type Flow = { kind: "done"; result: CommitTurnResult } | { kind: "again" };

function done(result: CommitTurnResult): Flow {
  return { kind: "done", result };
}

function again(): Flow {
  return { kind: "again" };
}

function commitFailed(): CommitTurnResult {
  return { ok: false, reason: "commit-failed" };
}

function sameSha(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function commitMessage(turn: string): string {
  return `Update the PRD\n\nPRD-Turn: ${turn}\n`;
}

function hintRecord(value: string | null | undefined): Record<string, unknown> | null {
  if (typeof value !== "string" || value === "") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function whole(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function preparedOf(value: Record<string, unknown>): PreparedCommit | null {
  const op = text(value.op);
  const turn = text(value.turn);
  const repo = text(value.repo);
  const base = shaOf(value.base);
  const attempt = whole(value.attempt);
  if (
    op === null ||
    !UUID.test(op) ||
    turn === null ||
    !UUID.test(turn) ||
    repo === null ||
    base === null ||
    attempt === null
  ) {
    return null;
  }
  const sections = sectionsOf(value.sections);
  if (sections === null) return null;
  return { op, attempt, base, turn, repo, sections };
}

function attemptOf(
  hint: Record<string, unknown> | null,
  detail: "attempt-prepared" | "attempt-written" | "attempt-published",
): WrittenAttempt | null {
  if (hint === null) return null;
  const op = text(hint.op);
  const turn = text(hint.turn);
  const repo = text(hint.repo);
  if (op === null || !UUID.test(op) || turn === null || !UUID.test(turn) || repo === null || whole(hint.attempt) === null) {
    return null;
  }
  const status =
    detail === "attempt-prepared" ? "prepared" : detail === "attempt-written" ? "written" : "published";
  const base = hint.base === null || hint.base === undefined ? null : shaOf(hint.base);
  if ((hint.base !== null && hint.base !== undefined && base === null) || base === null) return null;
  const sha = hint.sha === null || hint.sha === undefined ? null : shaOf(hint.sha);
  if (hint.sha !== null && hint.sha !== undefined && sha === null) return null;
  if (status !== "prepared" && sha === null) return null;
  return { op, status, base, sha, turn, repo };
}

async function asked(deps: GitDeps, name: string, args: Record<string, unknown>) {
  const call = deps.rpc;
  return call(name, args);
}

async function readPrepare(deps: GitDeps, grant: string): Promise<PrepareRead> {
  const result = await asked(deps, "commit_prepare", { p_grant: grant });
  if (result.ok) {
    if (!isRecord(result.value)) return { kind: "done", result: commitFailed() };
    if (result.value.ok === false && result.value.reason === "stale") {
      return { kind: "done", result: { ok: true, result: "stale", sections: result.value.sections ?? [] } };
    }
    if (result.value.ok !== true) return { kind: "done", result: commitFailed() };
    const prepared = preparedOf(result.value);
    if (prepared === null) return { kind: "done", result: commitFailed() };
    return { kind: "prepared", prepared };
  }
  const detail = result.details ?? "";
  const hint = hintRecord(result.hint);
  if (detail === "turn-committed") {
    const sha = hint === null ? null : shaOf(hint.sha);
    if (sha === null) return { kind: "done", result: commitFailed() };
    return { kind: "done", result: { ok: true, result: "committed", sha } };
  }
  if (detail === "attempt-prepared" || detail === "attempt-written" || detail === "attempt-published") {
    const attempt = attemptOf(hint, detail);
    if (attempt === null) return { kind: "done", result: commitFailed() };
    return { kind: "inflight", attempt };
  }
  if (detail !== "") return { kind: "done", result: { ok: false, reason: detail } };
  return { kind: "done", result: commitFailed() };
}

async function failOp(deps: GitDeps, op: string): Promise<boolean> {
  const failed = await asked(deps, "prd_git_op_fail", { p_op: op });
  return failed.ok;
}

async function synced(project: string, deps: GitDeps, known?: string): Promise<boolean> {
  const result = known === undefined ? await syncRepo(project, deps) : await syncRepo(project, deps, known);
  return result.ok;
}

async function mainSha(github: GithubRepo, repo: string): Promise<string | null> {
  const head = await github.head(repo);
  if (!head.ok || "missing" in head) return null;
  return head.sha;
}

async function dropAttempt(
  project: string,
  deps: GitDeps,
  attempt: WrittenAttempt,
  syncAfter: boolean,
): Promise<Flow> {
  if (attempt.status === "published") return done(commitFailed());
  if (!(await failOp(deps, attempt.op))) return done(commitFailed());
  if (syncAfter && !(await synced(project, deps))) return done(commitFailed());
  return again();
}

async function resume(
  project: string,
  grant: string,
  deps: GitDeps,
  attempt: WrittenAttempt,
  allowRetry: boolean,
): Promise<Flow> {
  if (attempt.sha === null) return done(commitFailed());
  if (!(await synced(project, deps))) return done(commitFailed());
  const probe = await readPrepare(deps, grant);
  if (probe.kind === "done") return probe;
  if (probe.kind === "prepared") {
    await failOp(deps, probe.prepared.op);
    return done(commitFailed());
  }
  const head = await mainSha(deps.github, attempt.repo);
  if (head === null) return done(commitFailed());
  if (sameSha(head, attempt.sha)) {
    if (!(await synced(project, deps))) return done(commitFailed());
    const seen = await readPrepare(deps, grant);
    if (seen.kind === "done" && seen.result.ok && seen.result.result === "committed") return seen;
    return done(commitFailed());
  }
  if (sameSha(head, attempt.base)) {
    if (!allowRetry) return done({ ok: true, result: "busy" });
    const moved = await deps.github.advance(attempt.repo, attempt.sha);
    if (!moved.ok && moved.kind === "uncertain") return resume(project, grant, deps, attempt, false);
    return settleAdvance(project, grant, deps, attempt, moved);
  }
  return dropAttempt(project, deps, attempt, false);
}

async function settleAdvance(
  project: string,
  grant: string,
  deps: GitDeps,
  attempt: WrittenAttempt,
  moved: Awaited<ReturnType<GithubRepo["advance"]>>,
): Promise<Flow> {
  if (attempt.sha === null) return done(commitFailed());
  if (!moved.ok) {
    if (moved.kind !== "uncertain") return done(commitFailed());
    return resume(project, grant, deps, attempt, true);
  }
  if (moved.result === "rejected") return dropAttempt(project, deps, attempt, true);
  if (!(await synced(project, deps, attempt.sha))) return done(commitFailed());
  return done({ ok: true, result: "committed", sha: attempt.sha });
}

async function publishPrepared(
  project: string,
  grant: string,
  deps: GitDeps,
  prepared: PreparedCommit,
): Promise<Flow> {
  const files = rendered(prepared.sections);
  if (!files.ok) return done(commitFailed());
  const written = await deps.github.writeCommit(
    prepared.repo,
    prepared.base,
    files.files,
    commitMessage(prepared.turn),
  );
  if (!written.ok) return done(commitFailed());
  const registered = await asked(deps, "prd_git_op_written", {
    p_op: prepared.op,
    p_base: prepared.base,
    p_sha: written.sha,
  });
  if (!registered.ok) return done(commitFailed());
  const sha = shaOf(registered.value) ?? written.sha;
  const attempt: WrittenAttempt = {
    op: prepared.op,
    status: "written",
    base: prepared.base,
    sha,
    turn: prepared.turn,
    repo: prepared.repo,
  };
  return settleAdvance(project, grant, deps, attempt, await deps.github.advance(prepared.repo, sha));
}

/** Commits one turn. The trailer is only a hint; SQL decides what the commit did. */
export async function commitTurn(
  project: string,
  grant: string,
  deps: GitDeps,
): Promise<CommitTurnResult> {
  for (let round = 0; round < COMMIT_ROUNDS; round += 1) {
    const read = await readPrepare(deps, grant);
    if (read.kind === "done") return read.result;
    if (read.kind === "inflight") {
      if (read.attempt.status === "prepared") {
        if (!(await failOp(deps, read.attempt.op))) return commitFailed();
        continue;
      }
      const resumed = await resume(project, grant, deps, read.attempt, true);
      if (resumed.kind === "done") return resumed.result;
      continue;
    }
    const published = await publishPrepared(project, grant, deps, read.prepared);
    if (published.kind === "done") return published.result;
  }
  return { ok: true, result: "busy" };
}
