import {
  parseScope,
  SCOPE_KEYS,
  scopeSourceProblems,
  type ConfirmedDiscovery,
  type Scope,
} from "../scope.ts";

type StoredTechnicalScope = { kind: "not-written" } | { kind: "written"; scope: Scope };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads the technical-scope section's stored scope: an empty object is not written yet, anything else must be a Scope. */
export function storedTechnicalScope(value: unknown): StoredTechnicalScope | null {
  if (isRecord(value) && Object.keys(value).length === 0) return { kind: "not-written" };
  const scope = parseScope(value);
  return scope === null ? null : { kind: "written", scope };
}

function shapeProblems(value: unknown): string[] {
  const problems = ["The technical scope is not a complete scope."];
  if (!isRecord(value)) return problems;
  const extra = Object.keys(value).filter(
    (key) => !(SCOPE_KEYS as readonly string[]).includes(key),
  );
  if (extra.length > 0)
    problems.push(`The technical scope has fields a scope does not have: ${extra.join(", ")}.`);
  if (!Array.isArray(value.userStories)) return problems;
  value.userStories.forEach((story, index) => {
    if (!isRecord(story)) return;
    const criteria = story.acceptanceCriteria;
    if (!Array.isArray(criteria) || criteria.length === 0) {
      problems.push(`Story ${index + 1} has no acceptance criterion.`);
    }
  });
  return problems;
}

/** Validates the technical-scope section document against the confirmed Discovery document it must trace to. */
export function parseTechnicalScope(
  value: unknown,
  discovery: ConfirmedDiscovery,
): { ok: true; scope: Scope | null } | { ok: false; problems: string[] } {
  const stored = storedTechnicalScope(value);
  if (stored === null) return { ok: false, problems: shapeProblems(value) };
  if (stored.kind === "not-written") return { ok: true, scope: null };
  const problems = scopeSourceProblems(stored.scope, discovery);
  return problems.length > 0 ? { ok: false, problems } : { ok: true, scope: stored.scope };
}
