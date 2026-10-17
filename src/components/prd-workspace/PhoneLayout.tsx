import { AnswerReview } from "./AnswerReview";
import { ActNotice, ClosedBanner, ReadOnlyBanner } from "./Banners";
import { MainColumn } from "./DesktopLayout";
import { PhoneTabs } from "./PhoneTabs";
import { PrdPanel } from "./PrdPanel";
import { StageChip } from "./ProcessBar";
import { QuestionsPanel } from "./QuestionsPanel";
import { SideChat } from "./SideChat";
import { TopicPage } from "./TopicPage";
import type { PrdController } from "./use-prd-workspace";

export function PhoneLayout({
  controller,
  onOpenUiDesign,
}: {
  controller: PrdController;
  onOpenUiDesign?: (revision: number) => void;
}) {
  const view = controller.view;
  const tab = controller.phoneTab;
  const center = controller.center;
  const aside = controller.aside;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <StageChip />
      </div>
      <ClosedBanner view={view} onOpenUiDesign={onOpenUiDesign} />
      <ReadOnlyBanner view={view} phone />
      <ActNotice controller={controller} />
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "chat" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 pt-3">
            <MainColumn controller={controller} phone />
          </div>
        ) : null}
        {tab === "prd" ? (
          center.kind === "topic" ? (
            <TopicPage
              key={center.topicId}
              topicId={center.topicId}
              view={view}
              controller={controller}
              phone
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-3.5">
              <PrdPanel view={view} controller={controller} phone />
            </div>
          )
        ) : null}
        {tab === "questions" ? (
          aside.kind === "side" ? (
            <div className="flex min-h-0 flex-1 flex-col px-3 pb-2.5 pt-1">
              <SideChat
                key={aside.questionId}
                questionId={aside.questionId}
                view={view}
                controller={controller}
              />
            </div>
          ) : aside.kind === "review" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 pt-1">
              <AnswerReview
                key={aside.questionId}
                questionId={aside.questionId}
                view={view}
                controller={controller}
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-3.5">
              <QuestionsPanel view={view} controller={controller} phone />
            </div>
          )
        ) : null}
      </div>
      <PhoneTabs view={view} current={tab} onTab={controller.setPhoneTab} />
    </div>
  );
}
