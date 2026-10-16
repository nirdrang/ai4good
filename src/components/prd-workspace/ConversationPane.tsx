import { useChat } from "@ai-sdk/react";
import { Sparkles } from "lucide-react";
import { Fragment, useLayoutEffect, useRef, type ReactNode } from "react";
import {
  scopeKey,
  type ChatScope,
  type CheckGap,
  type DevQuestion,
  type PrdUIMessage,
  type QuestionId,
  type TopicId,
} from "@/lib/prd-stream";
import { cn } from "@/lib/utils";
import { COPY, dayLabel } from "./copy";
import { testIds } from "./testids";
import { topicTitle, questionStatusText, type PrdView } from "./model";
import { introElementId, turnElementId, type PrdController } from "./use-prd-workspace";
import { DEV_BUTTON, FOCUS, LINK_BUTTON, NGO_BUTTON, PLAIN_BUTTON } from "./ui";

type Part = PrdUIMessage["parts"][number];

function Answering({ testId }: { testId?: string }) {
  return (
    <div
      role="status"
      data-testid={testId}
      className="inline-flex items-center gap-1.5 self-start rounded-lg bg-actor-ai-soft px-2.5 py-1.5 text-xs font-semibold text-actor-ai"
    >
      <span aria-hidden="true" className="flex gap-1">
        <span className="size-1.5 rounded-full bg-actor-ai" />
        <span className="size-1.5 rounded-full bg-actor-ai/70" />
        <span className="size-1.5 rounded-full bg-actor-ai/40" />
      </span>
      {COPY.answering}
    </div>
  );
}

function AiAvatar({ small }: { small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-actor-ai text-actor-on max-md:hidden",
        small ? "size-6" : "size-7",
      )}
    >
      <Sparkles className={small ? "size-3" : "size-3.5"} />
    </span>
  );
}

function hasVisibleParts(message: PrdUIMessage): boolean {
  return message.parts.some(
    (part) => (part.type === "text" && part.text.length > 0) || part.type.startsWith("data-"),
  );
}

function EventChip({
  text,
  topicId,
  onOpen,
}: {
  text: string;
  topicId: TopicId | null;
  onOpen: (topicId: TopicId) => void;
}) {
  return (
    <div
      data-testid={testIds.prdSectionEvent}
      className="inline-flex max-w-[92%] flex-wrap items-center justify-center gap-1.5 self-center rounded-full border border-actor-dev-line bg-actor-dev-soft px-3 py-1 text-center text-xs text-actor-dev"
    >
      {text}
      {topicId !== null ? (
        <button
          type="button"
          data-testid={testIds.prdOpenSectionChat}
          onClick={() => onOpen(topicId)}
          className={cn(LINK_BUTTON, "font-bold text-actor-dev")}
        >
          {COPY.openLink}
        </button>
      ) : null}
    </div>
  );
}

function IntroCard({
  questionId,
  view,
  controller,
}: {
  questionId: string;
  view: PrdView;
  controller: PrdController;
}) {
  const question = view.snapshot.questions.find((entry) => entry.id === questionId);
  if (!question) return null;
  const names = view.names;
  const heading =
    question.kind === "suggested"
      ? COPY.suggestedHeading(names.ngoLabel)
      : COPY.postedHeading(
          names.ngoLabel,
          question.blocking,
          questionStatusText(question, view.isDev, names, view.closed !== null),
        );
  const post =
    question.kind === "suggested" && question.post.kind === "available"
      ? question.post.action
      : null;
  const canAnswer =
    view.snapshot.canWrite[scopeKey({ kind: "side", questionId: question.id })] === true;
  return (
    <div
      id={introElementId(question.id)}
      tabIndex={-1}
      data-testid={testIds.prdNgoQuestionIntro}
      className="my-1 rounded-lg border border-dashed border-actor-ngo bg-actor-ngo-soft px-3 py-2 outline-none focus:ring-2 focus:ring-actor-ngo"
    >
      <div className="text-[11px] font-bold text-actor-ngo">{heading}</div>
      <div className="text-sm font-semibold text-foreground">{question.text}</div>
      {canAnswer ? (
        <button
          type="button"
          data-testid={testIds.prdNgoQuestionAnswer}
          onClick={() => controller.openQuestion(question.id, false)}
          className={cn(NGO_BUTTON, "mt-2")}
        >
          {COPY.answerIt}
        </button>
      ) : null}
      {post ? (
        <button
          type="button"
          data-testid={testIds.prdPostQuestion}
          aria-disabled={controller.acting}
          onClick={() => {
            if (!controller.acting) void controller.act(post);
          }}
          className={cn(DEV_BUTTON, "mt-2")}
        >
          {COPY.postTo(names.ngo)}
        </button>
      ) : null}
    </div>
  );
}

