import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitOnEnter, useGrowingField } from "./fields";
import { COPY } from "./copy";
import type { QueuedItem } from "./outbox";
import { testIds } from "./testids";
import { FOCUS, LINK_BUTTON } from "./ui";

export function SendButton({
  testId,
  label,
  enabled,
  tone,
  onSend,
}: {
  testId: string;
  label: string;
  enabled: boolean;
  tone: "dev" | "ngo";
  onSend(): void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      title={label}
      aria-disabled={!enabled}
      onClick={() => {
        if (enabled) onSend();
      }}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full text-actor-on",
        FOCUS,
        enabled
          ? tone === "dev"
            ? "bg-actor-dev"
            : "bg-actor-ngo"
          : "cursor-not-allowed bg-muted-foreground/40",
      )}
    >
      <ArrowUp aria-hidden="true" className="size-[18px]" strokeWidth={2.5} />
    </button>
  );
}

export function Composer({
  text,
  busy,
  canSend,
  hint,
  queue,
  notice,
  onText,
  onSend,
  onEdit,
  onRemove,
}: {
  text: string;
  busy: boolean;
  canSend: boolean;
  hint: string | null;
  queue: readonly QueuedItem[];
  notice: string | null;
  onText(text: string): void;
  onSend(): void;
  onEdit(id: string): void;
  onRemove(id: string): void;
}) {
  const field = useGrowingField(text, 140);
  const enabled = canSend && text.trim().length > 0;
  return (
    <div
      data-testid={testIds.prdComposer}
      className="flex shrink-0 flex-col gap-2 rounded-2xl border-2 border-actor-dev bg-background px-3 py-2.5 max-md:mx-2.5 max-md:mb-2.5 max-md:px-2.5 max-md:py-2"
    >
      {hint ? <div className="text-xs text-muted-foreground max-md:hidden">{hint}</div> : null}
      {notice ? (
        <div role="alert" className="text-xs font-semibold text-destructive">
          {notice}
        </div>
      ) : null}
      {queue.length > 0 ? (
        <div
          data-testid={testIds.prdQueue}
          className="flex flex-col gap-1.5 rounded-lg border border-dashed border-muted-foreground/60 bg-muted/50 px-2.5 py-2"
        >
          <div className="text-[11px] font-bold text-foreground/80">
            {COPY.queued(queue.length)}
          </div>
          {queue.map((item) => (
            <div
              key={item.id}
              data-testid={testIds.prdQueueItem}
              className="flex items-center gap-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{item.text}</span>
              {item.intent.kind === "text" ? (
                <button
                  type="button"
                  data-testid={testIds.prdQueueEdit}
                  onClick={() => onEdit(item.id)}
                  className={cn(LINK_BUTTON, "px-1.5")}
                >
                  {COPY.edit}
                </button>
              ) : null}
              <button
                type="button"
                data-testid={testIds.prdQueueRemove}
                onClick={() => onRemove(item.id)}
                className={cn(LINK_BUTTON, "px-1.5 text-destructive")}
              >
                {COPY.remove}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex items-end gap-2.5">
        <textarea
          ref={field}
          rows={1}
          data-testid={testIds.prdComposerInput}
          aria-label={COPY.messageToAi}
          placeholder={COPY.writeToAi}
          value={text}
          onChange={(event) => onText(event.target.value)}
          onKeyDown={(event) => submitOnEnter(event, () => enabled && onSend())}
          className={cn(
            "min-w-0 flex-1 resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-sm leading-5 text-foreground placeholder:text-muted-foreground max-md:text-base",
            FOCUS,
          )}
        />
        <SendButton
          testId={testIds.prdSendButton}
          label={busy ? COPY.addToQueue : COPY.send}
          enabled={enabled}
          tone="dev"
          onSend={onSend}
        />
      </div>
    </div>
  );
}
