export function extractGithubHandle(user: unknown): string | null {
  if (typeof user !== 'object' || user === null) return null;
  const identities = (user as { identities?: unknown }).identities;
  if (!Array.isArray(identities)) return null;

  for (const identity of identities) {
    if (typeof identity !== 'object' || identity === null) continue;
    const record = identity as { provider?: unknown; identity_data?: unknown };
    if (record.provider !== 'github') continue;
    const data = record.identity_data;
    if (typeof data !== 'object' || data === null) continue;
    const handle = (data as { user_name?: unknown }).user_name;
    if (typeof handle === 'string' && handle.trim() !== '') return handle.trim();
  }
  return null;
}

export type GithubStats = {
  topLanguages: string[];
  repositoryCount: number;
  contributionSummary: string;
};

const STUB_LANGUAGE_POOL = [
  'TypeScript',
  'Python',
  'Go',
  'Rust',
  'Ruby',
  'Java',
  'Elixir',
  'C',
] as const;

function handleFingerprint(handle: string): number {
  let hash = 2166136261;
  for (let index = 0; index < handle.length; index += 1) {
    hash ^= handle.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function stubGithubStatsFor(handle: string): GithubStats {
  const fingerprint = handleFingerprint(handle);

  const languageCount = 1 + (fingerprint % 3);
  const firstLanguage = fingerprint % STUB_LANGUAGE_POOL.length;
  const topLanguages: string[] = [];
  for (let offset = 0; offset < languageCount; offset += 1) {
    topLanguages.push(STUB_LANGUAGE_POOL[(firstLanguage + offset) % STUB_LANGUAGE_POOL.length]);
  }

  const repositoryCount = 1 + (fingerprint % 240);

  return {
    topLanguages,
    repositoryCount,
    contributionSummary:
      `stub import fixture: ${handle} has ${repositoryCount} public repositories, ` +
      `most recently in ${topLanguages[0]} — no GitHub API was called to produce this`,
  };
}
