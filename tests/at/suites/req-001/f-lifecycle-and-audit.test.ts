/**
 * AT-REQ-001 sections G and H — the lifecycle gate on every write, the single-dev invariant, the
 * append-only audit, and sign-in rate limiting.
 *
 * ONE OF THIS FILE'S IDS IS NOW WRITTEN — AT-001.32, the single-developer invariant, which belongs
 * to the single-seat item rather than to the lifecycle ones around it. It stays at this call site
 * because an id is registered once and moving it would be churn for no gain; what it needs is
 * `public.projects` and its guard trigger, which that item lands.
 *
 * THE LIFECYCLE IDS ARE STILL DECLARED. `public.accounts` carries no lifecycle column at all: an
 * account is created by a completed signup and that is the whole of its state. Adding a deactivation
 * flag now, with no gate that reads it and no route registered through one, would be a column that
 * looks like the requirement and enforces nothing.
 */

import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import { at00132, INTEGRATION_TIMEOUT_MS } from './_integration.ts';
import { LEAF, notLanded } from './_pending.ts';

/** The version string of the ToS + Platform Promise text this file's one written body accepts. */
const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
/** The address the acknowledgment records — every completion here carries one. */
const CLIENT_IP = '203.0.113.7';
/** The password every email/password registration in this file uses. */
const PASSWORD = 'correct horse battery staple';

atTest('AT-001.29', 'every enumerated write is rejected for a deactivated account while an active control succeeds', notLanded(LEAF.D6_L2));

atTest('AT-001.30', 'an AUP-deactivated volunteer is refused writes immediately and the project keys are revoked', notLanded(LEAF.D6_L2));

atTest('AT-001.31', 're-enabling an account restores otherwise-authorized writes while independent gates stay enforced', notLanded(LEAF.D6_L2));

atTest(
  'AT-001.32',
  'attaching a second volunteer to a project is rejected — single-dev projects',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();

      // THE GIVEN IS OPERATOR-PROVISIONED, AND THAT IS STATED RATHER THAN HIDDEN. No product path
      // creates a project or attaches a volunteer in this tree, at either tier; building one to
      // reach this criterion's Given would be landing another requirement's surface early. What is
      // under test is the REFUSAL of the second attach.
      const ngo = await sut.registerWithEmailPassword(w.email('project-owner-32'), PASSWORD);
      const ngoCompletion = await sut.completeSignup(
        ngo,
        { accountType: 'ngo', organizationName: 'Riverside Shelter 32', acknowledgmentTextVersion: TEXT_VERSION },
        CLIENT_IP,
      );
      expect(ngoCompletion, 'the NGO could not complete signup, so there is no organisation to hold a project').toMatchObject({ ok: true });
      if (!ngoCompletion.ok || ngoCompletion.organizationId === null) return;

      const first = await sut.registerWithEmailPassword(w.email('first-volunteer-32'), PASSWORD);
      await sut.linkGithubIdentity(first, 'first-volunteer-32-handle');
      const firstCompletion = await sut.completeSignup(
        first,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION },
        CLIENT_IP,
      );
      expect(firstCompletion, 'the first volunteer could not complete signup').toMatchObject({ ok: true });
      if (!firstCompletion.ok) return;

      const second = await sut.registerWithEmailPassword(w.email('second-volunteer-32'), PASSWORD);
      await sut.linkGithubIdentity(second, 'second-volunteer-32-handle');
      const secondCompletion = await sut.completeSignup(
        second,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION },
        CLIENT_IP,
      );
      expect(secondCompletion, 'the second volunteer could not complete signup').toMatchObject({ ok: true });
      if (!secondCompletion.ok) return;

      // A project with an assigned volunteer — the criterion's Given, in two steps so that the
      // freshly created project is seen with its seat FREE. One nullable field holds the developer,
      // so there is no collaborator seat for a second one to occupy.
      const project = await sut.createProjectAsOperator(ngoCompletion.organizationId, 'Riverside Shelter Website 32');
      expect(project.assignedVolunteerId, 'a freshly created project already carries a developer').toBeNull();
      const assigned = await sut.assignVolunteerAsOperator(project.id, firstCompletion.accountId);
      expect(assigned, 'the first volunteer could not be attached, so this criterion has no Given').toMatchObject({ ok: true });
      expect(await sut.projectAssignment(project.id), 'the seat does not hold the first volunteer').toMatchObject({
        assignedVolunteerId: firstCompletion.accountId,
      });

      // THE ACT UNDER TEST.
      const secondAttach = await sut.assignVolunteerAsOperator(project.id, secondCompletion.accountId);
      expect(secondAttach.ok, 'a second volunteer was attached to a project that already has one').toBe(false);
      if (secondAttach.ok) return;
      expect(secondAttach.kind, 'the second attach was refused for a reason other than the seat being taken').toBe('seat-occupied');

      // AND IT WROTE NOTHING: the seat still holds the FIRST volunteer.
      expect(await sut.projectAssignment(project.id), 'the refused attach changed the project seat').toMatchObject({
        id: project.id,
        assignedVolunteerId: firstCompletion.accountId,
      });

      // THE CONTROL — the same call with the SAME volunteer is not refused, so the guard is about a
      // second developer rather than about writing to the column at all.
      const again = await sut.assignVolunteerAsOperator(project.id, firstCompletion.accountId);
      expect(
        again,
        'attaching the volunteer that already holds the seat was refused, so the refusal above is not about a SECOND one',
      ).toMatchObject({ ok: true });
      expect(await sut.projectAssignment(project.id)).toMatchObject({ assignedVolunteerId: firstCompletion.accountId });
    },
    integration: at00132,
  },
);

atTest('AT-001.33', 'role changes and contact transfer leave an append-only audit record that cannot be altered', notLanded(LEAF.D6_L3));

atTest('AT-001.34', 'sign-in attempts past the configured rate limit are throttled while legitimate use continues', notLanded(LEAF.D6_L3));
