import { useEffect, useRef, useState } from "react";
import type { BriefSnapshot } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { SCREEN } from "./a11y";
import { progressOf } from "./model";

export function ProgressStrip({
  brief,
  projectTitle,
  onOpenReview,
}: {
  brief: BriefSnapshot;
  projectTitle: string;
  onOpenReview(): void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const progress = progressOf(brief);
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setCompact(!entry.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <>
      <div ref={sentinel} className="h-px" aria-hidden="true" />
      <div
        role={SCREEN.progress.role}
        aria-label={SCREEN.progress.name}
        className="sticky top-16 z-20 -mt-px flex flex-wrap items-center gap-2 bg-background py-2"
      >
        {compact ? null : <p className="text-sm text-muted-foreground">{projectTitle}</p>}
        <p className="text-sm font-semibold">{progress.percent}%</p>
        <p className="text-sm">
          {progress.agreed} of {progress.total} topics agreed
        </p>
        <Button type="button" className="ml-auto" onClick={onOpenReview}>
          {SCREEN.finish.name}
        </Button>
      </div>
    </>
  );
}
