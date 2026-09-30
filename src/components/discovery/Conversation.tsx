import type { BriefQuestion, DiscoveryUIMessage } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { NAME, SCREEN, TEXT } from "./a11y";
import { presentMessages, type Draft } from "./model";
import { QuestionGroup } from "./QuestionGroup";

export function Conversation({
  messages,
  questions,
  drafts,
  highlight,
  focusId,
  focusNonce,
  tags,
  oneAtATime,
  canAdvance,
  onPick,
  onShowOne,
  onShowTogether,
  onNext,
}: {
  messages: readonly DiscoveryUIMessage[];
  questions: readonly BriefQuestion[];
  drafts: Readonly<Record<string, Draft>>;
  highlight: { messageId: string; text: string } | null;
  focusId: string | null;
  focusNonce: number;
  tags: Readonly<Record<string, "carried" | "changing" | null>>;
  oneAtATime: boolean;
  canAdvance: boolean;
  onPick(questionId: string, draft: Draft | null): void;
  onShowOne(): void;
  onShowTogether(): void;
  onNext(): void;
}) {
  const presented = presentMessages(messages);
  return (
    <div role={SCREEN.conversation.role} aria-label={SCREEN.conversation.name} className="flex min-w-0 flex-col gap-4">
      {presented.map((message) => {
        const name = message.role === "assistant" ? NAME.aiReply : NAME.yourTurn;
        return (
          <article
            key={message.id}
            aria-label={name}
            className={
              message.role === "assistant"
                ? "rounded-lg border border-border bg-card p-4"
                : "rounded-lg bg-muted p-4"
            }
          >
            <h2 className="sr-only">{name}</h2>
            {message.paragraphs.map((paragraph) => {
              const current = highlight?.messageId === message.id && highlight.text === paragraph;
              return (
                <p key={paragraph} aria-current={current ? "true" : undefined} className="mt-2 first:mt-0">
                  {paragraph}
                </p>
              );
            })}
            {message.filed.map((title) => (
              <p key={title} className="mt-2 text-sm">
                {TEXT.added}: {title}
              </p>
            ))}
            {message.receipt ? <p className="mt-2 text-sm text-muted-foreground">{message.receipt}</p> : null}
          </article>
        );
      })}
      {questions.length > 1 ? (
        <Button type="button" variant="outline" className="self-start" onClick={oneAtATime ? onShowTogether : onShowOne}>
          {oneAtATime ? TEXT.showTogether : TEXT.oneAtATime}
        </Button>
      ) : null}
      {questions.map((question) => (
        <QuestionGroup
          key={question.id}
          question={question}
          draft={drafts[question.id]}
          tag={tags[question.id] ?? null}
          focused={focusId === question.id}
          focusNonce={focusNonce}
          onPick={onPick}
        />
      ))}
      {oneAtATime && canAdvance ? (
        <Button type="button" variant="outline" className="self-start" onClick={onNext}>
          {TEXT.nextQuestion}
        </Button>
      ) : null}
    </div>
  );
}
