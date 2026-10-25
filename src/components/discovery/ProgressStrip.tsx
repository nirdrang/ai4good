import { useState } from "react";
import type { BriefSnapshot } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { SCREEN } from "./a11y";
import { progressOf } from "./model";

export function ProgressStrip({
  brief,
  projectTitle,
  organizationName,
  stage,
  saveState,
  blocked,
  phone = false,
  onOpenReview,
}: {
  brief: BriefSnapshot;
  projectTitle: string;
  organizationName: string;
  stage: string;
  saveState: string;
  blocked: string | null;
  phone?: boolean;
  onOpenReview(): void;
}) {
  const [tried, setTried] = useState(false);
  const progress = progressOf(brief);
  const summary = `${progress.percent}% · ${progress.agreed} of ${progress.total} topics agreed`;
  const hint = tried && blocked ? (
    <p role="status" className="m-0 basis-full text-sm font-semibold">
      {blocked}
    </p>
  ) : null;
  const finish = (
    <Button
      type="button"
      className={phone ? "shrink-0 px-3" : "ml-auto"}
      onClick={() => {
        setTried(blocked !== null);
        if (!blocked) onOpenReview();
      }}
    >
      {SCREEN.finish.name}
    </Button>
  );
  if (phone) {
    return (
      <div
        role={SCREEN.progress.role}
        aria-label={SCREEN.progress.name}
        className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 bg-background py-1"
      >
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-xs text-muted-foreground">{`${projectTitle} · ${organizationName}`}</p>
          <p className="m-0 text-sm font-semibold">{summary}</p>
        </div>
        {finish}
        <p className="m-0 basis-full truncate text-xs text-muted-foreground">{`${stage} · ${saveState}`}</p>
        {hint}
      </div>
    );
  }
  return (
    <div
      role={SCREEN.progress.role}
      aria-label={SCREEN.progress.name}
      className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-2 bg-background py-2"
    >
      <p className="m-0 text-sm text-muted-foreground">{`${projectTitle} · ${organizationName}`}</p>
      <p className="m-0 text-sm">{stage}</p>
      <p className="m-0 text-sm font-semibold">{progress.percent}%</p>
        <p className="m-0 text-sm">
          {progress.agreed} of {progress.total} topics agreed
        </p>
      <p aria-live="polite" className="m-0 text-sm text-muted-foreground">{saveState}</p>
      {finish}
      {hint}
    </div>
  );
}
