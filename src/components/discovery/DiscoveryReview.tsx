import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Check } from "lucide-react";
import type { DiscoveryState, Importance } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { IMPORTANCE, NAME, SCREEN, TEXT } from "./a11y";
import { DiscoveryDocument } from "./DiscoveryDocument";
import { fileTookLine, type OpenReviewItem, type ReviewSection } from "./model";
import type { DiscoveryPort } from "./port";
import { useIsPhone } from "./use-is-phone";
import { useDiscoveryReview, type DiscoveryReviewController } from "./use-discovery";

export function DiscoveryReview({
  port,
  onBackToChat,
}: {
  port: DiscoveryPort;
  onBackToChat(questionId: string | null): void;
}) {
  const [loaded, setLoaded] = useState<DiscoveryState | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    port.load().then(
      (result) => {
        if (!live) return;
        if (result.ok) setLoaded(result.value);
        else setFailure(result.refusal.reason);
      },
      (error: unknown) => {
        if (!live) return;
        setFailure(error instanceof Error ? error.message : "Discovery did not load.");
      },
    );
    return () => {
      live = false;
    };
  }, [port]);
  if (failure) return <p role="alert">{failure}</p>;
  if (!loaded) return <p>Loading Discovery.</p>;
  return <Loaded port={port} initial={loaded} onBackToChat={onBackToChat} />;
}

function Loaded({
  port,
  initial,
  onBackToChat,
}: {
  port: DiscoveryPort;
  initial: DiscoveryState;
  onBackToChat(questionId: string | null): void;
}) {
  const phone = useIsPhone();
  const review = useDiscoveryReview(port, initial);
  if (review.confirmation) return <Finished review={review} onBackToChat={onBackToChat} />;
  if (phone) return <PhoneReview review={review} onBackToChat={onBackToChat} />;
  return <DesktopReview review={review} onBackToChat={onBackToChat} />;
}

