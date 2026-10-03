export const MIN_SENTINEL_VALUE_LENGTH = 16;

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

export function faultPointProblem(point: string, exposed: readonly string[]): string | null {
  if (exposed.includes(point)) return null;
  return (
    `the product exposes no fault point named ${JSON.stringify(point)} — arming it would inject nothing. ` +
    `Exposed points: ${exposed.length ? [...exposed].sort().join(', ') : '(none)'}`
  );
}

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

export function faultFiredProblem(point: string, triggerCount: number): string | null {
  if (!Number.isFinite(triggerCount) || triggerCount < 0) {
    return `fault at ${JSON.stringify(point)} reported a nonsensical trigger count (${triggerCount})`;
  }
  if (triggerCount < 1) {
    return `the fault at ${JSON.stringify(point)} never fired — execution did not reach the armed point, so this run is not fault-injected at all`;
  }
  return null;
}

export function processEpochProblem(before: string, after: string): string | null {
  if (!before.trim() || !after.trim()) return 'the delivery process reported an empty epoch, so a restart cannot be observed at all';
  if (before === after) {
    return `the delivery process identity is still ${JSON.stringify(after)} after a restart — processRestart() restarted nothing`;
  }
  return null;
}

export function providerForceCountProblem(count: number): string | null {
  if (!Number.isInteger(count)) {
    return `a forced-outcome count must be a whole number of sends, got ${String(count)}`;
  }
  if (count < 1) {
    return (
      `a forced-outcome count of ${count} queues nothing — the next send would take the provider's ` +
      `default while the test that armed it believes an outcome is waiting`
    );
  }
  return null;
}
