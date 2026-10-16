import { useChat } from "@ai-sdk/react";
import { AnswerReview } from "./AnswerReview";
import { ActNotice, ClosedBanner, ReadOnlyBanner } from "./Banners";
import { Composer } from "./Composer";
import { MainConversation } from "./ConversationPane";
import { COPY } from "./copy";
import { PrdPanel } from "./PrdPanel";
import { ProcessBar } from "./ProcessBar";
import { QuestionsPanel } from "./QuestionsPanel";
import { SideChat } from "./SideChat";
import { TopicPage } from "./TopicPage";
import { MAIN, type PrdController } from "./use-prd-workspace";

export function MainColumn({ controller, phone }: { controller: PrdController; phone: boolean }) {
  const view = controller.view;
  useChat({ chat: controller.chat(MAIN) });
  const state = controller.sendState(MAIN);
  const writable = view.snapshot.canWrite.main === true;
  const hint =
    state.send.kind === "unavailable" && state.send.block === "funds"
      ? COPY.composerHint.funds
      : state.busy
        ? COPY.composerHint.busy
        : COPY.composerHint.idle;
  return (
    <>
      <MainConversation view={view} controller={controller} />
      {writable ? (
        <Composer
          text={controller.drafts.main ?? ""}
          busy={state.busy}
          canSend={state.enabled}
          hint={phone ? null : hint}
          queue={controller.queue}
          canEdit={controller.canEditQueued}
          notice={
            controller.notice && controller.notice.key === "main" ? controller.notice.reason : null
          }
          onText={(text) => controller.setDraft("main", text)}
          onSend={() => controller.send(MAIN)}
          onEdit={(id) => controller.editQueued(id)}
          onRemove={(id) => controller.removeQueued(id)}
        />
      ) : null}
    </>
  );
}

export function DesktopLayout({
  controller,
  onOpenUiDesign,
}: {
  controller: PrdController;
  onOpenUiDesign?: (revision: number) => void;
}) {
  const view = controller.view;
  const center = controller.center;
  const aside = controller.aside;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 bg-background text-foreground">
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm text-muted-foreground">
          {view.snapshot.project.organizationName} · {view.snapshot.project.title}
        </span>
        <ProcessBar />
      </div>
      <ClosedBanner view={view} onOpenUiDesign={onOpenUiDesign} />
      <ReadOnlyBanner view={view} phone={false} />
      <ActNotice controller={controller} />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(220px,264px)_minmax(0,1fr)_minmax(250px,300px)] overflow-hidden rounded-xl border border-border">
        <aside
          aria-label={COPY.projectPrd}
          className="flex min-h-0 flex-col gap-4 overflow-y-auto border-r border-border p-4"
        >
          <PrdPanel view={view} controller={controller} phone={false} />
        </aside>
        <section
          aria-label="PRD chat"
          className="flex min-h-0 min-w-0 flex-col gap-3 px-5 pb-4 pt-3"
        >
          {center.kind === "topic" ? (
            <TopicPage
              key={center.topicId}
              topicId={center.topicId}
              view={view}
              controller={controller}
              phone={false}
            />
          ) : (
            <MainColumn controller={controller} phone={false} />
          )}
        </section>
        <aside
          aria-label="Questions for the NGO"
          className="flex min-h-0 flex-col gap-4 overflow-y-auto border-l border-border p-4"
        >
          {aside.kind === "side" ? (
            <SideChat
              key={aside.questionId}
              questionId={aside.questionId}
              view={view}
              controller={controller}
            />
          ) : aside.kind === "review" ? (
            <AnswerReview
              key={aside.questionId}
              questionId={aside.questionId}
              view={view}
              controller={controller}
            />
          ) : (
            <QuestionsPanel view={view} controller={controller} phone={false} />
          )}
        </aside>
      </div>
    </div>
  );
}
