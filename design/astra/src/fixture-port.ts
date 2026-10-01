import type { DiscoveryFile } from "../../../src/lib/discovery-stream";
import type { DiscoveryPort, Result } from "../../../src/components/discovery/port";
import { FixtureChatTransport, reportModelCall } from "./fixture-transport";
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
  const world = openFixtureWorld(scenario, pace);
  const scope = { organizationId: "fixture", projectId: "fixture" };
  return {
    load: () => world.load(),
    chat: new FixtureChatTransport(world, pace, scope),
    async addFile(file: File): Promise<Result<DiscoveryFile>> {
      const blocked = world.fileRefusal(file);
      if (blocked) return { ok: false, refusal: blocked };
      await reportModelCall("file-read");
      return world.addFile(file);
    },
    subscribe: (listener) => world.subscribe(listener),
    saveBriefEdit: (input) => world.saveBriefEdit(input),
    acceptSuggestion: (input) => world.acceptSuggestion(input),
    askTopic: (input) => world.askTopic(input),
    removeCauseLabel: (input) => world.removeCauseLabel(input),
    finish: (input) => world.finish(input),
  };
}
