import { readFileSync } from 'node:fs';
import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import { TIER } from '../../harness/registry.ts';
import { openingDocument, decideFinish } from '../../../../supabase/functions/_shared/discovery-brief.ts';
import { buildScopeRequest, generateConfirmedScope, renderScopeMarkdown, scopeMoneyProblems, type Scope, type ConfirmedDiscovery } from '../../../../supabase/functions/_shared/scope.ts';
import { discoveryModelPort } from '../../../../supabase/functions/_shared/discovery-model.ts';
import { DISCOVERY_SKILLS } from '../../../../supabase/functions/_shared/discovery-skills/index.ts';
import { SCOPE_TIER_FIXTURES, GRANT_TRACKER_SCOPE, scopeContractProblems, scopeDocumentProblems } from '../req-004/fixtures/scope-tiers.ts';

function confirmed(scope: Scope): ConfirmedDiscovery {
  const brief = openingDocument({ need: scope.summary });
  brief.document.dataTier = { tier: Number(scope.dataSensitivity.tier.at(-1)) as 0 | 1 | 2, reason: scope.dataSensitivity.rationale };
  brief.document.fit = { verdict: scope.maintainabilityFit.verdict === 'fit' ? 'fits' : 'declined', reason: scope.maintainabilityFit.rationale };
  brief.document.topics.priority!.state = { kind: 'agreed', answer: scope.summary, source: { kind: 'chat', round: 1 }, answerMessageId: 'answer-1' };
  const decision = decideFinish(brief, { acks: { reviewed: true, openGaps: true, data: true }, filesReading: false,
    actor: { id: 'ngo', displayName: 'NGO' }, at: '2026-10-04T00:00:00Z', existing: null });
  if (!decision.ok) throw new Error(decision.reason);
  return { brief, confirmation: decision.confirmation };
}

function livePort() {
  const values = new Map<string, string>();
  for (const line of readFileSync('supabase/functions/.env', 'utf8').split(/\r?\n/)) {
    const match = /^(DISCOVERY_[A-Z_]+|ANTHROPIC_API_KEY)=(.*)$/.exec(line);
    if (match) values.set(match[1], match[2].replace(/^['"]|['"]$/g, ''));
  }
  Object.defineProperty(globalThis, 'Deno', { configurable: true, value: { env: { get: (name: string) => values.get(name) } } });
  return discoveryModelPort();
}

atTest('AT-036.11', 'a confirmed Discovery document produces a grounded technical scope with both build parts', {
  default: async ({ open }) => {
    const { h, sut } = await open();
    const input = confirmed(GRANT_TRACKER_SCOPE);
    const scope = { ...GRANT_TRACKER_SCOPE, userStories: GRANT_TRACKER_SCOPE.userStories.map((story) => ({ ...story, discoveryTopicId: 'priority' })) };
    const generate = TIER === 'integration' ? (value: ConfirmedDiscovery) => generateConfirmedScope(value, DISCOVERY_SKILLS, livePort()) : sut.generate;
    if (TIER === 'loop') h.vendors.anthropic.script([{ kind: 'tool', name: 'record_scope', input: scope, text: '', usage: { inputTokens: 1800, outputTokens: 640 } }]);
    const generated = await generate(input);
    expect(scopeContractProblems(generated.scope)).toEqual([]);
    expect(generated.scope.buildSplit.lovable.length).toBeGreaterThan(0);
    expect(generated.scope.buildSplit.claudeCode.length).toBeGreaterThan(0);
    for (const story of generated.scope.userStories) {
      const topic = input.brief.document.topics[story.discoveryTopicId!];
      expect(topic).toBeDefined();
      expect(topic.state.kind === 'agreed' || input.confirmation.acceptedGaps.some((gap) => gap.topicId === topic.id)).toBe(true);
    }
    expect(() => buildScopeRequest({ ...input, confirmation: { ...input.confirmation, revision: 2 } }, DISCOVERY_SKILLS)).toThrow('stale');
    if (TIER === 'loop') {
      for (const invalid of [null, { ...scope, buildSplit: { lovable: ['Screens'], claudeCode: [] } }, { ...scope, userStories: [{ ...scope.userStories[0], discoveryTopicId: 'unknown' }] }]) {
        h.vendors.anthropic.script([{ kind: 'tool', name: 'record_scope', input: invalid, text: '', usage: { inputTokens: 1800, outputTokens: 640 } }]);
        await expect(generate(input)).rejects.toThrow();
      }
    }
  },
});

atTest('AT-036.12', 'each data tier explains complexity, maintenance and public pricing without a build estimate', {
  default: async ({ open }) => {
    const { h, sut } = await open();
    for (const fixture of SCOPE_TIER_FIXTURES) {
      expect(scopeDocumentProblems(renderScopeMarkdown(fixture.scope, { title: fixture.title }), fixture)).toEqual([]);
      const scope = { ...fixture.scope, userStories: fixture.scope.userStories.map((story) => ({ ...story, discoveryTopicId: 'priority' })) };
      const generate = TIER === 'integration' ? (value: ConfirmedDiscovery) => generateConfirmedScope(value, DISCOVERY_SKILLS, livePort()) : sut.generate;
      if (TIER === 'loop') h.vendors.anthropic.script([{ kind: 'tool', name: 'record_scope', input: scope, text: '', usage: { inputTokens: 1800, outputTokens: 640 } }]);
      const generated = await generate(confirmed(scope));
      expect(scopeMoneyProblems(generated.markdown)).toEqual([]);
      expect(scopeDocumentProblems(generated.markdown, { ...fixture, scope: generated.scope })).toEqual([]);
    }
    if (TIER === 'loop') {
      h.vendors.anthropic.script([{ kind: 'tool', name: 'record_scope', input: { ...GRANT_TRACKER_SCOPE, summary: 'A list, roughly $4,000 to build.' }, text: '', usage: { inputTokens: 1800, outputTokens: 640 } }]);
      await expect(sut.generate(confirmed(GRANT_TRACKER_SCOPE))).rejects.toThrow();
    }
  },
});
