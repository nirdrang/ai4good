import { useChat } from "@ai-sdk/react";
import { scopeKey, type QuestionId } from "@/lib/prd-stream";
import { cn } from "@/lib/utils";
import { SendButton } from "./Composer";
import { submitOnEnter, useGrowingField } from "./fields";
import { SideConversation } from "./ConversationPane";
import { COPY } from "./copy";
import { topicTitle, questionStatusText, type PrdView } from "./model";
import { testIds } from "./testids";
import type { PrdController } from "./use-prd-workspace";
import { DEV_BUTTON, FOCUS, LINK_BUTTON, NGO_BUTTON } from "./ui";

export function SideChat({
  questionId,
  view,
  controller,
}: {
  questionId: QuestionId;
  view: PrdView;
  controller: PrdController;
}) {
  const scope = { kind: "side", questionId } as const;
  const key = scopeKey(scope);
  const { status } = useChat({ chat: controller.chat(scope) });
  const text = controller.drafts[key] ?? "";
  const field = useGrowingField(text, 96);
  const question = view.snapshot.questions.find((entry) => entry.id === questionId);
  if (!question) return null;
  const names = view.names;
  const title = topicTitle(view.snapshot, question.topicId);
  const idle = status !== "submitted" && status !== "streaming";
  const writable = view.snapshot.canWrite[key] === true;
  const canSend = idle && writable && view.canAffordReply && text.trim().length > 0;
  const complete = question.kind === "answering" ? question.complete : null;
  const completeAction = complete?.kind === "available" && idle ? complete.action : null;
  const hint =
    question.kind === "answering" &&
    question.followUp === "pending" &&
    idle &&
    complete?.kind === "unavailable"
      ? complete.reason
      : null;
  const notice =
    controller.notice && controller.notice.key === key ? controller.notice.reason : null;
  const note = view.isDev
    ? question.kind === "posted" || question.kind === "answering"
      ? COPY.sideNoteDev(names.ngo)
      : question.kind === "used"
        ? COPY.sideNoteUsed(names.dev)
        : null
    : question.kind === "complete"
      ? COPY.sideNoteComplete(names.dev)
      : question.kind === "used"
        ? COPY.sideNoteUsed(names.dev)
        : null;
  const canUse = question.kind === "complete" && question.canUse;
  const send = () => controller.send(scope);
  return (
    <div
      data-testid={testIds.prdSideChat}
      data-status={question.kind}
      className="flex min-h-0 flex-1 flex-col gap-2.5"
    >
      <button
        type="button"
        data-testid={testIds.prdSideChatBack}
        aria-label={COPY.allQuestionsName}
        onClick={() => controller.select({ kind: "questions" })}
        className={cn(LINK_BUTTON, "self-start py-1.5 max-md:text-sm")}
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
          <span className="font-semibold text-actor-ngo">
            · {questionStatusText(question, view.isDev, names)}
          </span>
        </div>
        <div className="mt-0.5 text-sm font-bold leading-snug text-foreground max-md:text-[15px]">
          {question.text}
        </div>
      </div>
      <SideConversation questionId={questionId} view={view} controller={controller} />
      {writable ? (
        <>
          <div className="flex shrink-0 gap-1.5 max-md:overflow-x-auto md:flex-wrap">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                data-testid={testIds.prdSideChatOption}
                onClick={() => controller.setDraft(key, option)}
                className={cn(
                  "min-h-8 shrink-0 rounded-full border border-actor-ngo-line bg-background px-2.5 text-xs text-foreground hover:border-muted-foreground max-md:min-h-10 max-md:whitespace-nowrap",
                  FOCUS,
                )}
              >
                {option}
              </button>
            ))}
          </div>
          {notice ? (
            <div role="alert" className="text-xs font-semibold text-destructive">
              {notice}
            </div>
          ) : null}
          <div className="flex shrink-0 items-end gap-2 rounded-xl border-2 border-actor-ngo px-2 py-1.5">
            <textarea
              ref={field}
              rows={1}
              data-testid={testIds.prdSideChatInput}
              aria-label={COPY.sideInput}
              placeholder={COPY.sidePlaceholder}
              value={text}
              onChange={(event) => controller.setDraft(key, event.target.value)}
              onKeyDown={(event) => submitOnEnter(event, () => canSend && send())}
              className={cn(
                "min-w-0 flex-1 resize-none rounded-md bg-transparent px-1.5 py-1.5 text-sm leading-5 text-foreground placeholder:text-muted-foreground max-md:text-base",
                FOCUS,
              )}
            />
            <SendButton
              testId={testIds.prdSideChatSend}
              label={COPY.sideSend}
              enabled={canSend}
              tone="ngo"
              onSend={send}
            />
          </div>
          <button
            type="button"
            data-testid={testIds.prdSideChatComplete}
            aria-disabled={completeAction === null || controller.acting}
            onClick={() => {
              if (completeAction && !controller.acting)
                void controller.completeAnswer(completeAction);
            }}
            className={cn(NGO_BUTTON, "min-h-10 shrink-0 text-sm")}
          >
            {COPY.markComplete}
          </button>
          {hint ? (
            <div
              data-testid={testIds.prdSideChatCompleteHint}
              className="shrink-0 text-xs font-semibold text-actor-ngo"
            >
              {hint}
            </div>
          ) : null}
        </>
      ) : null}
      {view.isDev && canUse ? (
        <button
          type="button"
          data-testid={testIds.prdSideChatClaim}
          onClick={() => controller.useAnswer(question.id)}
          className={cn(DEV_BUTTON, "min-h-10 shrink-0 text-sm")}
        >
          {COPY.useAnswer}
        </button>
      ) : null}
      {note ? (
        <div
          data-testid={testIds.prdSideChatNote}
          className="shrink-0 text-xs leading-snug text-muted-foreground"
        >
          {note}
        </div>
      ) : null}
    </div>
  );
}
