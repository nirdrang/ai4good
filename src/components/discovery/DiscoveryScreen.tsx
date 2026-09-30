import { useEffect, useState, type ReactNode } from "react";
import type { BriefQuestion, DiscoveryState } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { SCREEN, TEXT } from "./a11y";
import { BriefCard, BriefDialog, BriefSide, briefHeading } from "./BriefPanel";
import { Composer } from "./Composer";
import { Conversation } from "./Conversation";
import { FileOverlay } from "./FilePanel";
import { FilesCard } from "./FilesCard";
import { currentQuestions, questionRows } from "./model";
import type { DiscoveryPort } from "./port";
import { ProgressStrip } from "./ProgressStrip";
import { questionCountLine, QuestionsCard, QuestionsDialog } from "./QuestionsCard";
import { useDiscovery } from "./use-discovery";
import { useIsPhone } from "./use-is-phone";
import { UsageCard } from "./UsageCard";

export function DiscoveryScreen({
  port,
  onOpenReview,
  active = true,
  returnFocus = null,
}: {
  port: DiscoveryPort;
  onOpenReview(): void;
  active?: boolean;
  returnFocus?: { questionId: string; nonce: number } | null;
}) {
  const [loaded, setLoaded] = useState<DiscoveryState | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    port.load().then(
      (result) => {
        if (!live) return;
        if (result.ok) setLoaded(result.value);
        else setFailure(result.refusal.reason);
      },
      (error: unknown) => {
        if (!live) return;
        setFailure(error instanceof Error ? error.message : "Discovery did not load.");
      },
    );
    return () => {
      live = false;
    };
  }, [port]);
  if (failure) return <p role="alert">{failure}</p>;
  if (!loaded) return <p>Loading Discovery.</p>;
  return <Loaded port={port} initial={loaded} onOpenReview={onOpenReview} active={active} returnFocus={returnFocus} />;
}

function tagFor(
  question: BriefQuestion,
  discovery: ReturnType<typeof useDiscovery>,
): "carried" | "changing" | null {
  if (discovery.reopened.includes(question.id)) return "changing";
  const topic = discovery.brief.topics.find((item) => item.id === question.topicId);
  if (topic?.state.kind === "open" && question.askedInRound < discovery.assistantCount) return "carried";
  return null;
}

