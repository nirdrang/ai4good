export const DISCOVERY_REQUEST_SETTINGS = {
  model: 'claude-opus-5', maxOutputTokens: 4096, effort: 'low',
} as const;
export const DISCOVERY_TURN_DEADLINE_SECONDS = 150;
export const DISCOVERY_OFF_TOPIC_FLAG_STRIKES = 3;
export const DISCOVERY_MESSAGE_MAX_CHARS = 4000;
export type ModelUsage = { inputTokens: number; outputTokens: number };
export type DiscoveryReserveSettings = Omit<ReturnType<typeof reserveSettings>, 'model'> & {
  model: string;
};
export function reserveSettings() {
  return {
    model: DISCOVERY_REQUEST_SETTINGS.model, effort: DISCOVERY_REQUEST_SETTINGS.effort,
    max_output_tokens: DISCOVERY_REQUEST_SETTINGS.maxOutputTokens,
    message_max_chars: DISCOVERY_MESSAGE_MAX_CHARS,
    turn_deadline_seconds: DISCOVERY_TURN_DEADLINE_SECONDS,
    off_topic_flag_strikes: DISCOVERY_OFF_TOPIC_FLAG_STRIKES,
  };
}
