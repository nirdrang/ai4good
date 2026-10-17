import { Check, ChevronRight, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { COPY } from "./copy";
import type { FundsView, PrdView } from "./model";
import { testIds } from "./testids";
import type { PrdController } from "./use-prd-workspace";
import { ACTION, BAND_BAR, BAND_TEXT, STATE_BADGE, TONE_TEXT } from "./ui";

function TopicProgress({ view }: { view: PrdView }) {
  const { confirmed, total } = view.progress;
  return (
    <div data-testid={testIds.prdTopicProgress} className="mt-2.5">
      <div className="text-sm text-foreground/80">
        <strong className="text-lg text-foreground">
          {confirmed} of {total}
        </strong>{" "}
        {COPY.progressTail}
      </div>
      <Progress
        aria-hidden="true"
        value={total > 0 ? Math.round((confirmed / total) * 100) : 0}
        className="mt-2 bg-muted"
        indicatorClassName="bg-funds-ok"
      />
    </div>
  );
}

function ClosePanel({ view, controller }: { view: PrdView; controller: PrdController }) {
  const close = view.close;
  return (
    <Card
      data-testid={testIds.prdClosePanel}
      className={cn(
        "flex flex-col gap-2 px-3 py-2.5",
        close.ready ? "border-funds-ok/40 bg-funds-ok/10" : "",
      )}
    >
      <div className="text-xs font-bold text-foreground">{close.title}</div>
      {close.remaining.length > 0 ? (
        <ul
          data-testid={testIds.prdCloseRemaining}
          className="list-disc pl-4 text-xs leading-normal text-muted-foreground"
        >
          {close.remaining.map((item) => (
            <li key={item} data-testid={testIds.prdCloseRemainingItem}>
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      {close.action ? (
        <Button
          type="button"
          variant="dev"
          data-testid={testIds.prdCloseButton}
          aria-disabled={controller.acting}
          onClick={() => {
            if (!controller.acting) void controller.closePrd();
          }}
          className={cn(ACTION, "min-h-10 text-sm")}
        >
          {COPY.closePrd}
        </Button>
      ) : close.reason ? (
        <div className="text-xs text-muted-foreground">{close.reason}</div>
      ) : null}
    </Card>
  );
}

function Gauge({ funds }: { funds: FundsView }) {
  return (
    <Card data-testid={testIds.prdUsdGauge} className="p-3">
      <div className="text-xs font-semibold text-foreground">{COPY.funds}</div>
      <div aria-hidden="true" className="my-2 flex h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-2", BAND_BAR[funds.band])}
          style={{ width: `${funds.spentPercent}%` }}
        />
        <div
          className="h-2 bg-[repeating-linear-gradient(45deg,var(--muted-foreground)_0_4px,transparent_4px_8px)] opacity-60"
          style={{ width: `${funds.pendingPercent}%` }}
        />
      </div>
      <div className={cn("text-sm", BAND_TEXT[funds.band])}>
        <strong data-testid={testIds.prdUsdAvailable} className={BAND_TEXT[funds.band]}>
          {funds.available}
        </strong>
        {COPY.fundsTail(funds.allocation)}
        {funds.pending ? (
          <span data-testid={testIds.prdUsdPending} className="text-muted-foreground">
            {COPY.pending(funds.pending)}
          </span>
        ) : null}
      </div>
      {funds.low ? (
        <div data-testid={testIds.prdUsdOut} className="mt-1 text-xs font-semibold text-funds-stop">
          {COPY.fundsOut}
        </div>
      ) : null}
    </Card>
  );
}

function TopicList({
  view,
  controller,
  phone,
}: {
  view: PrdView;
  controller: PrdController;
  phone: boolean;
}) {
  const center = controller.center;
  const onMain = center.kind === "main";
  const itemClass = (selected: boolean) =>
    cn(
      "h-auto w-full flex-col items-stretch justify-start gap-1 whitespace-normal rounded-xl px-3 py-2.5 text-left font-normal shadow-none hover:bg-muted/60 hover:text-foreground",
      phone ? "min-h-[52px]" : "",
      selected ? "border-foreground bg-muted/60" : "border-border bg-background",
    );
  return (
    <ul
      data-testid={testIds.prdTopicList}
      aria-label={COPY.topicsLabel}
      className={cn("flex shrink-0 flex-col", phone ? "gap-2" : "gap-1.5")}
    >
      {phone ? null : (
        <li>
          <Button
            type="button"
            variant="outline"
            data-testid={testIds.prdMainChatItem}
            aria-pressed={onMain}
            onClick={() => controller.select({ kind: "main" })}
            className={cn(itemClass(onMain), "flex-row items-center gap-2 [&_svg]:size-3.5")}
          >
            <MessageSquare aria-hidden="true" />
            <span className="flex-1 text-sm font-semibold">{COPY.mainChat}</span>
          </Button>
        </li>
      )}
      {view.topics.map(({ topic, label, blockerTone }) => {
        const selected = center.kind === "topic" && center.topicId === topic.id;
        return (
          <li key={topic.id}>
            <Button
              type="button"
              variant="outline"
              data-testid={testIds.prdTopicItem}
              aria-pressed={phone ? undefined : selected}
              onClick={() => controller.select({ kind: "topic", topicId: topic.id })}
              className={cn(itemClass(!phone && selected), "[&_svg]:size-3.5")}
            >
              <span className="flex w-full items-center gap-2">
                <span className="flex-1 text-sm font-semibold text-foreground">{topic.title}</span>
                <Badge
                  data-testid={testIds.prdTopicState}
                  variant="outline"
                  className={cn(
                    "gap-1 rounded-full px-2 text-[11px] [&_svg]:size-3!",
                    STATE_BADGE[topic.state],
                  )}
                >
                  {topic.state === "confirmed" ? (
                    <Check aria-hidden="true" strokeWidth={3} />
                  ) : null}
                  {label}
                </Badge>
                {phone ? (
                  <ChevronRight aria-hidden="true" className="text-muted-foreground" />
                ) : null}
              </span>
              {topic.blocker ? (
                <span
                  data-testid={testIds.prdTopicBlocker}
                  className={cn("text-xs", TONE_TEXT[blockerTone])}
                >
                  {topic.blocker}
                </span>
              ) : null}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

export function PrdPanel({
  view,
  controller,
  phone,
}: {
  view: PrdView;
  controller: PrdController;
  phone: boolean;
}) {
  return (
    <>
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-foreground">{COPY.projectPrd}</h2>
          <span data-testid={testIds.prdRevision} className="text-xs text-muted-foreground">
            {COPY.revision(view.snapshot.revision)}
          </span>
        </div>
        <TopicProgress view={view} />
      </div>
      <ClosePanel view={view} controller={controller} />
      <TopicList view={view} controller={controller} phone={phone} />
      <div className={phone ? "" : "mt-auto"}>
        <Gauge funds={view.funds} />
      </div>
    </>
  );
}