function Loaded({
  port,
  initial,
  onOpenReview,
  active,
  returnFocus,
}: {
  port: DiscoveryPort;
  initial: DiscoveryState;
  onOpenReview(): void;
  active: boolean;
  returnFocus: { questionId: string; nonce: number } | null;
}) {
  const phone = useIsPhone();
  const discovery = useDiscovery(port, initial, active, returnFocus);
  const confirmation = discovery.confirmation;
  const questions = confirmation ? [] : currentQuestions(discovery.brief, discovery.reopened);
  const visible = discovery.oneAtATime ? questions.slice(discovery.questionIndex, discovery.questionIndex + 1) : questions;
  const tags = Object.fromEntries(visible.map((question) => [question.id, tagFor(question, discovery)]));
  const rows = questionRows(discovery.brief, discovery.drafts);
  const showFile = discovery.panel?.kind === "chooser" || discovery.panel?.kind === "file";
  const files = (
    <FilesCard
      files={discovery.files}
      funded={discovery.project.funded}
      dense={showFile && !phone}
      onAdd={discovery.openChooser}
      onOpen={discovery.openFile}
    />
  );
  const fileOverlay = showFile ? (
    <FileOverlay
      phone={phone}
      mode={discovery.panel?.kind === "file" ? "file" : "chooser"}
      view={discovery.fileChat}
      usage={discovery.usage}
      notice={discovery.fileNotice}
      onChoose={discovery.chooseFile}
      onClose={discovery.closePanel}
      onDraft={discovery.setFileDraft}
      onSend={(text) => void discovery.sendFileAnswer(text)}
    />
  ) : null;
  const conversation = (
    <Conversation
      messages={discovery.messages}
      questions={visible}
      drafts={discovery.drafts}
      highlight={discovery.highlight}
      focusId={discovery.focus?.id ?? null}
      focusNonce={discovery.focus?.nonce ?? 0}
      tags={tags}
      oneAtATime={discovery.oneAtATime}
      canAdvance={discovery.oneAtATime && discovery.questionIndex < questions.length - 1}
      tail={phone ? files : null}
      onPick={discovery.pick}
      onShowOne={discovery.showOne}
      onShowTogether={discovery.showTogether}
      onNext={discovery.nextQuestion}
    />
  );
  const composer = confirmation ? (
    <div className="flex flex-col gap-1">
      <p className="m-0 text-sm font-semibold">{confirmation.acceptedGaps.length > 0 ? TEXT.finishedOpen : TEXT.finished}</p>
      <p className="m-0 text-sm">{TEXT.finishedClosed}</p>
    </div>
  ) : (
    <Composer
      text={discovery.composerText}
      canSend={discovery.canSend}
      paid={discovery.paidSend}
      placeholder={phone ? TEXT.replyPlaceholder : TEXT.notePlaceholder}
      onText={discovery.setComposerText}
      onSend={() => void discovery.send()}
    />
  );
  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-3 overflow-hidden">
      {discovery.refusal ? <p role="alert" className="m-0 shrink-0">{discovery.refusal.reason}</p> : null}
      <ProgressStrip brief={discovery.brief} projectTitle={discovery.project.title} onOpenReview={onOpenReview} />
      {phone ? (
        <PhoneColumn
          heading={briefHeading(discovery.brief)}
          counts={questionCountLine(rows)}
          onOpenBrief={() => discovery.openPanel("brief")}
          onOpenQuestions={() => discovery.openPanel("questions")}
          conversation={conversation}
          usage={discovery.panel?.kind === "brief" ? null : <UsageCard usage={discovery.usage} dock />}
          composer={composer}
        />
      ) : (
        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_22rem] gap-4">
          <div className="flex min-h-0 min-w-0 flex-col gap-3">
            {conversation}
            {composer}
          </div>
          <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
            {showFile ? (
              // A floating panel would cover Send. A modal would hide the main chat during a read.
              fileOverlay
            ) : (
              <>
                {discovery.panel?.kind === "brief" ? (
                  <BriefSide brief={discovery.brief} onClose={discovery.closePanel} onEdit={discovery.reopen} />
                ) : (
                  <BriefCard brief={discovery.brief} onOpen={() => discovery.openPanel("brief")} />
                )}
                {discovery.panel?.kind === "brief" ? null : (
                  <QuestionsCard rows={rows} onAnswer={discovery.focusQuestion} onView={discovery.viewAnswer} />
                )}
              </>
            )}
            {files}
            <UsageCard usage={discovery.usage} dense={showFile} />
          </div>
        </div>
      )}
      {phone && showFile ? fileOverlay : null}
      {phone && discovery.panel?.kind === "brief" ? (
        <BriefDialog
          brief={discovery.brief}
          usage={<UsageCard usage={discovery.usage} />}
          onClose={discovery.closePanel}
          onEdit={discovery.reopen}
        />
      ) : null}
      {phone && discovery.panel?.kind === "questions" ? (
        <QuestionsDialog
          rows={rows}
          onAnswer={discovery.focusQuestion}
          onView={discovery.viewAnswer}
          onClose={discovery.closePanel}
        />
      ) : null}
    </div>
  );
}

function PhoneColumn({
  heading,
  counts,
  onOpenBrief,
  onOpenQuestions,
  conversation,
  usage,
  composer,
}: {
  heading: string;
  counts: string;
  onOpenBrief(): void;
  onOpenQuestions(): void;
  conversation: ReactNode;
  usage: ReactNode;
  composer: ReactNode;
}) {
  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-col gap-2">
        <p className="m-0 text-sm font-semibold">{heading}</p>
        <p className="m-0 text-sm text-muted-foreground">{counts}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal px-2" onClick={onOpenBrief}>
            {SCREEN.openBrief.name}
          </Button>
          <Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal px-2" onClick={onOpenQuestions}>
            {SCREEN.openQuestions.name}
          </Button>
        </div>
      </div>
      {conversation}
      <div className="flex w-full min-w-0 shrink-0 flex-col gap-2">
        {usage}
        {composer}
      </div>
    </div>
  );
}
