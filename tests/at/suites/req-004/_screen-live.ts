import { authPost, functionPost, stackFromEnv } from '../../harness/live-stack.ts';
import { seedFileProject } from '../req-032/_files.ts';
import { openingDocument, snapshotOf, type BriefVersion } from '../../../../supabase/functions/_shared/discovery-brief.ts';
import { GIVEN, type ScreenScenario } from '../../../../design/astra/src/givens.ts';
import type { DiscoverySut } from './_contract.ts';
import type { DiscoveryState } from '../../../../src/lib/discovery-stream.ts';

export async function seedDiscoveryScreen(sut: DiscoverySut, email: string, scenario: ScreenScenario) {
  const stack = stackFromEnv();
  const given = GIVEN['finish-open'];
  const first = scenario.startsWith('first-reply') || scenario.startsWith('three-files');
  const confirmed = scenario.startsWith('confirmed');
  const finish = scenario.startsWith('finish') || confirmed;
  const version: BriefVersion = openingDocument({ need: finish ? given.need : 'We coordinate 45 volunteers across three kitchens. Scheduling takes four hours each week.' });
  const doc = version.document;
  doc.topics.measure!.importance = 'suggested';
  doc.topics.rules!.importance = 'suggested';
  doc.topics.info!.importance = 'later';
  doc.topics.rules!.why = given.open[2].why;
  doc.dependsOn.measure = ['priority'];
  if (!first) {
    version.revision = finish ? 6 : 4;
    for (const [id, round] of [['priority', 2], ['booking', 3]] as const) {
      const topic = doc.topics[id]!;
      topic.state = { kind: 'agreed', answer: topic.suggestion!, source: { kind: 'chat', round }, answerMessageId: `seed-${id}` };
    }
    doc.topics.measure!.state = { kind: 'not-sure', questionId: 'measure', help: doc.topics.measure!.definition.uncertaintyHelp };
    for (const id of doc.topicOrder) {
      if (!finish && id === 'rules') continue;
      const topic = doc.topics[id]!;
      doc.questions[id] = { topicId: id, text: topic.definition.text, reason: topic.why, options: topic.definition.options,
        suggestedId: topic.definition.suggestedId, importance: topic.importance, recommendation: topic.definition.recommendation,
        uncertaintyHelp: topic.definition.uncertaintyHelp, askedInRound: id === 'priority' ? 1 : id === 'booking' ? 2 : 4 };
      if (!doc.questionOrder.includes(id)) doc.questionOrder.push(id);
    }
  }
  if (finish) {
    doc.usersToday = { text: given.users, source: { kind: 'intake' } };
    doc.dataTier = { tier: scenario === 'finish-tier-0' ? 0 : scenario.endsWith('2') ? 2 : 1, reason: 'Volunteer contact information.' };
    doc.fit = { verdict: 'fits', reason: 'The need fits a small volunteer scheduling tool.' };
    doc.causeLabels = ['food security'];
    if (confirmed) {
      const data = scenario === 'confirmed-tier-2' ? GIVEN['confirmed-tier-2'] : GIVEN['confirmed-tier-1'];
      doc.successMeasure = { text: data.success, source: { kind: 'chat', round: data.successRound } };
      doc.topics.measure!.state = { kind: 'agreed', answer: data.success, source: { kind: 'chat', round: 4 }, answerMessageId: null };
      doc.topics.owner!.state = { kind: 'agreed', answer: data.agreed[2].answer, source: { kind: 'chat', round: 5 }, answerMessageId: null };
      doc.topics.info!.importance = 'needed';
      doc.questions.info!.importance = 'needed';
      doc.causeLabels = [...data.labels];
      for (const [index, id] of ['info', 'rules'].entries()) {
        doc.topics[id]!.why = data.open[index]!.why;
        doc.topics[id]!.suggestion = null;
      }
    }
  }
  const seed = await seedFileProject(stack, sut, email, { brief: first ? null : version, title: 'Volunteer scheduling',
    description: doc.need.text, intakeName: 'intake-notes.pdf' });
  const scope = { organizationId: seed.ngo.organizationId, projectId: seed.projectId };
  try {
    if (scenario === 'three-files-funded') await sut.setProjectFundingAsOperator(seed.projectId, { fundedAt: new Date().toISOString(), fuelMicros: 0 });
    if (finish || scenario.includes('three-files')) {
      const files = finish ? (confirmed ? GIVEN['confirmed-tier-2'].files : given.files).slice(1) : GIVEN['first-reply-three-files'].files.map((name) => ({ name, took: 'Volunteer scheduling source material.' }));
      for (const file of files) {
        const id = crypto.randomUUID();
        await seed.sql`insert into public.discovery_files(id, project_id, name, media_type, size_bytes, content_hash, status, facts_count,
          total_parts, completed_parts, created_by, digest) values (${id}::uuid, ${seed.projectId}::uuid, ${file.name}, 'text/plain', 100,
          ${id.replaceAll('-', '').repeat(2)}, 'read', 1, 1, 1, ${seed.ngo.accountId}::uuid, ${JSON.stringify({ facts: [{ sectionId: 'need', text: file.took }], questions: [] })}::text::jsonb)`;
      }
    }
    if (!first) {
      await sut.seedTurnsAsOperator(seed.projectId, [
        { message: 'From your intake', reply: 'Discovery has started.', usage: { inputTokens: 100, outputTokens: 20 } },
        { message: 'Less coordination time', reply: 'Main priority saved.', usage: { inputTokens: 100, outputTokens: 20 } },
        { message: 'Volunteers book themselves', reply: 'Booking answer saved.', usage: { inputTokens: 100, outputTokens: 20 } },
        { message: "I'm not sure", reply: 'You can ask the people who schedule shifts how long last week took.', usage: { inputTokens: 100, outputTokens: 20 } },
      ]);
      await sut.writeSpendRowAsOperator({ organizationId: scope.organizationId, utcDay: new Date().toISOString().slice(0, 10), spent: scenario === 'daily-empty' ? 10 : 7, granted: 10 });
      await seed.sql.begin(async (tx) => {
        await tx`alter table public.discovery_turns disable trigger discovery_turns_immutable`;
        await tx`update public.discovery_turns set user_message_id = case seq when 2 then 'seed-priority' when 3 then 'seed-booking' else 'seed-' || seq end,
          base_revision = ${version.revision} where project_id = ${seed.projectId}::uuid`;
        await tx`alter table public.discovery_turns enable trigger discovery_turns_immutable`;
      });
    }
    if (confirmed) {
      const answer = await functionPost(stack, 'discovery-brief', { ...scope, action: 'finish', revision: version.revision,
        acks: { reviewed: true, openGaps: true, data: true } }, seed.bearer);
      if (answer.json.ok !== true) throw new Error(`seeding confirmation: ${answer.status} ${JSON.stringify(answer.json)}`);
    }
    const cutoff = (await sut.turnRows(seed.projectId)).length;
    let bearer = seed.bearer;
    async function post(name: string, body: Record<string, unknown>) {
      const claims = JSON.parse(Buffer.from(bearer.split('.')[1]!, 'base64url').toString('utf8')) as { exp: number };
      if (claims.exp * 1000 < Date.now() + 10_000) {
        const login = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password: 'correct horse battery staple' });
        if (typeof login.json.access_token !== 'string') throw new Error('The screen evidence reader could not renew its session.');
        bearer = login.json.access_token;
      }
      return functionPost(stack, name, body, bearer);
    }
    async function read(): Promise<DiscoveryState> {
      const answer = await post('discovery-conversation', { projectId: seed.projectId });
      if (answer.json.state === undefined) throw new Error('The running discovery-conversation edge runtime has no screen state. It must load the updated files before the real route can run.');
      return answer.json.state as DiscoveryState;
    }
    async function modelCalls(): Promise<string[]> {
      const turns = await seed.sql`select 'chat-turn' as kind, opened_at as at from public.discovery_turns
        where project_id = ${seed.projectId}::uuid and seq > ${cutoff} and status = 'settled'` as { kind: string; at: Date }[];
      const parts = await seed.sql`select 'file-read' as kind, f.created_at as at from public.discovery_file_parts p
        join public.discovery_files f on f.id = p.file_id where f.project_id = ${seed.projectId}::uuid order by f.created_at, p.part_index` as { kind: string; at: Date }[];
      return [...turns, ...parts].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).map((row) => row.kind);
    }
    return { ...seed, scope, read, post, modelCalls, snapshot: snapshotOf(version) };
  } catch (error) { await seed.sql.close(); throw error; }
}
