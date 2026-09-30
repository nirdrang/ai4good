import type { ReactNode, Ref } from "react";
import type { BriefSnapshot } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NAME, SCREEN, TEXT } from "./a11y";
import { briefSections, progressOf } from "./model";

const FULL_SCREEN =
  "inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 sm:rounded-none";

export function briefHeading(brief: BriefSnapshot): string {
  const progress = progressOf(brief);
  return `Your live brief · ${TEXT.revision(brief.revision)} · ${progress.agreed} of ${progress.total} agreed`;
}

function Sections({ brief, onEdit }: { brief: BriefSnapshot; onEdit(questionId: string): void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">{TEXT.revision(brief.revision)}</p>
      <p className="text-sm text-muted-foreground">{TEXT.editsFree}</p>
      {briefSections(brief).map((section) => {
        const questionId = section.questionId;
        return (
          <section key={section.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0">
            <h3 className="text-sm font-semibold">{section.title}</h3>
            <p className="text-sm">{section.status}</p>
            {section.text ? <p className="text-sm">{section.text}</p> : null}
            {section.detail ? <p className="text-sm text-muted-foreground">{section.detail}</p> : null}
            {questionId ? (
              <Button type="button" variant="outline" className="mt-1 h-auto min-h-11 self-start whitespace-normal" onClick={() => onEdit(questionId)}>
                {NAME.editSection(section.title)}
              </Button>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export function BriefCard({
  brief,
  onOpen,
  buttonRef,
}: {
  brief: BriefSnapshot;
  onOpen(): void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <section className="flex min-w-0 shrink-0 flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="m-0 text-base font-semibold">{briefHeading(brief)}</h2>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        className="h-auto min-h-11 self-start whitespace-normal"
        onClick={onOpen}
      >
        {SCREEN.openBrief.name}
      </Button>
    </section>
  );
}

export function BriefSide({
  brief,
  onClose,
  onEdit,
}: {
  brief: BriefSnapshot;
  onClose(): void;
  onEdit(questionId: string): void;
}) {
  return (
    <aside
      role={SCREEN.briefSide.role}
      aria-label={SCREEN.briefSide.name}
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto rounded-xl border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{SCREEN.briefSide.name}</h2>
        <Button type="button" variant="outline" onClick={onClose}>
          {SCREEN.backToChat.name}
        </Button>
      </div>
      <Sections brief={brief} onEdit={onEdit} />
    </aside>
  );
}

export function BriefDialog({
  brief,
  usage,
  onClose,
  onEdit,
}: {
  brief: BriefSnapshot;
  usage: ReactNode;
  onClose(): void;
  onEdit(questionId: string): void;
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={FULL_SCREEN} onCloseAutoFocus={(event) => event.preventDefault()}>
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b p-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {SCREEN.backToChat.name}
          </Button>
          <DialogTitle className="text-base">{SCREEN.briefFull.name}</DialogTitle>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <Sections brief={brief} onEdit={onEdit} />
        </div>
        <div className="shrink-0 border-t p-3">{usage}</div>
      </DialogContent>
    </Dialog>
  );
}
