export const DISCOVERY_MICROS_PER_CREDIT = 100_000;
export const DISCOVERY_PRICE_MICROS_PER_TOKEN = { input: 5, output: 25 } as const;
export const DISCOVERY_REQUEST_SETTINGS = {
  model: 'claude-opus-5', maxOutputTokens: 4096, minOutputTokens: 512, effort: 'low',
} as const;
export const DISCOVERY_INPUT_MARGIN_TOKENS = 64;
export const DISCOVERY_TURN_DEADLINE_SECONDS = 150;
export const DISCOVERY_MESSAGE_MAX_CHARS = 4000;
export type ModelUsage = { inputTokens: number; outputTokens: number };

export function creditsForMicros(micros: number, microsPerCredit = DISCOVERY_MICROS_PER_CREDIT): number {
  return Math.max(0, Math.ceil(micros / microsPerCredit));
}
export function countedInputTokens(counted: number): number {
  return counted + DISCOVERY_INPUT_MARGIN_TOKENS;
}
export function affordableOutputTokens(input: { availableMicros: number; estimatedInputTokens: number }): number {
  return Math.min(DISCOVERY_REQUEST_SETTINGS.maxOutputTokens,
    Math.floor((input.availableMicros - input.estimatedInputTokens * DISCOVERY_PRICE_MICROS_PER_TOKEN.input) /
      DISCOVERY_PRICE_MICROS_PER_TOKEN.output));
}
export function reservationFor(input: { estimatedInputTokens: number; maxOutputTokens: number }) {
  const reservedMicros = input.estimatedInputTokens * DISCOVERY_PRICE_MICROS_PER_TOKEN.input +
    input.maxOutputTokens * DISCOVERY_PRICE_MICROS_PER_TOKEN.output;
  return { reservedMicros, reservedCredits: creditsForMicros(reservedMicros) };
}
export function settlementFor(input: {
  reservedMicros: number; reservedCredits: number; billing: 'free' | 'fuel'; usage: ModelUsage;
}) {
  const actualMicros = input.usage.inputTokens * DISCOVERY_PRICE_MICROS_PER_TOKEN.input +
    input.usage.outputTokens * DISCOVERY_PRICE_MICROS_PER_TOKEN.output;
  return {
    actualMicros,
    chargedCredits: input.billing === 'free' ? Math.min(input.reservedCredits, creditsForMicros(actualMicros)) : 0,
    overrunMicros: Math.max(0, actualMicros - input.reservedMicros),
  };
}
export type DiscoveryReserveSettings = ReturnType<typeof reserveSettings> & { counted_input_tokens?: number };
export function reserveSettings() {
  return {
    model: DISCOVERY_REQUEST_SETTINGS.model, effort: DISCOVERY_REQUEST_SETTINGS.effort,
    max_output_tokens: DISCOVERY_REQUEST_SETTINGS.maxOutputTokens,
    min_output_tokens: DISCOVERY_REQUEST_SETTINGS.minOutputTokens,
    message_max_chars: DISCOVERY_MESSAGE_MAX_CHARS, micros_per_credit: DISCOVERY_MICROS_PER_CREDIT,
    input_micros_per_token: DISCOVERY_PRICE_MICROS_PER_TOKEN.input,
    output_micros_per_token: DISCOVERY_PRICE_MICROS_PER_TOKEN.output,
    turn_deadline_seconds: DISCOVERY_TURN_DEADLINE_SECONDS,
  };
}
