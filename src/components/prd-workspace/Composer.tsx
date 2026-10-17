import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitOnEnter, useGrowingField } from "./fields";
import { COPY } from "./copy";
import type { QueuedItem } from "./outbox";
import { testIds } from "./testids";
import { LINK } from "./ui";

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
    <Button
      type="button"
      variant={tone}
      size="icon"
      data-testid={testId}
      aria-label={label}
      title={label}
      aria-disabled={!enabled}
      onClick={() => {
        if (enabled) onSend();
      }}
      className={cn(
        "size-11 shrink-0 rounded-full [&_svg]:size-[18px]",
        enabled
          ? ""
          : "cursor-not-allowed bg-muted-foreground/40 shadow-none hover:bg-muted-foreground/40",
      )}
    >
      <ArrowUp aria-hidden="true" strokeWidth={2.5} />
    </Button>
  );
}

export function Composer({
  text,
  busy,
  canSend,
  hint,
  queue,
  canEdit,
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
  canEdit: boolean;
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
              {canEdit && item.intent.kind === "text" ? (
                <Button
                  type="button"
                  variant="link"
                  data-testid={testIds.prdQueueEdit}
                  onClick={() => onEdit(item.id)}
                  className={cn(LINK, "px-1.5")}
                >
                  {COPY.edit}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="link"
                data-testid={testIds.prdQueueRemove}
                onClick={() => onRemove(item.id)}
                className={cn(LINK, "px-1.5 text-destructive hover:text-destructive")}
              >
                {COPY.remove}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex items-end gap-2.5">
        <Textarea
          ref={field}
          rows={1}
          data-testid={testIds.prdComposerInput}
          aria-label={COPY.messageToAi}
          placeholder={COPY.writeToAi}
          value={text}
          onChange={(event) => onText(event.target.value)}
          onKeyDown={(event) => submitOnEnter(event, () => enabled && onSend())}
          className="min-h-0 min-w-0 flex-1 resize-none rounded-lg bg-background px-2.5 py-2 leading-5 text-foreground"
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
