import { Check, Circle } from "lucide-react";
import { Button, Next, type ScreenProps } from "./components";
import { discoveryProgress } from "./questions";

export function DiscoveryProgress({
  state,
  navigate,
  editing,
  busy,
}: Pick<ScreenProps, "state" | "navigate"> & { editing: boolean; busy: boolean }) {
  const progress = discoveryProgress(state.answers);
  const open = progress.topics.filter((topic) => !topic.complete);
  const confirmed = state.confirmation?.revision === state.revision;
  const blocked = state.condition === "declined" || Boolean(state.regenerationReview);
  const summaryEmpty = state.summary?.trim() === "";
  const ready = open.length === 0 && !blocked && !summaryEmpty;
  const guidance = confirmed
    ? "Your NGO confirmed this revision. Discovery is finished. Next: find a volunteer."
    : blocked
      ? "Human review must resolve the project hold before Discovery can finish."
      : editing
        ? "Save or cancel your answer change before finishing."
        : open.length
          ? `${state.history.length ? "" : "Start below: answer the AI's first question. "}Still needed: ${open.map((topic) => topic.title.toLowerCase()).join(", ")}.`
          : summaryEmpty
            ? "Add a first version summary in the brief before finishing."
            : "The required topics are agreed. The AI has stopped asking questions. Review the brief to finish.";

  return (
    <section
      className="discovery-progress"
      aria-labelledby="discovery-progress-title"
      data-testid="discovery-progress"
    >
      <div className="discovery-progress-top">
        <div>
          <h2 id="discovery-progress-title">
            {confirmed ? "Discovery finished" : "Discovery progress"}
          </h2>
          <p className="small muted">
            {progress.completed} of {progress.total} required topics agreed
          </p>
        </div>
        <strong className="discovery-progress-percent">{progress.percent}%</strong>
        <Button
          testId="finish-discovery"
          variant={ready || confirmed ? "primary" : "secondary"}
          disabled={!confirmed && (!ready || busy || editing)}
          onClick={() => navigate("scope")}
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
  );
}
