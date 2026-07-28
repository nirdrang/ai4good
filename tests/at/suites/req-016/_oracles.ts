/**
 * Pure comparison oracles shared by the REQ-016 suite.
 *
 * They live apart from `_bind.ts` deliberately: `_bind.ts` touches the harness and the test
 * framework, so nothing in it can be exercised on its own. These functions decide whether a
 * set of observed deliveries matches the specification, which makes them the last thing that
 * should be unverifiable — they are dependency-free and directly executable.
 */

/**
 * Counted `recipientId:channel` multiset. Set-based comparison silently forgives a duplicate
 * delivery, which is exactly the defect AT-016.07 exists to catch — so the shared oracle
 * counts rather than dedupes.
 */
export function countPairs(items: { recipientId: string; channel: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const i of items) {
    const key = `${i.recipientId}:${i.channel}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * The exact `recipientId:channel` set a row must produce.
 * Assumes the fixture's one-actor-per-role world (`World.actors`), so an extra recipient of an
 * expected role shows up as an unexpected key rather than collapsing into the role's pair.
 */
export function expectedPairs(
  actors: Record<string, string>,
  recipients: readonly string[],
  channels: readonly string[],
): string[] {
  return recipients.flatMap((r) => channels.map((c) => `${actors[r]}:${c}`)).sort();
}

/**
 * Diff of a counted multiset against the exactly-once expectation.
 * Empty result = every expected pair received exactly one delivery and nothing else was
 * delivered. A missing pair, a duplicate pair and an unexpected recipient are all distinct
 * problems, so a failure names which of the three occurred.
 */
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
