/**
 * REQ-002's pin source arms: a value or a sentence identical in two languages. The grants,
 * the three debit sentences, the email-unverified sentence, and the notice channel set.
 *
 * Shared posture (throws rather than report an absence the instrument could not measure):
 * `_source-scan.ts`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  dailyAllowanceExhaustedReason,
  dailyGrantFor,
  debitExceedsRemainingReason,
  DISCOVERY_DAILY_GRANT,
  emailUnverifiedReason,
  remainingCredits,
} from '../../../../supabase/functions/_shared/discovery-allowance.ts';
import { channelsFor, taxonomyRow } from '../../../../supabase/functions/_shared/notification-taxonomy.ts';
import { AT_CONFIG } from '../../harness/atconfig.ts';
import { splitSqlStatements } from '../req-001/_policy-scan.ts';
import {
  DEFINER_HEAD,
  REPO_ROOT,
  VETTING_DEFINER,
  migrationFiles,
  posix,
} from './_source-scan.ts';

const GRANT_FUNCTION_HEAD = /create\s+(?:or\s+replace\s+)?function\s+public\.discovery_daily_grant\s*\(/i;
const GRANT_VETTED_ARM = /when\s+p_vetted\s+then\s+(\d+)/i;
const GRANT_UNVERIFIED_ARM = /else\s+(\d+)/i;

export type GrantPinInput = {
  unverifiedPin: number;
  vettedPin: number;
  typescriptUnverified: number;
  typescriptVetted: number;
  grantFunctionSql: string;
};

/** SQL arms of `public.discovery_daily_grant`. */
export function parseGrantFunctionArms(sql: string): { unverified: number; vetted: number } {
  if (!GRANT_FUNCTION_HEAD.test(sql)) {
    throw new Error(
      'parseGrantFunctionArms found no public.discovery_daily_grant definition in the SQL it was given. ' +
        'Refusing to report agreement.',
    );
  }
  const vetted = GRANT_VETTED_ARM.exec(sql);
  const unverified = GRANT_UNVERIFIED_ARM.exec(sql);
  if (vetted === null || unverified === null) {
    throw new Error(
      "parseGrantFunctionArms could not read `when p_vetted then N else M` from public.discovery_daily_grant. " +
        'Refusing to report agreement.',
    );
  }
  return { vetted: Number(vetted[1]), unverified: Number(unverified[1]) };
}

/** Every disagreement between the pinned registry, the TypeScript constants, and the SQL grant. */
export function scanGrantPins(input: GrantPinInput): string[] {
  const arms = parseGrantFunctionArms(input.grantFunctionSql);
  const problems: string[] = [];
  const rows: ReadonlyArray<{ label: string; value: number; pin: number; pinName: string }> = [
    { label: 'DISCOVERY_DAILY_GRANT.unverified', value: input.typescriptUnverified, pin: input.unverifiedPin, pinName: 'unverified pin' },
    { label: 'DISCOVERY_DAILY_GRANT.vetted', value: input.typescriptVetted, pin: input.vettedPin, pinName: 'vetted pin' },
    { label: 'discovery_daily_grant unverified arm', value: arms.unverified, pin: input.unverifiedPin, pinName: 'unverified pin' },
    { label: 'discovery_daily_grant vetted arm', value: arms.vetted, pin: input.vettedPin, pinName: 'vetted pin' },
  ];
  for (const row of rows) {
    if (row.value !== row.pin) {
      problems.push(`${row.label} is ${row.value}, ${row.pinName} is ${row.pin}`);
    }
  }
  return problems.sort();
}

function lastGrantFunctionSql(oracle: string): string {
  const files = migrationFiles(oracle);
  let last: { path: string; text: string } | null = null;
  for (const file of files) {
    for (const statement of splitSqlStatements(file.text)) {
      if (GRANT_FUNCTION_HEAD.test(statement)) last = { path: file.path, text: statement };
    }
  }
  if (last === null) {
    throw new Error(
      `${oracle} found no migration defining public.discovery_daily_grant, so there is no SQL grant to compare. ` +
        'Refusing to report agreement.',
    );
  }
  return last.text;
}