function DesktopReview({
  review,
  onBackToChat,
}: {
  review: DiscoveryReviewController;
  onBackToChat(questionId: string | null): void;
}) {
  return (
    <div role="main" aria-label={SCREEN.review.name} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_22rem] gap-4">
        <article className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden rounded-xl border border-border p-4">
          <DocumentHead review={review} />
          <ReviewBody review={review} phone={false} onBackToChat={onBackToChat} />
        </article>
        <aside className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto overflow-x-hidden">
          <ConfirmCard review={review} />
          <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold">{TEXT.review.nextTitle}</h2>
            <p className="text-sm">{TEXT.review.nextBody}</p>
            <BackButton onBackToChat={onBackToChat} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function PhoneReview({
  review,
  onBackToChat,
}: {
  review: DiscoveryReviewController;
  onBackToChat(questionId: string | null): void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const inView = useConfirmInView(scroller, card);
  return (
    <div role="main" aria-label={SCREEN.review.name} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <header className="flex flex-col gap-2 pb-3">
          <p className="text-sm font-semibold">
            {SCREEN.review.name} · {TEXT.revision(review.brief.revision)}
          </p>
          <BackButton onBackToChat={onBackToChat} />
        </header>
        <ReviewBody review={review} phone onBackToChat={onBackToChat} />
        <div ref={card} className="scroll-mt-2 pt-3">
          <ConfirmCard review={review} />
        </div>
      </div>
      {inView ? null : (
        // The page frame does not scroll. The bar stays under the column until the card is in view.
        <div className="shrink-0 border-t border-border bg-background p-3">
          <Button
            type="button"
            className="h-auto min-h-11 w-full whitespace-normal"
            onClick={() => card.current?.scrollIntoView({ block: "start", inline: "nearest" })}
          >
            {TEXT.review.goToFinish}
          </Button>
        </div>
      )}
    </div>
  );
}

function Finished({
  review,
  onBackToChat,
}: {
  review: DiscoveryReviewController;
  onBackToChat(questionId: string | null): void;
}) {
  const confirmation = review.confirmation;
  if (!confirmation) return null;
  const open = confirmation.acceptedGaps.length;
  return (
    <div role="main" aria-label={SCREEN.review.name} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex min-w-0 flex-col gap-4 pb-4">
          <header className="flex flex-col gap-2">
            <p className="text-sm font-semibold">
              {SCREEN.review.name} · {TEXT.revision(review.brief.revision)}
            </p>
            <BackButton onBackToChat={onBackToChat} />
          </header>
          <div className="mx-auto flex w-full min-w-0 max-w-xl flex-col gap-3 rounded-xl border border-border p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-usage-ok/15 text-usage-ok">
              <Check aria-hidden="true" />
            </span>
            <h2 className="text-lg font-semibold">{open > 0 ? TEXT.finishedOpen : TEXT.finished}</h2>
            <p className="text-sm">
              {TEXT.review.doneBody(confirmation.revision)} {TEXT.review.doneOpen(open)}
            </p>
            <p className="text-sm text-muted-foreground">{TEXT.review.doneNext}</p>
            <Button type="button" className="min-h-11 w-full">
              {SCREEN.findVolunteer.name}
            </Button>
          </div>
          <DiscoveryDocument projectTitle={review.project.title} brief={review.brief} files={review.files} />
        </div>
      </div>
    </div>
  );
}

function DocumentHead({ review }: { review: DiscoveryReviewController }) {
  return (
    <div className="flex flex-col gap-2 pb-4">
      <p className="text-xs text-muted-foreground">{TEXT.review.crumb}</p>
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="min-w-0 flex-1 text-xl font-semibold">{TEXT.review.title(review.project.title)}</h1>
        <span className="text-xs">{TEXT.revision(review.brief.revision)}</span>
      </div>
      <p className="text-sm text-muted-foreground">{TEXT.review.intro}</p>
    </div>
  );
}

function ReviewBody({
  review,
  phone,
  onBackToChat,
}: {
  review: DiscoveryReviewController;
  phone: boolean;
  onBackToChat(questionId: string | null): void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {review.changed.length > 0 ? (
        <p className="rounded-md bg-accent px-3 py-2 text-sm">
          {TEXT.review.changeNote(review.brief.revision, review.changed.join(", "))}
        </p>
      ) : null}
      <OpenList review={review} phone={phone} onBackToChat={onBackToChat} />
      {review.sections.map((section) => (
        <BriefSection key={section.id} section={section} review={review} phone={phone} />
      ))}
      <FilesBlock files={review.files} />
      <CauseBlock review={review} />
    </div>
  );
}

function OpenList({
  review,
  phone,
  onBackToChat,
}: {
  review: DiscoveryReviewController;
  phone: boolean;
  onBackToChat(questionId: string | null): void;
}) {
  if (review.open.length === 0) return null;
  return (
    <section aria-label={SCREEN.reviewOpen.name} className="flex min-w-0 flex-col gap-2 rounded-xl border border-usage-warn bg-usage-warn/10 p-3">
      <h2 className="text-base font-semibold">{TEXT.review.openTitle(review.open.length)}</h2>
      <p className="text-sm text-muted-foreground">{TEXT.review.openNote}</p>
      <ul className="flex flex-col">
        {review.open.map((item) => (
          <OpenItem key={item.topicId} item={item} phone={phone} review={review} onBackToChat={onBackToChat} />
        ))}
      </ul>
    </section>
  );
}

function OpenItem({
  item,
  phone,
  review,
  onBackToChat,
}: {
  item: OpenReviewItem;
  phone: boolean;
  review: DiscoveryReviewController;
  onBackToChat(questionId: string | null): void;
}) {
  const titleId = useId();
  return (
    <li aria-labelledby={titleId} className="flex min-w-0 flex-col gap-2 border-t border-usage-warn/40 py-3">
      <div className={phone ? "flex min-w-0 flex-col gap-2" : "flex min-w-0 items-start gap-3"}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={titleId} className="text-sm font-semibold">
              {item.topicTitle}
            </h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${importanceClass(item.importance)}`}>
              {IMPORTANCE[item.importance]}
            </span>
          </div>
          <p className="break-words text-sm text-muted-foreground">{item.why}</p>
          {item.suggestion ? <p className="break-words text-sm">{TEXT.review.suggestedLine(item.suggestion)}</p> : null}
        </div>
        <div className={phone ? "grid grid-cols-1 gap-2" : "flex shrink-0 flex-col gap-2"}>
          {item.suggestion ? (
            <Button
              type="button"
              className="h-auto min-h-11 whitespace-normal"
              onClick={() => void review.accept(item.topicId, item.topicTitle)}
            >
              {NAME.useSuggestion}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-11 whitespace-normal"
            onClick={() => {
              if (item.questionId) {
                onBackToChat(item.questionId);
                return;
              }
              void review.askTopic(item.topicId).then((questionId) => {
                if (questionId) onBackToChat(questionId);
              });
            }}
          >
            {NAME.answerInChat}
          </Button>
        </div>
      </div>
    </li>
  );
}

function BriefSection({
  section,
  review,
  phone,
}: {
  section: ReviewSection;
  review: DiscoveryReviewController;
  phone: boolean;
}) {
  const headingId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const editing = review.editingId === section.id;
  useEffect(() => {
    if (!editing) return;
    fieldRef.current?.focus();
  }, [editing]);
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2 border-b border-border pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={headingId} aria-label={section.title} className="min-w-0 flex-1 text-sm font-semibold uppercase tracking-wide">
          {section.title}
        </h3>
        <span className="text-xs text-muted-foreground">{section.source}</span>
        {section.editable && !editing ? (
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-11 whitespace-normal"
            aria-label={NAME.editSection(section.title)}
            onClick={() => review.beginEdit(section.id, section.text)}
          >
            {TEXT.review.edit}
          </Button>
        ) : null}
      </div>
      {editing ? (
        <>
          <Textarea
            ref={fieldRef}
            aria-label={section.title}
            value={review.draft}
            rows={4}
            className="w-full min-w-0"
            onChange={(event) => review.setDraft(event.target.value)}
          />
          <div className={phone ? "grid grid-cols-2 gap-2" : "flex flex-wrap justify-end gap-2"}>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => review.cancelEdit()}>
              {TEXT.review.cancel}
            </Button>
            <Button type="button" className="min-h-11" onClick={() => void review.saveEdit(section.title)}>
              {TEXT.review.save}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{TEXT.review.saveNote}</p>
          {review.editError ? (
            <p role="alert" className="text-sm">
              {review.editError}
            </p>
          ) : null}
        </>
      ) : (
        <p className="whitespace-pre-line break-words text-sm">{section.text}</p>
      )}
    </section>
  );
}

function FilesBlock({ files }: { files: DiscoveryReviewController["files"] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide">Your files</h2>
      {files.map((file) => (
        <p key={file.id} className="break-words text-sm">
          {fileTookLine(file)}
        </p>
      ))}
    </div>
  );
}

function CauseBlock({ review }: { review: DiscoveryReviewController }) {
  const labels = review.brief.causeLabels;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide">{TEXT.review.cause}</h2>
      {labels.length === 0 ? (
        <p className="text-sm text-muted-foreground">{TEXT.review.noCause}</p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-2">
            {labels.map((label) => (
              <li key={label} className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted py-1 pl-3 pr-1 text-sm">
                <span className="break-words">{label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 min-w-11 px-2"
                  aria-label={TEXT.review.removeLabel(label)}
                  onClick={() => void review.removeLabel(label)}
                >
                  ×
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">{TEXT.review.causeNote}</p>
        </>
      )}
    </div>
  );
}

function ConfirmCard({ review }: { review: DiscoveryReviewController }) {
  const open = review.open.length;
  const reviewed = review.ticks.reviewedRevision === review.brief.revision;
  return (
    <section aria-label={SCREEN.confirmation.name} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border p-4">
      <h2 className="text-base font-semibold">{SCREEN.finish.name}</h2>
      <p className="text-sm">{TEXT.review.confirmLead}</p>
      <Ack sentence={TEXT.ack.reviewed(review.brief.revision)} checked={reviewed} onChange={review.setReviewed} />
      {open > 0 ? <Ack sentence={TEXT.ack.gaps(open)} checked={review.ticks.openGaps} onChange={review.setOpenGaps} /> : null}
      <Ack sentence={TEXT.ack.data} checked={review.ticks.data} onChange={review.setData} />
      <p className="text-xs text-muted-foreground">{TEXT.review.dataPractice}</p>
      <Button
        type="button"
        aria-disabled={!review.gate.canFinish}
        className={`min-h-12 w-full whitespace-normal ${review.gate.canFinish ? "bg-usage-ok text-primary-foreground hover:bg-usage-ok/90" : "opacity-60"}`}
        onClick={() => void review.finish()}
      >
        {SCREEN.finish.name}
      </Button>
      <p className="text-xs text-muted-foreground">{review.gate.hint}</p>
      {review.finishError ? (
        <p role="alert" className="text-sm">
          {review.finishError}
        </p>
      ) : null}
    </section>
  );
}

function Ack({
  sentence,
  checked,
  onChange,
}: {
  sentence: string;
  checked: boolean;
  onChange(checked: boolean): void;
}) {
  const boxId = useId();
  const labelId = useId();
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Checkbox
        id={boxId}
        className="mt-0.5"
        aria-labelledby={labelId}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <label id={labelId} htmlFor={boxId} className="min-w-0 flex-1 text-sm leading-5">
        {sentence}
      </label>
    </div>
  );
}

function BackButton({ onBackToChat }: { onBackToChat(questionId: string | null): void }) {
  return (
    <Button type="button" variant="outline" className="h-auto min-h-11 w-full whitespace-normal" onClick={() => onBackToChat(null)}>
      {SCREEN.reviewBack.name}
    </Button>
  );
}

function importanceClass(importance: Importance): string {
  if (importance === "needed") return "bg-usage-stop/15 text-usage-stop";
  if (importance === "suggested") return "bg-accent text-accent-foreground";
  return "bg-muted text-muted-foreground";
}

/** Hide the jump bar once a quarter of the confirm card is inside the column. */
function useConfirmInView(root: RefObject<HTMLDivElement | null>, card: RefObject<HTMLDivElement | null>): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const scroller = root.current;
    const target = card.current;
    if (!scroller || !target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setInView(entry.isIntersecting && entry.intersectionRatio >= 0.25);
      },
      { root: scroller, threshold: [0, 0.25, 0.5, 1] },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [root, card]);
  return inView;
}
