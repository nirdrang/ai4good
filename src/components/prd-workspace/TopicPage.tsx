import { useChat } from "@ai-sdk/react";
import { useLayoutEffect, useRef } from "react";
import { scopeKey, type Topic, type TopicId } from "@/lib/prd-stream";
import { cn } from "@/lib/utils";
import { SendButton } from "./Composer";
import { submitOnEnter, useGrowingField } from "./fields";
import { TopicConversation } from "./ConversationPane";
import { COPY } from "./copy";
import { actionOf, reasonOf, type PrdView } from "./model";
import { testIds } from "./testids";
import type { PrdController } from "./use-prd-workspace";
import { DEV_BUTTON, FOCUS, LINK_BUTTON, PLAIN_BUTTON, STATE_BADGE } from "./ui";

function TopicDocument({
  topic,
  view,
  controller,
  phone,
}: {
  topic: Topic;
  view: PrdView;
  controller: PrdController;
  phone: boolean;
}) {
  const confirm = actionOf(topic.confirm);
  const reopen = actionOf(topic.reopen);
  const reason = confirm || reopen ? null : reasonOf(topic.confirm);
  const label = view.topics.find((entry) => entry.topic.id === topic.id)?.label ?? topic.state;
  const status =
    topic.state === "confirmed"
      ? "text-funds-ok"
      : topic.state === "needs-review"
        ? "text-destructive"
        : "text-muted-foreground";
  const button = (
    action: NonNullable<typeof confirm> | NonNullable<typeof reopen>,
    text: string,
    testId: string,
    primary: boolean,
  ) => (
    <button
      type="button"
      data-testid={testId}
      aria-disabled={controller.acting}
      onClick={() => {
        if (!controller.acting) void controller.act(action);
      }}
      className={cn(primary ? DEV_BUTTON : PLAIN_BUTTON, "min-h-10 text-sm", phone ? "w-full" : "")}
    >
      {text}
    </button>
  );
  return (
    <div
      data-testid={testIds.prdSection}
      className={cn(
        "flex shrink-0 flex-col gap-1.5 rounded-xl border border-input bg-muted/40 px-3.5 py-3",
        phone ? "mx-3 overflow-visible" : "max-h-[380px] overflow-y-auto",
      )}
    >
      <div className="flex items-center gap-2.5">
        {phone ? null : (
          <span className="text-[11px] font-semibold text-muted-foreground">{COPY.prdSection}</span>
        )}
        <strong className={cn("text-foreground", phone ? "flex-1 text-[15px]" : "text-base")}>
          {topic.title}
        </strong>
        <span
          data-testid={testIds.prdSectionState}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
            STATE_BADGE[topic.state],
          )}
        >
          {label}
        </span>
      </div>
      <ul
        data-testid={testIds.prdSectionText}
        className="list-disc pl-[18px] text-sm leading-relaxed text-foreground"
      >
        {topic.statements.map((statement, index) => (
          <li key={index}>{statement}</li>
        ))}
      </ul>
      <div className="text-[11px] text-muted-foreground">
        {COPY.sources(topic.sources.join(" · "))}
      </div>
      {topic.stories !== null ? (
        <>
          <div
            data-testid={testIds.prdSectionStories}
            className="mt-1 text-sm font-bold text-foreground"
          >
            {COPY.userStories}
          </div>
          <ol className="list-decimal pl-5 text-xs leading-normal text-foreground max-md:text-sm">
            {topic.stories.map((story, index) => (
              <li key={index} data-testid={testIds.prdSectionStory}>
                {story}
              </li>
            ))}
          </ol>
        </>
      ) : null}
      <div data-testid={testIds.prdSectionStatus} className={cn("text-xs font-semibold", status)}>
        {topic.statusText}
      </div>
      <div className={cn("flex items-center gap-2.5", phone ? "flex-col items-stretch" : "")}>
        {confirm ? button(confirm, COPY.confirmSection, testIds.prdSectionConfirm, true) : null}
        {reopen ? button(reopen, COPY.reopenSection, testIds.prdSectionReopen, false) : null}
        {reason ? <span className="text-xs text-muted-foreground">{reason}</span> : null}
      </div>
    </div>
  );
}