function pinnedGrant(key: 'discoveryDailyCreditsUnverified' | 'discoveryDailyCreditsVetted'): number {
  const value = AT_CONFIG[key].value;
  if (typeof value !== 'number') {
    throw new Error(
      `grantPinProblems: ${key} is not a pinned number (${JSON.stringify(value)}). Refusing to report agreement.`,
    );
  }
  return value;
}

export function grantPinProblems(): string[] {
  const unverifiedPin = pinnedGrant('discoveryDailyCreditsUnverified');
  const vettedPin = pinnedGrant('discoveryDailyCreditsVetted');
  const problems = scanGrantPins({
    unverifiedPin,
    vettedPin,
    typescriptUnverified: DISCOVERY_DAILY_GRANT.unverified,
    typescriptVetted: DISCOVERY_DAILY_GRANT.vetted,
    grantFunctionSql: lastGrantFunctionSql('grantPinProblems'),
  });
  if (dailyGrantFor('unverified') !== unverifiedPin) {
    problems.push(`dailyGrantFor('unverified') is ${dailyGrantFor('unverified')}, unverified pin is ${unverifiedPin}`);
  }
  if (dailyGrantFor('vetted') !== vettedPin) {
    problems.push(`dailyGrantFor('vetted') is ${dailyGrantFor('vetted')}, vetted pin is ${vettedPin}`);
  }
  return [...new Set(problems)].sort();
}

