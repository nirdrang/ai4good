import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Circle } from "lucide-react";
import { Button, Next, type ScreenProps } from "./components";
import { discoveryProgress } from "./questions";

export function DiscoveryProgress({
  state,
  onReview,
  editing,
  busy,
  highlight,
}: Pick<ScreenProps, "state"> & { onReview: () => void; editing: boolean; busy: boolean; highlight?: ReactNode }) {
  const progress = discoveryProgress(state.answers);
  const open = progress.topics.filter((topic) => !topic.complete);
  const confirmed = state.confirmation?.revision === state.revision;
  const blocked = state.condition === "declined" || Boolean(state.regenerationReview);
  const summaryEmpty = state.summary?.trim() === "";
  const guidance = confirmed
    ? `Your NGO confirmed this revision${state.confirmation?.openQuestions.length ? " with open questions" : ""}. Discovery is finished. Next: find a volunteer.`
    : blocked
      ? "Human review must resolve the project hold before Discovery can finish."
      : editing
        ? "Save or cancel your answer change before reviewing the brief."
        : busy
          ? "The AI is replying. Stop the reply or wait before reviewing the brief."
          : open.length
          ? `Still open: ${open.map((topic) => topic.title.toLowerCase()).join(", ")}. You can review and finish with these questions open.`
          : summaryEmpty
            ? "The first version summary is empty. You can review and finish with this gap recorded."
            : "The required topics are agreed. The AI has stopped asking questions. Review the brief to finish.";

  const panel = useRef<HTMLElement>(null);
  const [scrolledPast, setScrolledPast] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < 0),
    );
    if (panel.current) observer.observe(panel.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
    <section
      ref={panel}
      className="discovery-progress"
      aria-labelledby="discovery-progress-title"
      data-testid="discovery-progress"
      data-scenario-highlight={highlight ? true : undefined}
    >
      {highlight}
      <div className="discovery-progress-top">
        <div>
          <h2 id="discovery-progress-title">
            {confirmed ? "Discovery finished" : "Discovery progress"}
          </h2>
          <p className="small muted">
            {progress.completed} of {progress.total} Discovery topics agreed
          </p>
        </div>
        <strong className="discovery-progress-percent">{progress.percent}%</strong>
        <Button
          testId="finish-discovery"
          variant="primary"
          onClick={onReview}
        >
          <Next>{confirmed ? "View approved brief" : "Finish Discovery"}</Next>
        </Button>
      </div>
      <div
        className="discovery-progress-track"
        role="progressbar"
        aria-label="Discovery topics agreed"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <p
        className="discovery-progress-guidance"
        aria-live="polite"
        data-testid="discovery-next-step"
      >
        {guidance}
      </p>
      <details className="discovery-progress-details">
        <summary>
          {open.length ? "View checklist" : "View completed checklist"}
        </summary>
        <ul>
          {progress.topics.map((topic) => (
            <li key={topic.id}>
              {topic.complete ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                <Circle size={15} aria-hidden="true" />
              )}
              <div>
                {topic.title}
                <span>
                  {topic.complete ? "Agreed" : "Still needed"}
                  {topic.detail && ` · ${topic.detail}`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </details>
      {!confirmed && (
        <p className="small muted discovery-finish-note">
          Progress counts agreed topics. Only your confirmation finishes Discovery. Reviewing and
          finishing use no AI turns.
        </p>
      )}
    </section>
    <div className="progress-float-anchor">
      {scrolledPast && (
        <div className="progress-float" data-testid="discovery-progress-compact">
          <span>
            <strong>{progress.percent}%</strong> · {progress.completed} of {progress.total} topics
            agreed
          </span>
          <Button
            testId="finish-discovery-compact"
            variant="primary"
            onClick={onReview}
          >
            <Next>{confirmed ? "View approved brief" : "Finish Discovery"}</Next>
          </Button>
        </div>
      )}
    </div>
    </>
  );
}