function TopicComposer({
  topic,
  view,
  controller,
}: {
  topic: Topic;
  view: PrdView;
  controller: PrdController;
}) {
  const scope = { kind: "topic", topicId: topic.id } as const;
  const key = scopeKey(scope);
  useChat({ chat: controller.chat(scope) });
  const text = controller.drafts[key] ?? "";
  const field = useGrowingField(text, 140);
  const asked = view.snapshot.devQuestions.filter(
    (question) => question.topicId === topic.id && question.answered === null,
  );
  const picked = asked.length > 0 && asked.every((question) => controller.picks[question.id]);
  const enabled = controller.sendState(scope).enabled && (text.trim().length > 0 || picked);
  const send = () => controller.send(scope);
  const notice = controller.notice?.key === key ? controller.notice.reason : null;
  return (
    <div className="flex shrink-0 flex-col gap-1 max-md:mx-2.5 max-md:mb-2.5">
      {notice ? (
        <div role="alert" className="text-xs font-semibold text-destructive">
          {notice}
        </div>
      ) : null}
      <div
        data-testid={testIds.prdSectionComposer}
        className="flex items-end gap-2.5 rounded-2xl border-2 border-actor-dev bg-background px-3 py-2 max-md:px-2.5 max-md:py-1.5"
      >
        <textarea
          ref={field}
          rows={1}
          data-testid={testIds.prdSectionInput}
          aria-label={COPY.topicInput(topic.title)}
          placeholder={asked.length > 0 ? COPY.topicPickPlaceholder : COPY.topicPlaceholder}
          value={text}
          onChange={(event) => controller.setDraft(key, event.target.value)}
          onKeyDown={(event) => submitOnEnter(event, () => enabled && send())}
          className={cn(
            "min-w-0 flex-1 resize-none rounded-md bg-transparent px-1.5 py-2 text-sm leading-5 text-foreground placeholder:text-muted-foreground max-md:text-base",
            FOCUS,
          )}
        />
        <SendButton
          testId={testIds.prdSectionSend}
          label={COPY.topicSend}
          enabled={enabled}
          tone="dev"
          onSend={send}
        />
      </div>
    </div>
  );
}

export function TopicPage({
  topicId,
  view,
  controller,
  phone,
}: {
  topicId: TopicId;
  view: PrdView;
  controller: PrdController;
  phone: boolean;
}) {
  const topic = view.snapshot.topics.find((entry) => entry.id === topicId);
  const page = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (page.current) page.current.scrollTop = 0;
  }, [topicId]);
  if (!topic) return null;
  const writable = view.snapshot.canWrite[scopeKey({ kind: "topic", topicId })] === true;
  const readOnlyNote = !view.isDev ? (
    <div className="shrink-0 rounded-xl border border-actor-ngo-line bg-actor-ngo-soft px-3 py-2.5 text-xs text-foreground/80 max-md:mx-2.5 max-md:mb-2.5">
      {COPY.ngoTopicNote(view.names.dev)}
    </div>
  ) : null;
  const footer = writable ? (
    <TopicComposer topic={topic} view={view} controller={controller} />
  ) : (
    readOnlyNote
  );
  if (phone) {
    return (
      <>
        <div className="shrink-0 px-3 pt-1">
          <button
            type="button"
            data-testid={testIds.prdSectionBack}
            aria-label={COPY.backToSectionsName}
            onClick={() => controller.closeTopic()}
            className={cn(LINK_BUTTON, "px-1 text-sm")}
          >
            {COPY.backToSections}
          </button>
        </div>
        <div
          ref={page}
          data-testid={testIds.prdSectionPage}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          <TopicDocument topic={topic} view={view} controller={controller} phone />
          <TopicConversation topicId={topic.id} view={view} controller={controller} phone />
        </div>
        {footer}
      </>
    );
  }
  return (
    <>
      <TopicDocument topic={topic} view={view} controller={controller} phone={false} />
      <TopicConversation topicId={topic.id} view={view} controller={controller} phone={false} />
      {footer}
    </>
  );
}
