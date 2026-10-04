import { expect } from 'vitest';
import { atTest, TIER } from './_bind.ts';
import { labelCurationSurfaceProblems } from './_source-absences.ts';
import type { DiscoverySut, Session } from './_contract.ts';

async function briefOf(sut: DiscoverySut, session: Session, projectId: string) {
  const read = await sut.readConversation(session, projectId);
  if (!read.ok || !read.value.brief) throw new Error('Discovery has no live brief.');
  return read.value.brief;
}
async function finish(sut: DiscoverySut, session: Session, organizationId: string, projectId: string) {
  const brief = await briefOf(sut, session, projectId);
  expect(await sut.briefAction(session, { organizationId, projectId, action: 'finish', revision: brief.revision,
    acks: { reviewed: true, openGaps: true, data: true } })).toMatchObject({ ok: true });
}
function reply(causeLabels: string[]) {
  return { kind: 'tool' as const, name: 'reply', input: { text: 'Recorded.', questions: [], agreed: [], openQuestions: [], causeLabels },
    usage: { inputTokens: 1600, outputTokens: 80 } };
}
const food = { title: 'Food bank shelf list', description: 'Our food bank distributes meals and groceries to hungry households. Coordinators need a shared shelf list to know what food is available.' };

atTest('AT-004.58', 'Discovery reuses a vocabulary label in the live brief and publishes it at finish', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    await sut.seedCauseLabelsAsOperator(['food security']);
    const ngo = await sut.provisionNgo(w.email('labels-58'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, food);
    if (TIER === 'loop') h.vendors.anthropic.script([reply(['food security'])]);
    expect(await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'We work on food security. Please record this need.' })).toMatchObject({ ok: true });
    expect((await briefOf(sut, ngo.session, projectId)).causeLabels).toEqual(['food security']);
    expect(await sut.causeLabelRows()).toEqual([{ label: 'food security', firstProjectId: null }]);
    await finish(sut, ngo.session, ngo.organizationId, projectId);
    expect(await sut.readNeed(ngo.session, projectId)).toMatchObject({ ok: true, value: { need: { causeLabels: ['food security'] } } });
    expect(await sut.causeLabelRows()).toEqual([{ label: 'food security', firstProjectId: null }]);
    if (TIER === 'loop') expect(h.vendors.anthropic.requests()[0].system[1].text).toContain('["food security"]');
  },
});
atTest('AT-004.59', 'Discovery grows the vocabulary for a new domain and a thin conversation emits none', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    await sut.seedCauseLabelsAsOperator(['food security']);
    const ngo = await sut.provisionNgo(w.email('labels-59'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, { title: 'Forest restoration',
      description: 'We restore native forests. Volunteers collect seed and plant trees. Coordinators need to track planting plots and tree survival.' });
    if (TIER === 'loop') h.vendors.anthropic.script([reply(['forest restoration'])]);
    expect(await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'We restore native forests. We need planting plots and tree survival recorded for this forest restoration project.' })).toMatchObject({ ok: true });
    const proposed = (await briefOf(sut, ngo.session, projectId)).causeLabels;
    expect(proposed.length).toBeGreaterThan(0);
    expect(proposed).not.toContain('food security');
    expect(await sut.causeLabelRows()).toHaveLength(1);
    await finish(sut, ngo.session, ngo.organizationId, projectId);
    for (const label of proposed) expect(await sut.causeLabelRows()).toContainEqual({ label, firstProjectId: projectId });
    const before = await sut.causeLabelRows();
    const thin = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, { title: 'Need help', description: 'We do not yet know what problem or domain this project should cover.' });
    if (TIER === 'loop') h.vendors.anthropic.script([reply([])]);
    expect(await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId: thin.projectId, message: 'We cannot yet describe our work or cause domain.' })).toMatchObject({ ok: true });
    expect((await briefOf(sut, ngo.session, thin.projectId)).causeLabels).toEqual([]);
    await finish(sut, ngo.session, ngo.organizationId, thin.projectId);
    expect(await sut.causeLabelRows()).toEqual(before);
  },
});
atTest('AT-004.60', 'the NGO removes a proposed label from the brief and cannot curate the vocabulary', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    await sut.seedCauseLabelsAsOperator(['food security']);
    const ngo = await sut.provisionNgo(w.email('labels-60'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, food);
    if (TIER === 'loop') h.vendors.anthropic.script([reply(['food security'])]);
    expect(await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'We work on food security.' })).toMatchObject({ ok: true });
    const brief = await briefOf(sut, ngo.session, projectId);
    expect(brief.causeLabels).toEqual(['food security']);
    expect(await sut.briefAction(ngo.session, { organizationId: ngo.organizationId, projectId, action: 'remove-label', baseRevision: brief.revision, label: 'food security' }))
      .toMatchObject({ ok: true, brief: { causeLabels: [], revision: brief.revision + 1 } });
    await finish(sut, ngo.session, ngo.organizationId, projectId);
    expect(await sut.readNeed(ngo.session, projectId)).toMatchObject({ ok: true, value: { need: { causeLabels: [] } } });
    expect(await sut.causeLabelRows()).toEqual([{ label: 'food security', firstProjectId: null }]);
    expect(labelCurationSurfaceProblems()).toEqual([]);
  },
});
