import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { COPY, CURRENT_STAGE, STAGES } from "./copy";
import { testIds } from "./testids";

export function ProcessBar() {
  return (
    <nav
      aria-label={COPY.stagesLabel}
      data-testid={testIds.processBar}
      className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs"
    >
      {STAGES.map((label, index) => {
        const done = index < CURRENT_STAGE;
        const current = index === CURRENT_STAGE;
        return (
          <span
            key={label}
            data-testid={testIds.processStage}
            aria-current={current ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
              current
                ? "border-foreground bg-foreground font-bold text-background"
                : done
                  ? "border-border bg-muted/50 text-foreground/80"
                  : "border-border bg-background text-muted-foreground",
            )}
          >
            {done ? <Check aria-hidden="true" className="size-3" strokeWidth={2.5} /> : null}
            {label}
          </span>
        );
      })}
    </nav>
  );
}

export function StageChip() {
  return (
    <span
      data-testid={testIds.processStageCurrent}
      className="rounded-full bg-foreground px-2 py-0.5 text-[11px] font-bold text-background"
    >
      {COPY.stageChip(CURRENT_STAGE, STAGES.length)}
    </span>
  );
}
