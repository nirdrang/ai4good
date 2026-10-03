import { AT_CONFIG, type AtConfigKey } from './atconfig.ts';
import type { ConfigOverrides } from './registry.ts';

export const CONFIG_KEYS: Record<string, AtConfigKey> = {
  'req-004.discovery.max_output_tokens': 'discoveryMaxOutputTokens',
  'req-004.discovery.turn_deadline_seconds': 'discoveryTurnDeadlineSeconds',
  'req-004.discovery.cause_labels_max': 'discoveryCauseLabelsMax',
  'req-004.discovery.off_topic_flag_strikes': 'discoveryOffTopicFlagStrikes',
  'req-004.discovery.regeneration_bound': 'discoveryRegenerationBound',
  'req-002.discovery.daily_credits.unverified': 'discoveryDailyCreditsUnverified',
  'req-002.discovery.daily_credits.vetted': 'discoveryDailyCreditsVetted',
  'req-015.thread_comment_notifications.max_per_window': 'threadCommentNotificationsMaxPerWindow',
  'req-015.thread_comment_notifications.window_ms': 'threadCommentNotificationsWindowMs',
  'req-015.thread_comment_notifications.coalesce': 'threadCommentNotificationsCoalesce',
};

export type ConfigRegistry = {
  get<T>(key: string): T;
};

export function unknownConfigKeys(overrides: ConfigOverrides): string[] {
  return Object.keys(overrides)
    .filter((key) => !(key in CONFIG_KEYS))
    .sort();
}

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
