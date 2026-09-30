import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import type { BriefQuestion, DiscoveryState } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { NAME, SCREEN, TEXT } from "./a11y";
import { BriefCard, BriefDialog, BriefSide } from "./BriefPanel";
import { Composer } from "./Composer";
import { Conversation } from "./Conversation";
import { FileOverlay } from "./FilePanel";
import { FilesCard } from "./FilesCard";
import { answerText, currentQuestions, progressOf, questionRows } from "./model";
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
): "carried" | "changing" | "review" | null {
  if (discovery.reopened.includes(question.id)) return "changing";
  const topic = discovery.brief.topics.find((item) => item.id === question.topicId);
  if (topic?.needsReview === true) return "review";
  if (topic?.state.kind === "open" && question.askedInRound < discovery.assistantCount) return "carried";
  return null;
}

function canSaveQuestion(question: BriefQuestion, discovery: ReturnType<typeof useDiscovery>): boolean {
  const text = answerText(question, discovery.drafts[question.id]);
  if (!text) return false;
  const topic = discovery.brief.topics.find((item) => item.id === question.topicId);
  if (!topic || topic.needsReview === true) return true;
  if (topic.state.kind === "agreed") return topic.state.answer !== text;
  if (topic.state.kind === "not-sure") return text !== NAME.notSure;
  return true;
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
  const briefOpenerRef = useRef<HTMLButtonElement>(null);
  const questionsOpenerRef = useRef<HTMLButtonElement>(null);
  const addOpenerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const token = discovery.restore;
    if (!token) return;
    const timer = window.setTimeout(() => {
      const opener = token.opener;
      if (opener === "brief") briefOpenerRef.current?.focus();
      else if (opener === "questions") questionsOpenerRef.current?.focus();
      else if (opener === "add") addOpenerRef.current?.focus();
      else document.getElementById(`discovery-file-${opener.fileId}`)?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [discovery.restore]);
  const confirmation = discovery.confirmation;
  const asked = currentQuestions(discovery.brief, discovery.reopened);
  const questions =
    confirmation === null
      ? asked
      : asked.filter(
          (question) => discovery.reopened.includes(question.id) || discovery.pinned.includes(question.id),
        );
  const progress = progressOf(discovery.brief);
  const readyToFinish =
    confirmation === null && questions.length === 0 && progress.total > 0 && progress.agreed === progress.total;
  const visible = discovery.oneAtATime ? questions.slice(discovery.questionIndex, discovery.questionIndex + 1) : questions;
  const tags = Object.fromEntries(visible.map((question) => [question.id, tagFor(question, discovery)]));
  const rows = questionRows(discovery.brief, discovery.drafts);
  const showFile = discovery.panel?.kind === "chooser" || discovery.panel?.kind === "file";
  const files = (
    <FilesCard
      files={discovery.files}
      funded={discovery.project.funded}
      finished={confirmation !== null}
      dense={showFile && !phone}
      addRef={addOpenerRef}
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
      canToggle={discovery.oneAtATime || questions.length > 1}
      canAdvance={discovery.oneAtATime && discovery.questionIndex < questions.length - 1}
      tail={phone ? files : null}
      onPick={discovery.pick}
      offerSave={(questionId) =>
        discovery.reopened.includes(questionId) ||
        (confirmation !== null && discovery.pinned.includes(questionId))
      }
      onSave={(questionId) => void discovery.saveChange(questionId)}
      canSave={(questionId) => {
        const question = visible.find((item) => item.id === questionId);
        return question !== undefined && canSaveQuestion(question, discovery);
      }}
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
  ) : readyToFinish ? (
    <div role={SCREEN.readyInvite.role} aria-label={SCREEN.readyInvite.name} className="shrink-0">
      <p className="m-0 text-sm">{TEXT.readyInvite}</p>
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
    <div className={`flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden ${phone ? "gap-2" : "gap-3"}`}>
      {discovery.refusal ? <p role="alert" className="m-0 shrink-0">{discovery.refusal.reason}</p> : null}
      <ProgressStrip
        brief={discovery.brief}
        projectTitle={discovery.project.title}
        phone={phone}
        onOpenReview={onOpenReview}
      />
      {phone ? (
        <PhoneColumn
          counts={questionCountLine(rows)}
          briefRef={briefOpenerRef}
          questionsRef={questionsOpenerRef}
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
                  <BriefCard
                    brief={discovery.brief}
                    buttonRef={briefOpenerRef}
                    onOpen={() => discovery.openPanel("brief")}
                  />
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
  counts,
  briefRef,
  questionsRef,
  onOpenBrief,
  onOpenQuestions,
  conversation,
  usage,
  composer,
}: {
  counts: string;
  briefRef: Ref<HTMLButtonElement>;
  questionsRef: Ref<HTMLButtonElement>;
  onOpenBrief(): void;
  onOpenQuestions(): void;
  conversation: ReactNode;
  usage: ReactNode;
  composer: ReactNode;
}) {
  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-2">
      <div className="grid shrink-0 grid-cols-2 gap-2">
        <Button ref={briefRef} type="button" variant="outline" className="h-auto min-h-11 whitespace-normal px-2 text-sm leading-snug" onClick={onOpenBrief}>
          {SCREEN.openBrief.name}
        </Button>
        <Button ref={questionsRef} type="button" variant="outline" className="h-auto min-h-11 whitespace-normal px-2 text-sm leading-snug" onClick={onOpenQuestions}>
          {`Questions · ${counts}`}
        </Button>
      </div>
      {conversation}
      <div className="flex w-full min-w-0 shrink-0 flex-col gap-2">
        {usage}
        {composer}
      </div>
    </div>
  );
}
