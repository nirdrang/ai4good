import { expect } from 'vitest';
import {
  renderScopeMarkdown, scopeReferenceForScorer, scopeSourceForPrd,
  type ScopeView,
} from '../../../../supabase/functions/_shared/scope.ts';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';
import { scopeDecompositionProblems } from './_source-absences.ts';
import { GRANT_TRACKER } from './fixtures/grant-tracker.ts';
import {
  GRANT_TRACKER_SCOPE,
} from './fixtures/scope-tiers.ts';

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
