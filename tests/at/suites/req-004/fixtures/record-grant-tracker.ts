import { writeFileSync } from 'node:fs';
import { createLiveAdapter } from '../_live.ts';
import { stackFromEnv } from '../../../harness/live-stack.ts';
import type { ScriptedReply } from '../../../harness/contracts.ts';
import { GRANT_TRACKER } from './grant-tracker.ts';
import { grantTrackerOracleProblems } from './grant-tracker.oracle.ts';

if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY must be in the environment and available to the deployed discovery-message function');
const adapter = await createLiveAdapter({ stack: stackFromEnv() });
try {
  const world = await adapter.fixtures.world('record-grant-tracker');
  const sut = adapter.sut.discovery;
  const ngo = await sut.provisionNgo(world.email('ngo-recording'), { emailVerified: true });
  const admin = await sut.provisionPlatformAdmin(world.email('admin-recording'));
  await sut.vetOrganizationAsAdmin(admin, ngo.organizationId);
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
  const replies: ScriptedReply[] = [];
  let model = '';
  for (const message of GRANT_TRACKER.ngoMessages) {
    const answer = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message });
    if (!answer.ok) throw new Error(`recording refused with status ${answer.status}`);
    model = answer.turn.servedModel ?? '';
    if (model === '') throw new Error('the turn recorded no served model');
    const usage = { inputTokens: answer.turn.inputTokens!, outputTokens: answer.turn.outputTokens! };
    if (answer.elicitation) replies.push({ kind: 'tool', name: 'record_elicitation', input: answer.elicitation, text: answer.reply, usage });
    else {
      if (!['end_turn', 'max_tokens', 'refusal'].includes(answer.turn.stopReason ?? '')) throw new Error('turn did not return a recordable stop reason');
      replies.push({ kind: 'text', text: answer.reply, usage, stopReason: answer.turn.stopReason as 'end_turn' | 'max_tokens' | 'refusal' });
    }
  }
  const last = replies.at(-1);
  const recordedInput = last?.kind === 'tool' ? last.input : null;
  const problems = grantTrackerOracleProblems(recordedInput);
  if (problems.length) throw new Error(`recording did not satisfy its oracle: ${problems.join('; ')}`);
  const data = { intake: GRANT_TRACKER.intake, ngoMessages: GRANT_TRACKER.ngoMessages, replies, source: 'recorded' };
  const source = `import type { ScriptedReply } from '../../../harness/contracts.ts';\nimport type { Elicitation, IntakeFixture } from '../_contract.ts';\n\n` +
    `export const GRANT_TRACKER_ELICITATION: Elicitation = ${JSON.stringify(recordedInput, null, 2)};\n\n` +
    `export const GRANT_TRACKER: { intake: IntakeFixture; ngoMessages: string[]; replies: ScriptedReply[]; source: 'recorded' | 'handwritten'; recordedWith?: { model: string; date: string } } = {\n` +
    `${JSON.stringify(data, null, 2).slice(1, -1)},\n  recordedWith: { model: ${JSON.stringify(model)}, date: ${JSON.stringify(new Date().toISOString().slice(0, 10))} },\n};\n`;
  writeFileSync(new URL('./grant-tracker.ts', import.meta.url), source, 'utf8');
  console.log(`Recorded ${replies.length} turns through discovery-message.`);
} finally {
  await adapter.teardown();
}
