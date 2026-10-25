import {
  decodeBase64,
  encodeBase64,
  githubApp,
  githubHttp,
  type GithubConfig,
  type GithubFailure,
  type GithubFetch,
  type GithubVisibility,
} from "./app.ts";

export type GithubFile = { path: string; content: string | null };

export type GithubCommit = {
  sha: string;
  parents: string[];
  committerLogin: string | null;
  message: string;
};

type RepoIdentity = {
  id: number;
  fullName: string;
  url: string;
  visibility: GithubVisibility;
};

export type CreateRepoResult =
  | ({ ok: true; result: "created" } & RepoIdentity)
  | ({ ok: true; result: "exists" } & RepoIdentity)
  | GithubFailure;

export type ProtectionResult =
  | { ok: true; forbidsForcePushes: boolean; forbidsDeletion: boolean }
  | GithubFailure;

export type HeadResult = { ok: true; sha: string } | { ok: true; missing: true } | GithubFailure;

export type WriteCommitResult = { ok: true; sha: string } | GithubFailure;

export type AdvanceResult =
  | { ok: true; result: "advanced" }
  | { ok: true; result: "rejected"; reason: string }
  | GithubFailure;

export type CommitsSinceResult =
  | { ok: true; result: "commits"; commits: GithubCommit[] }
  | { ok: true; result: "diverged" }
  | GithubFailure;

export type PrdTreeResult = { ok: true; files: { path: string; sha: string }[] } | GithubFailure;

export type ReadBlobsResult = { ok: true; blobs: { sha: string; text: string }[] } | GithubFailure;

export type TagResult =
  | { ok: true; result: "tagged" }
  | { ok: true; result: "conflict"; sha: string }
  | GithubFailure;

export type GithubRepo = {
  createRepo(name: string): Promise<CreateRepoResult>;
  protection(repo: string): Promise<ProtectionResult>;
  head(repo: string): Promise<HeadResult>;
  writeCommit(
    repo: string,
    parent: string,
    files: GithubFile[],
    message: string,
  ): Promise<WriteCommitResult>;
  advance(repo: string, sha: string): Promise<AdvanceResult>;
  commitsSince(repo: string, from: string, to: string): Promise<CommitsSinceResult>;
  prdTree(repo: string, commit: string): Promise<PrdTreeResult>;
  readBlobs(repo: string, shas: string[]): Promise<ReadBlobsResult>;
  tag(repo: string, name: string, sha: string): Promise<TagResult>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(reason: string): GithubFailure {
  return { ok: false, kind: "invalid", reason };
}

function uncertain(reason: string): GithubFailure {
  return { ok: false, kind: "uncertain", reason };
}

function visibilityOf(value: Record<string, unknown>): GithubVisibility | null {
  if (value.visibility === "public" || value.visibility === "private") return value.visibility;
  if (value.private === true) return "private";
  if (value.private === false) return "public";
  return null;
}

function readRepo(value: unknown): RepoIdentity | null {
  if (!isRecord(value) || typeof value.id !== "number" || !Number.isInteger(value.id)) return null;
  if (typeof value.full_name !== "string" || value.full_name === "") return null;
  if (typeof value.html_url !== "string" || value.html_url === "") return null;
  const visibility = visibilityOf(value);
  if (visibility === null) return null;
  return { id: value.id, fullName: value.full_name, url: value.html_url, visibility };
}

function nameTaken(value: unknown): boolean {
  const parts: string[] = [];
  if (isRecord(value) && typeof value.message === "string") parts.push(value.message);
  if (isRecord(value) && Array.isArray(value.errors)) {
    for (const error of value.errors) {
      if (isRecord(error) && typeof error.message === "string") parts.push(error.message);
    }
  }
  return /name already exists/i.test(parts.join(" "));
}

function shaOf(value: unknown): string | null {
  if (!isRecord(value) || typeof value.sha !== "string" || !/^[0-9a-f]{40}$/i.test(value.sha))
    return null;
  return value.sha;
}

function refSha(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return shaOf(value.object);
}

function commitTree(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return shaOf(value.tree);
}

function enabledFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (isRecord(value) && typeof value.enabled === "boolean") return value.enabled;
  return null;
}

function loginOf(user: unknown): string | null {
  return isRecord(user) && typeof user.login === "string" && user.login !== "" ? user.login : null;
}

