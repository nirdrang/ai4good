/**
 * Live proof of the Discovery brief store.
 *
 *   bun loop/items/AI4DEV-181/evidence/unit1/prove.ts
 *
 * Seeds revision 1 through the database as the operator, then over HTTP edits,
 * accepts, finishes, edits again, and reads revisions 2, 3, 3, 4. A stale base
 * answers stale-revision. The transcript is transcript.txt beside this file.
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { openingDocument } from '../../../../../supabase/functions/_shared/discovery-brief.ts';
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

function briefOf(json: Record<string, unknown>): { revision: unknown; confirmationRevision: unknown; lineIds: string[] } {
  const brief = json.brief;
  const confirmation = json.confirmation;
  const personLines = Array.isArray(json.lines) ? json.lines : [];
  const revision = brief !== null && typeof brief === 'object' && 'revision' in brief ? brief.revision : null;
  const confirmationRevision = confirmation !== null && typeof confirmation === 'object' && 'revision' in confirmation
    ? confirmation.revision : null;
  const lineIds = personLines.flatMap((line) => (
    line !== null && typeof line === 'object' && 'id' in line && typeof line.id === 'string' ? [line.id] : []
  ));
  return { revision, confirmationRevision, lineIds };
}

function numbers(rows: { revision: number | string }[]): string {
  return rows.map((row) => String(Number(row.revision))).join(',');
}

async function main(): Promise<number> {
  const stack = stackFromLocalStatus(repoRoot);
  const live = await createLiveAdapter({ stack });
  const sql = sqlClient(stack);
  try {
    const sut = live.sut.discovery;
    const stamp = Date.now();
    const email = `unit1-brief-${stamp}@example.com`;
    const ngo = await sut.provisionNgo(email, { emailVerified: true });
    const admin = await sut.provisionPlatformAdmin(`unit1-admin-${stamp}@example.com`);
    await sut.vetOrganizationAsAdmin(admin, ngo.organizationId);
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const opening = openingDocument({ need: GRANT_TRACKER.intake.description });
    const inserted = await sql`insert into public.brief_revisions (project_id, revision, document, created_by)
      values (${projectId}::uuid, 1, ${JSON.stringify(opening.document)}::text::jsonb, ${ngo.accountId}::uuid)
      returning revision` as { revision: number | string }[];
    record('seed', 'the operator inserted the opening brief at revision 1', inserted.length === 1 && Number(inserted[0]?.revision) === 1, `rows ${inserted.length}`);

    const signed = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password: PASSWORD });
    const token = typeof signed.json.access_token === 'string' ? signed.json.access_token : '';
    if (token === '') {
      record('signin', 'the organisation admin signed in', false, `status ${signed.status}`);
      return 1;
    }

    const post = (body: Record<string, unknown>) => functionPost(stack, 'discovery-brief', {
      organizationId: ngo.organizationId, projectId, ...body,
    }, token);

    const edited = await post({ action: 'edit', sectionId: 'need', text: 'A shared list of funder reporting deadlines.', baseRevision: 1 });
    const editedView = briefOf(edited.json);
    record('edit', 'an edit answers revision 2', edited.status === 200 && editedView.revision === 2 && editedView.lineIds.includes('you-2'), `status ${edited.status} revision ${String(editedView.revision)} lines ${editedView.lineIds.join(',') || 'none'} kind ${String(edited.json.kind ?? '')} reason ${String(edited.json.reason ?? '')}`);

    const accepted = await post({ action: 'accept', topicId: 'priority', baseRevision: 2 });
    const acceptedView = briefOf(accepted.json);
    record('accept', 'accepting the priority suggestion answers revision 3', accepted.status === 200 && acceptedView.revision === 3 && acceptedView.lineIds.includes('you-3'), `status ${accepted.status} revision ${String(acceptedView.revision)} lines ${acceptedView.lineIds.join(',') || 'none'} kind ${String(accepted.json.kind ?? '')} reason ${String(accepted.json.reason ?? '')}`);

    const finished = await post({ action: 'finish', revision: 3, acks: { reviewed: true, openGaps: true, data: false } });
    const finishedView = briefOf(finished.json);
    record('finish', 'finish keeps revision 3 and records the confirmation', finished.status === 200 && finishedView.revision === 3 && finishedView.confirmationRevision === 3, `status ${finished.status} revision ${String(finishedView.revision)} confirmation ${String(finishedView.confirmationRevision)} kind ${String(finished.json.kind ?? '')} reason ${String(finished.json.reason ?? '')}`);

    const editedAgain = await post({ action: 'edit', sectionId: 'need', text: 'A shared list of funder reporting deadlines, with reminders.', baseRevision: 3 });
    const editedAgainView = briefOf(editedAgain.json);
    record('edit-again', 'a later edit answers revision 4 and the confirmation is no longer current', editedAgain.status === 200 && editedAgainView.revision === 4 && editedAgainView.confirmationRevision === null && editedAgainView.lineIds.includes('you-4'), `status ${editedAgain.status} revision ${String(editedAgainView.revision)} confirmation ${String(editedAgainView.confirmationRevision)} lines ${editedAgainView.lineIds.join(',') || 'none'} kind ${String(editedAgain.json.kind ?? '')} reason ${String(editedAgain.json.reason ?? '')}`);

    const revisions = await sql`select revision from public.brief_revisions where project_id = ${projectId}::uuid order by revision` as { revision: number | string }[];
    const confirmations = await sql`select revision from public.discovery_confirmations where project_id = ${projectId}::uuid order by revision` as { revision: number | string }[];
    record('chain', 'the stored revisions are 1, 2, 3, 4 and the confirmation history is revision 3', numbers(revisions) === '1,2,3,4' && numbers(confirmations) === '3', `revisions ${numbers(revisions) || 'none'} confirmations ${numbers(confirmations) || 'none'}`);

    const stale = await post({ action: 'edit', sectionId: 'need', text: 'This edit names an old revision.', baseRevision: 2 });
    const staleBrief = briefOf(stale.json);
    record('stale', 'a stale base answers stale-revision and carries revision 4', stale.status === 409 && stale.json.kind === 'stale-revision' && staleBrief.revision === 4, `status ${stale.status} kind ${String(stale.json.kind ?? '')} brief ${String(staleBrief.revision)} reason ${String(stale.json.reason ?? '')}`);

    const conversation = await functionPost(stack, 'discovery-conversation', { projectId }, token);
    const conversationBrief = briefOf(conversation.json);
    const conversationBody = conversation.json.conversation;
    const projectMatches = conversationBody !== null && typeof conversationBody === 'object' && 'projectId' in conversationBody && conversationBody.projectId === projectId && 'turns' in conversationBody && Array.isArray(conversationBody.turns);
    record('read', 'the conversation returns the brief, an empty current confirmation and the person lines beside the conversation', conversation.status === 200 && conversation.json.ok === true && conversationBrief.revision === 4 && conversationBrief.confirmationRevision === null && conversationBrief.lineIds.length === 3 && projectMatches, `status ${conversation.status} revision ${String(conversationBrief.revision)} confirmation ${String(conversationBrief.confirmationRevision)} lines ${conversationBrief.lineIds.join(',') || 'none'}`);
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
