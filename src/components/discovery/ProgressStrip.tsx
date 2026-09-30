import { useEffect, useRef, useState } from "react";
import type { BriefSnapshot } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { SCREEN } from "./a11y";
import { progressOf } from "./model";

export function ProgressStrip({
  brief,
  projectTitle,
  phone = false,
  onOpenReview,
}: {
  brief: BriefSnapshot;
  projectTitle: string;
  phone?: boolean;
  onOpenReview(): void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const progress = progressOf(brief);
  const summary = `${progress.percent}% · ${progress.agreed} of ${progress.total} topics agreed`;
  useEffect(() => {
    if (phone) return;
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setCompact(!entry.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [phone]);
  if (phone) {
    return (
      <div
        role={SCREEN.progress.role}
        aria-label={SCREEN.progress.name}
        className="flex shrink-0 items-center gap-2 bg-background py-1"
      >
        <p className="m-0 min-w-0 flex-1 text-sm font-semibold">{summary}</p>
        <Button type="button" className="shrink-0 px-3" onClick={onOpenReview}>
          {SCREEN.finish.name}
        </Button>
      </div>
    );
  }
  return (
    <>
      <div ref={sentinel} className="h-px shrink-0" aria-hidden="true" />
      <div
        role={SCREEN.progress.role}
        aria-label={SCREEN.progress.name}
        className="sticky top-0 z-20 -mt-px flex shrink-0 flex-wrap items-center gap-2 bg-background py-2"
      >
        {compact ? null : <p className="m-0 text-sm text-muted-foreground">{projectTitle}</p>}
        <p className="m-0 text-sm font-semibold">{progress.percent}%</p>
        <p className="m-0 text-sm">
          {progress.agreed} of {progress.total} topics agreed
        </p>
        <Button type="button" className="ml-auto" onClick={onOpenReview}>
          {SCREEN.finish.name}
        </Button>
      </div>
    </>
  );
}
