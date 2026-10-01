import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { NAME, SCREEN, TEXT } from "./a11y";
import type { FileReadView } from "./model";

const FULL_SCREEN =
  "inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 sm:rounded-none";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.tsv,.txt,.doc,.docx,.xls,.xlsx";

function useFinePointer(): boolean {
  const query = "(pointer: fine)";
  const [fine, setFine] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setFine(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return fine;
}

function PanelBody({
  phone,
  mode,
  view,
  notice,
  onChoose,
  onClose,
}: {
  phone: boolean;
  mode: "chooser" | "file";
  view: FileReadView | null;
  notice: string | null;
  onChoose(file: File): void;
  onClose(): void;
}) {
  const fine = useFinePointer();
  const inputRef = useRef<HTMLInputElement>(null);
  const title = mode === "file" && view ? view.name : SCREEN.chooser.name;
  const closeLabel = mode === "file" ? TEXT.closeFile : SCREEN.cancelAdding.name;
  const chooseButton = (
    <Button
      type="button"
      className="h-auto min-h-11 max-w-full whitespace-normal"
      onClick={() => inputRef.current?.click()}
    >
      {SCREEN.chooseFile.name}
    </Button>
  );
  let body: ReactNode;
  if (mode === "chooser") {
    body = (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          accept={ACCEPT}
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            event.target.value = "";
            if (chosen) onChoose(chosen);
          }}
        />
        {fine ? (
          <div
            className="flex min-h-32 flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted p-5 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const dropped = event.dataTransfer.files[0];
              if (dropped) onChoose(dropped);
            }}
          >
            <p className="m-0 text-sm font-semibold">{TEXT.dropHere}</p>
            <p className="m-0 text-sm text-muted-foreground">or</p>
            {chooseButton}
          </div>
        ) : (
          chooseButton
        )}
        <p className="m-0 text-sm">{TEXT.acceptedTypes}</p>
        <p className="m-0 text-sm text-muted-foreground">{TEXT.sampleData}</p>
        {notice ? <p className="m-0 text-sm text-destructive">{notice}</p> : null}
      </div>
    );
  } else if (view) {
    body = (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <p aria-live="polite" className="m-0 text-sm">
          {view.statusText}
        </p>
        {view.percent !== null && view.tone ? (
          <Progress
            className="h-1"
            indicatorClassName="bg-progress-reading"
            value={view.percent}
            aria-label={NAME.reading(view.name)}
          />
        ) : null}
        {view.factText ? <p className="m-0 text-sm">{view.factText}</p> : null}
        {notice ? <p className="m-0 text-sm text-destructive">{notice}</p> : null}
      </div>
    );
  } else {
    body = null;
  }
  const cancelAtBottom = phone && mode === "chooser";
  return (
    <>
      <div className={`flex shrink-0 items-center gap-2 border-b border-border p-3 ${phone ? "flex-nowrap" : "flex-wrap"}`}>
        {phone && mode === "chooser" ? (
          <Button type="button" variant="outline" className="h-auto min-h-11 shrink-0 whitespace-normal" onClick={onClose}>
            {SCREEN.backToChat.name}
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          {phone ? (
            <DialogTitle className="truncate whitespace-nowrap text-base">{title}</DialogTitle>
          ) : (
            <h2 className="m-0 whitespace-normal text-base font-semibold">{title}</h2>
          )}
          {mode === "file" && view ? <p className="m-0 truncate text-sm text-muted-foreground">{view.sizeText}</p> : null}
        </div>
        {cancelAtBottom ? null : (
          <Button type="button" variant="outline" className="h-auto min-h-11 shrink-0 whitespace-normal" onClick={onClose}>
            {closeLabel}
          </Button>
        )}
      </div>
      {body}
      {cancelAtBottom ? (
        <div className="shrink-0 border-t border-border p-3">
          <Button type="button" variant="outline" className="h-auto min-h-11 w-full whitespace-normal" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      ) : null}
    </>
  );
}

export function FileOverlay({
  phone,
  mode,
  view,
  notice,
  onChoose,
  onClose,
}: {
  phone: boolean;
  mode: "chooser" | "file";
  view: FileReadView | null;
  notice: string | null;
  onChoose(file: File): void;
  onClose(): void;
}) {
  const title = mode === "file" && view ? view.name : SCREEN.chooser.name;
  const body = (
    <PanelBody phone={phone} mode={mode} view={view} notice={notice} onChoose={onChoose} onClose={onClose} />
  );
  if (phone) {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent
          className={`${FULL_SCREEN} [&>button]:hidden`}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex h-full min-h-0 flex-col bg-background">{body}</div>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <section
      role={mode === "chooser" ? "dialog" : "region"}
      aria-label={title}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      {body}
    </section>
  );
}