const ALLOWANCE_FUNCTION_HEAD = /create\s+(?:or\s+replace\s+)?function\s+public\.discovery_allowance\s*\(/i;
const RAISE_EXCEPTION = /raise\s+exception\s+'((?:[^']|'')*)'([^;]*);/gi;
const ERRCODE_P0001 = /errcode\s*=\s*'P0001'/i;
const RAISE_DETAIL = /detail\s*=\s*'([^']+)'/i;
const GRANT_FROM_FUNCTION = /^public\.discovery_daily_grant\(\s*true\s*\)$/i;
const REMAINING_ARG = /^(?:v_remaining|v_granted\s*-\s*v_spent)$/i;
const VETTED_GRANT_READ = /dailyGrantFor\(\s*['"]vetted['"]\s*\)/;
const EXHAUSTED_DETAIL = 'daily-allowance-exhausted';
const EXCEEDS_DETAIL = 'debit-exceeds-remaining';

export type DebitRefusalRaise = {
  format: string;
  args: string[];
  detail: string;
};

export type ExhaustedSentenceInput = {
  organizationId: string;
  vettedGrant: number;
  remaining: number;
  exhaustedUnverified: string;
  exhaustedVetted: string;
  exceedsRemaining: string;
  allowanceFunctionSql: string;
  typescriptExhaustedRendererSource: string;
  typescriptExceedsRemainingRendererSource: string;
};

function parseRaiseArgs(tail: string): { args: string[]; using: string } | null {
  const usingMatch = /\s+using\s+/i.exec(tail);
  if (usingMatch === null || usingMatch.index === undefined) return null;
  const before = tail.slice(0, usingMatch.index).trim();
  const using = tail.slice(usingMatch.index + usingMatch[0].length);
  const list = before.startsWith(',') ? before.slice(1).trim() : before;
  if (list === '') return { args: [], using };
  const args: string[] = [];
  let current = '';
  let depth = 0;
  for (const ch of list) {
    if (ch === '(') {
      depth += 1;
      current += ch;
      continue;
    }
    if (ch === ')') {
      depth -= 1;
      current += ch;
      continue;
    }
    if (ch === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim() !== '') args.push(current.trim());
  return { args, using };
}

/** Every P0001 debit raise inside `public.discovery_allowance`. Throws when the function cannot be read. */
export function parseDebitRefusalRaises(sql: string): DebitRefusalRaise[] {
  if (!ALLOWANCE_FUNCTION_HEAD.test(sql)) {
    throw new Error(
      'parseDebitRefusalRaises found no public.discovery_allowance definition in the SQL it was given. ' +
        'Refusing to report agreement.',
    );
  }
  RAISE_EXCEPTION.lastIndex = 0;
  const found: DebitRefusalRaise[] = [];
  for (const match of sql.matchAll(RAISE_EXCEPTION)) {
    const tail = match[2] ?? '';
    if (!ERRCODE_P0001.test(tail)) continue;
    const parsed = parseRaiseArgs(tail);
    const detailMatch = RAISE_DETAIL.exec(tail);
    if (parsed === null || detailMatch === null || detailMatch[1] === undefined) {
      throw new Error(
        'parseDebitRefusalRaises could not read a P0001 raise as a format string, arguments, and a detail. ' +
          'Refusing to report agreement.',
      );
    }
    found.push({
      format: (match[1] ?? '').replace(/''/g, "'"),
      args: parsed.args,
      detail: detailMatch[1],
    });
  }
  return found;
}

function extractExportedFunction(source: string, name: string): string {
  const head = new RegExp(`export function ${name}\\(`);
  const start = source.search(head);
  if (start < 0) {
    throw new Error(`parseTypescriptSentenceRenderer found no export function ${name}. Refusing to report agreement.`);
  }
  const brace = source.indexOf('{', start);
  if (brace < 0) {
    throw new Error(`parseTypescriptSentenceRenderer could not read the body of ${name}. Refusing to report agreement.`);
  }
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTick = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    const prev = i > 0 ? source[i - 1] : '';
    if (inSingle) {
      if (ch === "'" && prev !== '\\') inSingle = false;
      continue;
    }
    if (inDouble) {
      if (ch === '"' && prev !== '\\') inDouble = false;
      continue;
    }
    if (inTick) {
      if (ch === '`' && prev !== '\\') inTick = false;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === '`') {
      inTick = true;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        let end = i + 1;
        if (source[end] === '\r') end += 1;
        if (source[end] === '\n') end += 1;
        return source.slice(start, end);
      }
    }
  }
  throw new Error(`parseTypescriptSentenceRenderer could not read the body of ${name}. Refusing to report agreement.`);
}

/** The exported TypeScript exhausted renderer. */
export function parseTypescriptExhaustedRenderer(source: string): string {
  return extractExportedFunction(source, 'dailyAllowanceExhaustedReason');
}

/** The exported TypeScript oversize-debit renderer. */
export function parseTypescriptExceedsRemainingRenderer(source: string): string {
  return extractExportedFunction(source, 'debitExceedsRemainingReason');
}

function applyRaiseFormat(format: string, values: readonly string[]): string {
  let index = 0;
  return format.replace(/%/g, () => {
    const value = values[index];
    index += 1;
    if (value === undefined) {
      throw new Error(
        'applyRaiseFormat ran out of values before the format string ran out of % slots. Refusing to report agreement.',
      );
    }
    return value;
  });
}

function slotCount(format: string): number {
  return (format.match(/%/g) ?? []).length;
}

function findRaise(
  raises: readonly DebitRefusalRaise[],
  detail: string,
  label: string,
  match: (raise: DebitRefusalRaise) => boolean,
): DebitRefusalRaise {
  const hits = raises.filter((raise) => raise.detail === detail && match(raise));
  if (hits.length !== 1 || hits[0] === undefined) {
    throw new Error(
      `scanExhaustedSentence could not read exactly one ${label} raise. Refusing to report agreement.`,
    );
  }
  return hits[0];
}

function checkOrganizationArg(raise: DebitRefusalRaise, label: string, problems: string[]): void {
  if (raise.args[0] !== 'p_organization_id') {
    problems.push(`${label} organisation argument is ${raise.args[0] ?? '(missing)'}, expected p_organization_id`);
  }
}

function checkNoNumeral(format: string, label: string, problems: string[]): void {
  if (/\d/.test(format)) problems.push(`the SQL ${label} sentence contains a numeric literal`);
}

/** Every disagreement between a TypeScript debit renderer and its SQL raise. Compares every arm. */
export function scanExhaustedSentence(input: ExhaustedSentenceInput): string[] {
  const raises = parseDebitRefusalRaises(input.allowanceFunctionSql);
  const unverified = findRaise(
    raises,
    EXHAUSTED_DETAIL,
    'unverified exhausted',
    (raise) => raise.args.length === 2,
  );
  const vetted = findRaise(
    raises,
    EXHAUSTED_DETAIL,
    'vetted exhausted',
    (raise) => raise.args.length === 1,
  );
  const exceeds = findRaise(raises, EXCEEDS_DETAIL, 'exceeds-remaining', () => true);

  if (slotCount(unverified.format) !== 2 || unverified.args.length !== 2) {
    throw new Error(
      'scanExhaustedSentence could not read the unverified exhausted raise as a format string, ' +
        'p_organization_id, and a grant argument. Refusing to report agreement.',
    );
  }
  if (slotCount(vetted.format) !== 1 || vetted.args.length !== 1) {
    throw new Error(
      'scanExhaustedSentence could not read the vetted exhausted raise as a format string and p_organization_id. ' +
        'Refusing to report agreement.',
    );
  }
  if (slotCount(exceeds.format) !== 2 || exceeds.args.length !== 2) {
    throw new Error(
      'scanExhaustedSentence could not read the exceeds-remaining raise as a format string, ' +
        'p_organization_id, and a remaining argument. Refusing to report agreement.',
    );
  }

  const problems: string[] = [];
  checkOrganizationArg(unverified, 'unverified exhausted raise', problems);
  checkOrganizationArg(vetted, 'vetted exhausted raise', problems);
  checkOrganizationArg(exceeds, 'exceeds-remaining raise', problems);

  const grantArg = unverified.args[1] ?? '';
  if (!GRANT_FROM_FUNCTION.test(grantArg)) {
    problems.push(`exhausted raise grant argument is ${grantArg}, expected public.discovery_daily_grant(true)`);
  }
  const remainingArg = exceeds.args[1] ?? '';
  if (!REMAINING_ARG.test(remainingArg)) {
    problems.push(`exceeds-remaining remaining argument is ${remainingArg}, expected v_remaining or v_granted - v_spent`);
  }

  checkNoNumeral(unverified.format, 'unverified exhausted', problems);
  checkNoNumeral(vetted.format, 'vetted exhausted', problems);
  checkNoNumeral(exceeds.format, 'exceeds-remaining', problems);

  if (!VETTED_GRANT_READ.test(input.typescriptExhaustedRendererSource)) {
    problems.push("dailyAllowanceExhaustedReason does not read the vetted grant from dailyGrantFor('vetted')");
  }
  if (/\b\d+\b/.test(input.typescriptExhaustedRendererSource)) {
    problems.push('dailyAllowanceExhaustedReason contains a numeric literal');
  }
  if (/\b\d+\b/.test(input.typescriptExceedsRemainingRendererSource)) {
    problems.push('debitExceedsRemainingReason contains a numeric literal');
  }

  const unverifiedFromSql = applyRaiseFormat(unverified.format, [input.organizationId, String(input.vettedGrant)]);
  if (unverifiedFromSql !== input.exhaustedUnverified) {
    problems.push(
      `TypeScript unverified exhausted sentence is ${JSON.stringify(input.exhaustedUnverified)}, ` +
        `SQL raise filled with the vetted grant is ${JSON.stringify(unverifiedFromSql)}`,
    );
  }
  const vettedFromSql = applyRaiseFormat(vetted.format, [input.organizationId]);
  if (vettedFromSql !== input.exhaustedVetted) {
    problems.push(
      `TypeScript vetted exhausted sentence is ${JSON.stringify(input.exhaustedVetted)}, ` +
        `SQL raise filled is ${JSON.stringify(vettedFromSql)}`,
    );
  }
  const exceedsFromSql = applyRaiseFormat(exceeds.format, [input.organizationId, String(input.remaining)]);
  if (exceedsFromSql !== input.exceedsRemaining) {
    problems.push(
      `TypeScript exceeds-remaining sentence is ${JSON.stringify(input.exceedsRemaining)}, ` +
        `SQL raise filled with remaining is ${JSON.stringify(exceedsFromSql)}`,
    );
  }
  return problems.sort();
}

function lastAllowanceFunctionSql(oracle: string): string {
  const files = migrationFiles(oracle);
  let last: { path: string; text: string } | null = null;
  for (const file of files) {
    for (const statement of splitSqlStatements(file.text)) {
      if (ALLOWANCE_FUNCTION_HEAD.test(statement)) last = { path: file.path, text: statement };
    }
  }
  if (last === null) {
    throw new Error(
      `${oracle} found no migration defining public.discovery_allowance, so there is no SQL raise to compare. ` +
        'Refusing to report agreement.',
    );
  }
  return last.text;
}

function typescriptRendererFile(oracle: string): string {
  const path = join(REPO_ROOT, 'supabase', 'functions', '_shared', 'discovery-allowance.ts');
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(
      `${oracle} could not read ${posix(path)}: ${(error as Error).message}. Refusing to report agreement.`,
    );
  }
}

