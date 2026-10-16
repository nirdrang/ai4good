import { cn } from "@/lib/utils";
import { COPY } from "./copy";
import type { PrdView, QuestionView } from "./model";
import { testIds } from "./testids";
import type { PrdController } from "./use-prd-workspace";
import { DEV_BUTTON, FOCUS, LINK_BUTTON, PLAIN_BUTTON, TONE_TEXT } from "./ui";

function Participants({ view }: { view: PrdView }) {
  const color = { ai: "bg-actor-ai", dev: "bg-actor-dev", ngo: "bg-actor-ngo" } as const;
  return (
    <ul
      data-testid={testIds.prdParticipantList}
      aria-label={COPY.peopleLabel}
      className="flex items-center gap-1.5"
    >
      <li className="mr-0.5 text-xs text-muted-foreground">{COPY.people}</li>
      {view.snapshot.people.map((person) => (
        <li
          key={person.role}
          data-testid={testIds.prdParticipant}
          title={`${person.name} · ${person.label}`}
          aria-label={`${person.name}, ${person.label}`}
          className={cn(
            "flex size-[26px] items-center justify-center rounded-full text-[11px] font-bold text-actor-on",
            color[person.role],
          )}
        >
          {person.role === "ai" ? "AI" : person.name.charAt(0)}
        </li>
      ))}
    </ul>
  );
}

function QuestionItem({
  entry,
  controller,
  phone,
}: {
  entry: QuestionView;
  controller: PrdController;
  phone: boolean;
}) {
  const { question } = entry;
  const frame =
    question.kind === "complete"
      ? "border-actor-dev"
      : question.kind === "answering"
        ? "border-actor-ngo"
        : "border-border";
  return (
    <li
      data-testid={testIds.prdNgoQuestion}
      data-status={question.kind}
      className={cn("overflow-hidden rounded-xl border bg-background", frame)}
    >
      <button
        type="button"
        data-testid={testIds.prdNgoQuestionOpen}
        onClick={() => controller.openQuestion(question.id, !phone)}
        className={cn(
          "block w-full px-3 py-2.5 text-left hover:bg-muted/60",
          phone ? "min-h-[52px]" : "",
          FOCUS,
        )}
      >
        <span className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="text-muted-foreground">{entry.topicTitle}</span>
          <span
            className={cn(
              "font-bold",
              question.blocking ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {entry.blockLabel}
          </span>
        </span>
        <span className="mt-0.5 block text-sm font-semibold leading-snug text-foreground">
          {question.text}
        </span>
        {entry.sent === null ? (
          <span className={cn("mt-1 block text-xs font-semibold", TONE_TEXT[entry.statusTone])}>
            {entry.statusText}
          </span>
        ) : (
          <span
            data-testid={testIds.prdNgoQuestionSent}
            className="mt-1 block text-xs leading-normal text-foreground/80 max-md:text-sm"
          >
            <strong className={TONE_TEXT[entry.statusTone]}>{entry.sentLabel}</strong> {entry.sent}
          </span>
        )}
      </button>
      {entry.canView ? (
        <div className="flex border-t border-actor-dev-line">
          <button
            type="button"
            data-testid={testIds.prdNgoQuestionView}
            onClick={() => controller.select({ kind: "review", questionId: question.id })}
            className={cn(
              PLAIN_BUTTON,
              "min-h-10 flex-1 rounded-none border-0 border-r border-actor-dev-line text-sm text-actor-dev",
            )}
          >
            {COPY.viewAnswer}
          </button>
          {entry.canUse && !controller.answerQueued(question.id) ? (
            <button
              type="button"
              data-testid={testIds.prdNgoQuestionClaim}
              onClick={() => controller.useAnswer(question.id)}
              className={cn(DEV_BUTTON, "min-h-10 flex-1 rounded-none text-sm")}
            >
              {COPY.useAnswer}
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function QuestionsPanel({
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
      {phone ? null : <Participants view={view} />}
      <div data-testid={testIds.prdNgoQuestions}>
        <h3 className="text-sm font-semibold text-foreground">{view.listTitle}</h3>
        <p className="mb-2 mt-1 text-xs leading-snug text-muted-foreground">{view.listNote}</p>
        <ul data-testid={testIds.prdNgoQuestionList} className="flex flex-col gap-2">
          {view.open.map((entry) => (
            <QuestionItem
              key={entry.question.id}
              entry={entry}
              controller={controller}
              phone={phone}
            />
          ))}
        </ul>
        {view.answered.length > 0 ? (
          <>
            <button
              type="button"
              data-testid={testIds.prdAnsweredToggle}
              aria-expanded={controller.answeredOpen}
              onClick={() => controller.toggleAnswered()}
              className={cn(LINK_BUTTON, "mt-3 font-semibold max-md:text-sm")}
            >
              {COPY.answered(controller.answeredOpen, view.answered.length)}
            </button>
            {controller.answeredOpen ? (
              <ul data-testid={testIds.prdAnsweredList} className="mt-1 flex flex-col gap-1.5">
                {view.answered.map((entry) => (
                  <li key={entry.question.id} data-testid={testIds.prdAnsweredQuestion}>
                    <button
                      type="button"
                      onClick={() => controller.openAnswered(entry.question.id)}
                      className={cn(
                        "block w-full rounded-xl border border-border bg-muted/40 px-2.5 py-2 text-left hover:bg-muted max-md:min-h-11",
                        FOCUS,
                      )}
                    >
                      <span className="block text-[11px] text-muted-foreground">
                        {COPY.answeredMeta(entry.topicTitle)}
                      </span>
                      <span className="block text-xs font-semibold text-foreground max-md:text-sm">
                        {entry.wordingChanged ? (
                          <strong className="text-actor-dev">{entry.wordingChanged} </strong>
                        ) : null}
                        {entry.question.kind === "used" ? entry.question.answer : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
