/**
 * AT-004.10 — a Discovery output against a fixture-specific semantic oracle.
 *
 * DISPOSABLE SKELETON. Read this label literally: the parameters below are NOT the future suite's
 * oracle, and the suite that translates REQ-004 should expect to throw this file away rather than
 * edit it.
 *
 * WHY IT CANNOT BE MORE THAN A SKELETON. The ratified criterion is *"Given a representative
 * non-technical intake fixture … its output satisfies a fixture-specific semantic oracle — the
 * required facts, constraints, user stories, and acceptance criteria for that fixture are present
 * and correct"*. Every noun in that sentence is owned by a fixture that does not exist. Which
 * facts are required, how many user stories are enough, what "correct" means for that intake —
 * all of it arrives with the fixture. Authoring a rubric now and calling it a head start would be
 * inventing the fixture's contents in a file the fixture's author will never read (Gate 1 finding
 * F5).
 *
 * WHAT IT IS FOR, then: proving the contract can EXPRESS this shape of oracle at all — a
 * containment criterion per required fact, and a count-minimum over produced artifacts. That is
 * what the ratified text genuinely pins today, and it is what the factory below demonstrates.
 */

import type { Rubric } from '../contracts.ts';

/**
 * Build the skeleton for one intake fixture.
 *
 * A FACTORY rather than a constant, because the shape of this oracle is per-fixture by
 * construction: a constant would have to invent one fixture's facts and would then look like a
 * decision rather than an example.
 */
export function at004_10DiscoveryRubric(fixture: {
  id: string;
  /** the facts that fixture's intake supplies, each of which the scope must carry and carry correctly */
  requiredFacts: string[];
  /** how many acceptance criteria the scope must produce for that fixture */
  minimumAcceptanceCriteria: number;
}): Rubric {
  return {
    id: `at-004-10-discovery-${fixture.id}`,
    version: '1',
    materialSlots: ['discovery_scope'],
    criteria: [
      ...fixture.requiredFacts.map((fact, index) => ({
        kind: 'semantic' as const,
        id: `fact-${index + 1}-present`,
        statement:
          `The scope states this fact from the intake, and states it correctly rather than merely mentioning the ` +
          `subject: ${fact}`,
        required: true,
      })),
      {
        kind: 'extraction',
        id: 'acceptance-criteria-count',
        statement: 'How many distinct acceptance criteria does the scope list?',
        required: true,
        extract: {
          what: 'the number of distinct acceptance criteria in the scope',
          unit: 'criteria',
          normalization: 'count each criterion once, however it is formatted; do not count headings or restatements',
        },
        compare: { op: 'count_at_least', minimum: fixture.minimumAcceptanceCriteria },
      },
    ],
  };
}

/** The example parameters. Not a fixture, not a decision — enough to have two specimens to judge. */
export const AT_004_10_EXAMPLE_RUBRIC: Rubric = at004_10DiscoveryRubric({
  id: 'example',
  requiredFacts: [
    'the organisation runs a weekly food distribution and currently tracks recipients on paper',
    'volunteers who staff the distribution have no email addresses and share one phone',
  ],
  minimumAcceptanceCriteria: 3,
});

export const AT_004_10_COMPLIANT: Record<string, string> = {
  discovery_scope: [
    'Scope: recipient tracking for the weekly food distribution.',
    '',
    'Today the distribution is run once a week and recipients are recorded on paper sheets that are re-typed later.',
    'The volunteers who staff it do not have individual email addresses and share a single phone at the site, so',
    'anything that requires a personal login per volunteer is out.',
    '',
    'Acceptance criteria:',
    '1. A volunteer can record a recipient visit on the shared phone without signing in as themselves.',
    '2. The week\'s visits can be exported as a single file at the end of each distribution day.',
    '3. A recipient recorded twice in one distribution is shown as one visit, not two.',
    '4. The paper sheets can be entered later without creating duplicate visits.',
  ].join('\n'),
};

export const AT_004_10_VIOLATING: Record<string, string> = {
  discovery_scope: [
    'Scope: a modern volunteer management platform.',
    '',
    'The organisation wants to digitise its operations. Each volunteer will have an account and will sign in with',
    'their own email address to see their shift assignments.',
    '',
    'Acceptance criteria:',
    '1. Volunteers can log in.',
  ].join('\n'),
};
