import { Button, type ScreenProps } from "./components";
import { invalidateApproval } from "./model";
import { discoveryDataTier } from "./questions";

export function DiscoveryScope({ state, setState }: Pick<ScreenProps, "state" | "setState">) {
  const data = state.answers.data;
  const tier = discoveryDataTier(state.answers);
  const labels = ["Community food support", "Volunteering"];
  const stories = [
    {
      title: "Plan and fill volunteer shifts",
      story:
        "As an NGO coordinator, I want a clear schedule so each site has the volunteers it needs.",
      criteria: [
        state.answers.booking?.text ?? "Confirm who books each shift.",
        state.answers.rules?.text ?? "Confirm access and booking rules.",
        "Show each shift's site, time, capacity, and unfilled places.",
      ],
    },
    {
      title: "Measure the first version's effect",
      story:
        "As an NGO coordinator, I want to see our agreed measure so I can check whether the tool helps.",
      criteria: [
        state.answers.measure?.text ?? "Confirm the success measure.",
        "Show the agreed measure for the first month.",
      ],
    },
    {
      title: "Maintain the tool after handoff",
      story:
        "As the NGO maintenance owner, I want to manage routine changes so the tool stays useful after handoff.",
      criteria: [
        state.answers.owner?.text ?? "Confirm the maintenance owner.",
        "The NGO can update routine settings through its Lovable workspace.",
        "The handoff includes access instructions and a short operating guide.",
      ],
    },
  ];
  if (state.answers.training?.certain) stories[0].criteria.push(state.answers.training.text);

  return (
    <>
      <section className="scope-section" data-testid="scope-stories">
        <h3>What the first version must do</h3>
        {stories.map((story) => (
          <div key={story.title}>
            <h4>{story.title}</h4>
            <p>{story.story}</p>
            <ul className="plain-list">
              {story.criteria.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <section className="scope-section" data-testid="scope-data-tier">
        <h3>Data and responsibilities</h3>
        <p>
          {data?.certain
            ? data.text
            : "The data question is still open. Treat unknown data as sensitive until review."}
        </p>
        <p>
          <strong>Data tier {tier}:</strong>{" "}
          {tier === 0
            ? "No personal information in the agreed scope."
            : tier === 1
              ? "Ordinary personal information. Keep only the names and contact details the tool needs."
              : "Sensitive or unclassified information. Use fictional or anonymized records during build."}
        </p>
        {tier === 2 && (
          <p className="callout warning">
            The NGO connects real sensitive data after handoff. Do not share it with the AI,
            Lovable, or the developer. Sensitive data alone does not cause a decline.
          </p>
        )}
        <p className="small muted">
          The NGO controls data access and confirms its responsibilities. A person verifies the data
          tier during project review.
        </p>
      </section>
      <section className="scope-section" data-testid="scope-maintainability">
        <h3>Can your team maintain it?</h3>
        <p>
          <strong>Proposed fit: yes.</strong> The first version is a small internal scheduling tool.
          Your named owner maintains routine changes in Lovable.
        </p>
        <p>
          Confirm this scope with your maintenance owner. Ongoing custom integrations need a new fit
          review.
        </p>
      </section>
      <section className="scope-section" data-testid="scope-risk-flags">
        <h3>Risks to check</h3>
        <ul className="plain-list">
          <li>Access must follow your agreed booking rules.</li>
          <li>Keep an alternative schedule during the first month.</li>
          <li>
            {tier === 2
              ? "Only fictional or anonymized records can enter the build workspace."
              : "Use only the minimum volunteer information needed."}
          </li>
        </ul>
        <p>
          <strong>Complexity: small.</strong> This sample covers one scheduling workflow and
          excludes external integrations. This is a size assessment, not a price.
        </p>
      </section>
      <details className="scope-section" data-testid="scope-technical-approach">
        <summary>Suggested build approach</summary>
        <p>
          <strong>Suggested stack:</strong> React, TypeScript, Tailwind, and Supabase. The interface
          uses edge functions for data access.
        </p>
        <p>
          <strong>Lovable recommendation:</strong> use Lovable as the long-term home so NGO staff
          can make routine changes by chat.
        </p>
        <ul className="plain-list">
          <li>
            <strong>Lovable:</strong> scheduling screens, forms, and routine interface changes.
          </li>
          <li>
            <strong>Claude Code:</strong> access rules, edge functions, checks, and the handoff
            guide.
          </li>
        </ul>
        <p className="small muted">
          The NGO pays any Lovable subscription directly. It is separate from project fuel. The
          developer writes the PRD from this confirmed scope.
        </p>
      </details>
      <section className="scope-section" data-testid="scope-cause-labels">
        <h3>Suggested cause labels</h3>
        <p className="small muted">
          These sample labels come from the NGO mission and Discovery. Remove a label if it does not
          fit.
        </p>
        <div className="row wrap">
          {labels
            .filter((label) => !state.removedLabels.includes(label))
            .map((label) => (
              <Button
                key={label}
                testId="remove-cause-label"
                aria-label={`Remove ${label}`}
                disabled={state.phase === "under-review"}
                onClick={() =>
                  setState((current) => ({
                    ...invalidateApproval(current),
                    removedLabels: [...current.removedLabels, label],
                  }))
                }
              >
                {label} ×
              </Button>
            ))}
        </div>
        {state.removedLabels.length === labels.length && (
          <p className="small muted">No cause labels. Labels are optional.</p>
        )}
      </section>
    </>
  );
}
