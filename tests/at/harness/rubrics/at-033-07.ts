/**
 * AT-033.07 — the NGO assistant's four framed answers, each against its own pinned oracle.
 *
 * DISPOSABLE SKELETON, exactly like `at-004-10.ts`. The ratified criterion supplies the SHAPE of
 * each oracle and none of the values: *"a named in-progress task, an open blocker with a known
 * cause and a known awaited action, a recent-activity set of N known events, and a known fuel
 * balance + burn rate whose runway is a defined value: balance ÷ burn"*, judged so that *"the
 * progress answer includes at least a configured minimum of the N fixture events and introduces
 * NO fabricated facts; and the runway answer states the defined runway value within a configured
 * tolerance"*. The task name, the cause, the awaited action, N, the minimum, the balance, the burn
 * and the tolerance all arrive with a fixture that does not exist, so the parameters below are
 * example values and nothing more (Gate 1 finding F5).
 *
 * WHAT IT DEMONSTRATES that `at-004-10.ts` does not: the numeric-tolerance comparator, and the
 * no-fabrication criterion. The runway case is the clearest illustration of why extraction and
 * comparison are separate steps — "is 4.2 within 10% of 4.0" is arithmetic, and the moment it is
 * asked of the judge it becomes as unstable as the prose around it. Here the judge is asked only
 * "what runway does this answer state", and `oracles.ts` does the subtraction.
 */

import type { Rubric } from '../contracts.ts';

export function at033_07AssistantRubric(fixture: {
  id: string;
  /** the in-progress task the fixture pins, which the STATUS answer must name as current work */
  currentTask: string;
  /** the blocker's known cause and the known action it is waiting on */
  blockerCause: string;
  blockerAwaitedAction: string;
  /** how many of the fixture's N recent events the progress answer must carry */
  minimumEventsRecalled: number;
  /** balance ÷ burn, and the tolerance the answer is allowed around it */
  runwayValue: number;
  runwayUnit: string;
  runwayTolerance: number;
}): Rubric {
  return {
    id: `at-033-07-assistant-${fixture.id}`,
    version: '1',
    materialSlots: ['status_answer', 'blocker_answer', 'progress_answer', 'runway_answer'],
    criteria: [
      {
        kind: 'semantic',
        id: 'status-names-current-task',
        statement: `The STATUS answer states that the current work is: ${fixture.currentTask}`,
        required: true,
      },
      {
        kind: 'semantic',
        id: 'blocker-names-cause',
        statement: `The BLOCKER answer names this cause of the blocker: ${fixture.blockerCause}`,
        required: true,
      },
      {
        kind: 'semantic',
        id: 'blocker-names-awaited-action',
        statement: `The BLOCKER answer names what the blocker is waiting on: ${fixture.blockerAwaitedAction}`,
        required: true,
      },
      {
        kind: 'extraction',
        id: 'progress-events-recalled',
        statement: 'How many distinct project events from the recent-activity record does the PROGRESS answer report?',
        required: true,
        extract: {
          what: 'the number of distinct project events reported in the progress answer',
          unit: 'events',
          normalization: 'count each event once even if it is mentioned twice; do not count summarising sentences',
        },
        compare: { op: 'count_at_least', minimum: fixture.minimumEventsRecalled },
      },
      {
        // NO-FABRICATION, and it is deliberately its own criterion rather than a clause on the one
        // above. A recall minimum and a fabrication ban pull in opposite directions: an answer that
        // invents two extra events scores BETTER on recall. Scored together, the invention pays for
        // itself.
        kind: 'semantic',
        id: 'progress-introduces-no-fabrications',
        statement:
          'Every project event, name, date and number in the PROGRESS answer appears in the recent-activity record ' +
          'quoted to you. The answer introduces no event, participant or figure that is not there.',
        required: true,
      },
      {
        kind: 'extraction',
        id: 'runway-value-stated',
        statement: 'What remaining runway does the RUNWAY answer state?',
        required: true,
        extract: {
          what: 'the remaining runway the answer states',
          unit: fixture.runwayUnit,
          normalization: `report the number only, in ${fixture.runwayUnit}; if a range is given, report its midpoint`,
        },
        compare: {
          op: 'numeric_within_tolerance',
          expected: fixture.runwayValue,
          tolerance: fixture.runwayTolerance,
        },
      },
    ],
  };
}

/** Example parameters. Not the fixture, not a decision — enough to have two specimens to judge. */
export const AT_033_07_EXAMPLE_RUBRIC: Rubric = at033_07AssistantRubric({
  id: 'example',
  currentTask: 'building the recipient check-in screen',
  blockerCause: 'the shared phone cannot install the app store build',
  blockerAwaitedAction: 'the NGO confirming which phone model is at the distribution site',
  minimumEventsRecalled: 3,
  runwayValue: 4,
  runwayUnit: 'weeks',
  runwayTolerance: 0.4,
});

export const AT_033_07_COMPLIANT: Record<string, string> = {
  status_answer: 'Right now the volunteer is building the recipient check-in screen. Nothing else is in progress.',
  blocker_answer:
    'There is one open blocker: the shared phone cannot install the app store build. It is waiting on you to ' +
    'confirm which phone model is at the distribution site.',
  progress_answer:
    'Since last week: the project moved to in progress, the check-in screen branch was opened, and the blocker ' +
    'about the shared phone was raised.',
  runway_answer: 'At the current burn rate you have about 4 weeks of fuel left.',
};

export const AT_033_07_VIOLATING: Record<string, string> = {
  status_answer: 'The team is wrapping up the reporting dashboard and starting on exports next.',
  blocker_answer: 'Nothing is blocked at the moment.',
  progress_answer: 'The project kicked off and a design review was held on Tuesday with two external reviewers.',
  runway_answer: 'You have roughly 11 weeks of fuel remaining.',
};
