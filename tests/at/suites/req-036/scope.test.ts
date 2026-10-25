import { afterAll, expect } from 'vitest';
import { cleanupReposNamed } from '../../harness/github.ts';
import { atTest } from './_bind.ts';
import { scopeMoneySourceProblems } from '../req-004/_source-absences.ts';
import { TIER } from '../../harness/registry.ts';
import { openingDocument, decideFinish } from '../../../../supabase/functions/_shared/discovery-brief.ts';
import { buildScopeRequest, renderScopeMarkdown, scopeMoneyProblems, type Scope, type ConfirmedDiscovery } from '../../../../supabase/functions/_shared/scope.ts';
import { DISCOVERY_SKILLS } from '../../../../supabase/functions/_shared/discovery-skills/index.ts';
import { SCOPE_TIER_FIXTURES, GRANT_TRACKER_SCOPE, scopeContractProblems, scopeDocumentProblems } from '../req-004/fixtures/scope-tiers.ts';
import { parseTechnicalScope } from '../../../../supabase/functions/_shared/prd/technical-scope.ts';
import { createdRepoNames, proveScopeSection } from './_record.ts';

afterAll(async () => {
  await cleanupReposNamed(createdRepoNames());
});

function confirmed(scope: Scope): ConfirmedDiscovery {
  const brief = openingDocument({ need: scope.summary });
  const tier = Number(scope.dataSensitivity.tier.at(-1)) as 0 | 1 | 2;
  brief.document.dataTier = { tier, kinds: [(['none', 'ordinary-pii', 'special-category'] as const)[tier]], reason: scope.dataSensitivity.rationale, responsibility: 'ngo' };
  brief.document.fit = { verdict: 'fits', reason: scope.maintainabilityFit.rationale };
  brief.document.topics.priority!.state = { kind: 'agreed', answer: scope.summary, source: { kind: 'chat', round: 1 }, answerMessageId: 'answer-1' };
  const decision = decideFinish(brief, { acks: { reviewed: true, openGaps: true, data: true }, filesReading: false,
    actor: { id: 'ngo', displayName: 'NGO' }, at: '2026-10-04T00:00:00Z', existing: null });
  if (!decision.ok) throw new Error(decision.reason);
  return { brief, confirmation: decision.confirmation };
}

atTest('AT-036.11', 'a confirmed Discovery document produces a grounded technical scope', { timeoutMs: { integration: 180_000 } }, {
  default: async ({ open }) => {
    const { h, sut } = await open();
    const input = confirmed(GRANT_TRACKER_SCOPE);
    const scope = { ...GRANT_TRACKER_SCOPE, userStories: GRANT_TRACKER_SCOPE.userStories.map((story) => ({ ...story, discoveryTopicId: 'priority' })) };
    expect(JSON.stringify(buildScopeRequest(input, DISCOVERY_SKILLS))).not.toMatch(/lovableRecommendation|buildSplit|build-split|Lovable|Claude Code/);
    const generate = sut.generate;
    if (TIER === 'loop') h.vendors.anthropic.script([{ kind: 'tool', name: 'record_scope', input: scope, text: '', usage: { inputTokens: 1800, outputTokens: 640 } }]);
    const generated = await generate(input);
    expect(scopeContractProblems(generated.scope)).toEqual([]);
    expect(generated.scope).not.toHaveProperty('lovableRecommendation');
    expect(generated.scope).not.toHaveProperty('buildSplit');
    expect(generated.scope.suggestedStack.length).toBeGreaterThan(0);
    expect(['small', 'medium', 'large']).toContain(generated.scope.complexity.tier);
    expect(generated.scope.complexity.rationale.length).toBeGreaterThan(0);
    expect(generated.scope.complexity.startSmallAdvice.length).toBeGreaterThan(0);
    expect(generated.scope.riskFlags.length).toBeGreaterThan(0);
    for (const story of generated.scope.userStories) {
      expect(story.acceptanceCriteria.length).toBeGreaterThan(0);
      const topic = input.brief.document.topics[story.discoveryTopicId!];
      expect(topic).toBeDefined();
      expect(topic.state.kind === 'agreed' || input.confirmation.acceptedGaps.some((gap) => gap.topicId === topic.id)).toBe(true);
    }
    expect(scopeDocumentProblems(generated.markdown, { title: 'Funder reporting deadline tracker', scope: generated.scope })).toEqual([]);
    expect(scopeMoneyProblems(generated.markdown)).toEqual([]);
    expect(() => buildScopeRequest({ ...input, confirmation: { ...input.confirmation, revision: 2 } }, DISCOVERY_SKILLS)).toThrow('stale');
    if (TIER === 'loop') {
      const story = scope.userStories[0];
      for (const invalid of [
        null,
        { ...scope, lovableRecommendation: { recommended: true, rationale: 'Edit the list by chat.' }, buildSplit: { lovable: ['Screens'], claudeCode: ['Jobs'] } },
        { ...scope, userStories: [{ ...story, acceptanceCriteria: [] }] },
        { ...scope, userStories: [{ ...story, discoveryTopicId: 'unknown' }] },
      ]) {
        h.vendors.anthropic.script([{ kind: 'tool', name: 'record_scope', input: invalid, text: '', usage: { inputTokens: 1800, outputTokens: 640 } }]);
        await expect(generate(input)).rejects.toThrow();
      }
    }
    expect(parseTechnicalScope(generated.scope, input)).toEqual({ ok: true, scope: generated.scope });
    if (TIER === 'integration') await proveScopeSection(generated.scope);
  },
});

atTest('AT-036.12', 'each data tier shows its complexity, start-small advice and risk flags with no build estimate', { timeoutMs: { integration: 180_000 } }, {
  default: async ({ open }) => {
    const { h, sut } = await open();
    expect(scopeMoneySourceProblems()).toEqual([]);
    for (const fixture of SCOPE_TIER_FIXTURES) {
      expect(scopeDocumentProblems(renderScopeMarkdown(fixture.scope, { title: fixture.title }), fixture)).toEqual([]);
      const scope = { ...fixture.scope, userStories: fixture.scope.userStories.map((story) => ({ ...story, discoveryTopicId: 'priority' })) };
      expect(scopeMoneyProblems(renderScopeMarkdown(scope, { title: fixture.title }))).toEqual([]);
      if (TIER === 'loop') {
        h.vendors.anthropic.script([{ kind: 'tool', name: 'record_scope', input: scope, text: '', usage: { inputTokens: 1800, outputTokens: 640 } }]);
        const generated = await sut.generate(confirmed(scope));
        expect(scopeMoneyProblems(generated.markdown)).toEqual([]);
        expect(scopeDocumentProblems(generated.markdown, { ...fixture, scope: generated.scope })).toEqual([]);
      }
    }
    if (TIER === 'loop') {
      h.vendors.anthropic.script([{ kind: 'tool', name: 'record_scope', input: { ...GRANT_TRACKER_SCOPE, userStories: GRANT_TRACKER_SCOPE.userStories.map((story) => ({ ...story, discoveryTopicId: 'priority' })), summary: 'A list, roughly $4,000 to build.' }, text: '', usage: { inputTokens: 1800, outputTokens: 640 } }]);
      await expect(sut.generate(confirmed(GRANT_TRACKER_SCOPE))).rejects.toThrow('money');
    }
  },
});
