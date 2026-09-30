import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { DiscoveryUsage } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { NAME, SCREEN, TEXT } from "./a11y";
import { fileBarClass, type FileChatView } from "./model";
import { UsageCard } from "./UsageCard";

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

function AnswerBox({
  text,
  canSend,
  paid,
  onText,
  onSend,
}: {
  text: string;
  canSend: boolean;
  paid: boolean;
  onText(text: string): void;
  onSend(): void;
}) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const style = getComputedStyle(field);
    const line = Number.parseFloat(style.lineHeight);
    const pad =
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom) +
      Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderBottomWidth);
    const oneLine = (Number.isFinite(line) ? line : 0) + (Number.isFinite(pad) ? pad : 0);
    field.style.height = "auto";
    const grown = Math.min(field.scrollHeight, 192);
    // A long placeholder can inflate scrollHeight. An empty box stays one line.
    const next = text.length === 0 ? oneLine : Math.max(grown, oneLine);
    field.style.height = `${next}px`;
    setHeight(next);
  }, [text]);
  function onChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onText(event.target.value);
  }
  return (
    <form
      className="flex w-full min-w-0 items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
    >
      <Textarea
        ref={fieldRef}
        aria-label={SCREEN.fileAnswer.name}
        rows={1}
        value={text}
        placeholder={TEXT.fileAnswerPlaceholder}
        style={{ height: height ?? undefined, minHeight: 0 }}
        className="min-h-0 min-w-0 flex-1 resize-none overflow-y-auto py-2 text-base leading-5"
        onChange={onChange}
      />
      <Button type="submit" className="h-auto min-h-11 shrink-0 whitespace-normal" disabled={!canSend}>
        {paid ? TEXT.sendPaid : TEXT.send}
      </Button>
    </form>
  );
}

function PanelBody({
  phone,
  mode,
  view,
  usage,
  notice,
  onChoose,
  onClose,
  onDraft,
  onSend,
}: {
  phone: boolean;
  mode: "chooser" | "file";
  view: FileChatView | null;
  usage: DiscoveryUsage;
  notice: string | null;
  onChoose(file: File): void;
  onClose(): void;
  onDraft(text: string): void;
  onSend(text: string): void;
}) {
  const fine = useFinePointer();
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const lastMessageId = view?.messages[view.messages.length - 1]?.id ?? "";
  useLayoutEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }, [lastMessageId]);
  const title = mode === "file" && view ? NAME.fileChat(view.name) : SCREEN.chooser.name;
  const closeLabel = mode === "file" && view ? view.closeLabel : SCREEN.cancelAdding.name;
  const canSend = view !== null && view.canAnswer && !view.busy && view.draft.trim().length > 0;
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
      </div>
    );
  } else if (view) {
    body = (
      <>
        <div className="shrink-0 px-3 pt-3">
          <p aria-live="polite" className="m-0 text-sm">
            {view.statusText}
          </p>
          {view.percent !== null && view.tone ? (
            <Progress
              className="mt-2 h-1"
              indicatorClassName={fileBarClass(view.tone)}
              value={view.percent}
              aria-label={NAME.reading(view.name)}
            />
          ) : null}
          {notice ? <p className="m-0 mt-2 text-sm text-destructive">{notice}</p> : null}
        </div>
        <div ref={logRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          {view.messages.map((message) => (
            <p
              key={message.id}
              className={
                message.role === "user"
                  ? "max-w-[85%] self-end rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[85%] self-start rounded-lg bg-muted px-3 py-2 text-sm"
              }
            >
              {message.text}
            </p>
          ))}
        </div>
        {view.canAnswer ? (
          <div className="flex shrink-0 flex-wrap gap-2 px-3 pb-2">
            {view.chips.map((chip) => (
              <Button
                key={chip}
                type="button"
                variant="outline"
                className="h-auto min-h-11 max-w-full whitespace-normal"
                disabled={view.busy}
                onClick={() => onSend(chip)}
              >
                {chip}
              </Button>
            ))}
          </div>
        ) : null}
        {phone ? (
          <div className={view.canAnswer ? "shrink-0 px-3" : "shrink-0 px-3 pb-3"}>
            <UsageCard usage={usage} dock />
          </div>
        ) : null}
        {view.canAnswer ? (
          <div className="shrink-0 px-3 pb-3">
            <AnswerBox
              text={view.draft}
              canSend={canSend}
              paid={view.paid}
              onText={onDraft}
              onSend={() => onSend(view.draft)}
            />
          </div>
        ) : view.closeHint ? (
          <p className="m-0 shrink-0 px-3 pb-3 text-center text-sm text-muted-foreground">{view.closeHint}</p>
        ) : null}
      </>
    );
  } else {
    body = null;
  }
  const cancelAtBottom = phone && closeLabel === SCREEN.cancelAdding.name;
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
  usage,
  notice,
  onChoose,
  onClose,
  onDraft,
  onSend,
}: {
  phone: boolean;
  mode: "chooser" | "file";
  view: FileChatView | null;
  usage: DiscoveryUsage;
  notice: string | null;
  onChoose(file: File): void;
  onClose(): void;
  onDraft(text: string): void;
  onSend(text: string): void;
}) {
  const title = mode === "file" && view ? NAME.fileChat(view.name) : SCREEN.chooser.name;
  const body = (
    <PanelBody
      phone={phone}
      mode={mode}
      view={view}
      usage={usage}
      notice={notice}
      onChoose={onChoose}
      onClose={onClose}
      onDraft={onDraft}
      onSend={onSend}
    />
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
