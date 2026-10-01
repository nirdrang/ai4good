import { useEffect, useId, useRef } from "react";
import type { BriefQuestion } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BRIEF_STATUS, IMPORTANCE, NAME, TEXT } from "./a11y";
import type { Draft } from "./model";

export function QuestionGroup({
  question,
  draft,
  tag,
  focused,
  focusNonce,
  onPick,
  onSave,
  canSave,
}: {
  question: BriefQuestion;
  draft: Draft | undefined;
  tag: "carried" | "changing" | "review" | null;
  focused: boolean;
  focusNonce: number;
  onPick(questionId: string, draft: Draft | null): void;
  onSave?(): void;
  canSave?: boolean;
}) {
  const headingId = useId();
  const firstOption = useRef<HTMLButtonElement>(null);
  const selected = draft?.kind === "option" ? draft.optionId : null;
  const writing = draft?.kind === "own";
  const uncertain = draft?.kind === "uncertain";
  useEffect(() => {
    if (!focused) return;
    const node = firstOption.current;
    if (!node) return;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ block: "center" });
      node.focus();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [focused, focusNonce]);
  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h3 id={headingId} className="text-base font-semibold">
        {question.text}
      </h3>
      {tag === "changing" ? <p className="text-sm">{TEXT.changing}</p> : null}
      {tag === "carried" ? <p className="text-sm">{TEXT.carried}</p> : null}
      {tag === "review" ? <p className="text-sm">{BRIEF_STATUS.needsReview}</p> : null}
      <p className="text-sm">{IMPORTANCE[question.importance]}</p>
      <p className="text-sm text-muted-foreground">{question.reason}</p>
      <p className="text-sm text-muted-foreground">{question.recommendation}</p>
      <div className="flex flex-col gap-2">
        {question.options.map((option, index) => {
          const suggested = option.id === question.suggestedId;
          const pressed = selected === option.id;
          return (
            <Button
              key={option.id}
              ref={index === 0 ? firstOption : undefined}
              type="button"
              variant={pressed ? "default" : "outline"}
              aria-pressed={pressed}
              aria-label={NAME.option(option.label, suggested)}
              className="h-auto min-h-11 justify-start whitespace-normal py-2 text-left"
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
          className="h-auto min-h-11 justify-start whitespace-normal"
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
          className="h-auto min-h-11 justify-start whitespace-normal"
          onClick={() => onPick(question.id, uncertain ? null : { kind: "uncertain" })}
        >
          {NAME.notSure}
        </Button>
        {uncertain ? <p className="text-sm text-muted-foreground">{question.uncertaintyHelp}</p> : null}
      </div>
      {onSave ? (
        <Button type="button" className="h-auto min-h-11 self-start whitespace-normal" disabled={!canSave} onClick={onSave}>
          {TEXT.saveChange}
        </Button>
      ) : null}
    </div>
  );
}
