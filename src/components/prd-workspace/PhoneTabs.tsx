import { CircleHelp, FileText, MessageSquare, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { COPY } from "./copy";
import type { PrdView } from "./model";
import { testIds } from "./testids";
import type { PhoneTab } from "./use-prd-workspace";
import { FOCUS } from "./ui";

export function PhoneTabs({
  view,
  current,
  onTab,
}: {
  view: PrdView;
  current: PhoneTab;
  onTab(tab: PhoneTab): void;
}) {
  const tabs: readonly { tab: PhoneTab; testId: string; label: string; Icon: LucideIcon }[] = [
    { tab: "chat", testId: testIds.phoneTabChat, label: COPY.tabs.chat, Icon: MessageSquare },
    {
      tab: "prd",
      testId: testIds.phoneTabPrd,
      label: COPY.tabs.prd(view.progress.confirmed, view.progress.total),
      Icon: FileText,
    },
    {
      tab: "questions",
      testId: testIds.phoneTabQuestions,
      label: COPY.tabs.questions,
      Icon: CircleHelp,
    },
  ];
  return (
    <nav
      aria-label={COPY.tabs.label}
      data-testid={testIds.phoneTabBar}
      className="grid h-[60px] shrink-0 grid-cols-3 border-t border-border bg-background"
    >
      {tabs.map(({ tab, testId, label, Icon }) => {
        const active = tab === current;
        return (
          <button
            key={tab}
            type="button"
            data-testid={testId}
            aria-current={active ? "page" : undefined}
            onClick={() => onTab(tab)}
            className={cn(
              "relative flex min-h-11 flex-col items-center justify-center gap-1 border-t-2 text-[11px] font-semibold",
              FOCUS,
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-5" />
            <span className="block whitespace-nowrap leading-[14px]">{label}</span>
            {tab === "questions" && view.badge > 0 ? (
              <span
                data-testid={testIds.phoneTabQuestionsBadge}
                className={cn(
                  "absolute left-[calc(50%+6px)] top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold text-actor-on",
                  view.isDev ? "bg-actor-dev" : "bg-actor-ngo",
                )}
              >
                {view.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
