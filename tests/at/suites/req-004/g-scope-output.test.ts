import { expect } from 'vitest';
import {
  renderScopeMarkdown, scopeMoneyProblems, scopeReferenceForScorer, scopeSourceForPrd,
  type ScopeView,
} from '../../../../supabase/functions/_shared/scope.ts';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';
import { scopeDecompositionProblems, scopeMoneySourceProblems } from './_source-absences.ts';
import { GRANT_TRACKER, GRANT_TRACKER_ELICITATION } from './fixtures/grant-tracker.ts';
import {
  GRANT_TRACKER_SCOPE, GRANT_TRACKER_SCOPE_REPLY, SCOPE_TIER_FIXTURES,
  scopeContractProblems, scopeDocumentProblems,
} from './fixtures/scope-tiers.ts';

const ELICITATION_REPLY = {
  kind: 'tool' as const, name: 'record_elicitation', input: GRANT_TRACKER_ELICITATION,
  text: 'I recorded the shared deadline list and reminders.',
  usage: { inputTokens: 1600, outputTokens: 80 },
};

atTest('AT-004.20', 'a completed Discovery emits the full scope contract', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const ngo = await sut.provisionNgo(w.email('scope-20'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    h.vendors.anthropic.script([ELICITATION_REPLY, GRANT_TRACKER_SCOPE_REPLY]);
    const chat = await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId, message: 'That covers it.',
    });
    expect(chat.ok && chat.elicitation?.complete && chat.scopeReady).toBe(true);
    const before = await sut.readAllowance(ngo.session, ngo.organizationId);
    const generated = await sut.writeScope(ngo.session, {
      organizationId: ngo.organizationId, projectId, action: 'generate',
    });
    expect(generated.ok).toBe(true);
    if (!generated.ok || !before.ok) return;
    expect(generated.scope?.version).toBe(1);
    expect(generated.scope?.status).toBe('current');
    expect(scopeContractProblems(generated.scope?.contract)).toEqual([]);
    expect(generated.scope?.contract?.buildSplit.lovable.length).toBeGreaterThan(0);
    expect(generated.scope?.contract?.buildSplit.claudeCode.length).toBeGreaterThan(0);
    const maxLabels = h.config.get<number>('req-004.discovery.cause_labels_max');
    expect(generated.scope?.contract?.causeLabels.length).toBeLessThanOrEqual(maxLabels);
    expect(generated.need.stage).toBe('discovery_in_progress');
    const after = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(after.ok && after.allowance.remaining).toBe(before.allowance.remaining);
    const request = h.vendors.anthropic.requests().at(-1)!;
    expect(request.tools.map((tool) => tool.name)).toEqual(['record_scope']);
    expect(request.toolChoice).toEqual({ type: 'tool', name: 'record_scope' });
    const read = await sut.readConversation(ngo.session, projectId);
    expect(read.ok && read.value.conversation.scope?.version).toBe(1);
    expect(read.ok && read.value.conversation.scopes).toHaveLength(1);
  },
  integration: awaiting(AWAITED.anthropicLive),
});

atTest('AT-004.22', 'every generated scope emits both build-split parts', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const ngo = await sut.provisionNgo(w.email('scope-22'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const oneSided = {
      kind: 'tool' as const, name: 'record_scope',
      input: { ...GRANT_TRACKER_SCOPE, buildSplit: { lovable: ['Deadline list screens'], claudeCode: [] } },
      text: '', usage: { inputTokens: 1800, outputTokens: 640 },
    };
    h.vendors.anthropic.script([ELICITATION_REPLY, oneSided, GRANT_TRACKER_SCOPE_REPLY]);
    expect(await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId, message: 'That covers it.',
    })).toMatchObject({ ok: true, scopeReady: true });
    const refused = await sut.writeScope(ngo.session, {
      organizationId: ngo.organizationId, projectId, action: 'generate',
    });
    expect(refused).toMatchObject({ ok: false, kind: 'refused', status: 502 });
    expect((await sut.scopeRows(projectId)).some((row) => row.status === 'current')).toBe(false);
    expect((await sut.scopeRows(projectId)).some((row) => row.status === 'failed')).toBe(true);
    const generated = await sut.writeScope(ngo.session, {
      organizationId: ngo.organizationId, projectId, action: 'generate',
    });
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    expect(generated.scope?.status).toBe('current');
    expect(generated.scope?.contract?.buildSplit.lovable.length).toBeGreaterThan(0);
    expect(generated.scope?.contract?.buildSplit.claudeCode.length).toBeGreaterThan(0);
    expect(scopeContractProblems(generated.scope?.contract)).toEqual([]);
  },
  integration: awaiting(AWAITED.anthropicLive),
});

function proveRenderedMoneyFree() {
  expect(scopeMoneySourceProblems()).toEqual([]);
  for (const fixture of SCOPE_TIER_FIXTURES) {
    expect(scopeMoneyProblems(renderScopeMarkdown(fixture.scope, { title: fixture.title }))).toEqual([]);
  }
}