export function exhaustedSentenceProblems(): string[] {
  const organizationId = '00000000-0000-4000-8000-000000000002';
  const remaining = remainingCredits(dailyGrantFor('unverified'), 0);
  const rendererFile = typescriptRendererFile('exhaustedSentenceProblems');
  return scanExhaustedSentence({
    organizationId,
    vettedGrant: dailyGrantFor('vetted'),
    remaining,
    exhaustedUnverified: dailyAllowanceExhaustedReason(organizationId, 'unverified'),
    exhaustedVetted: dailyAllowanceExhaustedReason(organizationId, 'vetted'),
    exceedsRemaining: debitExceedsRemainingReason(organizationId, remaining),
    allowanceFunctionSql: lastAllowanceFunctionSql('exhaustedSentenceProblems'),
    typescriptExhaustedRendererSource: parseTypescriptExhaustedRenderer(rendererFile),
    typescriptExceedsRemainingRendererSource: parseTypescriptExceedsRemainingRenderer(rendererFile),
  });
}

const EMAIL_UNVERIFIED_DETAIL = 'email-unverified';

export type EmailUnverifiedSentenceInput = {
  accountId: string;
  typescriptReason: string;
  allowanceFunctionSql: string;
  typescriptRendererSource: string;
};

/** The email-unverified raise inside `public.discovery_allowance`. Throws when it cannot be read. */
export function parseEmailUnverifiedRaise(sql: string): DebitRefusalRaise {
  if (!ALLOWANCE_FUNCTION_HEAD.test(sql)) {
    throw new Error(
      'parseEmailUnverifiedRaise found no public.discovery_allowance definition in the SQL it was given. ' +
        'Refusing to report agreement.',
    );
  }
  RAISE_EXCEPTION.lastIndex = 0;
  const found: DebitRefusalRaise[] = [];
  for (const match of sql.matchAll(RAISE_EXCEPTION)) {
    const tail = match[2] ?? '';
    const detailMatch = RAISE_DETAIL.exec(tail);
    if (detailMatch === null || detailMatch[1] !== EMAIL_UNVERIFIED_DETAIL) continue;
    const parsed = parseRaiseArgs(tail);
    if (parsed === null) {
      throw new Error(
        'parseEmailUnverifiedRaise could not read the email-unverified raise as a format string, arguments, and a detail. ' +
          'Refusing to report agreement.',
      );
    }
    found.push({
      format: (match[1] ?? '').replace(/''/g, "'"),
      args: parsed.args,
      detail: EMAIL_UNVERIFIED_DETAIL,
    });
  }
  if (found.length !== 1 || found[0] === undefined) {
    throw new Error(
      'parseEmailUnverifiedRaise could not read exactly one email-unverified raise. Refusing to report agreement.',
    );
  }
  return found[0];
}

