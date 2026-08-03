/**
 * The generic self-checks every suite would otherwise re-assert in its own words.
 *
 * Rule 2 of the suite-authoring rules: sentinel value quality, rejection of an unknown fault
 * point, an arming that would displace a live one, a fault that never actually fired, a process
 * restart that restarted nothing — these are properties of the HARNESS, identical in all thirty
 * suites, so they are implemented once here and never repeated per suite. What stays in a suite is scenario evidence: no-fault control runs,
 * mid-flight-not-yet-delivered checks, meaningful-config guards, role-actually-moved checks.
 *
 * LOAD-BEARING, and the reason these have conformance tests of their own: a bug in a centralized
 * guard green-lights all thirty suites at once. A fault handle that counted "armed" as "triggered"
 * would make every atomicity test in the product pass on nothing at all, and no suite would show
 * a symptom. H3 (sentinels + fault injection) MUST route its `sentinels.plant`, `faults.at`,
 * `FaultHandle.clear` and `faults.processRestart` implementations through the predicates below
 * rather than re-deriving them — that is what makes this file the single place the property can
 * be got wrong, and the single place a test can prove it right.
 *
 * Each predicate returns a plain-words problem, or null when the thing is acceptable. Returning
 * text rather than throwing lets a caller decide whether the problem is a refusal (H3 throwing at
 * `plant()`) or an accumulated report; the judgement about what is wrong lives in one place either
 * way.
 */

/**
 * Shortest sentinel value that can carry a claim. A sentinel is asserted with
 * `body.includes(value)`, so a blank or two-character value is `true` of almost every body and
 * the assertion stops discriminating. Sixteen characters is enough to hold an AT id plus a
 * domain plus a timestamp, which is how the suites build them.
 */
export const MIN_SENTINEL_VALUE_LENGTH = 16;

/**
 * A sentinel is only evidence if it is long enough to be unlikely and has never been planted
 * before. A reused value cannot tell "this domain's event carried it" from "an earlier domain's
 * event did".
 *
 * OVERLAP COUNTS AS REUSE, because the scan matches with `body.includes(value)` rather than by
 * equality. A value that contains an already-planted one — or is contained in it — makes every body
 * carrying either of the two report BOTH as present, so a sentinel is found in a scope no event
 * ever carried it to. That is a false PRESENCE, which is worse than the ambiguity plain reuse
 * causes: it invents evidence rather than blurring it.
 */
export function sentinelValueProblem(value: string, alreadyPlanted: Iterable<string>): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `a sentinel value must be non-empty text, got ${JSON.stringify(value)}`;
  }
  if (value.length < MIN_SENTINEL_VALUE_LENGTH) {
    return (
      `sentinel value ${JSON.stringify(value)} is ${value.length} characters; at least ` +
      `${MIN_SENTINEL_VALUE_LENGTH} are needed for "the body contains it" to discriminate`
    );
  }
  for (const planted of alreadyPlanted) {
    if (planted === value) {
      return `sentinel value ${JSON.stringify(value)} was planted before — a reused sentinel cannot tell which event carried it`;
    }
    if (planted.includes(value) || value.includes(planted)) {
      return (
        `sentinel value ${JSON.stringify(value)} overlaps the already-planted ${JSON.stringify(planted)} — ` +
        `a scan asks whether the body CONTAINS the value, so every body carrying one of these two ` +
        `would report both present, and the shorter one would be found in a scope no event carried it to`
      );
    }
  }
  return null;
}

/**
 * Arming a fault at a point the product does not expose must be a refusal, never a no-op. A typo,
 * or a point the code stopped honouring, otherwise arms nothing and the atomicity oracle reads
 * "both committed" as proof of atomicity when no fault was ever injected.
 */
export function faultPointProblem(point: string, exposed: readonly string[]): string | null {
  if (exposed.includes(point)) return null;
  return (
    `the product exposes no fault point named ${JSON.stringify(point)} — arming it would inject nothing. ` +
    `Exposed points: ${exposed.length ? [...exposed].sort().join(', ') : '(none)'}`
  );
}

/**
 * Arming a point that already has a LIVE arming must be a refusal, never a silent replacement.
 *
 * A DISPLACED ARMING IS A RUN THAT IS NOT FAULT-INJECTED AND DOES NOT KNOW IT. The displaced handle
 * keeps a counter nothing will ever increment again, so it reports zero for a point execution
 * really did reach; and disarming the REPLACEMENT takes the point down altogether while the first
 * handle's owner still believes a fault is armed there. A suite that reads its atomicity oracle
 * before clearing — or never clears at all, which nothing here makes mandatory — then draws its
 * conclusion from a run in which nothing was injected, and no refusal is raised anywhere. That is
 * the same catastrophe as a handle counting "armed" as "triggered", arriving by a side door.
 */
export function faultAlreadyArmedProblem(point: string, liveArmings: Iterable<string>): string | null {
  for (const armed of liveArmings) {
    if (armed === point) {
      return (
        `a fault is already armed at ${JSON.stringify(point)} — arming it again would displace the live ` +
        `arming silently, leaving the first handle counting a point nothing reaches any more and the ` +
        `point itself disarmed as soon as the replacement is cleared. Clear the existing handle first.`
      );
    }
  }
  return null;
}

/**
 * A fault that was armed but never REACHED proves nothing about the code path it was aimed at.
 * Clearing such a handle is the moment to say so: the test that armed it is about to draw a
 * conclusion from a run in which its fault never happened.
 */
export function faultFiredProblem(point: string, triggerCount: number): string | null {
  if (!Number.isFinite(triggerCount) || triggerCount < 0) {
    return `fault at ${JSON.stringify(point)} reported a nonsensical trigger count (${triggerCount})`;
  }
  if (triggerCount < 1) {
    return `the fault at ${JSON.stringify(point)} never fired — execution did not reach the armed point, so this run is not fault-injected at all`;
  }
  return null;
}

/**
 * A restart that leaves the delivery process's identity unchanged restarted nothing, and every
 * "survives a restart" assertion above it is then a claim about a process that never stopped.
 */
export function processEpochProblem(before: string, after: string): string | null {
  if (!before.trim() || !after.trim()) return 'the delivery process reported an empty epoch, so a restart cannot be observed at all';
  if (before === after) {
    return `the delivery process identity is still ${JSON.stringify(after)} after a restart — processRestart() restarted nothing`;
  }
  return null;
}
