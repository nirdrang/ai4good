import { useState, type ReactNode } from "react";
import type { PrdViewerRole } from "./prd-givens";

const VIEWERS: readonly { role: PrdViewerRole; label: string }[] = [
  { role: "dev", label: "Priya (Dev)" },
  { role: "ngo", label: "Maya (NGO)" },
];

export function PrdShell({
  viewer,
  onViewer,
  children,
}: {
  viewer: PrdViewerRole;
  onViewer: (viewer: PrdViewerRole) => void;
  children: (openUiDesign: (revision: number) => void) => ReactNode;
}) {
  const [designRevision, setDesignRevision] = useState<number | null>(null);

  function choose(role: PrdViewerRole) {
    if (role === viewer) return;
    const url = new URL(location.href);
    url.searchParams.set("viewer", role);
    history.replaceState(history.state, "", url);
    onViewer(role);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div
        data-testid="prototype-viewer-switch"
        className="inline-flex items-center gap-1.5 self-end rounded-lg border border-dashed border-border px-1.5 py-1 text-[11px] text-muted-foreground"
      >
        Prototype only · view as
        {VIEWERS.map((item) => (
          <button
            key={item.role}
            type="button"
            aria-pressed={item.role === viewer}
            onClick={() => choose(item.role)}
            className={`min-h-[30px] rounded-md border px-2.5 text-xs font-semibold ${
              item.role === viewer
                ? item.role === "dev"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-amber-700 bg-amber-700 text-white"
                : "border-border bg-background text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {designRevision !== null ? (
        <div
          role="status"
          data-testid="prd-ui-design-note"
          className="rounded-md border border-border px-4 py-2 text-xs text-foreground"
        >
          UI Design starts from PRD revision {designRevision}. The UI Design screen is designed in
          its own item.
        </div>
      ) : null}
      {children(setDesignRevision)}
    </div>
  );
}
