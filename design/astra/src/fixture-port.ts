import type { DiscoveryPort } from "../../../src/components/discovery/port";
import { FixtureChatTransport, FixtureFileChatTransport } from "./fixture-transport";
import { openFixtureWorld } from "./fixture-world";
import { SCENARIOS, type Pace, type ScreenScenario } from "./givens";

export function fixtureSelection(search = location.search): { scenario: ScreenScenario; pace: Pace } {
  const params = new URLSearchParams(search);
  const requested = params.get("scenario");
  const scenario = SCENARIOS.find((item) => item === requested) ?? "first-reply";
  const pace: Pace = params.get("pace") === "demo" ? "demo" : "test";
  return { scenario, pace };
}

export function fixturePort(scenario: ScreenScenario, pace: Pace = "test"): DiscoveryPort {
  const world = openFixtureWorld(scenario);
  return {
    load: () => world.load(),
    chat: new FixtureChatTransport(world, pace),
    fileChat: (target) => new FixtureFileChatTransport(world, target),
    subscribe: (listener) => world.subscribe(listener),
    saveBriefEdit: (input) => world.saveBriefEdit(input),
    acceptSuggestion: (input) => world.acceptSuggestion(input),
    removeCauseLabel: (input) => world.removeCauseLabel(input),
    finish: (input) => world.finish(input),
  };
}
