import { scopeKey, type QuestionId } from "@/lib/prd-stream";
import { cn } from "@/lib/utils";
import { useGrowingField } from "./fields";
import { COPY } from "./copy";
import { topicTitle, type PrdView } from "./model";
import { testIds } from "./testids";
import { reviewKeys, type PrdController } from "./use-prd-workspace";
import { DEV_BUTTON, FOCUS, LINK_BUTTON } from "./ui";

const FIELD = cn(
  "resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-sm font-normal leading-snug text-foreground placeholder:text-muted-foreground max-md:text-base",
  FOCUS,
);

export function AnswerReview({
  questionId,
  view,
  controller,
}: {
  questionId: QuestionId;
  view: PrdView;
  controller: PrdController;
}) {
  const keys = reviewKeys(questionId);
  const question = view.snapshot.questions.find((entry) => entry.id === questionId);
  const original = question?.kind === "complete" ? question.answer : "";
  const answer = controller.drafts[keys.answer] ?? original;
  const note = controller.drafts[keys.note] ?? "";
  const answerField = useGrowingField(answer, 200);
  const noteField = useGrowingField(note, 140);
  if (!question || question.kind !== "complete") return null;
  const names = view.names;
  const title = topicTitle(view.snapshot, question.topicId);
  const said = (view.snapshot.chats[scopeKey({ kind: "side", questionId })] ?? []).filter(
    (message) => message.metadata?.actor === "ngo",
  ).length;
  const rows = [
    { label: COPY.howSheGotThere, text: COPY.howSheGotThereText(said) },
    { label: COPY.whatItChanges, text: question.impact },
    ...(question.openPoint !== null ? [{ label: COPY.toDiscuss, text: question.openPoint }] : []),
  ];
  const usable = question.canUse;
  return (
    <div data-testid={testIds.prdAnswerReview} className="flex flex-col gap-2.5">
      <button
        type="button"
        aria-label={COPY.allQuestionsName}
        onClick={() => controller.select({ kind: "questions" })}
        className={cn(LINK_BUTTON, "self-start px-1 max-md:text-sm")}
      >
        {COPY.allQuestions}
      </button>
      <div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="text-muted-foreground">{title}</span>
          <span
            className={cn(
              "font-bold",
              question.blocking ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {question.blocking ? COPY.blocks(title) : COPY.notBlocking}
          </span>
          <span className="font-semibold text-actor-dev">{COPY.reviewMarked(names.ngo)}</span>
        </div>
        <div className="mt-0.5 text-sm font-bold leading-snug text-foreground max-md:text-[15px]">
          {question.text}
        </div>
      </div>
      <label className="flex flex-col gap-1 text-xs font-bold text-foreground/80">
        {COPY.reviewAnswer(names.ngo)}
        <textarea
          ref={answerField}
          rows={2}
          data-testid={testIds.prdAnswerReviewAnswer}
          value={answer}
          onChange={(event) => controller.setDraft(keys.answer, event.target.value)}
          className={FIELD}
        />
      </label>
      <dl className="flex flex-col gap-1">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="inline text-xs font-bold text-foreground/80">{row.label}: </dt>
            <dd className="inline text-xs text-muted-foreground">{row.text}</dd>
          </div>
        ))}
      </dl>
      <label className="flex flex-col gap-1 text-xs font-bold text-foreground/80">
        {COPY.reviewNote}
        <textarea
          ref={noteField}
          rows={1}
          data-testid={testIds.prdAnswerReviewNote}
          placeholder={COPY.reviewNotePlaceholder}
          value={note}
          onChange={(event) => controller.setDraft(keys.note, event.target.value)}
          className={FIELD}
        />
      </label>
      <button
        type="button"
        data-testid={testIds.prdAnswerReviewClaim}
        aria-disabled={!usable}
        onClick={() => {
          if (usable) controller.useAnswer(question.id);
        }}
        className={cn(DEV_BUTTON, "min-h-10 text-sm")}
      >
        {COPY.useAnswer}
      </button>
      <div className="text-xs text-muted-foreground">{COPY.reviewHint}</div>
    </div>
  );
}
