import { useId } from "react";
import type { BriefQuestion } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NAME, TEXT } from "./a11y";
import type { Draft } from "./model";

export function QuestionGroup({
  question,
  draft,
  onPick,
}: {
  question: BriefQuestion;
  draft: Draft | undefined;
  onPick(questionId: string, draft: Draft | null): void;
}) {
  const headingId = useId();
  const selected = draft?.kind === "option" ? draft.optionId : null;
  const writing = draft?.kind === "own";
  const uncertain = draft?.kind === "uncertain";
  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h3 id={headingId} className="text-base font-semibold">
        {question.text}
      </h3>
      <p className="text-sm text-muted-foreground">{question.reason}</p>
      <div className="flex flex-col gap-2">
        {question.options.map((option) => {
          const suggested = option.id === question.suggestedId;
          const pressed = selected === option.id;
          return (
            <Button
              key={option.id}
              type="button"
              variant={pressed ? "default" : "outline"}
              aria-pressed={pressed}
              aria-label={NAME.option(option.label, suggested)}
              className="h-auto justify-start whitespace-normal py-2 text-left"
              onClick={() => onPick(question.id, pressed ? null : { kind: "option", optionId: option.id })}
            >
              {option.label}
              {suggested ? <span className="text-xs">{TEXT.suggested}</span> : null}
            </Button>
          );
        })}
        <Button
          type="button"
          variant={writing ? "default" : "outline"}
          aria-pressed={writing}
          onClick={() => onPick(question.id, writing ? null : { kind: "own", text: "" })}
        >
          {NAME.writeOwn}
        </Button>
        {writing ? (
          <Textarea
            aria-label={NAME.ownAnswer(question.text)}
            rows={2}
            value={draft?.kind === "own" ? draft.text : ""}
            onChange={(event) => onPick(question.id, { kind: "own", text: event.target.value })}
          />
        ) : null}
        <Button
          type="button"
          variant={uncertain ? "default" : "outline"}
          aria-pressed={uncertain}
          onClick={() => onPick(question.id, uncertain ? null : { kind: "uncertain" })}
        >
          {NAME.notSure}
        </Button>
      </div>
    </div>
  );
}