function CheckGaps({
  checkId,
  messageId,
  gaps,
  view,
  controller,
}: {
  checkId: string;
  messageId: string;
  gaps: readonly CheckGap[];
  view: PrdView;
  controller: PrdController;
}) {
  const check = view.snapshot.check;
  const current = check !== null && check.id === checkId && view.liveCheckMessage === messageId;
  const shown = current ? check.gaps : gaps;
  if (shown.length === 0) return null;
  return (
    <ul data-testid={testIds.prdCheckGaps} className="my-1 flex flex-col gap-2">
      {shown.map((gap) => (
        <li
          key={gap.topicId}
          data-testid={testIds.prdCheckGap}
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5"
        >
          <div className="text-xs font-bold text-destructive">{gap.title}</div>
          <div className="mt-0.5 text-sm text-foreground">{gap.text}</div>
          {!current ? null : gap.fixed ? (
            <div className="mt-1.5 text-xs font-semibold text-funds-ok">{COPY.gapClosed}</div>
          ) : (
            <button
              type="button"
              data-testid={testIds.prdCheckGapOpen}
              onClick={() => controller.select({ kind: "topic", topicId: gap.topicId })}
              className={cn(PLAIN_BUTTON, "mt-2 border-destructive text-destructive")}
            >
              {COPY.openGap(gap.title)}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function AiPart({
  part,
  first,
  messageId,
  view,
  controller,
}: {
  part: Part;
  first: boolean;
  messageId: string;
  view: PrdView;
  controller: PrdController;
}): ReactNode {
  switch (part.type) {
    case "text":
      return part.text ? <p className="mb-1.5">{part.text}</p> : null;
    case "data-line":
      return (
        <div className={cn("text-xs text-muted-foreground", first ? "mb-1" : "my-1")}>
          {part.data.text}
        </div>
      );
    case "data-section-link": {
      const topicId = part.data.topicId;
      return (
        <button
          type="button"
          data-testid={testIds.prdOpenSectionChat}
          onClick={() => controller.select({ kind: "topic", topicId })}
          className={cn(PLAIN_BUTTON, "mb-2 mt-0.5 border-actor-dev text-actor-dev")}
        >
          {COPY.openTopicChat(topicTitle(view.snapshot, topicId))}
        </button>
      );
    }
    case "data-ngo-question":
      return <IntroCard questionId={part.data.questionId} view={view} controller={controller} />;
    case "data-check":
      return (
        <CheckGaps
          checkId={part.data.checkId}
          messageId={messageId}
          gaps={part.data.gaps}
          view={view}
          controller={controller}
        />
      );
    case "data-close-ask": {
      if (!view.isDev || view.closed !== null) return null;
      const { closeAnyway, keepWorking } = part.data;
      return (
        <div data-testid={testIds.prdCloseWarning} className="mb-2 mt-1 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid={testIds.prdCloseAnyway}
            aria-disabled={controller.acting}
            onClick={() => {
              if (!controller.acting) void controller.act(closeAnyway);
            }}
            className={DEV_BUTTON}
          >
            {COPY.closeAnyway}
          </button>
          <button
            type="button"
            data-testid={testIds.prdCloseKeep}
            aria-disabled={controller.acting}
            onClick={() => {
              if (!controller.acting) void controller.act(keepWorking);
            }}
            className={PLAIN_BUTTON}
          >
            {COPY.keepWorking}
          </button>
        </div>
      );
    }
    case "data-recommendation": {
      const close = part.data.close;
      return (
        <div
          data-testid={testIds.prdRecommendation}
          className="my-2 rounded-xl border border-actor-ai/30 bg-actor-ai-soft px-3.5 py-3"
        >
          <div className="text-sm font-bold text-foreground">{COPY.closeThePrd}</div>
          <div className="mb-2.5 mt-1 text-xs text-muted-foreground">
            {COPY.closeReason(part.data.revision)}
          </div>
          {view.isDev ? (
            <button
              type="button"
              data-testid={testIds.prdCloseButton}
              aria-disabled={controller.acting}
              onClick={() => {
                if (!controller.acting) void controller.act(close);
              }}
              className={cn(DEV_BUTTON, "min-h-10 text-sm")}
            >
              {COPY.closePrd}
            </button>
          ) : (
            <div className="text-xs text-muted-foreground">{view.close.reason}</div>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}

function DevLines({ message }: { message: PrdUIMessage }) {
  return (
    <>
      {message.parts.map((part, index) => {
        if (part.type === "text") return <div key={index}>{part.text}</div>;
        if (part.type === "data-brief") {
          return (
            <dl
              key={index}
              data-testid={testIds.prdClaimBrief}
              className="mt-1.5 flex flex-col gap-1 rounded-lg border border-actor-dev-line bg-background px-2.5 py-2"
            >
              {part.data.rows.map((row) => (
                <div key={row.label}>
                  <dt className="inline text-xs font-bold text-actor-dev">{row.label}: </dt>
                  <dd className="inline text-sm text-foreground">{row.text}</dd>
                </div>
              ))}
            </dl>
          );
        }
        return null;
      })}
    </>
  );
}

function ActorName({ name, tone }: { name: string; tone: "ai" | "dev" | "ngo" }) {
  return (
    <div
      className={cn(
        "mb-0.5 flex items-center gap-1.5 text-[11px] font-bold",
        tone === "ai" ? "text-actor-ai" : tone === "dev" ? "text-actor-dev" : "text-actor-ngo",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          tone === "ai" ? "bg-actor-ai" : tone === "dev" ? "bg-actor-dev" : "bg-actor-ngo",
        )}
      />
      <span>{name}</span>
    </div>
  );
}

function MainTurn({
  message,
  view,
  controller,
}: {
  message: PrdUIMessage;
  view: PrdView;
  controller: PrdController;
}) {
  const openTopic = (topicId: TopicId) => controller.select({ kind: "topic", topicId });
  if (message.role === "system") {
    return (
      <>
        {message.parts.map((part, index) =>
          part.type === "data-line" ? (
            <EventChip
              key={index}
              text={part.data.text}
              topicId={part.data.topicId}
              onOpen={openTopic}
            />
          ) : null,
        )}
      </>
    );
  }
  if (message.role === "user") {
    return (
      <div
        id={turnElementId(message.id)}
        tabIndex={-1}
        data-testid={testIds.prdTurn}
        data-actor="dev"
        className="max-w-[86%] self-end rounded-xl rounded-br-sm border border-actor-dev-line bg-actor-dev-soft px-3.5 py-2.5 text-sm leading-normal text-foreground outline-none focus:ring-2 focus:ring-actor-dev md:max-w-[74%]"
      >
        <ActorName name={message.metadata?.name ?? view.names.devLabel} tone="dev" />
        <DevLines message={message} />
      </div>
    );
  }
  if (!hasVisibleParts(message)) return null;
  return (
    <div
      id={turnElementId(message.id)}
      tabIndex={-1}
      data-testid={testIds.prdTurn}
      data-actor="ai"
      className="flex gap-2.5 rounded-xl outline-none focus:ring-2 focus:ring-actor-ai"
    >
      <AiAvatar />
      <div className="min-w-0 max-w-[86%] text-sm leading-relaxed text-foreground/85">
        <ActorName name={message.metadata?.name ?? view.names.ai} tone="ai" />
        {message.parts.map((part, index) => (
          <Fragment key={index}>
            <AiPart
              part={part}
              first={index === 0}
              messageId={message.id}
              view={view}
              controller={controller}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function stampOf(message: PrdUIMessage): Date | null {
  const at = message.metadata?.at;
  if (!at) return null;
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? null : date;
}

function useStickToBottom(count: number, scrolls: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef<number | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    const first = seen.current === null;
    seen.current = count;
    if (!element) return;
    if (scrolls) element.scrollTop = element.scrollHeight;
    else if (!first) element.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [count, scrolls]);
  return ref;
}

export function MainConversation({
  view,
  controller,
}: {
  view: PrdView;
  controller: PrdController;
}) {
  const chat = controller.chat({ kind: "main" });
  const { messages } = useChat({ chat });
  const answering = controller.sendState({ kind: "main" }).busy;
  const ref = useStickToBottom(messages.length + (answering ? 1 : 0), true);
  const now = new Date();
  let lastDay = "";
  return (
    <div
      ref={ref}
      data-testid={testIds.prdChat}
      className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto bg-background pr-1.5 text-foreground max-md:gap-3 max-md:px-3.5"
    >
      {messages.map((message) => {
        const stamp = stampOf(message);
        const day = stamp ? dayLabel(stamp, now) : lastDay;
        const divider = day !== lastDay && day !== "";
        lastDay = day;
        return (
          <Fragment key={message.id}>
            {divider ? (
              <div
                data-testid={testIds.prdDayDivider}
                className="flex items-center gap-2.5 text-[11px] font-semibold text-muted-foreground"
              >
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
                {day}
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
              </div>
            ) : null}
            <MainTurn message={message} view={view} controller={controller} />
          </Fragment>
        );
      })}
      {answering ? (
        <div className="flex gap-2.5">
          <AiAvatar />
          <Answering testId={testIds.prdAiAnswering} />
        </div>
      ) : null}
    </div>
  );
}

function DevQuestions({
  questions,
  writable,
  controller,
}: {
  questions: readonly DevQuestion[];
  writable: boolean;
  controller: PrdController;
}) {
  return (
    <div className="flex flex-col gap-2.5 md:ml-9">
      {questions.map((question) => (
        <div
          key={question.id}
          data-testid={testIds.prdQuestion}
          className="rounded-xl border border-border bg-background px-3.5 py-3"
        >
          <strong className="block text-sm">{question.text}</strong>
          <div className="mb-2.5 mt-1 text-xs text-muted-foreground">
            {COPY.whyNow(question.why)}
          </div>
          <div className="flex flex-col gap-1.5 md:flex-row md:flex-wrap md:gap-2">
            {question.options.map((option) => {
              const pressed = controller.picks[question.id] === option;
              return (
                <button
                  key={option}
                  type="button"
                  data-testid={testIds.prdQuestionOption}
                  aria-pressed={pressed}
                  disabled={!writable}
                  onClick={() => controller.pick(question.id, option)}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-left text-xs disabled:cursor-default max-md:min-h-11 max-md:text-sm md:rounded-full",
                    FOCUS,
                    pressed
                      ? "border-actor-dev bg-actor-dev text-actor-on"
                      : "border-input bg-background text-foreground hover:border-muted-foreground",
                  )}
                >
                  <span className="flex-1">{option}</span>
                  {option === question.suggested ? (
                    <span className="rounded-md bg-funds-ok/15 px-1.5 py-px text-[10px] font-semibold text-funds-ok">
                      {COPY.suggested}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopicConversation({
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
  const scope: ChatScope = { kind: "topic", topicId };
  const chat = controller.chat(scope);
  const { messages } = useChat({ chat });
  const answering = controller.sendState(scope).busy;
  const ref = useStickToBottom(messages.length + (answering ? 1 : 0), !phone);
  const asked = new Set(
    messages.flatMap((message) =>
      message.parts.flatMap((part) => (part.type === "data-dev-questions" ? part.data.ids : [])),
    ),
  );
  const questions = view.snapshot.devQuestions.filter(
    (question) => asked.has(question.id) && question.answered === null,
  );
  return (
    <div
      ref={ref}
      data-testid={testIds.prdSectionChat}
      className={cn(
        "flex flex-col gap-3 bg-background text-foreground",
        phone ? "shrink-0 px-3.5 py-2.5" : "min-h-0 flex-1 overflow-y-auto pr-1.5",
      )}
    >
      {phone ? (
        <div className="mt-1 border-t border-border pt-2 text-[11px] font-bold text-muted-foreground">
          {COPY.sectionChat}
        </div>
      ) : null}
      {messages.map((message) => {
        if (message.role === "system") return null;
        const ai = message.role === "assistant";
        if (ai && !hasVisibleParts(message)) return null;
        const lines = message.parts.flatMap((part) =>
          part.type === "text" && part.text ? [part.text] : [],
        );
        return ai ? (
          <div
            key={message.id}
            data-testid={testIds.prdSectionMessage}
            data-actor="ai"
            className="flex gap-2.5"
          >
            {phone ? null : <AiAvatar small />}
            <div className="min-w-0 max-w-[88%] text-sm leading-relaxed text-foreground/85">
              <ActorName name={message.metadata?.name ?? view.names.ai} tone="ai" />
              {lines.map((line, index) => (
                <p key={index} className="mb-1.5">
                  {line}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div
            key={message.id}
            data-testid={testIds.prdSectionMessage}
            data-actor="dev"
            className="max-w-[86%] self-end rounded-xl rounded-br-sm border border-actor-dev-line bg-actor-dev-soft px-3.5 py-2.5 text-sm leading-normal md:max-w-[78%]"
          >
            <ActorName name={message.metadata?.name ?? view.names.devLabel} tone="dev" />
            {lines.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        );
      })}
      {questions.length > 0 ? (
        <DevQuestions
          questions={questions}
          writable={view.snapshot.canWrite[scopeKey(scope)] === true}
          controller={controller}
        />
      ) : null}
      {answering ? <Answering testId={testIds.prdAiAnswering} /> : null}
    </div>
  );
}

export function SideConversation({
  questionId,
  view,
  controller,
}: {
  questionId: QuestionId;
  view: PrdView;
  controller: PrdController;
}) {
  const scope: ChatScope = { kind: "side", questionId };
  const chat = controller.chat(scope);
  const { messages } = useChat({ chat });
  const answering = controller.sendState(scope).busy;
  const ref = useStickToBottom(messages.length + (answering ? 1 : 0), true);
  return (
    <div
      ref={ref}
      data-testid={testIds.prdSideChatMessages}
      className="flex min-h-[120px] flex-1 flex-col gap-2.5 overflow-y-auto rounded-xl border border-border bg-muted/40 p-2.5"
    >
      {messages.map((message) => {
        if (message.role === "system") return null;
        const ngo = message.metadata?.actor === "ngo";
        if (!ngo && !hasVisibleParts(message)) return null;
        const text = message.parts
          .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
          .join(" ");
        return (
          <div
            key={message.id}
            data-testid={testIds.prdSideChatMessage}
            data-actor={ngo ? "ngo" : "ai"}
            className={cn(
              "max-w-[90%] rounded-lg border px-2.5 py-2 text-xs leading-normal max-md:text-sm",
              ngo
                ? "self-end border-actor-ngo-line bg-actor-ngo-soft"
                : "self-start border-border bg-background",
            )}
          >
            <div className={cn("text-[10px] font-bold", ngo ? "text-actor-ngo" : "text-actor-ai")}>
              {message.metadata?.name ?? (ngo ? view.names.ngoLabel : view.names.ai)}
            </div>
            <div>{text}</div>
          </div>
        );
      })}
      {answering ? <Answering /> : null}
    </div>
  );
}