/** The exported TypeScript email-unverified renderer. */
export function parseTypescriptEmailUnverifiedRenderer(source: string): string {
  return extractExportedFunction(source, 'emailUnverifiedReason');
}

/** Every disagreement between the TypeScript email-unverified renderer and its SQL raise. */
export function scanEmailUnverifiedSentence(input: EmailUnverifiedSentenceInput): string[] {
  if (input.typescriptRendererSource.trim() === '') {
    throw new Error(
      'scanEmailUnverifiedSentence was given an empty TypeScript renderer. Refusing to report agreement.',
    );
  }
  const raise = parseEmailUnverifiedRaise(input.allowanceFunctionSql);
  if (slotCount(raise.format) !== 1 || raise.args.length !== 1) {
    throw new Error(
      'scanEmailUnverifiedSentence could not read the email-unverified raise as a format string and p_account_id. ' +
        'Refusing to report agreement.',
    );
  }

  const problems: string[] = [];
  if (raise.args[0] !== 'p_account_id') {
    problems.push(`email-unverified account argument is ${raise.args[0] ?? '(missing)'}, expected p_account_id`);
  }
  checkNoNumeral(raise.format, 'email-unverified', problems);
  if (/\b\d+\b/.test(input.typescriptRendererSource)) {
    problems.push('emailUnverifiedReason contains a numeric literal');
  }

  const fromSql = applyRaiseFormat(raise.format, [input.accountId]);
  if (fromSql !== input.typescriptReason) {
    problems.push(
      `TypeScript email-unverified sentence is ${JSON.stringify(input.typescriptReason)}, ` +
        `SQL raise filled with the account id is ${JSON.stringify(fromSql)}`,
    );
  }
  return problems.sort();
}

