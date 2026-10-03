import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stackFromLocalStatus } from '../../../../../tests/at/harness/local-stack.ts';
import { functionPost, restGet, sqlClient } from '../../../../../tests/at/harness/live-stack.ts';
import { createLiveAdapter } from '../../../../../tests/at/suites/req-003/_live.ts';
import { seedFileProject, uploadFile, waitForFile } from '../../../../../tests/at/suites/req-032/_files.ts';
import { discoveryPrepare, decideDiscoveryMessage, type CallerReads, type DiscoveryModelRequest } from '../../../../../supabase/functions/_shared/discovery-turn.ts';
import { DISCOVERY_SKILLS } from '../../../../../supabase/functions/_shared/discovery-skills/index.ts';
import { parseWriteStanding, writePipeline } from '../../../../../supabase/functions/_shared/write-routes.ts';
import type { FileRow } from '../../../../../supabase/functions/_shared/discovery-files.ts';

const transcript: unknown[] = [];
function record(step: string, data: unknown) {
  transcript.push({ step, data });
  console.log(`${step}: ${JSON.stringify(data)}`);
  writeFileSync(fileURLToPath(new URL('./transcript.json', import.meta.url)), JSON.stringify(transcript, null, 2) + '\n');
}

const stack = stackFromLocalStatus(process.cwd());
const adapter = await createLiveAdapter({ stack });
const email = `unit4-${Date.now()}@example.org`;
const seed = await seedFileProject(stack, adapter.sut.needs, email);
try {
  const org = seed.ngo.organizationId;
  const project = seed.projectId;
  const usageBefore = await adapter.sut.needs.readAllowance(seed.ngo.session, org);
  const smallText = 'We have 45 volunteers across three community kitchens. Coordinators spend four hours each week scheduling shifts. Sundays have two unfilled shifts. Our goal is to reduce scheduling to two hours each week.';
  const added = await uploadFile(stack, seed.bearer, org, project, 'small-rota.txt', smallText);
  assert.equal(added.status, 200, JSON.stringify(added));
  const smallId = String((added.body.file as { id: string }).id);
  record('small upload starts reading', added);
  const small = await waitForFile(stack, seed.bearer, project, smallId);
  assert.ok(small.facts_count > 0);
  record('small file read', { status: small.status, facts: small.facts_count, digest: small.digest });
  const revisionRows = await seed.sql`select revision, document from public.brief_revisions where project_id = ${project}::uuid order by revision desc limit 1` as { revision: number; document: { fileFacts?: { source: { kind: string; fileId: string } }[]; topics: Record<string, { required: boolean; state: { kind: string } }> } }[];
  assert.ok(Number(revisionRows[0].revision) > 1);
  assert.ok(revisionRows[0].document.fileFacts?.some((fact) => fact.source.kind === 'file' && fact.source.fileId === smallId));
  assert.ok(Object.values(revisionRows[0].document.topics).filter((topic) => topic.required).every((topic) => topic.state.kind === 'open'));
  const usageAfter = await adapter.sut.needs.readAllowance(seed.ngo.session, org);
  assert.deepEqual(usageAfter, usageBefore);
  const turnCount = await seed.sql`select count(*)::integer as count from public.discovery_turns where project_id = ${project}::uuid` as { count: number }[];
  assert.equal(turnCount[0].count, 0);
  record('brief provenance and free read', { revision: revisionRows[0].revision, usageBefore, usageAfter, turnRows: turnCount[0].count });

  const duplicate = await uploadFile(stack, seed.bearer, org, project, 'renamed-duplicate.txt', smallText);
  assert.equal(duplicate.body.kind, 'duplicate-file');
  record('duplicate refused by content', duplicate);
  const largeText = Array.from({ length: 420 }, (_, index) => `Rota row ${index + 1}: coordinators schedule 45 volunteers in three kitchens, with Sunday gaps and four hours of weekly scheduling.`).join('\n');
  const largeUpload = await uploadFile(stack, seed.bearer, org, project, 'large-rota.txt', largeText);
  assert.equal(largeUpload.status, 200, JSON.stringify(largeUpload));
  const largeId = String((largeUpload.body.file as { id: string }).id);
  const large = await waitForFile(stack, seed.bearer, project, largeId, 300_000);
  assert.ok(large.total_parts > 1);
  assert.equal(large.completed_parts, large.total_parts);
  record('large file processes every part', { bytes: large.size_bytes, totalParts: large.total_parts, completedParts: large.completed_parts, digest: large.digest });
  const thirdUpload = await uploadFile(stack, seed.bearer, org, project, 'rules.txt', 'Coordinators approve training before a volunteer books a kitchen shift.');
  assert.equal(thirdUpload.status, 200);
  await waitForFile(stack, seed.bearer, project, String((thirdUpload.body.file as { id: string }).id));
  const fourth = await uploadFile(stack, seed.bearer, org, project, 'fourth.txt', 'A fourth Discovery document.');
  assert.equal(fourth.body.kind, 'file-limit');
  record('fourth refused with intake excluded', fourth);
  const removed = await functionPost(stack, 'discovery-file', { organizationId: org, projectId: project, action: 'remove', fileId: largeId }, seed.bearer);
  assert.equal(removed.status, 200);
  const replacement = await uploadFile(stack, seed.bearer, org, project, 'replacement.txt', 'Two coordinators own the volunteer rota and spend four hours each week updating it.');
  assert.equal(replacement.status, 200);
  await waitForFile(stack, seed.bearer, project, String((replacement.body.file as { id: string }).id));
  record('removal frees a place', { removed: removed.json, replacement: replacement.body });

  const fileRows = await seed.sql`select * from public.discovery_files where project_id = ${project}::uuid and removed_at is null order by created_at` as FileRow[];
  const briefRows = await seed.sql`select public.discovery_brief_payload(${project}::uuid) as value` as { value: unknown }[];
  const needRows = await seed.sql`select project_id, description, urgency, stage, cause_labels, reference_files, tier2_classified_at, submitted_at, updated_at from public.need_intakes where project_id = ${project}::uuid` as unknown[];
  const reads = {
    project: async () => ({ ok: true, rows: [{ id: project, name: 'Kitchen volunteer rota', org_id: org, assigned_volunteer_id: null }] }),
    need: async () => ({ ok: true, rows: needRows }), discoveryTurnsOf: async () => ({ ok: true, rows: [] }),
    discoveryBriefOf: async () => ({ ok: true, value: briefRows[0].value }), discoveryFilesOf: async () => ({ ok: true, rows: fileRows }),
  } as unknown as CallerReads;
  const caller = { id: seed.ngo.accountId, emailVerified: true };
  const standing = parseWriteStanding({ account: { account_type: 'ngo', lifecycle: 'active' }, org_exists: true, org_role: 'admin', org_seat_account_id: seed.ngo.accountId });
  const decision = writePipeline({ name: 'discovery-message', decide: decideDiscoveryMessage }, { caller, standing, target: org, subject: null, ip: null,
    body: { organizationId: org, projectId: project, mode: 'answer', userMessageId: crypto.randomUUID(), expectedCharge: 'free', message: 'Please continue our kitchen rota brief.' } });
  assert.equal(decision.ok, true);
  if (!decision.ok) throw new Error(decision.reason);
  const prepared = await discoveryPrepare({ model: 'configured-model', create: async () => { throw new Error('prepare must not call the model'); }, stream: async () => { throw new Error('prepare must not call the model'); } }, DISCOVERY_SKILLS)(caller, decision.args, reads);
  assert.equal(prepared.ok, true);
  if (!prepared.ok) throw new Error(prepared.reason);
  const request = Object.getOwnPropertySymbols(prepared.args).map((key) => (prepared.args as unknown as Record<symbol, DiscoveryModelRequest>)[key]).find((value) => value.messages);
  assert.ok(request);
  const context = request.messages.filter((message) => message.content.startsWith('File digest'));
  assert.equal(context.length, 3);
  assert.ok(context.some((message) => message.content.includes('small-rota.txt')));
  assert.ok(context.every((message) => !message.content.includes('Rota row 420')));
  record('later turn context contains digests', context);
  const next = await functionPost(stack, 'discovery-message', { organizationId: org, projectId: project, mode: 'answer', userMessageId: crypto.randomUUID(), expectedCharge: 'free', message: 'The main priority is reducing coordinator scheduling time.' }, seed.bearer);
  assert.equal(next.status, 200, JSON.stringify(next.json));
  assert.ok(String(next.json.reply).includes('I finished reading small-rota.txt'));
  record('next real reply reports the file', next.json);
  const storageRead = await fetch(`${stack.apiUrl}/storage/v1/object/authenticated/discovery-files/${project}/${smallId}`, { headers: { apikey: stack.anonKey, Authorization: `Bearer ${seed.bearer}` } });
  assert.notEqual(storageRead.status, 200);
  const forbidden = await restGet(stack, '/discovery_files', seed.bearer);
  assert.equal(forbidden.status, 200);
  await seed.sql`update public.projects set funded_at = clock_timestamp() where id = ${project}::uuid`;
  const funded = await uploadFile(stack, seed.bearer, org, project, 'funded-fourth.txt', 'The funded rota adds another kitchen with 15 volunteers.');
  assert.equal(funded.status, 200);
  await waitForFile(stack, seed.bearer, project, String((funded.body.file as { id: string }).id));
  record('funded fourth upload succeeds', { result: funded.body, clientStorageStatus: storageRead.status });
  record('proof complete', { exitCode: 0 });
} catch (error) {
  record('proof failed', { reason: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
} finally {
  await seed.sql.close();
  await adapter.teardown();
}
