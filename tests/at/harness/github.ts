import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  githubApp,
  githubConfig,
  githubHttp,
  type GithubApp,
  type GithubConfig,
} from "../../../supabase/functions/_shared/github/app.ts";
import { githubRepo, type GithubRepo } from "../../../supabase/functions/_shared/github/repo.ts";

const ENV_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "supabase",
  "functions",
  ".env",
);

export type GithubTest =
  | { ok: true; config: GithubConfig; client: GithubRepo }
  | { ok: false; skip: boolean; reason: string };

function readEnvFile(path: string): Record<string, string> {
  const values: Record<string, string> = {};
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const first = value[0];
    const last = value[value.length - 1];
    if (value.length >= 2 && ((first === '"' && last === '"') || (first === "'" && last === "'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function open():
  | { ok: true; config: GithubConfig; app: GithubApp; client: GithubRepo }
  | { ok: false; skip: boolean; reason: string } {
  if (!existsSync(ENV_PATH)) {
    return {
      ok: false,
      skip: true,
      reason: "supabase/functions/.env is missing, so the GitHub tests are skipped",
    };
  }
  let env: Record<string, string>;
  try {
    env = readEnvFile(ENV_PATH);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "the env file could not be read";
    return {
      ok: false,
      skip: true,
      reason: `supabase/functions/.env could not be read: ${reason}`,
    };
  }
  const parsed = githubConfig(env);
  if (!parsed.ok)
    return { ok: false, skip: parsed.reason.endsWith(" is missing"), reason: parsed.reason };
  const app = githubApp(parsed.config);
  return { ok: true, config: parsed.config, app, client: githubRepo(parsed.config, fetch) };
}

export function loadGithubTest(): GithubTest {
  const loaded = open();
  if (!loaded.ok) return loaded;
  return { ok: true, config: loaded.config, client: loaded.client };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function cleanupRepos(prefix: string): Promise<void> {
  if (!/^[a-z0-9][a-z0-9-]{11,}$/i.test(prefix)) {
    throw new Error(`cleanupRepos refuses the prefix ${JSON.stringify(prefix)}`);
  }
  const loaded = open();
  if (!loaded.ok) throw new Error(loaded.reason);
  const token = await loaded.app.installationToken(fetch);
  if (!token.ok) throw new Error(token.reason);
  const org = encodeURIComponent(loaded.config.org);
  const names: string[] = [];
  let truncated = false;
  for (let page = 1; page <= 50; page += 1) {
    const response = await githubHttp(
      fetch,
      token.token,
      "GET",
      `/orgs/${org}/repos?per_page=100&page=${page}&type=all`,
    );
    if (!response.ok) throw new Error(`listing repositories failed: ${response.failure.reason}`);
    if (!Array.isArray(response.value)) throw new Error("GitHub did not return a repository list");
    for (const repo of response.value) {
      if (!isRecord(repo) || typeof repo.name !== "string") continue;
      if (repo.name.startsWith(prefix)) names.push(repo.name);
    }
    if (response.value.length < 100) break;
    if (page === 50) truncated = true;
  }
  for (const name of names) {
    if (!name.startsWith(prefix)) throw new Error(`cleanupRepos refused to delete ${name}`);
    const response = await githubHttp(
      fetch,
      token.token,
      "DELETE",
      `/repos/${org}/${encodeURIComponent(name)}`,
    );
    if (!response.ok && response.status !== 404) {
      throw new Error(`deleting ${name} failed: ${response.failure.reason}`);
    }
  }
  if (truncated)
    throw new Error("the repository list did not end, so cleanup may have missed a repository");
}

export async function cleanupReposNamed(names: readonly string[]): Promise<void> {
  if (names.length === 0) return;
  for (const name of names) {
    if (!/^[a-z0-9][a-z0-9-]{0,99}$/i.test(name)) {
      throw new Error(`cleanupReposNamed refuses ${JSON.stringify(name)}`);
    }
  }
  const loaded = open();
  if (!loaded.ok) throw new Error(loaded.reason);
  const token = await loaded.app.installationToken(fetch);
  if (!token.ok) throw new Error(token.reason);
  const org = encodeURIComponent(loaded.config.org);
  for (const name of names) {
    const response = await githubHttp(
      fetch,
      token.token,
      "DELETE",
      `/repos/${org}/${encodeURIComponent(name)}`,
    );
    if (!response.ok && response.status !== 404) {
      throw new Error(`deleting ${name} failed: ${response.failure.reason}`);
    }
  }
}
