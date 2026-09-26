import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Leaf,
  Plus,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Empty,
  Next,
  PageTitle,
  Stages,
  phaseLabel,
  type ScreenProps,
} from "./components";
import { confirmBrief, funding, invalidateApproval, regenerateScope, usd } from "./model";
import { briefReady, questions, discoveryDataTier } from "./questions";
import { DiscoveryScope } from "./DiscoveryScope";

export function Dashboard({ state, navigate }: ScreenProps) {
  const submitted = state.phase === "under-review";
  const next = submitted
    ? "publish"
    : state.confirmation
      ? "publish"
      : state.phase === "intake"
        ? "intake"
        : "discovery";
  return (
    <>
      <PageTitle
        eyebrow="Harbor Community Kitchen"
        title="Good morning, Sam."
        action={
          <Button testId="dashboard-continue" variant="primary" onClick={() => navigate(next)}>
            <Next>{submitted ? "View review status" : "Continue your project"}</Next>
          </Button>
        }
      >
        Small tools. More time for the people you help.
      </PageTitle>
      <div className="summary-grid">
        <div className="summary-stat">
          <span>Your projects</span>
          <strong>1</strong>
          <small>
            {submitted ? "Waiting for a person to review" : "Taking shape, one step at a time"}
          </small>
        </div>
        <div className="summary-stat">
          <span>Needs your attention</span>
          <strong>{submitted ? "0" : "1"}</strong>
          <small>
            {submitted
              ? "You're up to date"
              : state.confirmation
                ? "Submit your confirmed scope"
                : "Continue shaping your first version"}
          </small>
        </div>
        <div className="summary-stat">
          <span>Project fuel available</span>
          <strong>{usd(funding(state).available + state.usage.nextGate)}</strong>
          <small>Free Discovery turns are used first</small>
        </div>
      </div>
      <div className="dashboard-grid">
        <section>
          <div className="section-heading">
            <h2>Your project</h2>
            <button
              className="text-button"
              data-testid="view-all-projects"
              onClick={() => navigate("projects")}
            >
              View all
              <ArrowRight size={14} />
            </button>
          </div>
          <article
            className="panel project-card"
            data-testid="project-card"
            data-testkey="volunteer-scheduling"
          >
            <div className="project-card-top">
              <span className="project-icon">
                <Leaf size={24} />
              </span>
              <Badge tone={submitted ? "amber" : "green"}>{phaseLabel[state.phase]}</Badge>
            </div>
            <h2>{state.intake.title || "Your new project"}</h2>
            <p>{state.intake.outcome || "Describe the change you want to make."}</p>
            <div className="project-meta">
              <span>
                <span className="status-dot" />
                Community support
              </span>
              <span>Harbor Community Kitchen</span>
            </div>
            <div className="project-next">
              <div>
                <span className="small muted">NEXT STEP</span>
                <h3>
                  {submitted
                    ? "A person reviews your scope"
                    : state.confirmation
                      ? "Send your scope for review"
                      : state.phase === "intake"
                        ? "Tell us about the need"
                        : "Shape the first version"}
                </h3>
                <p className="small muted">
                  {submitted
                    ? "Your project becomes public only after approval."
                    : "Your answers help define a useful, manageable tool."}
                </p>
              </div>
              <Button testId="continue-project-card" onClick={() => navigate(next)}>
                <Next>{submitted ? "View status" : "Continue"}</Next>
              </Button>
            </div>
          </article>
          <section className="panel quiet-panel">
            <div className="section-heading">
              <h2>A small first version goes a long way.</h2>
              <span className="line-art">
                <Leaf size={48} strokeWidth={1} />
              </span>
            </div>
            <p>
              Start with the process that takes the most time. A volunteer can help turn a clear,
              small scope into a tool your team owns.
            </p>
            <button
              className="text-button"
              data-testid="dashboard-review-intake"
              onClick={() => navigate("intake")}
            >
              Review your project need
              <ArrowRight size={14} />
            </button>
          </section>
        </section>
        <aside className="panel next-steps">
          <h2>What happens next</h2>
          <ol>
            {[
              { title: "Describe your need", body: "Tell us what your team does today." },
              { title: "Shape a clear scope", body: "Answer questions and confirm the brief." },
              { title: "Get a human review", body: "A person checks fit before publication." },
              { title: "Meet a volunteer", body: "We help coordinate a match for your project." },
            ].map((step, i) => (
              <li key={step.title}>
                <span
                  className={
                    i === 0 && state.phase !== "intake" ? "step-bullet complete" : "step-bullet"
                  }
                >
                  {i === 0 && state.phase !== "intake" ? <Check size={13} /> : i + 1}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="small muted footnote">
            <ShieldCheck size={18} />
            <p>
              You keep ownership of your tool. The code is public and open source. Delivery is not
              guaranteed.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

export function Projects({ state, navigate }: ScreenProps) {
  return (
    <>
      <PageTitle eyebrow="Your workspace" title="My projects">
        Every project, including completed and cancelled work, belongs here.
      </PageTitle>
      <div className="panel project-list" data-testid="project-list">
        <div
          className="project-row"
          data-testid="project-list-item"
          data-testkey="volunteer-scheduling"
        >
          <span className="project-icon">
            <Leaf size={22} />
          </span>
          <div className="grow">
            <h2>{state.intake.title || "Untitled project"}</h2>
            <p className="small muted">Harbor Community Kitchen · Private until approved</p>
          </div>
          <Badge tone="green">{phaseLabel[state.phase]}</Badge>
          <Button
            testId="open-project"
            onClick={() =>
              navigate(
                state.phase === "intake"
                  ? "intake"
                  : state.phase === "under-review"
                    ? "publish"
                    : "discovery",
              )
            }
          >
            <Next>Open project</Next>
          </Button>
        </div>
      </div>
      <p className="small muted">One sample project is available in this first design pass.</p>
    </>
  );
}

export function Intake({ state, setState, navigate, notify }: ScreenProps) {
  function field(name: keyof typeof state.intake, value: string) {
    setState((current) => ({
      ...invalidateApproval(current),
      phase: current.phase === "intake" ? "intake" : "discovery",
      intake: { ...current.intake, [name]: value },
      answers: {},
      drafts: {},
      summary: null,
    }));
  }
  return (
    <>
      <PageTitle eyebrow="Your project / Intake" title="What could work better?">
        Describe the need in your own words. You don't need a technical specification.
      </PageTitle>
      <Stages current={0} />
      <div className="form-grid">
        <form
          className="panel intake-form"
          onSubmit={(event) => {
            event.preventDefault();
            setState((current) => ({
              ...invalidateApproval(current),
              answers: {},
              drafts: {},
              history: [],
              summary: null,
            }));
            navigate("discovery");
            notify("Project need saved. Discovery is ready.");
          }}
        >
          <h2>Tell us about the work</h2>
          <label className="field">
            Project name
            <input
              data-testid="project-title"
              required
              maxLength={80}
              value={state.intake.title}
              onChange={(e) => field("title", e.target.value)}
            />
            <span className="field-help">A short name your team will recognise.</span>
          </label>
          <label className="field">
            What problem do you want to solve?
            <textarea
              data-testid="project-need"
              required
              minLength={20}
              rows={5}
              value={state.intake.need}
              onChange={(e) => field("need", e.target.value)}
            />
            <span className="field-help">
              How do you do this today? Where does it take too much time?
            </span>
          </label>
          <label className="field">
            Who will use the tool?
            <textarea
              data-testid="project-users"
              required
              rows={2}
              value={state.intake.users}
              onChange={(e) => field("users", e.target.value)}
            />
          </label>
          <label className="field">
            What would a useful first version change?
            <textarea
              data-testid="project-outcome"
              required
              rows={2}
              value={state.intake.outcome}
              onChange={(e) => field("outcome", e.target.value)}
            />
          </label>
          {state.history.length > 0 && (
            <p className="callout warning">
              Starting Discovery again replaces the sample conversation and reopens the brief.
              Previous usage stays recorded.
            </p>
          )}
          <div className="form-footer">
            <span className="small muted">Saved in this browser</span>
            <Button testId="start-discovery" variant="primary" type="submit">
              <Next>{state.history.length ? "Restart Discovery" : "Continue to Discovery"}</Next>
            </Button>
          </div>
        </form>
        <aside>
          <section className="panel">
            <h2>A useful starting point</h2>
            <p>
              A small internal tool, such as a scheduling tool, directory, or tracker, is a good
              place to start.
            </p>
            <p className="small muted">
              Leave payments, complex integrations, and sensitive beneficiary data out of your first
              scope.
            </p>
          </section>
          <section className="panel reference-panel">
            <h2>
              Reference files <span className="muted small">Optional</span>
            </h2>
            <p className="small muted">
              Share a blank form or a sample spreadsheet. Use fictional data in this mock.
            </p>
            <label className="upload-control">
              <Upload size={18} />
              Choose sample files
              <input
                data-testid="reference-file-upload"
                type="file"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []).map((file) => ({
                    name: file.name,
                    size: file.size,
                  }));
                  setState((current) => ({ ...current, files: [...current.files, ...files] }));
                  event.target.value = "";
                  notify("File names added to the fixture. File contents are not uploaded.");
                }}
              />
            </label>
            <ul className="file-list" data-testid="reference-files">
              {state.files.map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  <FileText size={15} />
                  <span className="grow">
                    {file.name}
                    <small>{Math.max(1, Math.round(file.size / 1024))} KB</small>
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    data-testid="remove-reference-file"
                    data-testkey={String(index)}
                    aria-label={`Remove ${file.name}`}
                    onClick={() =>
                      setState((current) => ({
                        ...current,
                        files: current.files.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="small muted">Attachments use no AI turns.</p>
          </section>
        </aside>
      </div>
    </>
  );
}

export function Scope({ state, setState, navigate, notify }: ScreenProps) {
  const [agreed, setAgreed] = useState(false);
  const [dataAgreed, setDataAgreed] = useState(false);
  const [rewriteReason, setRewriteReason] = useState("");
  useEffect(() => {
    setAgreed(false);
    setDataAgreed(false);
  }, [state.revision]);
  const tier = discoveryDataTier(state.answers);
  const all = questions(state.answers);
  const ready = briefReady(state.answers);
  const isConfirmed = state.confirmation?.revision === state.revision;
  return (
    <>
      <PageTitle
        eyebrow="Your project / Discovery · last step"
        title="Does this describe what you need?"
        action={
          <Badge tone={isConfirmed ? "green" : "neutral"}>
            {isConfirmed ? "Confirmed by you" : `Draft · revision ${state.revision}`}
          </Badge>
        }
      >
        Review the decisions, then confirm this version to finish Discovery. This uses no AI turns.
      </PageTitle>
      <Stages current={isConfirmed ? 2 : 1} />
      <div className="form-grid">
        <div className="panel scope-document" data-testid="scope-document">
          <p className="eyebrow">Harbor Community Kitchen</p>
          <h2>{state.intake.title || "Your project"}</h2>
          <div className="scope-section">
            <h3>The need</h3>
            <p>{state.intake.need}</p>
          </div>
          <div className="scope-section">
            <h3>Who it helps</h3>
            <p>{state.intake.users}</p>
          </div>
          <div className="scope-section">
            <h3>Your decisions</h3>
            <dl className="scope-decisions">
              {all.map((q) => (
                <div key={q.id}>
                  <dt>{q.title}</dt>
                  <dd>
                    {state.answers[q.id]?.certain ? (
                      state.answers[q.id]?.text
                    ) : (
                      <span className="amber-text">Still an open question</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="scope-section">
            <label className="field">
              First version summary
              <textarea
                data-testid="scope-summary"
                rows={4}
                readOnly={state.phase === "under-review"}
                value={
                  state.summary ??
                  `A small scheduling tool for ${state.intake.users.toLowerCase()} ${state.intake.outcome}`
                }
                onChange={(event) =>
                  setState((current) => ({
                    ...invalidateApproval(current),
                    summary: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="scope-section">
            <h3>Outside the first version</h3>
            <ul className="plain-list">
              <li>Payroll and payment collection</li>
              <li>Live integrations with other systems</li>
              <li>Using real sensitive records during build</li>
            </ul>
          </div>
          <DiscoveryScope state={state} setState={setState} />
          <section className="scope-section">
            <details>
              <summary>The draft needs a rewrite</summary>
              <p>
                Tell us what the draft gets wrong. Up to three rewrites use no turns or paid fuel.
              </p>
              {state.regenerationReview ? (
                <p className="callout warning" role="status">
                  Human review requested. Your reason and conversation stay with the project. The
                  sample request sends no notification.
                </p>
              ) : (
                <>
                  <label className="field">
                    What needs to change?
                    <textarea
                      data-testid="scope-rewrite-reason"
                      rows={2}
                      value={rewriteReason}
                      onChange={(event) => setRewriteReason(event.target.value)}
                    />
                  </label>
                  <p className="small muted">
                    {Math.max(0, 3 - state.regenerations.length)} of 3 free rewrites remaining.
                  </p>
                  <Button
                    testId="regenerate-scope"
                    disabled={
                      !rewriteReason.trim() ||
                      !ready ||
                      state.condition === "declined" ||
                      state.phase === "under-review"
                    }
                    onClick={() => {
                      setState((current) => regenerateScope(current, rewriteReason));
                      setRewriteReason("");
                      notify(
                        state.regenerations.length < 3
                          ? "Draft rewritten. Reason recorded. No turn or fuel used."
                          : "Sample review request recorded. No real notification was sent.",
                      );
                    }}
                  >
                    {state.regenerations.length < 3
                      ? "Rewrite this draft · free"
                      : "Request human review"}
                  </Button>
                </>
              )}
              {state.regenerations.length > 0 && (
                <ul className="plain-list">
                  {state.regenerations.map((entry) => (
                    <li key={entry.revision}>
                      Revision {entry.revision}: {entry.reason}
                    </li>
                  ))}
                </ul>
              )}
            </details>
          </section>
        </div>
        {!isConfirmed && (
          <div className="scope-jump">
            <Button
              testId="jump-to-confirmation"
              variant="primary"
              className="full-width"
              onClick={() => {
                const panel = document.getElementById("confirm-discovery");
                panel?.scrollIntoView({ block: "start", behavior: "smooth" });
                panel?.focus({ preventScroll: true });
              }}
            >
              <Next>Ready? Go to Finish Discovery</Next>
            </Button>
          </div>
        )}
        <aside className="confirmation-aside">
          <section className="panel confirmation-panel" id="confirm-discovery" tabIndex={-1}>
            {isConfirmed && (
              <span className="project-icon">
                <CheckCircle2 size={24} />
              </span>
            )}
            <h2>{isConfirmed ? "Discovery is finished" : "Finish Discovery"}</h2>
            {isConfirmed ? (
              <>
                <p data-testid="brief-confirmation">
                  {state.confirmation?.actor} confirmed revision {state.confirmation?.revision}.
                </p>
                <p className="small muted">
                  {state.confirmation && new Date(state.confirmation.at).toLocaleString()}
                </p>
                <p>
                  Next: find a volunteer. Submit your project for review. After approval, ai4good
                  coordinates a match. PRD work follows volunteer consent and funding.
                </p>
                <p className="small muted" data-testid="fuel-transfer-receipt">
                  {usd(state.usage.nextGate)} of available fuel is set aside for the next stage.
                  Free turns are not money.
                </p>
                <Button
                  testId="continue-to-publish"
                  variant="primary"
                  className="full-width"
                  onClick={() => navigate("publish")}
                >
                  <Next>Find a volunteer</Next>
                </Button>
              </>
            ) : (
              <>
                <p>You decide whether this is the right first version for your organisation.</p>
                {!ready && (
                  <p className="callout warning" data-testid="brief-open-questions">
                    Answer the open Discovery questions before confirming.
                  </p>
                )}
                <label className="checkbox-field">
                  <input
                    data-testid="brief-acknowledgment"
                    type="checkbox"
                    checked={agreed}
                    disabled={!ready}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span>
                    I have reviewed revision {state.revision}. It describes the first version we
                    need.
                  </span>
                </label>
                {tier > 0 && (
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      data-testid="data-responsibility-acknowledgment"
                      disabled={!ready}
                      checked={dataAgreed}
                      onChange={(event) => setDataAgreed(event.target.checked)}
                    />
                    <span>
                      {tier === 2
                        ? "I will use fictional or anonymized records during build. Our NGO connects real data after handoff."
                        : "Our NGO takes responsibility for data access and keeps only the personal information this tool needs."}
                    </span>
                  </label>
                )}
                {tier > 0 && (
                  <p className="small muted checkbox-help" data-testid="data-responsibility-help">
                    {tier === 2
                      ? "In practice: the volunteer builds and tests with made-up records. Your team adds the real records after handoff."
                      : "In practice: your NGO decides who can see volunteer details, and the tool stores only what “Information handled” lists."}
                  </p>
                )}
                <Button
                  testId="confirm-brief"
                  variant="primary"
                  className="full-width"
                  disabled={
                    !ready ||
                    !agreed ||
                    Boolean(state.regenerationReview) ||
                    (tier > 0 && !dataAgreed) ||
                    state.summary?.trim() === "" ||
                    state.condition === "declined"
                  }
                  onClick={() => {
                    setState(confirmBrief);
                    notify(
                      "Discovery finished. Your approved brief is saved. Next: submit your project for volunteer matching.",
                    );
                  }}
                >
                  Confirm and finish Discovery
                  <Check size={15} />
                </Button>
              </>
            )}
            <Button
              testId="return-to-discovery"
              className="full-width"
              variant="quiet"
              onClick={() => navigate("discovery")}
            >
              Back to Discovery
            </Button>
          </section>
          <p className="small muted aside-note">
            Confirmation records your approval of this scope. It does not promise delivery or a
            price.
          </p>
        </aside>
      </div>
    </>
  );
}

export function Publish({ state, setState, navigate, notify }: ScreenProps) {
  const [agreed, setAgreed] = useState(false);
  const submitted = state.phase === "under-review";
  return (
    <>
      <PageTitle
        eyebrow="Your project / Volunteer match"
        title={submitted ? "Your project is with our review team." : "Find a volunteer"}
      >
        {submitted
          ? "A person reviews your project before it becomes public. After approval, ai4good coordinates a volunteer match."
          : "Submit your approved scope for review. After approval, ai4good helps find a volunteer. PRD work follows volunteer consent and funding."}
      </PageTitle>
      <Stages current={state.confirmation ? 2 : 1} />
      <div className="review-layout">
        <section className="panel publish-card">
          <span className="large-status">
            {submitted ? <Clock3 size={30} /> : <ShieldCheck size={30} />}
          </span>
          <Badge tone={submitted ? "amber" : "green"}>
            {submitted
              ? "Under review"
              : state.confirmation
                ? "Scope confirmed"
                : "Scope not confirmed"}
          </Badge>
          <h2>{state.intake.title || "Your project"}</h2>
          <p>{state.intake.outcome}</p>
          <div className="publish-checks">
            <p>
              <Check size={16} />
              Your organisation keeps ownership of the tool.
            </p>
            <p>
              <Check size={16} />
              The project code will be public under the MIT licence.
            </p>
            <p>
              <Check size={16} />A person checks fit before volunteers see the project.
            </p>
          </div>
          {submitted ? (
            <div className="callout" data-testid="publish-status">
              <strong>Waiting for review</strong>
              <p>
                No further action is needed now. A reviewer can approve the project, request
                changes, or decline it with a reason.
              </p>
              <p>
                After approval, we coordinate the volunteer match. The volunteer accepts the
                project, then your NGO funds kickoff before PRD work starts.
              </p>
              <p className="small muted">
                Fixture submission only. No review request or notification was sent.
              </p>
            </div>
          ) : (
            <>
              {!state.confirmation && (
                <p className="callout warning">
                  Confirm your Discovery brief before submitting this project.
                </p>
              )}
              <label className="checkbox-field">
                <input
                  data-testid="publish-acknowledgment"
                  type="checkbox"
                  checked={agreed}
                  disabled={!state.confirmation}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>
                  I understand that the code will be public and that delivery is not guaranteed.
                </span>
              </label>
              <Button
                testId="submit-for-review"
                variant="primary"
                disabled={!state.confirmation || !agreed}
                onClick={() => {
                  setState((current) => ({ ...current, phase: "under-review" }));
                  notify("The sample project is now under review.");
                }}
              >
                <Next>Send for review</Next>
              </Button>
            </>
          )}
          <Button testId="publish-view-scope" variant="quiet" onClick={() => navigate("scope")}>
            View your scope
          </Button>
        </section>
      </div>
    </>
  );
}

export function Funding({ state, setState, navigate, notify }: ScreenProps) {
  const [amount, setAmount] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [receipt, setReceipt] = useState<number | null>(null);
  return (
    <>
      <PageTitle eyebrow="Your project / Fuel" title="Fuel for your project">
        Free Discovery turns are always used first. Paid fuel covers actual AI usage after that.
      </PageTitle>
      <div className="form-grid">
        <form
          className="panel fuel-form"
          onSubmit={(event) => {
            event.preventDefault();
            const value = Number(amount);
            if (!Number.isFinite(value) || value < 50 || !agreed) return;
            const micros = Math.round(value * 1_000_000);
            setState((current) => ({
              ...current,
              usage: current.confirmation
                ? { ...current.usage, nextGate: current.usage.nextGate + micros }
                : { ...current.usage, allocation: current.usage.allocation + micros },
              purchases: [
                ...current.purchases,
                { id: current.purchases.length + 1, amount: micros },
              ],
            }));
            setReceipt(micros);
            setAmount("");
            setAgreed(false);
            notify("Sample fuel added. No payment was taken.");
          }}
        >
          <Badge>Simulated checkout</Badge>
          <h2>Add project fuel</h2>
          <p>
            Start small. Fuel can be fully spent without a finished tool. Unused project fuel stays
            in the platform as credit.
          </p>
          <label className="field">
            Amount in USD
            <div className="amount-field">
              <span>$</span>
              <input
                data-testid="fuel-amount"
                type="number"
                inputMode="decimal"
                min="50"
                max="1000"
                step="0.01"
                required
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <span className="field-help">
              $50 minimum. This mock supports purchases up to $1,000.
            </span>
          </label>
          <label className="checkbox-field">
            <input
              data-testid="fuel-acknowledgment"
              type="checkbox"
              required
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              I understand that fuel is not refundable as cash and does not guarantee delivery.
            </span>
          </label>
          <Button
            testId="confirm-demo-top-up"
            variant="primary"
            type="submit"
            disabled={!agreed || Number(amount) < 50}
          >
            <Plus size={16} />
            Add sample fuel
          </Button>
          <p className="small muted">
            This checkout uses fixtures. It takes no payment and asks for no card details.
          </p>
          {receipt !== null && (
            <div className="callout success" role="status" data-testid="fuel-purchase-receipt">
              <strong>{usd(receipt)} added to the sample balance.</strong>
              <p>Daily and beta free turns stay unchanged.</p>
            </div>
          )}
          <Button
            testId="fuel-return-to-project"
            variant="quiet"
            onClick={() => navigate(state.confirmation ? "scope" : "discovery")}
          >
            <Next>Return to your project</Next>
          </Button>
        </form>
        <aside className="panel fuel-overview">
          <h2>Current project fuel</h2>
          <p className="large-balance">{usd(funding(state).available + state.usage.nextGate)}</p>
          <dl className="balance-list">
            <div>
              <dt>Available in Discovery</dt>
              <dd>{usd(funding(state).available)}</dd>
            </div>
            <div>
              <dt>Next stage</dt>
              <dd>{usd(state.usage.nextGate)}</dd>
            </div>
            <div>
              <dt>Usage pending</dt>
              <dd>{usd(state.usage.reserved)}</dd>
            </div>
          </dl>
          <hr />
          <h3>Recent sample purchases</h3>
          {state.purchases.length ? (
            <ul className="purchase-list">
              {state.purchases.map((p) => (
                <li key={p.id}>
                  <span>Sample top-up {p.id}</span>
                  <strong>{usd(p.amount)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No purchases yet">The initial $10 is a remaining sample balance.</Empty>
          )}
        </aside>
      </div>
    </>
  );
}