function readCommit(value: unknown): GithubCommit | null {
  if (!isRecord(value) || typeof value.sha !== "string") return null;
  if (!isRecord(value.commit) || typeof value.commit.message !== "string") return null;
  if (!Array.isArray(value.parents)) return null;
  const parents: string[] = [];
  for (const parent of value.parents) {
    if (!isRecord(parent) || typeof parent.sha !== "string") return null;
    parents.push(parent.sha);
  }
  const committerLogin = loginOf(value.author) ?? loginOf(value.committer);
  return { sha: value.sha, parents, committerLogin, message: value.commit.message };
}

function readCompare(
  value: unknown,
): { status: string; total: number; commits: GithubCommit[] } | null {
  if (
    !isRecord(value) ||
    typeof value.status !== "string" ||
    typeof value.total_commits !== "number"
  ) {
    return null;
  }
  if (!Array.isArray(value.commits)) return null;
  const commits: GithubCommit[] = [];
  for (const entry of value.commits) {
    const commit = readCommit(entry);
    if (commit === null) return null;
    commits.push(commit);
  }
  return { status: value.status, total: value.total_commits, commits };
}

function blobText(value: unknown): { ok: true; text: string } | { ok: false; reason: string } {
  if (!isRecord(value) || typeof value.content !== "string") {
    return { ok: false, reason: "GitHub returned a blob the client could not read" };
  }
  if (value.encoding === "utf-8") return { ok: true, text: value.content };
  try {
    return {
      ok: true,
      text: new TextDecoder("utf-8", { fatal: true }).decode(decodeBase64(value.content)),
    };
  } catch {
    return { ok: false, reason: "GitHub returned a blob that is not UTF-8 text" };
  }
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function githubRepo(config: GithubConfig, fetchImpl: GithubFetch): GithubRepo {
  const app = githubApp(config);
  const org = encodeURIComponent(config.org);

  async function bearer(): Promise<{ ok: true; token: string } | GithubFailure> {
    return app.installationToken(fetchImpl);
  }

  async function protectMain(token: string, name: string): Promise<{ ok: true } | GithubFailure> {
    const path = `/repos/${org}/${encodeURIComponent(name)}/branches/main/protection`;
    const body = {
      required_status_checks: null,
      enforce_admins: true,
      required_pull_request_reviews: null,
      restrictions: null,
      allow_force_pushes: false,
      allow_deletions: false,
    };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await githubHttp(fetchImpl, token, "PUT", path, body);
      if (response.ok) return { ok: true };
      if (response.status !== 404 || attempt === 4) return response.failure;
      await pause(1000);
    }
    return { ok: false, kind: "not-found", reason: "main is not a branch on the new repository" };
  }

  return {
    async createRepo(name) {
      const auth = await bearer();
      if (!auth.ok) return auth;
      const created = await githubHttp(fetchImpl, auth.token, "POST", `/orgs/${org}/repos`, {
        name,
        auto_init: true,
        visibility: config.visibility,
        private: config.visibility === "private",
      });
      if (!created.ok) {
        if (created.status === 422 && nameTaken(created.value)) {
          const existing = await githubHttp(
            fetchImpl,
            auth.token,
            "GET",
            `/repos/${org}/${encodeURIComponent(name)}`,
          );
          if (!existing.ok) return existing.failure;
          const repo = readRepo(existing.value);
          if (repo === null)
            return invalid("GitHub returned an existing repository the client could not read");
          const protectedExisting = await protectMain(auth.token, name);
          if (!protectedExisting.ok) return protectedExisting;
          return { ok: true, result: "exists", ...repo };
        }
        return created.failure;
      }
      const repo = readRepo(created.value);
      if (repo === null) return uncertain("GitHub created a repository but the response had no id");
      const protectedBranch = await protectMain(auth.token, name);
      if (!protectedBranch.ok) return protectedBranch;
      return { ok: true, result: "created", ...repo };
    },

    async protection(repo) {
      const auth = await bearer();
      if (!auth.ok) return auth;
      const response = await githubHttp(
        fetchImpl,
        auth.token,
        "GET",
        `/repos/${org}/${encodeURIComponent(repo)}/branches/main/protection`,
      );
      if (!response.ok) {
        if (response.status === 404)
          return { ok: true, forbidsForcePushes: false, forbidsDeletion: false };
        return response.failure;
      }
      if (!isRecord(response.value)) return invalid("GitHub branch protection was not an object");
      const force = enabledFlag(response.value.allow_force_pushes);
      const deletion = enabledFlag(response.value.allow_deletions);
      if (force === null || deletion === null) {
        return invalid(
          "GitHub branch protection did not say whether force-pushes and deletion are allowed",
        );
      }
      return { ok: true, forbidsForcePushes: force === false, forbidsDeletion: deletion === false };
    },

    async head(repo) {
      const auth = await bearer();
      if (!auth.ok) return auth;
      const response = await githubHttp(
        fetchImpl,
        auth.token,
        "GET",
        `/repos/${org}/${encodeURIComponent(repo)}/git/ref/heads/main`,
      );
      if (!response.ok) {
        if (response.status === 404) return { ok: true, missing: true };
        return response.failure;
      }
      const sha = refSha(response.value);
      if (sha === null) return uncertain("GitHub did not return the sha of main");
      return { ok: true, sha };
    },

    async writeCommit(repo, parent, files, message) {
      const auth = await bearer();
      if (!auth.ok) return auth;
      const repoPath = encodeURIComponent(repo);
      const parentCommit = await githubHttp(
        fetchImpl,
        auth.token,
        "GET",
        `/repos/${org}/${repoPath}/git/commits/${encodeURIComponent(parent)}`,
      );
      if (!parentCommit.ok) return parentCommit.failure;
      const baseTree = commitTree(parentCommit.value);
      if (baseTree === null) return invalid("the parent commit has no tree");
      const entries: Record<string, unknown>[] = [];
      for (const file of files) {
        if (typeof file.path !== "string" || file.path === "")
          return invalid("a file path is empty");
        if (file.content === null) {
          entries.push({ path: file.path, mode: "100644", type: "blob", sha: null });
          continue;
        }
        if (typeof file.content !== "string")
          return invalid("a file is neither text nor a removal");
        const blob = await githubHttp(
          fetchImpl,
          auth.token,
          "POST",
          `/repos/${org}/${repoPath}/git/blobs`,
          {
            content: encodeBase64(new TextEncoder().encode(file.content)),
            encoding: "base64",
          },
        );
        if (!blob.ok) return blob.failure;
        const blobId = shaOf(blob.value);
        if (blobId === null) return invalid("GitHub created a blob without a sha");
        entries.push({ path: file.path, mode: "100644", type: "blob", sha: blobId });
      }
      const tree = await githubHttp(
        fetchImpl,
        auth.token,
        "POST",
        `/repos/${org}/${repoPath}/git/trees`,
        {
          base_tree: baseTree,
          tree: entries,
        },
      );
      if (!tree.ok) return tree.failure;
      const treeId = shaOf(tree.value);
      if (treeId === null) return invalid("GitHub created a tree without a sha");
      const commit = await githubHttp(
        fetchImpl,
        auth.token,
        "POST",
        `/repos/${org}/${repoPath}/git/commits`,
        {
          message,
          tree: treeId,
          parents: [parent],
        },
      );
      if (!commit.ok) return commit.failure;
      const sha = shaOf(commit.value);
      if (sha === null) return uncertain("GitHub created a commit without a sha");
      return { ok: true, sha };
    },

    async advance(repo, sha) {
      const auth = await bearer();
      if (!auth.ok) return auth;
      const response = await githubHttp(
        fetchImpl,
        auth.token,
        "PATCH",
        `/repos/${org}/${encodeURIComponent(repo)}/git/refs/heads/main`,
        { sha, force: false },
      );
      if (!response.ok) {
        if (response.status === 422 && /fast.forward/i.test(response.failure.reason))
          return { ok: true, result: "rejected", reason: response.failure.reason };
        return response.failure;
      }
      const moved = refSha(response.value);
      if (moved === null) return uncertain("GitHub did not confirm the branch move");
      if (moved !== sha) return uncertain("GitHub moved main to a different commit");
      return { ok: true, result: "advanced" };
    },

    async commitsSince(repo, from, to) {
      const auth = await bearer();
      if (!auth.ok) return auth;
      const perPage = 100;
      const commits: GithubCommit[] = [];
      const seen = new Set<string>();
      let total: number | null = null;
      for (let page = 1; page <= 100; page += 1) {
        const response = await githubHttp(
          fetchImpl,
          auth.token,
          "GET",
          `/repos/${org}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(from)}...${encodeURIComponent(to)}?per_page=${perPage}&page=${page}`,
        );
        if (!response.ok) return response.failure;
        const compared = readCompare(response.value);
        if (compared === null)
          return invalid("GitHub returned a comparison the client could not read");
        if (page === 1) {
          if (compared.status === "diverged" || compared.status === "behind") {
            return { ok: true, result: "diverged" };
          }
          if (compared.status === "identical" || compared.total === 0) {
            return { ok: true, result: "commits", commits: [] };
          }
          if (compared.status !== "ahead") {
            return invalid(
              `GitHub comparison status "${compared.status}" is not one this client handles`,
            );
          }
          total = compared.total;
        }
        let added = 0;
        for (const commit of compared.commits) {
          if (seen.has(commit.sha)) continue;
          seen.add(commit.sha);
          commits.push(commit);
          added += 1;
        }
        if (total !== null && commits.length >= total) break;
        if (added === 0 || compared.commits.length < perPage) break;
      }
      if (total !== null && commits.length !== total) {
        return uncertain(`GitHub returned ${commits.length} of ${total} commits in the range`);
      }
      return { ok: true, result: "commits", commits };
    },

    async prdTree(repo, commit) {
      const auth = await bearer();
      if (!auth.ok) return auth;
      const response = await githubHttp(
        fetchImpl,
        auth.token,
        "GET",
        `/repos/${org}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(commit)}?recursive=1`,
      );
      if (!response.ok) return response.failure;
      if (!isRecord(response.value) || !Array.isArray(response.value.tree)) {
        return invalid("GitHub returned a tree the client could not read");
      }
      if (response.value.truncated === true) {
        return invalid("GitHub truncated the repository tree, so the prd file list is incomplete");
      }
      const files: { path: string; sha: string }[] = [];
      for (const entry of response.value.tree) {
        if (!isRecord(entry) || entry.type !== "blob" || typeof entry.path !== "string") continue;
        if (!entry.path.startsWith("prd/")) continue;
        if (typeof entry.sha !== "string" || entry.sha === "")
          return invalid("a prd file has no blob sha");
        files.push({ path: entry.path, sha: entry.sha });
      }
      return { ok: true, files };
    },

    async readBlobs(repo, shas) {
      const auth = await bearer();
      if (!auth.ok) return auth;
      const blobs: { sha: string; text: string }[] = [];
      for (const sha of shas) {
        const response = await githubHttp(
          fetchImpl,
          auth.token,
          "GET",
          `/repos/${org}/${encodeURIComponent(repo)}/git/blobs/${encodeURIComponent(sha)}`,
        );
        if (!response.ok) return response.failure;
        const text = blobText(response.value);
        if (!text.ok) return invalid(text.reason);
        blobs.push({ sha, text: text.text });
      }
      return { ok: true, blobs };
    },

    async tag(repo, name, sha) {
      const auth = await bearer();
      if (!auth.ok) return auth;
      const repoPath = encodeURIComponent(repo);
      const created = await githubHttp(
        fetchImpl,
        auth.token,
        "POST",
        `/repos/${org}/${repoPath}/git/refs`,
        {
          ref: `refs/tags/${name}`,
          sha,
        },
      );
      if (created.ok) {
        const pointed = refSha(created.value);
        if (pointed === null) return uncertain("GitHub created a tag but did not confirm its sha");
        if (pointed !== sha) return uncertain("GitHub created the tag at a different commit");
        return { ok: true, result: "tagged" };
      }
      if (created.status !== 422) return created.failure;
      const existing = await githubHttp(
        fetchImpl,
        auth.token,
        "GET",
        `/repos/${org}/${repoPath}/git/ref/tags/${encodeURIComponent(name)}`,
      );
      if (!existing.ok) return existing.status === 404 ? created.failure : existing.failure;
      const held = refSha(existing.value);
      if (held === null) return invalid("GitHub returned a tag the client could not read");
      if (held === sha) return { ok: true, result: "tagged" };
      return { ok: true, result: "conflict", sha: held };
    },
  };
}
