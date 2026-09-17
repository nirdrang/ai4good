import { expect, it } from 'vitest';
import { GRANT_TRACKER_ELICITATION } from '../suites/req-004/fixtures/grant-tracker.ts';
import { grantTrackerOracleProblems } from '../suites/req-004/fixtures/grant-tracker.oracle.ts';

it('accepts the grounded grant tracker record', () => {
  expect(grantTrackerOracleProblems(GRANT_TRACKER_ELICITATION)).toEqual([]);
});
it('rejects a missing fact even when its story remains', () => {
  const record = structuredClone(GRANT_TRACKER_ELICITATION);
  record.facts.splice(1, 1);
  expect(grantTrackerOracleProblems(record)).toContain('missing fact: two staff');
});
it('rejects an invented feature even inside a deadline story', () => {
  const record = structuredClone(GRANT_TRACKER_ELICITATION);
  record.userStories[0].story += ' and run payroll';
  expect(grantTrackerOracleProblems(record).some((problem) => problem.startsWith('story exceeds intake:'))).toBe(true);
});
it('rejects a reminder criterion that reverses the agreed timing', () => {
  const record = structuredClone(GRANT_TRACKER_ELICITATION);
  record.userStories[3].acceptanceCriteria[0] = 'An email reminder reaches both staff seven days after the reporting deadline.';
  expect(grantTrackerOracleProblems(record).some((problem) => problem.startsWith('story contradicts intake:'))).toBe(true);
});
