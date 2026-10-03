import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { BriefQuestion, DiscoveryUIMessage } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { NAME, SCREEN, TEXT } from "./a11y";
import { presentMessages, type Draft } from "./model";
import { QuestionGroup } from "./QuestionGroup";

function latestReply(node: HTMLElement): HTMLElement | null {
  const replies = node.querySelectorAll(`article[aria-label="${NAME.aiReply}"]`);
  const last = replies.length > 0 ? replies.item(replies.length - 1) : null;
  return last instanceof HTMLElement ? last : null;
}

function replyTop(node: HTMLElement, reply: HTMLElement): number {
  return reply.getBoundingClientRect().top - node.getBoundingClientRect().top + node.scrollTop;
}

export function Conversation({
  messages,
  questions,
  drafts,
  highlight,
  focusId,
  focusNonce,
  tags,
  oneAtATime,
  canToggle,
  canAdvance,
  tail,
  onPick,
  offerSave,
  onSave,
  canSave,
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
  tags: Readonly<Record<string, "carried" | "changing" | "review" | null>>;
  oneAtATime: boolean;
  canToggle: boolean;
  canAdvance: boolean;
  tail?: ReactNode;
  onPick(questionId: string, draft: Draft | null): void;
  offerSave?(questionId: string): boolean;
  onSave?(questionId: string): void;
  canSave?(questionId: string): boolean;
  onShowOne(): void;
  onShowTogether(): void;
  onNext(): void;
}) {
  let lastAssistantId = "";
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant") {
      lastAssistantId = message.id;
      break;
    }
  }
  const scroller = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const intentRef = useRef(true);
  const adjustingRef = useRef(false);
  const openedAt = useRef(lastAssistantId);
  intentRef.current = followRef.current;
  const presented = presentMessages(messages);
  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const reply = latestReply(node);
    if (!reply) return;
    const atLoad = lastAssistantId === openedAt.current;
    const count = node.querySelectorAll(`article[aria-label="${NAME.aiReply}"]`).length;
    const pinTop = atLoad ? count <= 1 || reply.offsetHeight > node.clientHeight : intentRef.current;
    if (!atLoad && !pinTop) return;
    adjustingRef.current = true;
    node.scrollTop = pinTop ? replyTop(node, reply) : node.scrollHeight;
    adjustingRef.current = false;
  }, [lastAssistantId]);
  function onLogScroll() {
    if (adjustingRef.current) return;
    const node = scroller.current;
    if (!node) return;
    const reply = latestReply(node);
    if (!reply) return;
    followRef.current = node.scrollTop + 8 >= replyTop(node, reply);
  }
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
  const lastUserId = lastMessage?.role === "user" ? lastMessage.id : "";
  const seenUser = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (seenUser.current === null) {
      seenUser.current = lastUserId;
      return;
    }
    if (!lastUserId || seenUser.current === lastUserId) return;
    seenUser.current = lastUserId;
    const node = scroller.current;
    if (!node) return;
    const people = node.querySelectorAll(`article[aria-label="${NAME.yourTurn}"]`);
    const line = people.item(people.length - 1);
    if (line instanceof HTMLElement) line.scrollIntoView({ block: "nearest" });
  }, [lastUserId]);
  useLayoutEffect(() => {
    if (!highlight) return;
    const current = scroller.current?.querySelector("[aria-current='true']");
    if (current instanceof HTMLElement) current.scrollIntoView({ block: "nearest" });
  }, [highlight]);
  return (
    <div
      ref={scroller}
      role={SCREEN.conversation.role}
      aria-label={SCREEN.conversation.name}
      className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain"
      onScroll={onLogScroll}
    >
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
            {message.paragraphs.map((paragraph, index) => {
              const current = highlight?.messageId === message.id && highlight.text === paragraph;
              return (
                <p
                  key={`${message.id}-p-${index}`}
                  aria-current={current ? "true" : undefined}
                  className={
                    current
                      ? "mt-2 rounded-md bg-accent px-2 py-1 outline outline-2 outline-offset-2 outline-ring first:mt-0"
                      : "mt-2 first:mt-0"
                  }
                >
                  {paragraph}
                </p>
              );
            })}
            {message.filed.map((title, index) => (
              <p key={`${message.id}-f-${index}`} className="mt-2 text-sm">
                {TEXT.added}: {title}
              </p>
            ))}
            {message.receipt ? <p className="mt-2 text-sm text-muted-foreground">{message.receipt}</p> : null}
          </article>
        );
      })}
      {canToggle ? (
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
          onSave={onSave && offerSave?.(question.id) ? () => onSave(question.id) : undefined}
          canSave={canSave?.(question.id) ?? false}
        />
      ))}
      {oneAtATime && canAdvance ? (
        <Button type="button" variant="outline" className="self-start" onClick={onNext}>
          {TEXT.nextQuestion}
        </Button>
      ) : null}
      {tail}
    </div>
  );
}
