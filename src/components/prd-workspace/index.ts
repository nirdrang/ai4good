import { createElement, useEffect, useState } from "react";
import type { PrdSnapshot } from "@/lib/prd-stream";
import type { PrdPort, Selection } from "./port";

export type { PrdPort, PrdRefusal, Result, Selection } from "./port";

export type PrdWorkspaceScreenProps = {
  port: PrdPort;
  start: Selection;
  onOpenUiDesign?: (revision: number) => void;
};

export function PrdWorkspaceScreen({ port }: PrdWorkspaceScreenProps) {
  const [snapshot, setSnapshot] = useState<PrdSnapshot | null>(null);
  useEffect(() => {
    let live = true;
    void port.load().then((result) => {
      if (live && result.ok) setSnapshot(result.value);
    });
    const stop = port.subscribe((next) => setSnapshot(next));
    return () => {
      live = false;
      stop();
    };
  }, [port]);
  return createElement(
    "pre",
    { className: "min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-xs" },
    snapshot ? JSON.stringify(snapshot, null, 2) : "Loading",
  );
}