export function emailUnverifiedSentenceProblems(): string[] {
  const accountId = '00000000-0000-4000-8000-000000000022';
  const rendererFile = typescriptRendererFile('emailUnverifiedSentenceProblems');
  return scanEmailUnverifiedSentence({
    accountId,
    typescriptReason: emailUnverifiedReason(accountId),
    allowanceFunctionSql: lastAllowanceFunctionSql('emailUnverifiedSentenceProblems'),
    typescriptRendererSource: parseTypescriptEmailUnverifiedRenderer(rendererFile),
  });
}

/**
 * The vetting definer refuses a notice whose channels are not the decision class default, and it
 * names that set in SQL. The shipped taxonomy names the same set in TypeScript. Two places, one
 * rule, so this arm pins them the way the grant arm pins the grants.
 *
 * WHY THE SET IS IN SQL AT ALL. The definer must refuse a caller list the taxonomy did not
 * authorise, before any write, and a definer cannot read a TypeScript module. The alternative was
 * to trust the caller, which is the hole the design named and this run closed.
 */
const DEFINER_AUTHORIZED_CHANNELS = /v_authorized\s*:=\s*'(\[[^']*\])'::jsonb/i;

export function scanNoticeChannelPin(input: { definerSql: string; taxonomyChannels: readonly string[] }): string[] {
  const match = DEFINER_AUTHORIZED_CHANNELS.exec(input.definerSql);
  if (match === null || match[1] === undefined) {
    throw new Error(
      'scanNoticeChannelPin could not read the authorised channel set out of public.set_organization_vetting. ' +
        'Refusing to report agreement.',
    );
  }
  let fromSql: unknown;
  try {
    fromSql = JSON.parse(match[1]);
  } catch {
    throw new Error(
      `scanNoticeChannelPin could not parse ${match[1]} as JSON. Refusing to report agreement.`,
    );
  }
  if (!Array.isArray(fromSql) || fromSql.some((channel) => typeof channel !== 'string')) {
    throw new Error(
      `scanNoticeChannelPin read ${match[1]}, which is not an array of strings. Refusing to report agreement.`,
    );
  }
  const sqlSet = [...(fromSql as string[])].sort();
  const taxonomySet = [...input.taxonomyChannels].sort();
  if (JSON.stringify(sqlSet) !== JSON.stringify(taxonomySet)) {
    return [
      `the definer authorises ${JSON.stringify(sqlSet)} but the taxonomy's vetting.outcome resolves to ${JSON.stringify(taxonomySet)}`,
    ];
  }
  return [];
}

function lastVettingDefinerSql(oracle: string): string {
  let last: string | null = null;
  for (const file of migrationFiles(oracle)) {
    for (const statement of splitSqlStatements(file.text)) {
      if (DEFINER_HEAD.test(statement)) last = statement;
    }
  }
  if (last === null) {
    throw new Error(
      `${oracle} found no migration defining public.${VETTING_DEFINER}, so there is no authorised channel set to compare. ` +
        'Refusing to report agreement.',
    );
  }
  return last;
}

export function noticeChannelPinProblems(): string[] {
  const row = taxonomyRow('vetting.outcome');
  if (row === undefined) {
    throw new Error('noticeChannelPinProblems found no vetting.outcome row in the taxonomy. Refusing to report agreement.');
  }
  return scanNoticeChannelPin({
    definerSql: lastVettingDefinerSql('noticeChannelPinProblems'),
    taxonomyChannels: channelsFor(row),
  });
}
