/**
 * The config capability the suites hold — a reader over the at-config registry.
 *
 * This is NOT a stand-in for a later slice: the registry in `atconfig.ts` IS the single source
 * for every pinned number, so the thing a test reaches through `h.config` is the real article and
 * is registered as a real capability. There is no future version of it to wait for.
 *
 * Suites address values by DOTTED KEY (`req-015.thread_comment_notifications.max_per_window`)
 * rather than by the registry's TypeScript identifier. The dotted key says which requirement owns
 * the knob and what the knob is, which is what a test author is thinking about; the identifier is
 * an implementation detail of the registry module. The map below is the only place the two meet.
 *
 * Two things throw rather than returning something usable:
 *   - an unknown key, because a typo that silently returned undefined would make a cap of
 *     `undefined` compare as "no cap" and the guard assertion would pass on nothing;
 *   - a `null` value, i.e. a knob the requirement names but nobody has pinned. That doctrine is
 *     the registry's own (`atconfig.ts`): an invented threshold is worse than a red.
 */

import { AT_CONFIG, type AtConfigKey } from './atconfig.ts';
import type { ConfigOverrides } from './registry.ts';

/** Every dotted key the suites may read, and the registry entry that pins it. */
export const CONFIG_KEYS: Record<string, AtConfigKey> = {
  'req-015.thread_comment_notifications.max_per_window': 'threadCommentNotificationsMaxPerWindow',
  'req-015.thread_comment_notifications.window_ms': 'threadCommentNotificationsWindowMs',
  'req-015.thread_comment_notifications.coalesce': 'threadCommentNotificationsCoalesce',
};

export interface ConfigRegistry {
  get<T>(key: string): T;
}

/** Where an override names a knob that does not exist. Empty = every override is addressable. */
export function unknownConfigKeys(overrides: ConfigOverrides): string[] {
  return Object.keys(overrides)
    .filter((key) => !(key in CONFIG_KEYS))
    .sort();
}

/**
 * Build the reader, optionally with per-world overrides layered on top.
 *
 * Overrides may RE-TUNE a knob the registry already carries and may never introduce one. A test
 * that could invent a key would be describing a configuration the product has no notion of, and
 * "the implementation honours its configuration" would then be a claim about a knob nobody wired.
 */
export function createConfigRegistry(overrides: ConfigOverrides = {}): ConfigRegistry {
  const unknown = unknownConfigKeys(overrides);
  if (unknown.length) {
    throw new Error(
      `config override${unknown.length === 1 ? '' : 's'} ${unknown.join(', ')} name no at-config entry — ` +
        `an override re-tunes a pinned value, it cannot invent one. Known keys: ${Object.keys(CONFIG_KEYS).sort().join(', ')}`,
    );
  }

  return {
    get<T>(key: string): T {
      const entryKey = CONFIG_KEYS[key];
      if (!entryKey) {
        throw new Error(
          `no at-config entry is registered for ${JSON.stringify(key)}. Known keys: ${Object.keys(CONFIG_KEYS).sort().join(', ')}`,
        );
      }
      if (key in overrides) return overrides[key] as T;

      const entry = AT_CONFIG[entryKey];
      if (entry.value === null) {
        throw new Error(
          `${key} (${entry.name}) is not pinned anywhere — ${entry.source}. A test must fail on an ` +
            `unpinned value rather than substitute a guess.`,
        );
      }
      return entry.value as T;
    },
  };
}
