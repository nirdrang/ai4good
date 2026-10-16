import { cn } from "@/lib/utils";
import { COPY } from "./copy";
import type { PrdView } from "./model";
import type { PrdController } from "./use-prd-workspace";
import { testIds } from "./testids";
import { FOCUS, LINK_BUTTON } from "./ui";

export function ClosedBanner({
  view,
  onOpenUiDesign,
}: {
  view: PrdView;
  onOpenUiDesign?: (revision: number) => void;
}) {
  const closed = view.closed;
  if (!closed) return null;
  return (
    <div
      role="status"
      data-testid={testIds.prdClosedBanner}
      className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-funds-ok/40 bg-funds-ok/10 px-4 py-2.5 text-sm text-funds-ok max-md:gap-2 max-md:px-3.5 max-md:text-xs"
    >
      <strong className="min-w-0 flex-1 font-semibold">
        {COPY.closedBanner(closed.revision, closed.openPoints)}
      </strong>
      {view.isDev ? (
        <button
          type="button"
          data-testid={testIds.prdOpenUiDesign}
          onClick={() => onOpenUiDesign?.(closed.revision)}
          className={cn(
            "min-h-9 rounded-lg bg-foreground px-3.5 text-sm font-semibold text-background max-md:min-h-11",
            FOCUS,
          )}
        >
          {COPY.openUiDesign}
        </button>
      ) : (
        <span className="text-xs text-muted-foreground">{COPY.ngoOpensDesign(view.names.dev)}</span>
      )}
    </div>
  );
}

export function ReadOnlyBanner({ view, phone }: { view: PrdView; phone: boolean }) {
  if (view.isDev && !view.closed) return null;
  return (
    <div
      data-testid={testIds.prdReadonlyBanner}
      className="shrink-0 rounded-xl border border-actor-ngo-line bg-actor-ngo-soft px-3.5 py-3 text-sm text-foreground/80 max-md:mx-2.5 max-md:mb-2.5 max-md:text-xs"
    >
      {view.isDev ? (
        <strong className="text-foreground">{COPY.closedReadOnly}</strong>
      ) : (
        <>
          <strong className="text-actor-ngo">{COPY.readOnlyLead(view.names.dev)}</strong>{" "}
          {phone ? COPY.readOnlyTailPhone : COPY.readOnlyTail}
        </>
      )}
    </div>
  );
}

export function ActNotice({ controller }: { controller: PrdController }) {
  const notice = controller.notice;
  if (!notice || notice.key !== "act") return null;
  return (
    <div
      role="alert"
      className="flex shrink-0 items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive max-md:mx-2.5 max-md:mt-2"
    >
      <span className="min-w-0 flex-1">{notice.reason}</span>
      <button type="button" onClick={() => controller.dismissNotice()} className={LINK_BUTTON}>
        {COPY.dismiss}
      </button>
    </div>
  );
}