atTest('AT-004.21', 'the rendered scope shows no project or build-cost estimate', {
  loop: async ({ open }) => {
    const { w, sut, h } = await open();
    proveRenderedMoneyFree();
    const ngo = await sut.provisionNgo(w.email('scope-21'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const priced = {
      kind: 'tool' as const, name: 'record_scope',
      input: { ...GRANT_TRACKER_SCOPE, summary: 'A shared deadline list, roughly $4,000 to build.' },
      text: '', usage: { inputTokens: 1800, outputTokens: 640 },
    };
    h.vendors.anthropic.script([ELICITATION_REPLY, priced]);
    expect(await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId, message: 'That covers it.',
    })).toMatchObject({ ok: true, scopeReady: true });
    const refused = await sut.writeScope(ngo.session, {
      organizationId: ngo.organizationId, projectId, action: 'generate',
    });
    expect(refused).toMatchObject({ ok: false, kind: 'refused', status: 502 });
    expect((await sut.scopeRows(projectId)).some((row) => row.status === 'current')).toBe(false);
  },
  default: async ({ open }) => {
    await open();
    proveRenderedMoneyFree();
  },
});

atTest('AT-004.25', 'each tier document explains its data tier, complexity, maintenance and pricing', {
  default: async ({ open }) => {
    await open();
    for (const fixture of SCOPE_TIER_FIXTURES) {
      expect(scopeDocumentProblems(
        renderScopeMarkdown(fixture.scope, { title: fixture.title }),
        fixture,
      )).toEqual([]);
    }
  },
});

atTest('AT-004.24', 'the initial backlog does not decompose Discovery output directly', {
  default: async ({ open }) => {
    await open();
    expect(scopeDecompositionProblems()).toEqual([]);
    await awaiting(AWAITED.backlogDerivation)();
  },
});

function provePinnedScopeContract(
  scopes: readonly ScopeView[],
  projectId: string,
  otherProjectId: string,
) {
  const pinned = { projectId, version: 1 };
  const prd = scopeSourceForPrd(scopes, pinned);
  const scorer = scopeReferenceForScorer(scopes, pinned);
  expect(prd.ok).toBe(true);
  if (!prd.ok) return;
  expect(scorer).toEqual(prd);
  const current = scopes.find((row) => row.projectId === projectId && row.version === 1);
  expect(prd.scope).toEqual(current?.contract);
  expect(prd.markdown).toBe(current?.markdown);
  const missing = { projectId, version: 2 };
  expect(scopeSourceForPrd(scopes, missing)).toEqual({ ok: false, reason: 'no-such-version' });
  expect(scopeReferenceForScorer(scopes, missing)).toEqual({ ok: false, reason: 'no-such-version' });
  const other = { projectId: otherProjectId, version: 1 };
  expect(scopeSourceForPrd(scopes, other)).toEqual({ ok: false, reason: 'no-such-version' });
  expect(scopeReferenceForScorer(scopes, other)).toEqual({ ok: false, reason: 'no-such-version' });
}

function handScopeView(input: {
  projectId: string; version: number; status: ScopeView['status'];
  contract: ScopeView['contract']; markdown: string | null;
}): ScopeView {
  return {
    id: `${input.projectId}:${String(input.version)}:${input.status}`,
    projectId: input.projectId, version: input.version, status: input.status, reason: null,
    contract: input.contract, markdown: input.markdown,
    causeLabels: input.contract?.causeLabels ?? [],
    generatedAt: input.status === 'current' || input.status === 'superseded' ? '2026-01-01T00:00:00.000Z' : null,
    requestedAt: '2026-01-01T00:00:00.000Z',
  };
}

atTest('AT-004.52', 'the Discovery scope is the PRD source and the scorer reference', {
  loop: async ({ open }) => {
    const { w, sut, h } = await open();
    const ngo = await sut.provisionNgo(w.email('scope-52'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    h.vendors.anthropic.script([ELICITATION_REPLY, GRANT_TRACKER_SCOPE_REPLY]);
    expect(await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId, message: 'That covers it.',
    })).toMatchObject({ ok: true, scopeReady: true });
    const generated = await sut.writeScope(ngo.session, {
      organizationId: ngo.organizationId, projectId, action: 'generate',
    });
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    provePinnedScopeContract(await sut.scopeRows(projectId), projectId, `${projectId}-other`);
    await awaiting(AWAITED.prdAuthoring)();
  },
  default: async ({ open }) => {
    await open();
    const projectId = 'project-a';
    const otherProjectId = 'project-b';
    const markdown = renderScopeMarkdown(GRANT_TRACKER_SCOPE, { title: GRANT_TRACKER.intake.title });
    const current = handScopeView({
      projectId, version: 1, status: 'current', contract: GRANT_TRACKER_SCOPE, markdown,
    });
    const failed = handScopeView({
      projectId, version: 1, status: 'failed', contract: null, markdown: null,
    });
    const generating = handScopeView({
      projectId, version: 1, status: 'generating', contract: null, markdown: null,
    });
    provePinnedScopeContract([current], projectId, otherProjectId);
    expect(scopeSourceForPrd([failed], { projectId, version: 1 })).toEqual({ ok: false, reason: 'not-settled' });
    expect(scopeReferenceForScorer([failed], { projectId, version: 1 })).toEqual({ ok: false, reason: 'not-settled' });
    expect(scopeSourceForPrd([generating], { projectId, version: 1 })).toEqual({ ok: false, reason: 'not-settled' });
    expect(scopeReferenceForScorer([generating], { projectId, version: 1 })).toEqual({ ok: false, reason: 'not-settled' });
    await awaiting(AWAITED.prdAuthoring)();
  },
});
