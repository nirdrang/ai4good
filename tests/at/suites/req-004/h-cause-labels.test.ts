import { expect } from 'vitest';
import { DISCOVERY_REQUEST_SETTINGS } from '../../../../supabase/functions/_shared/discovery-metering.ts';
import { renderScopeMarkdown } from '../../../../supabase/functions/_shared/scope.ts';
import { atTest } from './_bind.ts';
import type { DiscoverySut, Session } from './_contract.ts';
import { AWAITED, awaiting } from './_pending.ts';
import { labelCurationSurfaceProblems } from './_source-absences.ts';
import {
  FOOD_BANK, FOOD_BANK_ELICITATION_REPLY, FOOD_BANK_SCOPE, FOOD_BANK_SCOPE_REPLY, FOOD_BANK_THIN_SCOPE_REPLY,
} from './fixtures/food-bank.ts';
import { GRANT_TRACKER, GRANT_TRACKER_ELICITATION } from './fixtures/grant-tracker.ts';
import { GRANT_TRACKER_SCOPE, GRANT_TRACKER_SCOPE_REPLY } from './fixtures/scope-tiers.ts';

const GRANT_ELICITATION_REPLY = {
  kind: 'tool' as const, name: 'record_elicitation', input: GRANT_TRACKER_ELICITATION,
  text: 'I recorded the shared deadline list and reminders.',
  usage: { inputTokens: 1600, outputTokens: 80 },
};

const GRANT_NEW_DOMAIN_REPLY = {
  kind: 'tool' as const, name: 'record_scope',
  input: { ...GRANT_TRACKER_SCOPE, causeLabels: ['grant management'] },
  text: '', usage: { inputTokens: 1800, outputTokens: 640 },
};

async function proveRemoveLabel(
  sut: DiscoverySut, session: Session, organizationId: string, projectId: string, label: string,
) {
  const before = await sut.causeLabelRows();
  expect(before.some((row) => row.label === label)).toBe(true);
  const removed = await sut.writeScope(session, {
    organizationId, projectId, action: 'remove-label', label,
  });
  expect(removed).toMatchObject({ ok: true, changed: true, need: { causeLabels: [] } });
  // the vocabulary is one table for every project; a sibling file may add a label meanwhile, so assert the removed one stays
  expect((await sut.causeLabelRows()).some((row) => row.label === label)).toBe(true);
  const again = await sut.writeScope(session, {
    organizationId, projectId, action: 'remove-label', label,
  });
  expect(again).toMatchObject({ ok: true, changed: false, need: { causeLabels: [] } });
  expect(labelCurationSurfaceProblems()).toEqual([]);
}

atTest('AT-004.58', 'generation reuses an existing cause label rather than minting a synonym', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    await sut.seedCauseLabelsAsOperator(['food security']);
    const ngo = await sut.provisionNgo(w.email('labels-58'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, FOOD_BANK.intake);
    h.vendors.anthropic.script([FOOD_BANK_ELICITATION_REPLY, FOOD_BANK_SCOPE_REPLY]);
    expect(await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId, message: 'That covers it.',
    })).toMatchObject({ ok: true, scopeReady: true });
    const generated = await sut.writeScope(ngo.session, {
      organizationId: ngo.organizationId, projectId, action: 'generate',
    });
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const request = h.vendors.anthropic.requests().at(-1)!;
    const uncached = request.system.find((block) => block.cached !== true);
    expect(uncached?.text).toContain(JSON.stringify(['food security']));
    expect(generated.scope?.causeLabels).toEqual(['food security']);
    expect(generated.scope?.contract?.causeLabels).toEqual(['food security']);
    expect(await sut.causeLabelRows()).toEqual([{ label: 'food security', firstProjectId: null }]);
    expect(generated.need.causeLabels).toEqual(['food security']);
  },
  integration: awaiting(AWAITED.anthropicLive),
});

