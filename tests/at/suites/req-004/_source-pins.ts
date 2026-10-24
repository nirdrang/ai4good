import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DISCOVERY_OFF_TOPIC_FLAG_STRIKES, DISCOVERY_REQUEST_SETTINGS, DISCOVERY_TURN_DEADLINE_SECONDS } from '../../../../supabase/functions/_shared/discovery-metering.ts';
import { DISCOVERY_STOP_RULE } from '../../../../supabase/functions/_shared/discovery-prompt.ts';
import { SCOPE_CAUSE_LABELS_MAX } from '../../../../supabase/functions/_shared/scope.ts';
import { discoveryMessageAllowed } from '../../../../supabase/functions/_shared/verification.ts';
import { AT_CONFIG } from '../../harness/atconfig.ts';
import { splitSqlStatements } from '../req-001/_policy-scan.ts';
import { lineOf, migrationFiles, productFiles, REPO_ROOT } from '../req-002/_source-scan.ts';

export function meteringPinProblems(): string[] {
  const pairs = [
    [DISCOVERY_REQUEST_SETTINGS.maxOutputTokens, AT_CONFIG.discoveryMaxOutputTokens.value],
    [DISCOVERY_TURN_DEADLINE_SECONDS, AT_CONFIG.discoveryTurnDeadlineSeconds.value],
    [SCOPE_CAUSE_LABELS_MAX, AT_CONFIG.discoveryCauseLabelsMax.value],
    [DISCOVERY_OFF_TOPIC_FLAG_STRIKES, AT_CONFIG.discoveryOffTopicFlagStrikes.value],
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
  const decision = discoveryMessageAllowed({ emailVerified: false });
  const problems: string[] = [];
  if (decision.ok || decision.reason !== sentence) problems.push('the SQL and TypeScript email refusal sentences differ');
  return problems;
}
export function stopRulePinProblems(): string[] {
  const skill = readFileSync(join(REPO_ROOT, 'supabase/functions/_shared/discovery-skills/04-complete-the-record.md'), 'utf8');
  const generated = readFileSync(join(REPO_ROOT, 'supabase/functions/_shared/discovery-skills/index.ts'), 'utf8');
  const problems: string[] = [];
  if (!skill.includes(DISCOVERY_STOP_RULE)) problems.push('the complete-the-record skill does not carry the stop rule');
  if (!generated.includes(DISCOVERY_STOP_RULE)) problems.push('the generated skills module does not carry the stop rule');
  return problems;
}
const TIER_WRITERS = new Set(['supabase/functions/_shared/discovery-brief.ts', 'supabase/functions/_shared/discovery-reply.ts']);
const TIER_ASSIGNMENT = [/\.dataTier\s*=(?!=)/g, /\bdataTier\s*:\s*\{\s*tier\b/g, /jsonb_set\s*\([^;]*dataTier/gi, /jsonb_build_object\s*\([^;]*'dataTier'/gi];
const BACKGROUND_REVIEW = /background[\s_-]?review/i;
export function tierFinalPinProblems(): string[] {
  const problems: string[] = [];
  for (const file of productFiles('tierFinalPinProblems').filter((item) => item.path.startsWith('supabase/'))) {
    if (!TIER_WRITERS.has(file.path)) {
      for (const pattern of TIER_ASSIGNMENT) {
        for (const match of file.text.matchAll(pattern)) problems.push(`${file.path}:${lineOf(file.text, match.index ?? 0)} writes the data tier`);
      }
    }
    if (BACKGROUND_REVIEW.test(file.text) && file.text.includes('dataTier')) problems.push(`${file.path} hands the data tier to the background review`);
  }
  return problems;
}
