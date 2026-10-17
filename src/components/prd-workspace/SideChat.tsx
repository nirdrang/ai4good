import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { scopeKey, type QuestionId } from "@/lib/prd-stream";
import { cn } from "@/lib/utils";
import { SendButton } from "./Composer";
import { submitOnEnter, useGrowingField } from "./fields";
import { SideConversation } from "./ConversationPane";
import { COPY } from "./copy";
import { topicTitle, questionStatusText, type PrdView } from "./model";
import { testIds } from "./testids";
import type { PrdController } from "./use-prd-workspace";
import { ACTION, LINK } from "./ui";

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
  useChat({ chat: controller.chat(scope) });
  const text = controller.drafts[key] ?? "";
  const field = useGrowingField(text, 96);
  const question = view.snapshot.questions.find((entry) => entry.id === questionId);
  if (!question) return null;
  const names = view.names;
  const title = topicTitle(view.snapshot, question.topicId);
  const state = controller.sendState(scope);
  const idle = !state.busy;
  const writable = view.snapshot.canWrite[key] === true;
  const canSend = state.enabled && text.trim().length > 0;
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
  const note =
    view.closed !== null && question.kind !== "used"
      ? COPY.closedReadOnly
      : view.isDev
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
  const canUse =
    question.kind === "complete" && question.canUse && !controller.answerQueued(question.id);
  const send = () => controller.send(scope);
  return (
    <div
      data-testid={testIds.prdSideChat}
      data-status={question.kind}
      className="flex min-h-0 flex-1 flex-col gap-2.5"
    >
      <Button
        type="button"
        variant="link"
        data-testid={testIds.prdSideChatBack}
        aria-label={COPY.allQuestionsName}
        onClick={() => controller.select({ kind: "questions" })}
        className={cn(LINK, "self-start py-1.5 max-md:text-sm")}
      >
        {COPY.allQuestions}
      </Button>
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
            · {questionStatusText(question, view.isDev, names, view.closed !== null)}
          </span>
        </div>
        <div className="mt-0.5 text-sm font-bold leading-snug text-foreground max-md:text-[15px]">
          {question.text}
        </div>
      </div>
      <SideConversation questionId={questionId} view={view} controller={controller} />
      {writable ? (
        <>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {question.options.map((option) => (
              <Button
                key={option}
                type="button"
                variant="outline"
                data-testid={testIds.prdSideChatOption}
                onClick={() => controller.setDraft(key, option)}
                className="h-auto min-h-8 shrink-0 whitespace-normal rounded-full border-actor-ngo-line px-2.5 py-0 text-xs font-normal shadow-none hover:border-muted-foreground hover:bg-background hover:text-foreground max-md:min-h-11 max-md:max-w-full max-md:rounded-2xl max-md:py-1.5 max-md:text-left"
              >
                {option}
              </Button>
            ))}
          </div>
          {notice ? (
            <div role="alert" className="text-xs font-semibold text-destructive">
              {notice}
            </div>
          ) : null}
          <div className="flex shrink-0 items-end gap-2 rounded-xl border-2 border-actor-ngo px-2 py-1.5">
            <Textarea
              ref={field}
              rows={1}
              data-testid={testIds.prdSideChatInput}
              aria-label={COPY.sideInput}
              placeholder={COPY.sidePlaceholder}
              value={text}
              onChange={(event) => controller.setDraft(key, event.target.value)}
              onKeyDown={(event) => submitOnEnter(event, () => canSend && send())}
              className="min-h-0 min-w-0 flex-1 resize-none border-0 px-1.5 py-1.5 leading-5 text-foreground shadow-none"
            />
            <SendButton
              testId={testIds.prdSideChatSend}
              label={COPY.sideSend}
              enabled={canSend}
              tone="ngo"
              onSend={send}
            />
          </div>
          <Button
            type="button"
            variant="ngo"
            data-testid={testIds.prdSideChatComplete}
            aria-disabled={completeAction === null || controller.acting}
            onClick={() => {
              if (completeAction && !controller.acting)
                void controller.completeAnswer(completeAction);
            }}
            className={cn(ACTION, "min-h-10 shrink-0 text-sm")}
          >
            {COPY.markComplete}
          </Button>
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
        <Button
          type="button"
          variant="dev"
          data-testid={testIds.prdSideChatClaim}
          onClick={() => controller.useAnswer(question.id)}
          className={cn(ACTION, "min-h-10 shrink-0 text-sm")}
        >
          {COPY.useAnswer}
        </Button>
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
