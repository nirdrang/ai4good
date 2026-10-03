export function countPairs(items: { recipientId: string; channel: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const i of items) {
    const key = `${i.recipientId}:${i.channel}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function expectedPairs(
  actors: Record<string, string>,
  recipients: readonly string[],
  channels: readonly string[],
): string[] {
  return recipients.flatMap((r) => channels.map((c) => `${actors[r]}:${c}`)).sort();
}

export function pairProblems(expectedKeys: readonly string[], got: Map<string, number>): string[] {
  const problems: string[] = [];
  for (const key of expectedKeys) {
    const n = got.get(key) ?? 0;
    if (n !== 1) problems.push(`${key}: ${n} deliveries, expected exactly 1`);
  }
  for (const [key, n] of got) {
    if (!expectedKeys.includes(key)) problems.push(`${key}: ${n} unexpected deliveries`);
  }
  return problems;
}
