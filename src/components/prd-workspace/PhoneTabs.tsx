import { CircleHelp, FileText, MessageSquare, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COPY } from "./copy";
import type { PrdView } from "./model";
import { testIds } from "./testids";
import type { PhoneTab } from "./use-prd-workspace";

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
          <Button
            key={tab}
            type="button"
            variant="ghost"
            data-testid={testId}
            aria-current={active ? "page" : undefined}
            onClick={() => onTab(tab)}
            className={cn(
              "relative h-auto min-h-11 flex-col gap-1 rounded-none border-t-2 px-0 py-0 text-[11px] font-semibold hover:bg-transparent [&_svg]:size-5",
              active
                ? "border-foreground text-foreground hover:text-foreground"
                : "border-transparent text-muted-foreground hover:text-muted-foreground",
            )}
          >
            <Icon aria-hidden="true" />
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
          </Button>
        );
      })}
    </nav>
  );
}
