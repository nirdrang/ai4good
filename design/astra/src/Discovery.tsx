import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import Markdown from "react-markdown";
import { Check, CircleHelp, FileText, MessageCircle, Pencil, Send, Sparkles, Square } from "lucide-react";
import type {
  DiscoveryAnswer,
  DiscoveryRequestBody,
  DiscoveryUIMessage,
} from "../../../src/lib/discovery-stream";
import { Badge, Button, Next, PageTitle, Stages, type ScreenProps } from "./components";
import { funding, refreshDay, saveAnswer, usd, type Answer, type QuestionId } from "./model";
import { briefReady, currentQuestions, questions, type Question } from "./questions";
import { FixtureChatTransport, messagesFromState, questionPart } from "./fixture-transport";
import { DiscoveryReferences } from "./DiscoveryReferences";
import { DiscoveryProgress } from "./DiscoveryProgress";
import "./discovery-chat.css";

function refusalReason(error: Error): string {
  try {
    const parsed: unknown = JSON.parse(error.message);
    if (parsed && typeof parsed === "object" && typeof (parsed as { reason?: unknown }).reason === "string")
      return (parsed as { reason: string }).reason;
  } catch {
    // Not a refusal body: the reply failed on the way.
  }
  return error.message;
}

function AssistantMessage({ message, showQuestions }: { message: DiscoveryUIMessage; showQuestions: boolean }) {
  return (
    <div className="ai-message" data-testid="discovery-round" data-testkey={message.id}>
      <div className="ai-avatar">
        <Sparkles size={17} />
      </div>
      <div className="chat-ai-content">
        <p className="message-author">ai4good AI</p>
        {message.parts.map((part, index) => {
          switch (part.type) {
            case "text":
              return <Markdown key={index}>{part.text}</Markdown>;
            case "data-filed":
              return (
                <p key={index} className="chat-filed" data-testid="round-filed">
                  <Check size={13} aria-hidden="true" /> Added to your brief:{" "}
                  {part.data.topics.map((topic) => topic.title).join(", ")}
                </p>
              );
            case "data-charge":
              return part.data.kind === "free" ? (
                <span key={index} className="chat-receipt">
                  Free reply · no charge
                </span>
              ) : (
                <div key={index}>
                  <span className="chat-receipt">Paid reply</span>
                  <p className="receipt" data-testid="paid-reply-receipt">
                    AI usage {usd(part.data.usageMicros)} + platform fee {usd(part.data.feeMicros)} ={" "}
                    {usd(part.data.usageMicros + part.data.feeMicros)} total
                  </p>
                </div>
              );
            case "data-question":
              return showQuestions ? <p key={index}>{part.data.text}</p> : null;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  answer,
  onChange,
  disabled,
  needsReview,
}: {
  question: Question;
  answer: Answer | undefined;
  onChange: (answer: Answer) => void;
  disabled: boolean;
  needsReview: boolean;
}) {
  return (
    <fieldset
      disabled={disabled}
      className="question-card"
      data-testid="discovery-question"
      data-testkey={question.id}
    >
      <legend>{question.text}</legend>
      {needsReview && (
        <p className="amber-text" data-testid="question-needs-review">
          Review again · an earlier answer changed.
        </p>
      )}
      <p className="question-reason">{question.reason}</p>
      <div className="answer-options">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            data-testid="suggested-answer"
            data-testkey={option.id}
            className={`answer-option ${answer?.choice === option.id ? "selected" : ""}`}
            aria-pressed={answer?.choice === option.id}
            onClick={() => onChange({ choice: option.id, text: option.answer, certain: true })}
          >
            <span className="radio-mark">
              {answer?.choice === option.id && <Check size={12} />}
            </span>
            {option.label}
          </button>
        ))}
      </div>
      <div className="question-alternatives">
        <button
          type="button"
          data-testid="custom-answer-choice"
          data-testkey={question.id}
          className="text-button"
          aria-pressed={answer?.choice === "custom"}
          onClick={() => onChange({ choice: "custom", text: "", certain: true })}
        >
          Write my own answer
        </button>
        <button
          type="button"
          data-testid="uncertain-answer-choice"
          data-testkey={question.id}
          className={`text-button ${answer?.choice === "uncertain" ? "chosen" : ""}`}
          aria-pressed={answer?.choice === "uncertain"}
          onClick={() =>
            onChange({ choice: "uncertain", text: "I'm not sure yet.", certain: false })
          }
        >
          <CircleHelp size={14} />
          I'm not sure
        </button>
      </div>
      {answer?.choice === "custom" && (
        <label className="field custom-answer">
          Your answer
          <textarea
            autoFocus
            data-testid="custom-answer"
            data-testkey={question.id}
            rows={3}
            value={answer.text}
            onChange={(event) => onChange({ ...answer, text: event.target.value })}
          />
        </label>
      )}
      {answer?.choice === "uncertain" && (
        <p className="small amber-text">This will stay an open question in your brief.</p>
      )}
    </fieldset>
  );
}

export function FundingPanel({ state, navigate }: Pick<ScreenProps, "state" | "navigate">) {
  const mode = funding(state);
  const questionsComplete = briefReady(state.answers);
  const noAllocation = !mode.free && state.usage.allocation === 0;
  const reset = new Date();
  reset.setUTCHours(24, 0, 0, 0);
  const resetTime = reset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <section className="panel funding-panel" aria-labelledby="fuel-title">
      <div className="section-heading">
        <h2 id="fuel-title">Discovery usage</h2>
        <Badge tone={mode.free ? "green" : "neutral"}>
          {questionsComplete
            ? "Questions complete"
            : mode.free
              ? "Free first"
              : mode.canSend
                ? "Paid usage"
                : "Fuel needed"}
        </Badge>
      </div>
      <p className="usage-summary" data-testid="usage-summary">
        {questionsComplete
          ? "No more AI replies are needed. Reviewing and finishing are free."
          : mode.free
            ? `Your next reply is free. ${Math.min(mode.dailyLeft, mode.betaLeft)} free ${Math.min(mode.dailyLeft, mode.betaLeft) === 1 ? "reply" : "replies"} left today. Free replies never use your money.`
            : `${
                mode.betaLeft === 0
                  ? "All 50 beta free replies are used. Beta free replies don't reset."
                  : `Today's 10 free replies are used. Free replies start again at ${resetTime}. Beta free replies count only while today's free replies last.`
              } ${
                mode.canSend
                  ? `Your next reply is paid from project fuel (${usd(mode.available)} available).`
                  : "Your draft is saved."
              }`}
      </p>
      {noAllocation ? (
        <p className="callout" data-testid="empty-paid-allocation">
          This project has no fuel for Discovery replies.
        </p>
      ) : (
        <>
          <p className="small muted">{mode.label}</p>
          <div
            className={`usage-track ${mode.band}`}
            role="progressbar"
            aria-label={mode.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={mode.percent}
          >
            <span style={{ width: `${mode.percent}%` }} />
          </div>
          <div className="gauge-caption">
            <span>
              {Number(mode.percent.toFixed(2))}% used ·{" "}
              {mode.percent >= 100
                ? "Fully used"
                : mode.band === "green"
                  ? "Within allowance"
                  : mode.band === "yellow"
                    ? "Getting low · replies still work"
                    : "Nearly used · replies still work"}
            </span>
            <span>{mode.free ? "1 reply = 1 turn" : "Actual usage in USD"}</span>
          </div>
        </>
      )}
      <dl className="balance-list" data-testid="discovery-balances">
        <div>
          <dt>Daily free turns</dt>
          <dd>
            {mode.dailyLeft} <span>of 10 left</span>
          </dd>
        </div>
        <div>
          <dt>Beta free turns</dt>
          <dd>
            {mode.betaLeft} <span>of 50 left</span>
          </dd>
        </div>
        <div>
          <dt>Paid fuel available</dt>
          <dd>{usd(mode.available)}</dd>
        </div>
      </dl>
      {state.usage.reserved > 0 && (
        <p className="callout warning" data-testid="usage-pending">
          Usage pending · {usd(state.usage.reserved)} is set aside while a reply's final cost is
          confirmed. The fuel shown already excludes it. You pay only the actual usage; the rest
          returns. This is not an extra charge.
        </p>
      )}
      <div className="next-reply" data-testid="next-reply-mode">
        <span>{questionsComplete ? "Next step" : "Next reply"}</span>
        <strong>
          {questionsComplete
            ? "Review brief · free"
            : mode.free
              ? "Free · 1 turn"
              : mode.canSend
                ? "Paid · actual usage in USD"
                : "Not available now"}
        </strong>
      </div>
      {!questionsComplete && !mode.free && mode.canSend && (
        <p className="small muted">Up to $0.25 reserved per reply. Unused fuel stays available.</p>
      )}
      <p className="small muted">
        {questionsComplete
          ? "No more AI replies are needed. Review and confirmation use no turns or paid fuel."
          : mode.betaLeft > 0
            ? `Daily turns reset at ${resetTime} in your time zone.`
            : "Your beta allowance is used. A daily reset does not renew it."}
      </p>
      {!questionsComplete && !mode.free && (
        <>
          <Button testId="buy-fuel" className="full-width" onClick={() => navigate("funding")}>
            Buy fuel
          </Button>
          <p className="small muted buy-fuel-terms" data-testid="buy-fuel-terms">
            Minimum purchase $50. Fuel pays for replies. It does not add free replies.
          </p>
        </>
      )}
    </section>
  );
}

export function Discovery(props: ScreenProps) {
  const { state, setState, navigate, notify } = props;
  const [editing, setEditing] = useState<QuestionId | null>(null);
  const [editAnswer, setEditAnswer] = useState<Answer>();
  const [error, setError] = useState("");
  const [batch, setBatch] = useState(false);
  const [asking, setAsking] = useState(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const transport = useMemo(
    () => new FixtureChatTransport({ read: () => stateRef.current, write: (next) => setState(next) }),
    [setState],
  );
  const { messages, sendMessage, setMessages, status, stop } = useChat<DiscoveryUIMessage>({
    id: "discovery",
    messages: messagesFromState(state),
    transport,
    onFinish: () => setAsking(false),
    onError: (failure) => setError(refusalReason(failure)),
  });
  const busy = status === "submitted" || status === "streaming";
  // Outside a reply, the transcript follows the saved conversation, as the real page follows
  // its conversation read after a stop, a refusal, an answer edit, or a review-tool change.
  useEffect(() => {
    if (status === "ready" || status === "error") setMessages(messagesFromState(state));
  }, [state.history, state.answers, status, setMessages]); // eslint-disable-line react-hooks/exhaustive-deps
  const all = questions(state.answers);
  const pending = currentQuestions(state.answers);
  const active = editing
    ? all.filter((q) => q.id === editing)
    : batch
      ? pending
      : pending.slice(0, 1);
  const currentQuestion = active[0];
  const currentAnswer = editing ? editAnswer : currentQuestion && state.drafts[currentQuestion.id];
  const mode = funding(state);
  const ready = briefReady(state.answers);
  const canAnswer =
    asking && !editing
      ? Boolean(state.note.trim())
      : active.length > 0 &&
        active.every((q) => (editing ? editAnswer : state.drafts[q.id])?.text.trim()) &&
        (editing !== null ||
          active.some(
            (q) =>
              !(
                state.answers[q.id]?.certain === false && state.drafts[q.id]?.choice === "uncertain"
              ),
          ));
  const declined = state.condition === "declined";
  const questionCardShown = !declined && !((state.confirmation || ready) && !editing);

  function draftAnswer(id: QuestionId, answer: Answer) {
    if (editing) setEditAnswer(answer);
    else setState((current) => ({ ...current, drafts: { ...current.drafts, [id]: answer } }));
  }

  function submit() {
    if (!canAnswer || busy || !currentQuestion) return;
    if (editing && editAnswer) {
      setState((current) => saveAnswer(current, editing, editAnswer));
      setEditing(null);
      setEditAnswer(undefined);
      notify("Answer updated. Dependent answers need review. No turn used.");
      return;
    }
    const fresh = refreshDay(state);
    if (funding(fresh).free !== mode.free) {
      setState(fresh);
      notify("The next reply mode changed. Please check it before sending.");
      return;
    }
    if (!mode.canSend) return;
    setError("");
    const answers: DiscoveryAnswer[] = asking
      ? []
      : active.flatMap((q) => {
          const draft = state.drafts[q.id];
          return draft ? [{ questionId: q.id, ...draft }] : [];
        });
    const text = [...answers.map((answer) => answer.text), state.note].filter(Boolean).join("\n\n");
    const body: DiscoveryRequestBody = {
      organizationId: "sample-organization",
      projectId: "sample-project",
      message: text,
      mode: asking ? "ask" : "answer",
      answers,
    };
    // The transcript keeps the questions this message answers, not every open question.
    const asked = (asking ? active.slice(0, 1) : active).map(questionPart);
    setMessages((current) =>
      current.map((message, index) =>
        index === current.length - 1 && message.role === "assistant"
          ? { ...message, parts: [...message.parts.filter((part) => part.type !== "data-question"), ...asked] }
          : message,
      ),
    );
    void sendMessage({ text }, { body });
  }

  async function stopReply() {
    await stop();
    notify("You stopped the reply. The turn was already used, so the full reply is shown.");
  }

  function edit(id: QuestionId) {
    setAsking(false);
    setEditing(id);
    setEditAnswer(state.answers[id]);
    document.getElementById("conversation")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <PageTitle
        eyebrow="Your project / Discovery"
        title={state.intake.title || "Your new project"}
        action={
          <Button
            testId="open-mobile-brief"
            className="brief-mobile-link"
            onClick={() => {
              const brief = document.getElementById("discovery-brief");
              brief?.focus({ preventScroll: true });
              brief?.scrollIntoView({ block: "start", behavior: "auto" });
            }}
          >
            <FileText size={16} />
            View brief
          </Button>
        }
      >
        Let's turn your need into a clear first version.{" "}
        <span className="discovery-save-state">Draft saved in this browser.</span>
      </PageTitle>
      <Stages current={state.confirmation ? 2 : 1} />
      <DiscoveryProgress state={state} navigate={navigate} editing={editing !== null} busy={busy} />
      <div className="discovery-grid">
        <section
          className="conversation discovery-chat"
          id="conversation"
          aria-label="NGO and AI conversation"
        >
          <div className="chat-heading">
            <div className="row">
              <MessageCircle size={18} />
              <h2>Chat with ai4good AI</h2>
            </div>
            <span className="small muted">You + AI · Scripted preview</span>
          </div>
          <div className="ngo-message chat-bubble intake-message">
            <p className="message-author">You · From your intake</p>
            <p>{state.intake.outcome}</p>
          </div>
          {state.condition === "reopened" && (
            <div className="callout success" data-testid="decline-overturned-notice">
              <strong>Your project is open again.</strong>
              <p>
                Our reviewer confirmed that your team can maintain this tool. Your earlier
                conversation stays here.{" "}
                {mode.free
                  ? "Free turns remain available."
                  : "Your existing usage limits still apply."}{" "}
                Reopening does not renew your allowance.
              </p>
              <details>
                <summary>Earlier decline</summary>
                <p>
                  The proposed tool appeared to need ongoing developer maintenance. A person reads
                  every one of these decisions — if we got this wrong, we'll reach out.
                </p>
              </details>
            </div>
          )}
          {messages.map((message, index) =>
            message.role === "user" ? (
              <div className="ngo-message chat-bubble" key={message.id}>
                <p className="message-author">You · Harbor Community Kitchen</p>
                {message.parts.flatMap((part) =>
                  part.type === "text"
                    ? part.text.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)
                    : [],
                )}
              </div>
            ) : (
              <AssistantMessage
                key={message.id}
                message={message}
                showQuestions={index < messages.length - 1 || !questionCardShown}
              />
            ),
          )}
          {declined ? (
            <div className="panel decline" data-testid="fit-decline-notice">
              <h2>This project needs a different kind of support.</h2>
              {state.declineDate && (
                <p className="small muted">
                  Decision recorded on {new Date(state.declineDate).toLocaleDateString()}.
                </p>
              )}
              <p>
                The proposed tool needs ongoing developer maintenance. This platform supports small
                tools your organisation can maintain.
              </p>
              <p>
                Consider starting with a simple scheduling tool and leaving live system integrations
                out of the first version.
              </p>
              <p data-testid="decline-oversight-notice">
                A person reads every one of these decisions — if we got this wrong, we'll reach out.
              </p>
            </div>
          ) : state.confirmation && !editing ? (
            <div className="panel ready-panel">
              <span className="success-symbol">
                <Check size={24} />
              </span>
              <h2>Discovery is finished.</h2>
              <p>
                Revision {state.confirmation.revision} is ready for volunteer matching. Submit it
                for review so ai4good can help find a volunteer.
              </p>
              <p className="small muted">
                {state.confirmation.actor} confirmed it on{" "}
                {new Date(state.confirmation.at).toLocaleString()}.
              </p>
              <Button
                testId="discovery-find-volunteer"
                variant="primary"
                onClick={() => navigate("publish")}
              >
                <Next>Find a volunteer</Next>
              </Button>
              <Button
                testId="confirmed-brief-review"
                variant="quiet"
                onClick={() => navigate("scope")}
              >
                View confirmed brief
              </Button>
            </div>
          ) : ready && !editing ? (
            <div className="panel ready-panel" data-testid="scope-ready-panel">
              <span className="success-symbol">
                <Check size={24} />
              </span>
              <h2>We have enough to finish Discovery.</h2>
              <p>
                All required topics are agreed. I have stopped asking questions. Press{" "}
                <strong>Finish Discovery</strong> at the top of this page to review your brief and
                confirm it.
              </p>
              <button
                type="button"
                className="text-button"
                data-testid="review-ready-brief"
                onClick={() => {
                  const panel = document.getElementById("discovery-progress-title");
                  panel?.scrollIntoView({ block: "center", behavior: "smooth" });
                  document.querySelector<HTMLButtonElement>('[data-testid="finish-discovery"]')?.focus({ preventScroll: true });
                }}
              >
                Take me to Finish Discovery ↑
              </button>
              <p className="small muted">Review and confirmation use no turns.</p>
            </div>
          ) : (
            <section
              className="chat-current"
              aria-label={editing ? "Revise your answer" : "Current questions"}
            >
              <div className="ai-message chat-question">
                <div className="ai-avatar">
                  <Sparkles size={17} />
                </div>
                <div className="chat-ai-content">
                  <p className="message-author">
                    {editing ? "Revise your answer · No turn used" : "ai4good AI"}
                  </p>
                  {batch && !editing
                    ? active.map((q) => (
                        <QuestionCard
                          key={q.id}
                          question={q}
                          disabled={busy}
                          needsReview={state.needsReview.includes(q.id)}
                          answer={editing ? editAnswer : state.drafts[q.id]}
                          onChange={(answer) => draftAnswer(q.id, answer)}
                        />
                      ))
                    : currentQuestion && (
                        <div data-testid="discovery-question" data-testkey={currentQuestion.id}>
                          <h3>{currentQuestion.text}</h3>
                          <p className="question-reason">{currentQuestion.reason}</p>
                          {state.answers[currentQuestion.id]?.certain === false && (
                            <p className="callout" data-testid="discovery-open-decision">
                              This topic is still open. Give an answer when you know, ask AI for
                              help, or return later. Sending the same uncertain answer again will
                              not move Discovery forward.
                            </p>
                          )}
                          {state.needsReview.includes(currentQuestion.id) && (
                            <p className="amber-text">Review again · an earlier answer changed.</p>
                          )}
                          <div className="chat-suggestions">
                            {currentQuestion.options.map((option) => (
                              <button
                                type="button"
                                key={option.id}
                                disabled={busy}
                                className="chat-suggestion"
                                data-testid="suggested-answer"
                                data-testkey={option.id}
                                aria-pressed={currentAnswer?.choice === option.id}
                                onClick={() => {
                                  setAsking(false);
                                  draftAnswer(currentQuestion.id, {
                                    choice: option.id,
                                    text: option.answer,
                                    certain: true,
                                  });
                                  composer.current?.focus();
                                }}
                              >
                                {option.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              disabled={busy}
                              className="chat-suggestion"
                              data-testid="uncertain-answer-choice"
                              data-testkey={currentQuestion.id}
                              aria-pressed={currentAnswer?.choice === "uncertain"}
                              onClick={() => {
                                setAsking(false);
                                draftAnswer(currentQuestion.id, {
                                  choice: "uncertain",
                                  text: "I'm not sure yet.",
                                  certain: false,
                                });
                              }}
                            >
                              I'm not sure
                            </button>
                          </div>
                        </div>
                      )}
                  {!editing && pending.length > 1 && (
                    <button
                      type="button"
                      className="text-button chat-batch"
                      disabled={busy}
                      aria-pressed={batch}
                      onClick={() => {
                        setBatch(!batch);
                        setAsking(false);
                      }}
                    >
                      {batch
                        ? "Discuss one question at a time"
                        : `Answer ${pending.length} independent questions together`}
                    </button>
                  )}
                </div>
              </div>
              <div className="chat-composer">
                <label className="field">
                  {asking ? "Ask ai4good AI" : "Your message to ai4good AI"}
                  <textarea
                    ref={composer}
                    data-testid="discovery-composer"
                    placeholder={
                      asking
                        ? "Ask about the current decision…"
                        : batch && !editing
                          ? "Add context to your answers…"
                          : "Write your answer in your own words…"
                    }
                    rows={3}
                    disabled={busy}
                    value={asking || (batch && !editing) ? state.note : (currentAnswer?.text ?? "")}
                    onChange={(event) => {
                      if (asking || (batch && !editing))
                        setState((current) => ({ ...current, note: event.target.value }));
                      else if (currentQuestion)
                        draftAnswer(currentQuestion.id, {
                          choice: "custom",
                          text: event.target.value,
                          certain: true,
                        });
                    }}
                  />
                </label>
                {!editing && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    aria-pressed={asking}
                    onClick={() => {
                      setAsking(!asking);
                      composer.current?.focus();
                    }}
                  >
                    <CircleHelp size={14} />
                    {asking ? "Back to my answer" : "Ask AI a question first"}
                  </button>
                )}
                {error && (
                  <p role="alert" className="callout warning" data-testid="reply-error">
                    {error}
                  </p>
                )}
                {busy && (
                  <div
                    className="callout"
                    role="status"
                    aria-live="polite"
                    data-testid="streaming-reply"
                  >
                    <strong>ai4good assistant</strong>
                    <p>{status === "submitted" ? "Reading your answers…" : "Replying…"}</p>
                    <p className="small muted">
                      One reply is in progress. Your answers stay saved.
                    </p>
                    <Button testId="stop-discovery-reply" variant="quiet" onClick={() => void stopReply()}>
                      <Square size={13} />
                      Stop
                    </Button>
                  </div>
                )}
                {!mode.canSend && !editing && (
                  <p className="callout warning" data-testid="free-capacity-exhausted">
                    Your draft is saved.{" "}
                    {mode.betaLeft > 0
                      ? "Today's free replies are used. Send it after the daily reset, or add project fuel in the Discovery usage card."
                      : "Your beta free replies are used. Add project fuel in the Discovery usage card to continue."}
                  </p>
                )}
                <div className="composer-footer">
                  <span className="small muted" aria-live="polite">
                    {busy
                      ? "The assistant is preparing a reply…"
                      : editing
                        ? "Changing an answer may reopen dependent questions."
                        : mode.free
                          ? "Next reply: free · 1 turn"
                          : !mode.canSend
                            ? "Next reply: not available now · your draft is saved"
                            : `Next reply: paid · actual usage in USD · ${usd(mode.available)} fuel left${
                              mode.band === "yellow"
                                ? " · getting low"
                                : mode.band === "red"
                                  ? " · nearly used"
                                  : ""
                            }. Up to $0.25 is set aside while it runs.`}
                  </span>
                  <div className="row">
                    {editing && (
                      <Button
                        testId="cancel-answer-edit"
                        variant="quiet"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      testId="send-discovery-round"
                      variant="primary"
                      disabled={!canAnswer || busy || (!editing && !mode.canSend)}
                      onClick={submit}
                    >
                      {busy
                        ? "Preparing reply…"
                        : editing
                          ? "Save change"
                          : error
                            ? "Retry reply"
                            : "Send message"}
                      <Send size={15} />
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </section>
        <aside className="discovery-aside">
          <section
            className="panel brief-panel"
            id="discovery-brief"
            tabIndex={-1}
            aria-labelledby="discovery-brief-title"
          >
            <div className="section-heading">
              <h2 id="discovery-brief-title">Your live brief</h2>
              <Badge>{state.confirmation ? "Confirmed" : `Revision ${state.revision}`}</Badge>
            </div>
            <p className="small muted">
              Each answer you give appears here. Use Edit to change one at any time, at no cost.
            </p>
            <div className="brief-fact">
              <span>THE NEED</span>
              <p>{state.intake.need}</p>
            </div>
            <dl className="brief-decisions" data-testid="discovery-brief-decisions">
              {all.map((q) => (
                <div key={q.id} data-testid="brief-decision" data-testkey={q.id}>
                  <dt>
                    {q.title}
                    {state.answers[q.id] && !busy && !declined && (
                      <button
                        className="brief-edit"
                        type="button"
                        data-testid="edit-brief-answer"
                        data-testkey={q.id}
                        aria-label={`Edit ${q.title.toLowerCase()}`}
                        onClick={() => edit(q.id)}
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    )}
                  </dt>
                  <dd className={!state.answers[q.id]?.certain ? "unresolved" : ""}>
                    {state.answers[q.id]?.certain
                      ? state.answers[q.id]?.text
                      : state.answers[q.id]
                        ? "Open question · not sure yet"
                        : state.needsReview.includes(q.id)
                          ? "Needs review · earlier answer changed"
                          : "To be discussed"}
                  </dd>
                </div>
              ))}
            </dl>
            <Button
              testId="review-draft-brief"
              className="full-width"
              onClick={() => navigate("scope")}
            >
              <FileText size={15} />
              Review draft brief
            </Button>
            <p className="small muted brief-footnote">
              {all.filter((q) => state.answers[q.id]?.certain).length} of {all.length} decisions
              confirmed
            </p>
          </section>
          {!state.confirmation && !declined && <FundingPanel state={state} navigate={navigate} />}
          <DiscoveryReferences state={state} setState={setState} notify={notify} />
        </aside>
      </div>
    </>
  );
}
