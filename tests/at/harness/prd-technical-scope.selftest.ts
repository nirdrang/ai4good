import { expect, it } from "vitest";
import {
  decideFinish,
  openingDocument,
} from "../../../supabase/functions/_shared/discovery-brief.ts";
import type { ConfirmedDiscovery, Scope } from "../../../supabase/functions/_shared/scope.ts";
import { parseTechnicalScope } from "../../../supabase/functions/_shared/prd/technical-scope.ts";
import { GRANT_TRACKER_SCOPE } from "../suites/req-004/fixtures/scope-tiers.ts";

const SCOPE: Scope = {
  ...GRANT_TRACKER_SCOPE,
  userStories: GRANT_TRACKER_SCOPE.userStories.map((story) => ({
    ...story,
    discoveryTopicId: "priority",
  })),
};

function confirmed(scope: Scope): ConfirmedDiscovery {
  const brief = openingDocument({ need: scope.summary });
  brief.document.dataTier = {
    tier: 1,
    kinds: ["ordinary-pii"],
    reason: scope.dataSensitivity.rationale,
    responsibility: "ngo",
  };
  brief.document.fit = { verdict: "fits", reason: scope.maintainabilityFit.rationale };
  brief.document.topics.priority!.state = {
    kind: "agreed",
    answer: scope.summary,
    source: { kind: "chat", round: 1 },
    answerMessageId: "answer-1",
  };
  const decision = decideFinish(brief, {
    acks: { reviewed: true, openGaps: true, data: true },
    filesReading: false,
    actor: { id: "ngo", displayName: "NGO" },
    at: "2026-10-04T00:00:00Z",
    existing: null,
  });
  if (!decision.ok) throw new Error(decision.reason);
  return { brief, confirmation: decision.confirmation };
}

const DISCOVERY = confirmed(SCOPE);

function problems(value: unknown): string[] {
  const result = parseTechnicalScope(value, DISCOVERY);
  if (result.ok) throw new Error("expected the technical scope to be refused");
  return result.problems;
}

it("accepts a scope that traces to the confirmed Discovery document", () => {
  expect(parseTechnicalScope(SCOPE, DISCOVERY)).toEqual({ ok: true, scope: SCOPE });
});

it("reads an empty object as a technical scope not written yet", () => {
  expect(parseTechnicalScope({}, DISCOVERY)).toEqual({ ok: true, scope: null });
});

it("refuses a story without an acceptance criterion", () => {
  const story = SCOPE.userStories[0];
  expect(problems({ ...SCOPE, userStories: [{ ...story, acceptanceCriteria: [] }] })).toContain(
    "Story 1 has no acceptance criterion.",
  );
});

it("refuses a story that traces to no agreed answer or kept open question", () => {
  const story = SCOPE.userStories[0];
  expect(problems({ ...SCOPE, userStories: [{ ...story, discoveryTopicId: "unknown" }] })).toEqual([
    `A scope story has no confirmed Discovery source: ${story.story}`,
  ]);
  const { discoveryTopicId: _dropped, ...untraced } = story;
  expect(problems({ ...SCOPE, userStories: [untraced] })).toEqual([
    `A scope story has no confirmed Discovery source: ${story.story}`,
  ]);
});

it("refuses a money figure", () => {
  expect(problems({ ...SCOPE, summary: "A list, roughly $4,000 to build." })).toEqual([
    "The scope contains a forbidden money figure.",
  ]);
});

it("refuses a changed data tier or fit verdict, as the generator does", () => {
  expect(
    problems({ ...SCOPE, dataSensitivity: { ...SCOPE.dataSensitivity, tier: "tier0" } }),
  ).toEqual(["The scope changed the confirmed data tier."]);
  expect(
    problems({
      ...SCOPE,
      maintainabilityFit: { ...SCOPE.maintainabilityFit, verdict: "declined" },
    }),
  ).toEqual(["The scope changed the confirmed fit verdict."]);
});

it("refuses a Lovable recommendation and a build split", () => {
  const found = problems({
    ...SCOPE,
    lovableRecommendation: { recommended: true, rationale: "Edit the list by chat." },
    buildSplit: { lovable: ["Screens"], claudeCode: ["Jobs"] },
  });
  expect(found).toContain(
    "The technical scope has fields a scope does not have: lovableRecommendation, buildSplit.",
  );
});

it("refuses a value that is not a scope", () => {
  for (const value of [null, [], "stories", { stories: [] }]) {
    expect(problems(value)).toContain("The technical scope is not a complete scope.");
  }
});
