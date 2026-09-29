import type { BriefQuestion, DiscoveryUIMessage } from "@/lib/discovery-stream";
import { NAME, SCREEN, TEXT } from "./a11y";
import { presentMessages, type Draft } from "./model";
import { QuestionGroup } from "./QuestionGroup";

export function Conversation({
  messages,
  questions,
  drafts,
  onPick,
}: {
  messages: readonly DiscoveryUIMessage[];
  questions: readonly BriefQuestion[];
  drafts: Readonly<Record<string, Draft>>;
  onPick(questionId: string, draft: Draft | null): void;
}) {
  const presented = presentMessages(messages);
  return (
    <div role={SCREEN.conversation.role} aria-label={SCREEN.conversation.name} className="flex flex-col gap-4">
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
            {message.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-2 first:mt-0">
                {paragraph}
              </p>
            ))}
            {message.filed.map((title) => (
              <p key={title} className="mt-2 text-sm">
                {TEXT.added}: {title}
              </p>
            ))}
            {message.receipt ? <p className="mt-2 text-sm text-muted-foreground">{message.receipt}</p> : null}
          </article>
        );
      })}
      {questions.map((question) => (
        <QuestionGroup key={question.id} question={question} draft={drafts[question.id]} onPick={onPick} />
      ))}
    </div>
  );
}
