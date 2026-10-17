import type { ChatTransport } from "ai";
import type { PrdPort, Selection } from "../../../src/components/prd-workspace/port";
import { scopeKey, type PrdUIMessage, type Role, type Viewer } from "../../../src/lib/prd-stream";
import { PrdFixtureTransport } from "./prd-fixture-transport";
import { createPrdWorld, forgetPrdWorld, openPrdWorld, type PrdWorld } from "./prd-fixture-world";
import { PRD_GIVEN, PRD_SCENARIOS, type PrdPace, type PrdScenario } from "./prd-givens";

export { createPrdWorld, openPrdWorld };
export type { PrdWorld };

export type PrdFixtureSelection = {
  scenario: PrdScenario;
  pace: PrdPace;
  viewer: Role;
  fresh: boolean;
};

export function prdFixtureSelection(search = location.search): PrdFixtureSelection {
  const params = new URLSearchParams(search);
  const requested = params.get("scenario");
  const scenario = PRD_SCENARIOS.find((item) => item === requested) ?? "prd-today";
  const pace: PrdPace = params.get("pace") === "demo" ? "demo" : "test";
  const asked = params.get("viewer");
  const viewer: Role = asked === "dev" || asked === "ngo" ? asked : PRD_GIVEN[scenario].viewer;
  return { scenario, pace, viewer, fresh: params.get("fresh") === "1" };
}

export function withoutFresh(href: string): string {
  const url = new URL(href);
  url.searchParams.delete("fresh");
  return url.toString();
}

/** The shell's selection. With `fresh=1` the scenario starts from its seed, and `fresh` leaves the URL so a reload keeps the changes. */
export function prdShellSelection(): PrdFixtureSelection {
  const selection = prdFixtureSelection();
  if (selection.fresh) {
    forgetPrdWorld(selection.scenario);
    history.replaceState(history.state, "", withoutFresh(location.href));
  }
  return selection;
}

export function prdStartSelection(scenario: PrdScenario, viewer: Role): Selection {
  if (viewer === "ngo" || PRD_GIVEN[scenario].start === "questions") return { kind: "questions" };
  return { kind: "main" };
}

/** A port bound to one viewer of a world. Both viewers of one world see the same record. */
export function prdPortFor(world: PrdWorld, viewer: Viewer): PrdPort {
  const transports = new Map<string, ChatTransport<PrdUIMessage>>();
  return {
    load: () => world.load(viewer),
    chat(scope) {
      const key = scopeKey(scope);
      const existing = transports.get(key);
      if (existing) return existing;
      const created = new PrdFixtureTransport(world, viewer, scope);
      transports.set(key, created);
      return created;
    },
    act: (action) => world.act(viewer, action),
    saveDraft: (key, text) => world.saveDraft(viewer, key, text),
    subscribe: (listener) => world.subscribe(viewer, listener),
  };
}

export function prdFixturePort(world: PrdWorld, role: Role): PrdPort {
  return prdPortFor(world, world.viewer(role));
}
