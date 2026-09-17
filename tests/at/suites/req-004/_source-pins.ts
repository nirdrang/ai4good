import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DISCOVERY_MICROS_PER_CREDIT, DISCOVERY_PRICE_MICROS_PER_TOKEN, DISCOVERY_REQUEST_SETTINGS, DISCOVERY_TURN_DEADLINE_SECONDS, fuelExhaustedReason } from '../../../../supabase/functions/_shared/discovery-metering.ts';
import { discoveryMessageAllowed } from '../../../../supabase/functions/_shared/verification.ts';
import { AT_CONFIG } from '../../harness/atconfig.ts';
import { splitSqlStatements } from '../req-001/_policy-scan.ts';
import { migrationFiles, REPO_ROOT } from '../req-002/_source-scan.ts';

export function meteringPinProblems(): string[] {
  const pairs = [
    [DISCOVERY_MICROS_PER_CREDIT, AT_CONFIG.discoveryMicrosPerCredit.value],
    [DISCOVERY_PRICE_MICROS_PER_TOKEN.input, AT_CONFIG.discoveryInputMicrosPerToken.value],
    [DISCOVERY_PRICE_MICROS_PER_TOKEN.output, AT_CONFIG.discoveryOutputMicrosPerToken.value],
    [DISCOVERY_REQUEST_SETTINGS.maxOutputTokens, AT_CONFIG.discoveryMaxOutputTokens.value],
    [DISCOVERY_REQUEST_SETTINGS.minOutputTokens, AT_CONFIG.discoveryMinOutputTokens.value],
    [DISCOVERY_TURN_DEADLINE_SECONDS, AT_CONFIG.discoveryTurnDeadlineSeconds.value],
  ];
  const problems = pairs.flatMap(([value, pin], i) => value === pin ? [] : [`metering pin ${i} differs: ${value} versus ${pin}`]);
  const client = readFileSync(join(REPO_ROOT, 'supabase/functions/_shared/anthropic-messages.ts'), 'utf8');
  const model = /DISCOVERY_CLIENT_MODEL\s*=\s*'([^']+)'/.exec(client)?.[1];
  if (!model) throw new Error('could not read the model client pin');
  if (model !== DISCOVERY_REQUEST_SETTINGS.model) problems.push('the model client and request settings disagree');
  return problems;
}
export function sendSentencePinProblems(): string[] {
  let sql: string | undefined;
  for (const file of migrationFiles('sendSentencePinProblems')) {
    for (const statement of splitSqlStatements(file.text)) {
      if (/^create\s+(?:or\s+replace\s+)?function\s+public\.discovery_turn_reserve\s*\(/i.test(statement)) sql = statement;
    }
  }
  if (!sql) throw new Error('could not read the Discovery reserve definer');
  const sentence = [...sql.matchAll(/raise\s+exception\s+'((?:[^']|'')*)'\s+using\s+errcode\s*=\s*'42501',\s*detail\s*=\s*'email-unverified'/gi)][0]?.[1].replace(/''/g, "'");
  if (!sentence) throw new Error('could not read the email-unverified sentence');
  const fuel = [...sql.matchAll(/raise\s+exception\s+'((?:[^']|'')*)'\s+using\s+errcode\s*=\s*'P0001',\s*detail\s*=\s*'fuel-exhausted'/gi)][0]?.[1].replace(/''/g, "'");
  if (!fuel) throw new Error('could not read the fuel-exhausted sentence');
  const decision = discoveryMessageAllowed({ emailVerified: false });
  const problems: string[] = [];
  if (decision.ok || decision.reason !== sentence) problems.push('the SQL and TypeScript email refusal sentences differ');
  if (fuel !== fuelExhaustedReason()) problems.push('the SQL and TypeScript fuel-exhausted sentences differ');
  return problems;
}
