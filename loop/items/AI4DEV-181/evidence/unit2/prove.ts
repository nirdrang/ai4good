/**
 * Live proof of the Discovery reply turn on the local stack.
 *
 *   bun loop/items/AI4DEV-181/evidence/unit2/prove.ts
 *
 * Opens a seeded project, sends one answered turn, repeats that message id,
 * refuses a changed charge, and reloads the conversation. The transcript is
 * transcript.txt beside this file.
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stackFromLocalStatus } from '../../../../../tests/at/harness/local-stack.ts';
import { authPost, functionPost, redactString, sqlClient } from '../../../../../tests/at/harness/live-stack.ts';
import { GRANT_TRACKER } from '../../../../../tests/at/suites/req-004/fixtures/grant-tracker.ts';
import { createLiveAdapter } from '../../../../../tests/at/suites/req-004/_live.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../../../');
const transcriptPath = resolve(here, 'transcript.txt');
const lines: string[] = [];
const PASSWORD = 'correct horse battery staple';

function note(text: string): string {
  return redactString(text)
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-db-url]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
}

function record(id: string, title: string, passed: boolean, detail: string): void {
  const line = `${passed ? 'PASS' : 'FAIL'} (${id}) ${title} — ${note(detail)}`;
  lines.push(line);
  console.log(line);
}

type Event = Record<string, unknown>;

function eventsOf(text: string): Event[] {
  const events: Event[] = [];
  for (const block of text.split('\n\n')) {
    const line = block.split('\n').find((item) => item.startsWith('data:'));
    if (!line) continue;
    const data = line.slice(5).trim();
    if (data === '[DONE]') {
      events.push({ type: 'done' });
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(data);
      events.push(parsed !== null && typeof parsed === 'object' ? parsed as Event : { type: 'unparsed' });
    } catch {
      events.push({ type: 'unparsed' });
    }
  }
  return events;
}

function eventTypes(events: readonly Event[]): string {
  return events.map((event) => String(event.type ?? 'unknown')).join(',');
}

function textOf(events: readonly Event[]): string {
  return events
    .filter((event) => event.type === 'text-delta' && typeof event.delta === 'string')
    .map((event) => event.delta)
    .join('');
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => sameValue(item, right[index]));
  }
  if (left !== null && right !== null && typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const keys = Object.keys(leftRecord);
    return keys.length === Object.keys(rightRecord).length && keys.every((key) => sameValue(leftRecord[key], rightRecord[key]));
  }
  return false;
}

function persistedFromStream(events: readonly Event[]): { id: string; parts: { type: string; id?: string; text?: string; data?: unknown }[] } | null {
  const start = events.find((event) => event.type === 'start');
  if (!start || typeof start.messageId !== 'string') return null;
  const parts: { type: string; id?: string; text?: string; data?: unknown }[] = [
    { type: 'text', id: 'reply', text: textOf(events) },
  ];
  for (const event of events) {
    if (typeof event.type !== 'string' || !event.type.startsWith('data-') || event.transient === true) continue;
    parts.push({ type: event.type, data: event.data });
  }
  return { id: start.messageId, parts };
}

function orderOk(events: readonly Event[], expectFiled: boolean): boolean {
  const types = events.map((event) => String(event.type ?? ''));
  const end = types.indexOf('text-end');
  const finish = types.indexOf('finish');
  if (types[0] !== 'start' || types[1] !== 'text-start' || end < 2 || finish < end) return false;
  if (!types.slice(2, end).every((type) => type === 'text-delta')) return false;
  const tail = types.slice(end + 1, finish);
  let index = 0;
  if (expectFiled) {
    if (tail[index] !== 'data-filed') return false;
    index += 1;
  }
  if (tail[index] !== 'data-charge') return false;
  index += 1;
  while (tail[index] === 'data-question') index += 1;
  if (tail[index] === 'data-ready') index += 1;
  return tail[index] === 'data-brief' && tail[index + 1] === 'data-usage' && index + 2 === tail.length
    && events[end + 1 + index]?.transient === true
    && events[end + 1 + index + 1]?.transient === true;
}

type Sql = ReturnType<typeof sqlClient>;

async function spentCredits(sql: Sql, organizationId: string): Promise<number> {
  const rows = await sql`select coalesce(sum(spent), 0)::integer as spent
    from public.discovery_spend
    where org_id = ${organizationId}::uuid` as { spent: number | string }[];
  return Number(rows[0]?.spent ?? 0);
}

async function main(): Promise<number> {
  const stack = stackFromLocalStatus(repoRoot);
  const live = await createLiveAdapter({ stack });
  const sql = sqlClient(stack);
  try {
    const sut = live.sut.discovery;
    const stamp = Date.now();
    const email = `unit2-turn-${stamp}@example.com`;
    const ngo = await sut.provisionNgo(email, { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const signed = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password: PASSWORD });
    const token = typeof signed.json.access_token === 'string' ? signed.json.access_token : '';
    if (token === '') {
      record('signin', 'the organisation admin signed in', false, `status ${signed.status}`);
      return 1;
    }

    const streamPost = async (body: Record<string, unknown>) => {
      const response = await fetch(`${stack.apiUrl.replace(/\/$/, '')}/functions/v1/discovery-message`, {
        method: 'POST',
        headers: {
          apikey: stack.anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ organizationId: ngo.organizationId, projectId, ...body }),
        signal: AbortSignal.timeout(180_000),
      });
      return { status: response.status, text: await response.text(), contentType: response.headers.get('content-type') ?? '' };
    };

    const opening = await streamPost({
      mode: 'opening', userMessageId: `unit2-open-${stamp}`, message: '',
    });
    const openingEvents = eventsOf(opening.text);
    const openingMessage = persistedFromStream(openingEvents);
    const openingTurns = await sql`select billing, status, reserved_credits, charged_credits
      from public.discovery_turns where project_id = ${projectId}::uuid order by seq` as {
      billing: string; status: string; reserved_credits: number; charged_credits: number | null;
    }[];
    const revisions = await sql`select revision from public.brief_revisions
      where project_id = ${projectId}::uuid order by revision` as { revision: number | string }[];
    const spentAfterOpen = await spentCredits(sql, ngo.organizationId);
    const opened = opening.status === 200
      && openingMessage !== null
      && orderOk(openingEvents, openingEvents.some((event) => event.type === 'data-filed'))
      && revisions.length === 1 && Number(revisions[0]?.revision) === 1
      && openingTurns.length === 1
      && openingTurns[0]?.billing === 'opening'
      && openingTurns[0]?.status === 'settled'
      && openingTurns[0]?.reserved_credits === 0
      && openingTurns[0]?.charged_credits === 0
      && spentAfterOpen === 0;
    record('opening', 'opening creates revision 1, the first reply, and charges nothing', opened, `status ${opening.status} events ${eventTypes(openingEvents)} revisions ${revisions.map((row) => String(row.revision)).join(',') || 'none'} turns ${openingTurns.length} billing ${openingTurns[0]?.billing ?? 'none'} spent ${spentAfterOpen} type ${opening.contentType} body ${opening.text.slice(0, 400)}`);
    if (!opened || openingMessage === null) return 1;

    const again = await streamPost({ mode: 'opening', userMessageId: `unit2-open-again-${stamp}`, message: '' });
    const againMessage = persistedFromStream(eventsOf(again.text));
    const turnsAfterAgain = await sql`select count(*)::integer as count from public.discovery_turns
      where project_id = ${projectId}::uuid` as { count: number | string }[];
    const spentAfterAgain = await spentCredits(sql, ngo.organizationId);
    record('opening-again', 'a second opening returns the stored opening and charges nothing', again.status === 200 && againMessage?.id === openingMessage.id && Number(turnsAfterAgain[0]?.count) === 1 && spentAfterAgain === 0, `status ${again.status} id ${againMessage?.id ?? 'none'} turns ${String(turnsAfterAgain[0]?.count ?? 'none')} spent ${spentAfterAgain}`);

    const question = openingEvents.find((event) => event.type === 'data-question');
    const data = question?.data;
    const questionData = data !== null && typeof data === 'object' ? data as {
      id?: unknown; suggestedId?: unknown; suggestions?: { id?: unknown; label?: unknown; answer?: unknown }[];
    } : null;
    const questionId = typeof questionData?.id === 'string' ? questionData.id : '';
    const choice = typeof questionData?.suggestedId === 'string' ? questionData.suggestedId : '';
    const option = questionData?.suggestions?.find((item) => item.id === choice) ?? questionData?.suggestions?.[0];
    const answerText = typeof option?.answer === 'string' && option.answer.length > 0
      ? option.answer
      : typeof option?.label === 'string' ? option.label : '';
    if (questionId === '' || choice === '' || answerText === '') {
      record('answer', 'the opening asked a question the turn can answer', false, `question ${questionId || 'none'} choice ${choice || 'none'}`);
      return 1;
    }

    const userMessageId = `unit2-answer-${stamp}`;
    const noteText = 'The coordinators should spend less time on the rota.';
    const answered = await streamPost({
      mode: 'answer', userMessageId, message: noteText, expectedCharge: 'free',
      answers: [{ questionId, choice, text: answerText, certain: true }],
    });
    const answerEvents = eventsOf(answered.text);
    const answerMessage = persistedFromStream(answerEvents);
    const filed = answerEvents.some((event) => event.type === 'data-filed');
    const after = await sql`select revision, document from public.brief_revisions
      where project_id = ${projectId}::uuid order by revision desc limit 1` as {
      revision: number | string; document: unknown;
    }[];
    const rawDocument = after[0]?.document;
    const document = typeof rawDocument === 'string' ? JSON.parse(rawDocument) as {
      topics?: Record<string, { state?: { kind?: string; answer?: string } }>;
    } : rawDocument as { topics?: Record<string, { state?: { kind?: string; answer?: string } }> } | undefined;
    const topic = document?.topics?.[questionId];
    const turns = await sql`select user_message_id, billing, status, charged_credits, assistant_ui
      from public.discovery_turns where project_id = ${projectId}::uuid order by seq` as {
      user_message_id: string | null; billing: string; status: string; charged_credits: number | null;
      assistant_ui: { id?: string; parts?: unknown } | null;
    }[];
    const answerTurn = turns.find((turn) => turn.user_message_id === userMessageId);
    const spentAfterAnswer = await spentCredits(sql, ngo.organizationId);
    const answerPassed = answered.status === 200
      && answerMessage !== null
      && orderOk(answerEvents, true)
      && filed
      && Number(after[0]?.revision) === 2
      && topic?.state?.kind === 'agreed'
      && topic.state.answer === answerText
      && answerTurn?.status === 'settled'
      && answerTurn.billing === 'free'
      && answerTurn.charged_credits === 1
      && spentAfterAnswer === 1;
    record('answer', 'one answered turn costs one credit, agrees the topic, and streams the parts in order', answerPassed, `status ${answered.status} events ${eventTypes(answerEvents)} revision ${String(after[0]?.revision ?? 'none')} topic ${topic?.state?.kind ?? 'none'} charged ${String(answerTurn?.charged_credits ?? 'none')} spent ${spentAfterAnswer}`);
    if (!answerPassed || answerMessage === null) return 1;

    const replay = await streamPost({
      mode: 'answer', userMessageId, message: noteText, expectedCharge: 'free',
      answers: [{ questionId, choice, text: answerText, certain: true }],
    });
    const replayMessage = persistedFromStream(eventsOf(replay.text));
    const spentAfterReplay = await spentCredits(sql, ngo.organizationId);
    const turnCount = await sql`select count(*)::integer as count from public.discovery_turns
      where project_id = ${projectId}::uuid` as { count: number | string }[];
    record('replay', 'the same message id returns the stored turn and charges nothing more', replay.status === 200 && replayMessage?.id === answerMessage.id && spentAfterReplay === 1 && Number(turnCount[0]?.count) === 2, `status ${replay.status} id ${replayMessage?.id ?? 'none'} spent ${spentAfterReplay} turns ${String(turnCount[0]?.count ?? 'none')}`);

    const changed = await streamPost({
      mode: 'answer', userMessageId: `unit2-changed-${stamp}`, message: 'Send this at the other price.',
      expectedCharge: 'paid', answers: [],
    });
    let changedBody: { kind?: unknown; reason?: unknown } = {};
    try {
      const parsed: unknown = JSON.parse(changed.text);
      if (parsed !== null && typeof parsed === 'object') changedBody = parsed as { kind?: unknown; reason?: unknown };
    } catch { /* a stream body is not a refusal */ }
    const spentAfterChanged = await spentCredits(sql, ngo.organizationId);
    record('mode-changed', 'a charge the screen did not show is refused and costs nothing', changed.status === 409 && changedBody.kind === 'mode-changed' && spentAfterChanged === 1, `status ${changed.status} kind ${String(changedBody.kind ?? '')} spent ${spentAfterChanged} reason ${String(changedBody.reason ?? '')}`);

    const conversation = await functionPost(stack, 'discovery-conversation', { projectId }, token);
    const conversationTurns = conversation.json.conversation;
    const loaded = conversationTurns !== null && typeof conversationTurns === 'object' && 'turns' in conversationTurns
      && Array.isArray(conversationTurns.turns)
      ? conversationTurns.turns.find((turn) => {
        if (turn === null || typeof turn !== 'object' || !('assistantUi' in turn)) return false;
        const ui = turn.assistantUi;
        return ui !== null && typeof ui === 'object' && 'id' in ui && ui.id === answerMessage.id;
      })
      : undefined;
    const loadedUi = loaded !== undefined && loaded !== null && typeof loaded === 'object' && 'assistantUi' in loaded
      ? loaded.assistantUi as { id?: string; parts?: unknown }
      : null;
    const sameParts = sameValue(loadedUi?.parts ?? null, answerMessage.parts);
    record('reload', 'the conversation returns the same assistant message id and parts', conversation.status === 200 && loadedUi?.id === answerMessage.id && sameParts, `status ${conversation.status} id ${loadedUi?.id ?? 'none'} parts ${sameParts ? 'match' : 'differ'}`);
  } finally {
    await sql.close();
    await live.teardown();
  }
  return lines.some((line) => line.startsWith('FAIL')) ? 1 : 0;
}

const exitCode = await main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  record('crash', 'the proof stopped on an error', false, message);
  return 1;
});
lines.push(exitCode === 0 ? 'RESULT pass' : 'RESULT fail');
writeFileSync(transcriptPath, `${lines.join('\n')}\n`, 'utf8');
process.exit(exitCode);