atTest('AT-004.59', 'a new domain grows the vocabulary and a thin conversation may emit none', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    await sut.seedCauseLabelsAsOperator(['food security']);
    const ngo = await sut.provisionNgo(w.email('labels-59'), { emailVerified: true });
    const grant = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    h.vendors.anthropic.script([
      GRANT_ELICITATION_REPLY, GRANT_NEW_DOMAIN_REPLY,
      FOOD_BANK_ELICITATION_REPLY, FOOD_BANK_THIN_SCOPE_REPLY,
    ]);
    expect(await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId: grant.projectId, message: 'That covers it.',
    })).toMatchObject({ ok: true, scopeReady: true });
    const grown = await sut.writeScope(ngo.session, {
      organizationId: ngo.organizationId, projectId: grant.projectId, action: 'generate',
    });
    expect(grown.ok).toBe(true);
    if (!grown.ok) return;
    const rows = await sut.causeLabelRows();
    expect(rows.map((row) => row.label)).toEqual(['food security', 'grant management']);
    expect(rows.find((row) => row.label === 'grant management')?.firstProjectId).toBe(grant.projectId);
    const food = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, FOOD_BANK.intake);
    expect(await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId: food.projectId, message: 'That covers it.',
    })).toMatchObject({ ok: true, scopeReady: true });
    const thin = await sut.writeScope(ngo.session, {
      organizationId: ngo.organizationId, projectId: food.projectId, action: 'generate',
    });
    expect(thin.ok).toBe(true);
    if (!thin.ok) return;
    expect(thin.scope?.causeLabels).toEqual([]);
    expect(thin.need.causeLabels).toEqual([]);
    expect(await sut.causeLabelRows()).toHaveLength(2);
  },
  integration: awaiting(AWAITED.anthropicLive),
});

atTest('AT-004.60', 'the NGO removes a generated label and no curation surface exists', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const ngo = await sut.provisionNgo(w.email('labels-60'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    h.vendors.anthropic.script([GRANT_ELICITATION_REPLY, GRANT_TRACKER_SCOPE_REPLY]);
    expect(await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId, message: 'That covers it.',
    })).toMatchObject({ ok: true, scopeReady: true });
    const generated = await sut.writeScope(ngo.session, {
      organizationId: ngo.organizationId, projectId, action: 'generate',
    });
    expect(generated.ok && generated.need.causeLabels).toEqual(GRANT_TRACKER_SCOPE.causeLabels);
    if (!generated.ok) return;
    await proveRemoveLabel(
      sut, ngo.session, ngo.organizationId, projectId, GRANT_TRACKER_SCOPE.causeLabels[0]!,
    );
  },
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('labels-60'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, FOOD_BANK.intake);
    await sut.seedTurnsAsOperator(projectId, [{
      message: 'That covers it.',
      reply: 'I recorded the shared shelf list.',
      usage: { inputTokens: 1600, outputTokens: 80 },
      elicitation: FOOD_BANK.elicitation,
    }]);
    const begun = await sut.beginScopeAsOperator({
      accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
    });
    expect(begun.ok).toBe(true);
    if (!begun.ok) return;
    const labelled = { ...FOOD_BANK_SCOPE, causeLabels: ['food security'] };
    const committed = await sut.commitScopeAsOperator({
      accountId: ngo.accountId, projectId, scopeId: begun.scopeId, outcome: 'completed',
      contract: labelled, markdown: renderScopeMarkdown(labelled, { title: FOOD_BANK.intake.title }),
      labels: ['food security'], servedModel: DISCOVERY_REQUEST_SETTINGS.model,
      inputTokens: 1800, outputTokens: 640,
    });
    expect(committed.ok && committed.need.causeLabels).toEqual(['food security']);
    if (!committed.ok) return;
    await proveRemoveLabel(sut, ngo.session, ngo.organizationId, projectId, 'food security');
  },
});
