import type { DiscoveryUsage } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SCREEN, TEXT } from "./a11y";
import { resetClock, usageView, type UsageTone } from "./model";

function toneClass(tone: UsageTone): string {
  if (tone === "red") return "bg-usage-stop";
  if (tone === "yellow") return "bg-usage-warn";
  return "bg-usage-ok";
}

function fillWidth(fraction: number): string {
  return `${Math.round(fraction * 1000) / 10}%`;
}

export function UsageCard({ usage, dock = false }: { usage: DiscoveryUsage; dock?: boolean }) {
  const view = usageView(usage, usage.nextResetAt ? resetClock(usage.nextResetAt) : "");
  const freeUsedUp = usage.dailyLeft === 0 && usage.betaLeft === 0;
  return (
    <section role={SCREEN.usage.role} aria-label={SCREEN.usage.name} className="min-w-0 max-w-full">
      <Card>
        <CardContent className={dock ? "flex flex-col gap-2 p-3 pb-1" : "flex flex-col gap-2 p-3"}>
          <p className="text-sm">{view.headline}</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex gap-1">
              <span>{TEXT.usageValues.daily}</span>
              <span>{view.values.daily}</span>
            </span>
            <span className="inline-flex gap-1">
              <span>{TEXT.usageValues.beta}</span>
              <span>{view.values.beta}</span>
            </span>
            <span className="inline-flex gap-1">
              <span>{TEXT.usageValues.fuel}</span>
              <span>{view.values.fuel}</span>
            </span>
          </p>
          <p className="text-sm text-muted-foreground">{view.footer}</p>
          {freeUsedUp ? (
            <div className="flex flex-col items-start gap-1">
              <Button type="button" variant="outline">
                {TEXT.buyFuel}
              </Button>
              <p className="text-sm text-muted-foreground">{TEXT.buyFuelNote}</p>
            </div>
          ) : null}
          <div role="img" aria-label={view.bar.label} className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            <span className="block h-full w-[34%] bg-muted">
              <span className={`block h-full ${toneClass(view.bar.freeTone)}`} style={{ width: fillWidth(view.bar.free) }} />
            </span>
            <span className="block h-full min-w-0 flex-1 bg-muted">
              <span className={`block h-full ${toneClass(view.bar.fuelTone)}`} style={{ width: fillWidth(view.bar.fuel) }} />
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
