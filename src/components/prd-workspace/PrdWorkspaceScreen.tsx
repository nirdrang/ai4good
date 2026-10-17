import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import type { PrdSnapshot } from "@/lib/prd-stream";
import { useIsPhone } from "../discovery/use-is-phone";
import { COPY } from "./copy";
import { DesktopLayout } from "./DesktopLayout";
import { PhoneLayout } from "./PhoneLayout";
import type { PrdPort, Selection } from "./port";
import { usePrdWorkspace, type FocusRequest } from "./use-prd-workspace";

export type PrdWorkspaceScreenProps = {
  port: PrdPort;
  start: Selection;
  onOpenUiDesign?: (revision: number) => void;
};

function useFocusRequest(request: FocusRequest | null) {
  useEffect(() => {
    if (!request) return;
    const element = document.getElementById(request.elementId);
    if (!element) return;
    element.scrollIntoView({ block: "center" });
    if (request.focus) element.focus({ preventScroll: true });
  }, [request]);
}

function Workspace({
  port,
  initial,
  start,
  onOpenUiDesign,
}: {
  port: PrdPort;
  initial: PrdSnapshot;
  start: Selection;
  onOpenUiDesign?: (revision: number) => void;
}) {
  const controller = usePrdWorkspace(port, initial, start);
  const phone = useIsPhone();
  useFocusRequest(controller.focusRequest);
  return phone ? (
    <PhoneLayout controller={controller} onOpenUiDesign={onOpenUiDesign} />
  ) : (
    <DesktopLayout controller={controller} onOpenUiDesign={onOpenUiDesign} />
  );
}

export function PrdWorkspaceScreen({ port, start, onOpenUiDesign }: PrdWorkspaceScreenProps) {
  const [loaded, setLoaded] = useState<
    | { kind: "loading" }
    | { kind: "ready"; snapshot: PrdSnapshot }
    | { kind: "failed"; reason: string }
  >({ kind: "loading" });
  useEffect(() => {
    let live = true;
    port.load().then(
      (result) => {
        if (!live) return;
        setLoaded(
          result.ok
            ? { kind: "ready", snapshot: result.value }
            : { kind: "failed", reason: result.refusal.reason },
        );
      },
      (error: unknown) => {
        if (live)
          setLoaded({
            kind: "failed",
            reason: error instanceof Error ? error.message : COPY.loadFailed,
          });
      },
    );
    return () => {
      live = false;
    };
  }, [port]);
  if (loaded.kind === "loading") {
    return (
      <div role="status" className="p-4 text-sm text-muted-foreground">
        {COPY.loading}
      </div>
    );
  }
  if (loaded.kind === "failed") {
    return (
      <Alert
        variant="destructive"
        className="rounded-xl border-destructive/40 p-4 dark:border-destructive/40"
      >
        {COPY.loadFailed} {loaded.reason}
      </Alert>
    );
  }
  return (
    <Workspace
      port={port}
      initial={loaded.snapshot}
      start={start}
      onOpenUiDesign={onOpenUiDesign}
    />
  );
}
