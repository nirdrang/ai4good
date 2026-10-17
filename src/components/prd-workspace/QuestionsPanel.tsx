import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { COPY } from "./copy";
import type { PrdView, QuestionView } from "./model";
import { testIds } from "./testids";
import type { PrdController } from "./use-prd-workspace";
import { ACTION, LINK, TONE_TEXT } from "./ui";

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
      <Button
        type="button"
        variant="ghost"
        data-testid={testIds.prdNgoQuestionOpen}
        onClick={() => controller.openQuestion(question.id, !phone)}
        className={cn(
          "block h-auto w-full whitespace-normal rounded-none px-3 py-2.5 text-left font-normal hover:bg-muted/60 hover:text-foreground",
          phone ? "min-h-[52px]" : "",
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
      </Button>
      {entry.sent !== null ? (
        <div className="border-t border-border px-3 py-1">
          <Button
            type="button"
            variant="link"
            data-testid={testIds.prdNgoQuestionSection}
            onClick={() => controller.select({ kind: "topic", topicId: question.topicId })}
            className={cn(LINK, "font-semibold max-md:text-sm")}
          >
            {COPY.openSection(entry.topicTitle)}
          </Button>
        </div>
      ) : null}
      {entry.canView ? (
        <div className="flex border-t border-actor-dev-line">
          <Button
            type="button"
            variant="outline"
            data-testid={testIds.prdNgoQuestionView}
            onClick={() => controller.select({ kind: "review", questionId: question.id })}
            className={cn(
              ACTION,
              "min-h-10 flex-1 rounded-none border-0 border-r border-actor-dev-line text-sm text-actor-dev shadow-none hover:text-actor-dev",
            )}
          >
            {COPY.viewAnswer}
          </Button>
          {entry.canUse && !controller.answerQueued(question.id) ? (
            <Button
              type="button"
              variant="dev"
              data-testid={testIds.prdNgoQuestionClaim}
              onClick={() => controller.useAnswer(question.id)}
              className={cn(ACTION, "min-h-10 flex-1 rounded-none text-sm shadow-none")}
            >
              {COPY.useAnswer}
            </Button>
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
          <Collapsible
            open={controller.answeredOpen}
            onOpenChange={() => controller.toggleAnswered()}
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="link"
                data-testid={testIds.prdAnsweredToggle}
                className={cn(LINK, "mt-3 font-semibold max-md:text-sm")}
              >
                {COPY.answered(controller.answeredOpen, view.answered.length)}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent asChild>
              <ul data-testid={testIds.prdAnsweredList} className="mt-1 flex flex-col gap-1.5">
                {view.answered.map((entry) => (
                  <li key={entry.question.id} data-testid={testIds.prdAnsweredQuestion}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => controller.openAnswered(entry.question.id)}
                      className="block h-auto w-full whitespace-normal rounded-xl border-border bg-muted/40 px-2.5 py-2 text-left font-normal shadow-none hover:bg-muted hover:text-foreground max-md:min-h-11"
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
                    </Button>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </>
  );
}
