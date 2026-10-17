import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { COPY } from "./copy";
import type { PrdView } from "./model";
import type { PrdController } from "./use-prd-workspace";
import { testIds } from "./testids";
import { LINK } from "./ui";

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
    <Alert
      role="status"
      data-testid={testIds.prdClosedBanner}
      className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border-funds-ok/40 bg-funds-ok/10 px-4 py-2.5 text-funds-ok max-md:gap-2 max-md:px-3.5 max-md:text-xs"
    >
      <strong className="min-w-0 flex-1 font-semibold">
        {COPY.closedBanner(closed.revision, closed.openPoints)}
      </strong>
      {view.isDev ? (
        <Button
          type="button"
          data-testid={testIds.prdOpenUiDesign}
          onClick={() => onOpenUiDesign?.(closed.revision)}
          className="h-auto min-h-9 rounded-lg px-3.5 py-0 font-semibold max-md:min-h-11"
        >
          {COPY.openUiDesign}
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">{COPY.ngoOpensDesign(view.names.dev)}</span>
      )}
    </Alert>
  );
}

export function ReadOnlyBanner({ view, phone }: { view: PrdView; phone: boolean }) {
  if (view.isDev && !view.closed) return null;
  return (
    <Alert
      role={undefined}
      data-testid={testIds.prdReadonlyBanner}
      className="w-auto shrink-0 rounded-xl border-actor-ngo-line bg-actor-ngo-soft px-3.5 py-3 text-foreground/80 max-md:mx-2.5 max-md:mt-2 max-md:py-2 max-md:text-xs"
    >
      {view.isDev ? (
        <strong className="text-foreground">{COPY.closedReadOnly}</strong>
      ) : (
        <>
          <strong className="text-actor-ngo">{COPY.readOnlyLead(view.names.dev)}</strong>{" "}
          {phone ? COPY.readOnlyTailPhone : COPY.readOnlyTail}
        </>
      )}
    </Alert>
  );
}

export function ActNotice({ controller }: { controller: PrdController }) {
  const notice = controller.notice;
  if (!notice || notice.key !== "act") return null;
  return (
    <Alert
      variant="destructive"
      className="flex w-auto shrink-0 items-center gap-3 rounded-xl border-destructive/40 bg-destructive/5 py-2 dark:border-destructive/40 max-md:mx-2.5 max-md:mt-2"
    >
      <span className="min-w-0 flex-1">{notice.reason}</span>
      <Button
        type="button"
        variant="link"
        onClick={() => controller.dismissNotice()}
        className={LINK}
      >
        {COPY.dismiss}
      </Button>
    </Alert>
  );
}
