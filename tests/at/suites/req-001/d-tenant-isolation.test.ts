/**
 * AT-REQ-001 section E — tenant isolation and visibility.
 *
 * ALL FIVE OF THIS FILE'S IDS ARE NOW WRITTEN, and they arrive in two leaves rather than one.
 * `loop/decomp/req-001.md` D5.L1 lands the two DENIALS — AT-001.21, one organisation cannot reach
 * another's data, and AT-001.22, a volunteer who is not assigned to a project cannot reach that
 * project's. D5.L2 lands the three GRANTS beside them — AT-001.23, the assigned volunteer reaches its
 * own project and nothing else; AT-001.40, the platform administrator reaches every account; and
 * AT-001.24, what a caller with no session may and may not reach.
 *
 * THE TWO LEAVES ARE ONE RULE SEEN FROM BOTH SIDES, which is why the five sit in one file. A denial
 * body alone measures a surface that might be shut, and a grant body alone measures a surface that
 * might be open; each of these bodies carries the other half as a control, and the second leaf
 * re-runs the first leaf's two ids so a policy branch that broke a denial fails here.
 *
 * (This header used to describe the tree as the first accounts leaf left it: row-level security on
 * every table with ZERO policies, which denies everybody. That was the safe default and never the
 * requirement. It stopped being true on 2026-08-12, when this leaf's migration landed the first
 * policy set, so the paragraph is rewritten rather than kept as a statement that now reads wrong.)
 *
 * WHAT A GREEN HERE CLAIMS, said before the bodies rather than after. It claims READ isolation and
 * READ visibility over every kind of tenant data this tree HOLDS — an organisation, its seat, its
 * projects and its acknowledgments — through BOTH paths the criteria name: the edge surface a user
 * interface must use, and direct identifier probing at the Data API with the caller's own access
 * token. It claims that a denial and an absence are the SAME answer, that the right tenant, the
 * assigned developer and the platform administrator each read what is theirs, and that a caller with
 * no live session reads none of it.
 *
 * WHAT IT DOES NOT CLAIM. Any browser route: no screen exists, and `src/` is another territory that
 * CI forbids this pull request to touch. The `ui` surface tag is what enrols an id in a wiring leaf's
 * `--wired` re-run for the day the screens land (gate-1 ruling 1). It claims nothing about drafts, a
 * ledger, files or a thread — no such table exists anywhere in this tree — and nothing about timing
 * side channels.
 *
 * AND AT-001.24 IS NOT GREEN AT THE INTEGRATION TIER, which is the line gate-1 ruling 1 drew and the
 * reason it is worth reading the two tags differently. AT-001.21 and AT-001.22 carry `ui` because
 * their criteria name a browser route while their OUTCOMES — access denied, nothing leaked — are
 * observable at an API. AT-001.24's outcome IS the rendering, so its integration body refuses with
 * `ui.logged-out-surface-rendering` rather than claiming a screen nobody has seen. What this file
 * lands for that criterion is the DECISION: every non-public surface refuses a caller with no live
 * session, the public one answers, and every route in the tree is declared public or authenticated.
 */

import { expect } from 'vitest';
import { atTest } from './_bind.ts';
// The INTEGRATION-tier procedures. Same criterion, same id, one registration; only the procedure
// differs — at that tier the Given is real rows on a real database, the action is the deployed
// function, and the two refusals are compared as RAW RESPONSE TEXT. See _integration.ts.
import { at00121, at00122, at00123, at00124, at00140, INTEGRATION_TIMEOUT_MS } from './_integration.ts';
// AT-001.24's route arm, out of band: it reads `src/routes/` and asks the SHIPPED registry which of
// those routes carry no declaration. It throws rather than reporting an absence it could not measure.
import { undeclaredRoutesInTree } from './_route-scan.ts';
// THE SHIPPED AUTHORITY STATEMENT, imported rather than restated — every completion below is a
// Given and must succeed, and the deployed validation accepts no other attestation.
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

/** The version string of the ToS + Platform Promise text these bodies accept on the user's behalf. */
const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
/** The address the acknowledgment records — the gateway chain's reported one, never a verified one. */
const CLIENT_IP = '203.0.113.7';
/** The password every email/password registration in this file uses. */
const PASSWORD = 'correct horse battery staple';
/**
 * AT-001.19's three fields, carried by every completion here.
 *
 * Every completion in this file is a GIVEN and must succeed, so each one carries the identity the
 * shared validation requires. Nothing here grades those fields.
 */
const SIGNER = {
  signerName: 'Dana Okonkwo',
  signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
} as const;

/**
 * A WELL-FORMED IDENTIFIER THAT NAMES NOTHING — the other half of the no-existence-oracle test.
 *
 * WELL-FORMED IS THE LOAD-BEARING WORD. A malformed value would be refused by the identifier parser
 * long before any tenant rule ran, and the two answers would then differ for a reason that has
 * nothing to do with the criterion. This is a valid uuid that no row in any table carries.
 */
const ABSENT_ID = '00000000-0000-4000-8000-000000000021';

atTest(
  'AT-001.21',
  'one NGO cannot reach another NGO non-public data by UI or by direct id probing',
  // THE `ui` TAG IS GATE-1 RULING 1. The criterion names a browser route this pull request cannot
  // build — `src/` is the other territory and CI fails a diff that crosses both — so the id is
  // graded where its OUTCOME is observable, at the API, and the tag enrols it in a wiring leaf's
  // `--wired` re-run for the day the screens land. `--wired` exits 3 today, so the tag changes no
  // current run.
  //
  // THE RAISED BUDGET IS FOR THE INTEGRATION TIER ONLY. That body registers two accounts, waits for
  // two confirmation messages and signs in twice against a real GoTrue; vitest's own 30 seconds
  // would end it red however correct it was. The loop tier keeps vitest's value.
  { surface: 'ui', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const NAME_A = 'Riverside Shelter 21A';
      const NAME_B = 'Northgate Foodbank 21B';

      // NGO A AND NGO B BOTH COME FROM THE PRODUCT PATH. Each completion writes its organisation and
      // seats its own caller as that organisation's admin, inside one step, so both standings are
      // product facts rather than something this test arranged.
      const sessionA = await sut.registerWithEmailPassword(w.email('ngo-a-21'), PASSWORD);
      const a = await sut.completeSignup(
        sessionA,
        { accountType: 'ngo', organizationName: NAME_A, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(a, 'NGO A could not complete signup, so there is no tenant for B to be denied').toMatchObject({ ok: true });
      // THE `expect` ABOVE THROWS ON `ok: false`, SO THE NARROWING RETURN BELOW IS REACHED ONLY BY A
      // COMPLETION THAT SUCCEEDED WITH NO ORGANISATION — and on that path the body used to return as
      // a PASS with zero arms run (gate-2 ruling 4). The assertion is what closes that seam; the
      // return stays exactly as it is and becomes what it was always meant to be, a TypeScript
      // narrowing device no run reaches.
      expect(
        a.ok ? a.organizationId : null,
        'NGO A completed signup with no organisation, so there is no tenant for B to be denied and this id would go green with every arm below skipped',
      ).not.toBeNull();
      if (!a.ok || a.organizationId === null) return;

      const sessionB = await sut.registerWithEmailPassword(w.email('ngo-b-21'), PASSWORD);
      const b = await sut.completeSignup(
        sessionB,
        { accountType: 'ngo', organizationName: NAME_B, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(b, 'NGO B could not complete signup, so there is no second tenant to do the probing').toMatchObject({ ok: true });
      expect(
        b.ok ? b.organizationId : null,
        'NGO B completed signup with no organisation, so its own unfiltered listing has nothing to hold and every probe below would be skipped',
      ).not.toBeNull();
      if (!b.ok || b.organizationId === null) return;

      // A PROJECT IN A, so `public.projects` holds a row that belongs to A. The operator provisions
      // it because no product path creates a project at either tier.
      const project = await sut.createProjectAsOperator(a.organizationId, 'Riverside Shelter Website 21');

      // A'S ROWS REALLY EXIST, read back with operator authority. Without this the empty Data API
      // answers below would be indistinguishable from four empty tables, and every denial would be
      // measuring the tree's emptiness instead of the policy set.
      expect(await sut.membership(a.organizationId, a.accountId), 'A holds no seat in its own organisation').toMatchObject({
        role: 'admin',
      });
      expect(await sut.projectAssignment(project.id), 'A\'s project is not there').toMatchObject({
        organizationId: a.organizationId,
      });
      expect((await sut.acknowledgments(a.accountId)).length, 'A\'s completion recorded no acknowledgment').toBeGreaterThan(0);

      // (1) THE CONTROL — A READS ITS OWN DASHBOARD. A surface that refused everybody would satisfy
      // every denial below while proving nothing at all.
      const own = await sut.organizationDashboard(sessionA, a.organizationId);
      expect(own.ok, 'A was refused its OWN dashboard, so the refusals below are not about the tenant boundary').toBe(true);
      if (!own.ok) return;
      expect(own.status, 'A\'s own dashboard did not answer 200').toBe(200);
      expect(own.value.organizationId, 'A\'s dashboard names a different organisation').toBe(a.organizationId);
      expect(own.value.seat, 'A\'s dashboard does not show A\'s own seat').toMatchObject({ accountId: a.accountId, role: 'admin' });
      expect(
        own.value.projects.map((row) => row.projectId),
        'A\'s dashboard does not show A\'s project, so the projection carries no tenant data to leak',
      ).toEqual([project.id]);

      // (2) B IS REFUSED A'S DASHBOARD.
      const foreign = await sut.organizationDashboard(sessionB, a.organizationId);
      expect(foreign.ok, 'NGO B read NGO A\'s dashboard').toBe(false);
      if (foreign.ok) return;

      // (3) AND THE SAME CALLER PROBING AN IDENTIFIER THAT NAMES NOTHING RECEIVES THE IDENTICAL
      // ANSWER. This is the no-existence-oracle clause, and it is an EQUALITY rather than two
      // refusals: two answers that both said no while differing in status, or in one field, would
      // still tell B which organisation identifiers are real.
      const absent = await sut.organizationDashboard(sessionB, ABSENT_ID);
      expect(absent.ok, 'an organisation that does not exist answered with a projection').toBe(false);
      if (absent.ok) return;
      expect(absent.status, 'the two refusals carry different statuses, which tells B which identifier is real').toBe(foreign.status);
      // AT THE LOOP TIER THERE ARE NO BYTES, so the comparison is deep equality of the whole returned
      // value. The integration body compares the RAW response text instead — gate-1 ruling 5 — and
      // neither comparison ever crosses the two tiers.
      expect(absent, 'the refusal for a real foreign organisation differs from the refusal for one that does not exist').toEqual(
        foreign,
      );

      // (4) THE SAME PAIR THROUGH THE DATA API, on every table that holds tenant data. This is the
      // criterion's "direct API/ID probing": the caller's own access token, PostgREST and the policy
      // set, not the edge surface wearing another name. A denied keyed read answers `[]`, which is
      // byte for byte what a row that does not exist answers — so the no-oracle property is free
      // here, and the pair is asserted anyway because "free" is a claim about today's mechanism.
      const probes = [
        { table: 'organizations' as const, keyedBy: 'id' as const, real: a.organizationId },
        { table: 'org_memberships' as const, keyedBy: 'org_id' as const, real: a.organizationId },
        { table: 'projects' as const, keyedBy: 'org_id' as const, real: a.organizationId },
        { table: 'acknowledgments' as const, keyedBy: 'account_id' as const, real: a.accountId },
      ];
      for (const probe of probes) {
        const keyed = await sut.dataApiRead(sessionB, { table: probe.table, keyedBy: probe.keyedBy, value: probe.real });
        expect(keyed.rows, `B's keyed probe of ${probe.table} was refused before any row was considered`).not.toBeNull();
        expect(keyed.rows ?? [], `B read A's rows out of ${probe.table} by identifier`).toEqual([]);

        const nothing = await sut.dataApiRead(sessionB, { table: probe.table, keyedBy: probe.keyedBy, value: ABSENT_ID });
        expect(nothing, `on ${probe.table} a real foreign identifier and one that names nothing answered differently`).toEqual(keyed);
      }

      // (5) THE POSITIVE CONTROL AT THE DATA API, and it is what settles that a policy ran at all
      // (gate-1 ruling 9). Without it an empty array from a denied read could be a gateway refusal
      // or a missing table privilege wearing the policy's clothes.
      //
      // IT COVERS ALL FOUR TABLES, not the one it used to (gate-2 ruling 3). Arm (4) above asserts a
      // DENIAL on each of the four, and a `using (false)` policy — or one keyed on the wrong column —
      // answers `[]` to A and to B alike, so three of those four denials had nothing standing behind
      // them: every assertion in this body passed while the rightful tenant could read nothing
      // either. Each table below is read by its OWN owner, keyed the way arm (4) keys it.
      const ownRow = await sut.dataApiRead(sessionA, { table: 'organizations', keyedBy: 'id', value: a.organizationId });
      expect(ownRow.rows, 'A\'s own keyed read was refused before any row was considered').not.toBeNull();
      expect(ownRow.rows ?? [], 'A\'s own keyed read did not return exactly one row').toHaveLength(1);
      expect((ownRow.rows ?? [])[0], 'A\'s own keyed read returned a different organisation').toMatchObject({ id: a.organizationId });

      // AND "AT LEAST ONE ROW, AND EVERY ROW IS A'S" ON THE OTHER THREE, rather than an exact count.
      // The reason is measured rather than stylistic: the integration database is shared by the whole
      // run — the twin of this body says so at its unfiltered listing — and one completion records
      // more than one kind of acknowledgment. An exact count would be a brittle assertion about the
      // suite instead of a statement about the policy.
      const ownSeats = await sut.dataApiRead(sessionA, { table: 'org_memberships', keyedBy: 'org_id', value: a.organizationId });
      expect(ownSeats.rows, 'A\'s own keyed read of org_memberships was refused before any row was considered').not.toBeNull();
      expect((ownSeats.rows ?? []).length, 'A cannot read the seats of its OWN organisation, so that denial proves nothing').toBeGreaterThan(0);
      expect(
        (ownSeats.rows ?? []).map((row) => String(row.org_id)),
        'A\'s keyed read of org_memberships returned a seat in another organisation',
      ).toEqual((ownSeats.rows ?? []).map(() => a.organizationId));

      const ownProjects = await sut.dataApiRead(sessionA, { table: 'projects', keyedBy: 'org_id', value: a.organizationId });
      expect(ownProjects.rows, 'A\'s own keyed read of projects was refused before any row was considered').not.toBeNull();
      expect((ownProjects.rows ?? []).length, 'A cannot read the projects of its OWN organisation, so that denial proves nothing').toBeGreaterThan(0);
      expect(
        (ownProjects.rows ?? []).map((row) => String(row.org_id)),
        'A\'s keyed read of projects returned a project of another organisation',
      ).toEqual((ownProjects.rows ?? []).map(() => a.organizationId));
      expect(
        (ownProjects.rows ?? []).map((row) => String(row.id)),
        'A\'s keyed read of projects does not hold the project the operator created in A',
      ).toContain(project.id);

      const ownAcknowledgments = await sut.dataApiRead(sessionA, { table: 'acknowledgments', keyedBy: 'account_id', value: a.accountId });
      expect(ownAcknowledgments.rows, 'A\'s own keyed read of acknowledgments was refused before any row was considered').not.toBeNull();
      expect((ownAcknowledgments.rows ?? []).length, 'A cannot read its OWN acknowledgments, so that denial proves nothing').toBeGreaterThan(0);
      expect(
        (ownAcknowledgments.rows ?? []).map((row) => String(row.account_id)),
        'A\'s keyed read of acknowledgments returned another account\'s row',
      ).toEqual((ownAcknowledgments.rows ?? []).map(() => a.accountId));

      // (6) AND THE UNFILTERED LISTING, which is a DIFFERENT attack from a keyed probe: a keyed
      // probe asks whether one identifier is yours, a listing asks what is there at all, and a
      // policy that leaked would leak there first.
      const organizations = await sut.dataApiRead(sessionB, { table: 'organizations', keyedBy: null, value: null });
      expect(organizations.rows, 'B\'s unfiltered listing of organisations was refused before any row was considered').not.toBeNull();
      expect(
        (organizations.rows ?? []).map((row) => String(row.id)),
        'B\'s unfiltered listing is not exactly its own organisation',
      ).toEqual([b.organizationId]);
      const projects = await sut.dataApiRead(sessionB, { table: 'projects', keyedBy: null, value: null });
      expect(projects.rows, 'B\'s unfiltered listing of projects was refused before any row was considered').not.toBeNull();
      expect(
        (projects.rows ?? []).map((row) => String(row.id)),
        'B\'s unfiltered listing shows a project B does not own',
      ).toEqual([]);

      // (7) AND THE NO-ORACLE PROPERTY SURVIVES A DATABASE FAULT — gate-1 ruling 4's PROOF rather
      // than its assertion, and the loop tier's own arm. `_live.ts` does not back `failNextReadOf`,
      // so there is no fault injection at the integration tier and an integration body reaching for
      // it would refuse by name rather than fault a real database.
      //
      // THIS IS THE SURFACE THAT MOST NEEDS THE ARM, and that is why it is here as well as on the
      // project workspace. `organization-dashboard` makes FOUR reads and THREE of them precede the
      // target, so it is where a lookup issued AFTER the target read would first appear. Such a
      // fault is reachable only on the path where the target EXISTS: a real foreign organisation
      // would answer 502 while an identifier that names nothing had already answered 404, and those
      // two answers are an existence oracle sitting outside `TENANT_NOT_FOUND`. With every decision
      // read issued BEFORE the target read and nothing after it, both answer the same 502 — by
      // construction rather than by care.
      //
      // ALL FOUR STORES, THE TARGET'S OWN INCLUDED. A fault on `organizations` faults the target
      // read itself, and that answer must be identical for both identifiers too; asserting it is
      // what makes this a complete statement rather than one about the first three reads only. The
      // fault is ONE-SHOT — it is consumed by the read it fails — so each call arms its own.
      for (const store of ['accounts', 'memberships', 'projects', 'organizations'] as const) {
        await sut.failNextReadOf(store);
        const faultedForeign = await sut.organizationDashboard(sessionB, a.organizationId);
        await sut.failNextReadOf(store);
        const faultedAbsent = await sut.organizationDashboard(sessionB, ABSENT_ID);
        expect(faultedForeign.ok, `a faulted ${store} read answered with a projection`).toBe(false);
        expect(faultedForeign.status, `a faulted ${store} read did not answer as an outage`).toBe(502);
        expect(
          faultedAbsent,
          `under a fault on ${store} a real foreign organisation and one that names nothing answered differently`,
        ).toEqual(faultedForeign);
      }
    },
    integration: at00121,
  },
);

atTest(
  'AT-001.22',
  'an unassigned volunteer is denied a project non-public data while the public page stays visible',
  // THE `ui` TAG, for the same reason AT-001.21 carries it (gate-1 ruling 1): "the public project
  // page remains visible" names a PAGE, and there is no page in this tree — only its API surface.
  { surface: 'ui', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const ORGANIZATION_NAME = 'Riverside Shelter 22';
      const PROJECT_NAME = 'Riverside Shelter Website 22';

      // THE OWNING NGO, through the product path.
      const ngo = await sut.registerWithEmailPassword(w.email('project-owner-22'), PASSWORD);
      const owner = await sut.completeSignup(
        ngo,
        { accountType: 'ngo', organizationName: ORGANIZATION_NAME, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(owner, 'the NGO could not complete signup, so there is no organisation to hold a project').toMatchObject({ ok: true });
      expect(
        owner.ok ? owner.organizationId : null,
        'the owning NGO completed signup with no organisation, so no project can be created for a volunteer to be denied and this id would go green having proved nothing',
      ).not.toBeNull();
      if (!owner.ok || owner.organizationId === null) return;

      // TWO VOLUNTEERS, both real accounts through the product path. The difference between them is
      // the ONE fact the criterion turns on: which of them holds the project's developer seat.
      const assignedSession = await sut.registerWithEmailPassword(w.email('assigned-volunteer-22'), PASSWORD);
      await sut.linkGithubIdentity(assignedSession, 'assigned-volunteer-22-handle');
      const assigned = await sut.completeSignup(
        assignedSession,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(assigned, 'the assigned volunteer could not complete signup, so there is no control').toMatchObject({ ok: true });
      if (!assigned.ok) return;

      const unassigned = await sut.registerWithEmailPassword(w.email('unassigned-volunteer-22'), PASSWORD);
      await sut.linkGithubIdentity(unassigned, 'unassigned-volunteer-22-handle');
      const outsider = await sut.completeSignup(
        unassigned,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(outsider, 'the unassigned volunteer could not complete signup, so there is nobody to be denied').toMatchObject({
        ok: true,
      });
      if (!outsider.ok) return;

      // THE PROJECT AND ITS SEAT — operator-provisioned, because no product path creates a project
      // or attaches a volunteer at either tier.
      const project = await sut.createProjectAsOperator(owner.organizationId, PROJECT_NAME);
      const seated = await sut.assignVolunteerAsOperator(project.id, assigned.accountId);
      expect(seated, 'the volunteer could not be attached, so this criterion has no Given').toMatchObject({ ok: true });
      expect(await sut.projectAssignment(project.id), 'the seat does not hold the assigned volunteer').toMatchObject({
        assignedVolunteerId: assigned.accountId,
      });

      // (1) THE CONTROL COMES FIRST — the ASSIGNED volunteer reads the workspace. A surface that
      // refused everybody would satisfy every denial below while proving nothing, so the allowed
      // read is asserted before any refusal is measured.
      const allowed = await sut.projectWorkspace(assignedSession, project.id);
      expect(allowed.ok, 'the ASSIGNED volunteer was refused its own project workspace').toBe(true);
      if (!allowed.ok) return;
      expect(allowed.status, 'the allowed workspace read did not answer 200').toBe(200);
      expect(allowed.value, 'the workspace does not hold the project working data it is supposed to').toEqual({
        projectId: project.id,
        projectName: PROJECT_NAME,
        organizationId: owner.organizationId,
        assignedVolunteerId: assigned.accountId,
      });

      // (2) THE UNASSIGNED VOLUNTEER IS REFUSED THE SAME WORKSPACE.
      const refused = await sut.projectWorkspace(unassigned, project.id);
      expect(refused.ok, 'a volunteer who holds no seat on the project read its workspace').toBe(false);
      if (refused.ok) return;

      // (3) AND THE IDENTIFIER THAT NAMES NOTHING ANSWERS IDENTICALLY. At the loop tier there are no
      // bytes, so the comparison is deep equality of the whole returned value; the integration body
      // compares the RAW response text instead (gate-1 ruling 5).
      const absent = await sut.projectWorkspace(unassigned, ABSENT_ID);
      expect(absent.ok, 'a project that does not exist answered with a projection').toBe(false);
      if (absent.ok) return;
      expect(absent.status, 'the two refusals carry different statuses, which says which project is real').toBe(refused.status);
      expect(absent, 'the refusal for a real foreign project differs from the refusal for one that does not exist').toEqual(refused);

      // (4) THE SAME DENIAL THROUGH THE DATA API — the criterion's other path, with the volunteer's
      // own access token on it rather than the edge surface's service-role read.
      const keyed = await sut.dataApiRead(unassigned, { table: 'projects', keyedBy: 'id', value: project.id });
      expect(keyed.rows, 'the volunteer\'s keyed probe was refused before any row was considered').not.toBeNull();
      expect(keyed.rows ?? [], 'an unassigned volunteer read the project row by identifier').toEqual([]);
      const keyedAbsent = await sut.dataApiRead(unassigned, { table: 'projects', keyedBy: 'id', value: ABSENT_ID });
      expect(keyedAbsent, 'a real foreign project and one that names nothing answered differently at the Data API').toEqual(keyed);

      // (5) AND THE PUBLIC PAGE STAYS VISIBLE — to that same refused volunteer AND to a caller with
      // no session at all. The second half is what makes it PUBLIC rather than merely wider.
      const toVolunteer = await sut.publicProjectPage(project.id, unassigned);
      expect(toVolunteer.ok, 'the public project page was hidden from the volunteer the workspace refused').toBe(true);
      if (!toVolunteer.ok) return;
      const toAnyone = await sut.publicProjectPage(project.id, null);
      expect(toAnyone.ok, 'the public project page was hidden from a caller holding no session').toBe(true);
      if (!toAnyone.ok) return;
      expect(toAnyone, 'the public page answered a signed-in caller and an anonymous one differently').toEqual(toVolunteer);

      // (6) AND THE PUBLIC PROJECTION CARRIES NEITHER FIELD THE WORKSPACE HOLDS, each named rather
      // than counted: a field count passes while the WRONG field is present. `organizationId` is an
      // internal identifier a stranger has no use for; `assignedVolunteerId` names a person.
      const publicFields = Object.keys(toAnyone.value);
      expect(publicFields, 'the public project page leaks the owning organisation identifier').not.toContain('organizationId');
      expect(publicFields, 'the public project page names the assigned developer').not.toContain('assignedVolunteerId');
      expect(toAnyone.value, 'the public projection is not the three fields the shipped module builds').toEqual({
        projectId: project.id,
        projectName: PROJECT_NAME,
        organizationName: ORGANIZATION_NAME,
      });

      // (7) AND THE NO-ORACLE PROPERTY SURVIVES A DATABASE FAULT — gate-1 ruling 4's PROOF rather
      // than its assertion, and the loop tier's own arm. `_live.ts` does not back `failNextReadOf`,
      // so there is no fault injection at the integration tier and an integration body reaching for
      // it would refuse by name.
      //
      // WHY IT MATTERS. With a lookup issued AFTER the target read, a fault reachable only on the
      // existing-row path would answer 502 for a real foreign project while an identifier that names
      // nothing had already answered 404 — an existence oracle sitting outside `TENANT_NOT_FOUND`.
      // The surface issues every decision read BEFORE the target read and nothing after it, so both
      // answer the same 502. The fault is ONE-SHOT, so each call arms its own.
      for (const store of ['accounts', 'projects'] as const) {
        await sut.failNextReadOf(store);
        const faultedForeign = await sut.projectWorkspace(unassigned, project.id);
        await sut.failNextReadOf(store);
        const faultedAbsent = await sut.projectWorkspace(unassigned, ABSENT_ID);
        expect(faultedForeign.ok, `a faulted ${store} read answered with a projection`).toBe(false);
        expect(faultedForeign.status, `a faulted ${store} read did not answer as an outage`).toBe(502);
        expect(
          faultedAbsent,
          `under a fault on ${store} a real foreign project and one that names nothing answered differently`,
        ).toEqual(faultedForeign);
      }
    },
    integration: at00122,
  },
);

atTest(
  'AT-001.23',
  'the assigned volunteer reaches that project working data, scoped to that project only',
  // NO `ui` TAG, and the absence is the same rule that put one on AT-001.21 and AT-001.22 (gate-1
  // ruling 1). This criterion names no browser route: its whole outcome is that a read succeeds and a
  // neighbouring one does not, which is observable at the API and is what this body observes.
  //
  // THE RAISED BUDGET IS FOR THE INTEGRATION TIER ONLY. That body registers two accounts, waits for
  // two confirmation messages and signs in twice against a real GoTrue. The loop tier keeps vitest's
  // own value.
  { timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const ORGANIZATION_NAME = 'Riverside Shelter 23';
      const ASSIGNED_PROJECT_NAME = 'Riverside Shelter Website 23';
      const OTHER_PROJECT_NAME = 'Riverside Shelter Newsletter 23';

      const ngo = await sut.registerWithEmailPassword(w.email('project-owner-23'), PASSWORD);
      const owner = await sut.completeSignup(
        ngo,
        { accountType: 'ngo', organizationName: ORGANIZATION_NAME, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(owner, 'the NGO could not complete signup, so there is no organisation to hold either project').toMatchObject({
        ok: true,
      });
      expect(
        owner.ok ? owner.organizationId : null,
        'the owning NGO completed signup with no organisation, so neither project can be created and every arm below would be skipped',
      ).not.toBeNull();
      if (!owner.ok || owner.organizationId === null) return;

      const volunteerSession = await sut.registerWithEmailPassword(w.email('assigned-volunteer-23'), PASSWORD);
      await sut.linkGithubIdentity(volunteerSession, 'assigned-volunteer-23-handle');
      const volunteer = await sut.completeSignup(
        volunteerSession,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(volunteer, 'the volunteer could not complete signup, so there is nobody to hold the seat').toMatchObject({ ok: true });
      if (!volunteer.ok) return;

      // TWO PROJECTS IN ONE ORGANISATION, and that is the Given rather than an economy. A second
      // project in ANOTHER organisation would be refused by the organisation rule and would say
      // nothing about per-project scoping; both belonging to one owner is what makes the refusal
      // below attributable to the developer seat.
      const assignedProject = await sut.createProjectAsOperator(owner.organizationId, ASSIGNED_PROJECT_NAME);
      const otherProject = await sut.createProjectAsOperator(owner.organizationId, OTHER_PROJECT_NAME);
      const seated = await sut.assignVolunteerAsOperator(assignedProject.id, volunteer.accountId);
      expect(seated, 'the volunteer could not be attached, so this criterion has no Given').toMatchObject({ ok: true });
      expect(await sut.projectAssignment(assignedProject.id), 'the seat does not hold the assigned volunteer').toMatchObject({
        assignedVolunteerId: volunteer.accountId,
      });

      // (1) THE GRANT — the assigned volunteer reads its own project's working data.
      const workspace = await sut.projectWorkspace(volunteerSession, assignedProject.id);
      expect(workspace.ok, 'the ASSIGNED volunteer was refused its own project workspace').toBe(true);
      if (!workspace.ok) return;
      expect(workspace.status, 'the allowed workspace read did not answer 200').toBe(200);
      expect(workspace.value, 'the workspace does not hold the project working data it is supposed to').toEqual({
        projectId: assignedProject.id,
        projectName: ASSIGNED_PROJECT_NAME,
        organizationId: owner.organizationId,
        assignedVolunteerId: volunteer.accountId,
      });

      // (2) AND THE OTHER PROJECT OF THE SAME ORGANISATION IS REFUSED — this is "scoped to that
      // project only". The answer is the shared not-found constant, and it is compared against the
      // answer for an identifier that names nothing: at this tier that is deep equality of the whole
      // returned value, and the integration body compares the raw response text instead.
      const other = await sut.projectWorkspace(volunteerSession, otherProject.id);
      expect(other.ok, 'the volunteer read a project it holds no seat on, so the grant is not scoped to its own project').toBe(false);
      if (other.ok) return;
      expect(other.status, 'the refusal for another project did not answer as the shared not-found constant').toBe(404);
      const absent = await sut.projectWorkspace(volunteerSession, ABSENT_ID);
      expect(absent.ok, 'a project that does not exist answered with a projection').toBe(false);
      if (absent.ok) return;
      expect(absent, 'the refusal for a real unassigned project differs from the refusal for one that does not exist').toEqual(other);

      // (3) AND THE OWNING ORGANISATION'S DASHBOARD IS REFUSED. This is the arm that proves the scope
      // is the PROJECT and not the tenant: the volunteer works inside that organisation and holds no
      // membership row in it, so the organisation's own data stays closed.
      const dashboard = await sut.organizationDashboard(volunteerSession, owner.organizationId);
      expect(
        dashboard.ok,
        "the assigned volunteer read the owning organisation's dashboard, so its scope is the tenant rather than the project",
      ).toBe(false);
      if (dashboard.ok) return;
      expect(dashboard.status, 'the dashboard refusal did not answer as the shared not-found constant').toBe(404);

      // (4) AND THE UNFILTERED DATA API LISTING HOLDS EXACTLY THE ASSIGNED PROJECT — the criterion's
      // other path, with the volunteer's own access token on it. Both projects belong to one
      // organisation, so a rule scoped to the tenant rather than to the seat would return both here.
      const listing = await sut.dataApiRead(volunteerSession, { table: 'projects', keyedBy: null, value: null });
      expect(listing.rows, "the volunteer's unfiltered listing was refused before any row was considered").not.toBeNull();
      expect(
        (listing.rows ?? []).map((row) => String(row.id)),
        "the volunteer's unfiltered listing of projects is not exactly the one project it is assigned to",
      ).toEqual([assignedProject.id]);
    },
    integration: at00123,
  },
);

atTest(
  'AT-001.40',
  'a platform admin reaches any NGO or project data — the admin role spans all accounts',
  // NO `ui` TAG, for the reason AT-001.23 carries none: the criterion names no browser route, and its
  // outcome is that reads succeed where another caller's are refused.
  { timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const NAME_A = 'Riverside Shelter 40A';
      const NAME_B = 'Northgate Foodbank 40B';

      const sessionA = await sut.registerWithEmailPassword(w.email('ngo-a-40'), PASSWORD);
      const a = await sut.completeSignup(
        sessionA,
        { accountType: 'ngo', organizationName: NAME_A, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(a, 'NGO A could not complete signup, so there is no first tenant to reach across').toMatchObject({ ok: true });
      expect(
        a.ok ? a.organizationId : null,
        'NGO A completed signup with no organisation, so the administrator has only one tenant to read and its reach would be indistinguishable from an ordinary one',
      ).not.toBeNull();
      if (!a.ok || a.organizationId === null) return;

      const sessionB = await sut.registerWithEmailPassword(w.email('ngo-b-40'), PASSWORD);
      const b = await sut.completeSignup(
        sessionB,
        { accountType: 'ngo', organizationName: NAME_B, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(b, 'NGO B could not complete signup, so there is no second tenant and no boundary to cross').toMatchObject({ ok: true });
      expect(
        b.ok ? b.organizationId : null,
        'NGO B completed signup with no organisation, so there is no second tenant and every arm below would be skipped',
      ).not.toBeNull();
      if (!b.ok || b.organizationId === null) return;

      const projectA = await sut.createProjectAsOperator(a.organizationId, 'Riverside Shelter Website 40');
      const projectB = await sut.createProjectAsOperator(b.organizationId, 'Northgate Foodbank Website 40');

      // THE ADMINISTRATOR, PROVISIONED AND THEN SIGNED IN. `complete_signup` refuses this account type
      // by name, so provisioning is the only way one exists at all, and the sign-in is what turns it
      // into a caller with a session.
      const adminEmail = w.email('platform-admin-40');
      await sut.provisionPlatformAdmin(adminEmail, PASSWORD);
      const adminSignIn = await sut.signInWithEmailPassword(adminEmail, PASSWORD);
      expect(adminSignIn, 'the provisioned platform administrator could not sign in, so there is no administrator to act').toMatchObject(
        { ok: true },
      );
      if (!adminSignIn.ok) return;
      const admin = adminSignIn.session;

      // (1) BOTH ORGANISATIONS' DASHBOARDS, read by ONE administrator. Two tenants, never one: one
      // administrator reading one organisation proves nothing an ordinary member could not prove.
      const dashboardA = await sut.organizationDashboard(admin, a.organizationId);
      expect(dashboardA.ok, "the platform administrator was refused NGO A's dashboard").toBe(true);
      if (!dashboardA.ok) return;
      expect(dashboardA.value.organizationName, "the administrator's read of NGO A named a different organisation").toBe(NAME_A);

      const dashboardB = await sut.organizationDashboard(admin, b.organizationId);
      expect(dashboardB.ok, "the platform administrator was refused NGO B's dashboard").toBe(true);
      if (!dashboardB.ok) return;
      expect(dashboardB.value.organizationName, "the administrator's read of NGO B named a different organisation").toBe(NAME_B);

      // (2) AND BOTH PROJECTS' WORKSPACES, which is the other scope the criterion names. The
      // administrator holds neither developer seat and neither membership row.
      const workspaceA = await sut.projectWorkspace(admin, projectA.id);
      expect(workspaceA.ok, "the platform administrator was refused NGO A's project workspace").toBe(true);
      if (!workspaceA.ok) return;
      expect(workspaceA.value.projectId, "the administrator's workspace read named a different project").toBe(projectA.id);

      const workspaceB = await sut.projectWorkspace(admin, projectB.id);
      expect(workspaceB.ok, "the platform administrator was refused NGO B's project workspace").toBe(true);
      if (!workspaceB.ok) return;
      expect(workspaceB.value.projectId, "the administrator's workspace read named a different project").toBe(projectB.id);

      // (3) AND THE UNFILTERED DATA API LISTING HOLDS BOTH ORGANISATIONS — the criterion's other path.
      // It is asserted as "both are present" rather than as an exact set, because the integration twin
      // reads a database the whole run shares and the two bodies state one claim.
      const listing = await sut.dataApiRead(admin, { table: 'organizations', keyedBy: null, value: null });
      expect(listing.rows, "the administrator's unfiltered listing was refused before any row was considered").not.toBeNull();
      const listed = (listing.rows ?? []).map((row) => String(row.id));
      expect(listed, "the administrator's unfiltered listing does not hold NGO A").toContain(a.organizationId);
      expect(listed, "the administrator's unfiltered listing does not hold NGO B").toContain(b.organizationId);

      // (4) AND A NON-ADMIN REPEATING ONE OF THOSE READS IS REFUSED. Without this arm the body would
      // show only that somebody read something. The reach is attributable through the CONTRAST and not
      // through anything the answer carries: the shipped decision knows WHY it granted, and
      // `TenantReadOutcome` deliberately does not carry that reason, because AT-001.21's claim is that
      // two whole answers are identical and a richer outcome would invite a weaker assertion.
      const nonAdminDashboard = await sut.organizationDashboard(sessionB, a.organizationId);
      expect(
        nonAdminDashboard.ok,
        "NGO B read NGO A's dashboard, so the administrator's reach is not attributable to its account type",
      ).toBe(false);
      const nonAdminListing = await sut.dataApiRead(sessionB, { table: 'organizations', keyedBy: null, value: null });
      expect(nonAdminListing.rows, "NGO B's unfiltered listing was refused before any row was considered").not.toBeNull();
      expect(
        (nonAdminListing.rows ?? []).map((row) => String(row.id)),
        "NGO B's unfiltered listing holds NGO A, so the administrator's listing proves nothing about reach",
      ).not.toContain(a.organizationId);
    },
    integration: at00140,
  },
);

atTest(
  'AT-001.24',
  'a logged-out visitor renders public surfaces only; authenticated surfaces redirect to sign-in',
  // THE `ui` TAG, and here it carries more weight than on AT-001.21: this criterion's OUTCOME is the
  // rendering itself, which is why the integration body refuses with a capability instead of going
  // green (gate-1 ruling 1). The tag is what enrols the id in a wiring leaf's `--wired` re-run for
  // the day the screens land.
  { surface: 'ui' },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const ORGANIZATION_NAME = 'Riverside Shelter 24';
      const PROJECT_NAME = 'Riverside Shelter Website 24';

      // SOMETHING NON-PUBLIC TO BE REFUSED AND SOMETHING PUBLIC TO BE ANSWERED WITH. A body that
      // pointed every surface at nothing would be refused for the wrong reason, and the public arm
      // would have no projection to compare.
      const ngo = await sut.registerWithEmailPassword(w.email('project-owner-24'), PASSWORD);
      const owner = await sut.completeSignup(
        ngo,
        { accountType: 'ngo', organizationName: ORGANIZATION_NAME, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(owner, 'the NGO could not complete signup, so there is no organisation to be refused').toMatchObject({ ok: true });
      expect(
        owner.ok ? owner.organizationId : null,
        'the NGO completed signup with no organisation, so the dashboard arm has no target and every arm below would be skipped',
      ).not.toBeNull();
      if (!owner.ok || owner.organizationId === null) return;
      const project = await sut.createProjectAsOperator(owner.organizationId, PROJECT_NAME);

      // THE TWO SHAPES OF "LOGGED OUT", and this body asserts BOTH and asserts they agree. The
      // criterion's visitor is the FIRST shape — a caller that never signed in, which is `null`. The
      // second is a caller that signed out, whose token was issued and then ended. A revoked token
      // must not be treated as a live one, so both are driven wherever both are expressible.
      const signedOut = await sut.registerWithEmailPassword(w.email('logged-out-visitor-24'), PASSWORD);
      await sut.signOut(signedOut);

      // (1) THE TWO AUTHENTICATED SURFACES REFUSE, at the session layer, before any tenant rule runs.
      //
      // THE RESIDUAL IS NAMED HERE RATHER THAN LEFT TO BE FOUND. Only the signed-out shape is
      // expressible against these two members: both deployed blocks declare `verify_jwt = true`, so
      // the gateway answers a missing token and a revoked one alike, and a member that could be
      // called with no session at all would be describing a request the gateway never forwards. So
      // what this arm proves is that a caller whose session has ended reads neither surface — and at
      // this tier nothing distinguishes that refusal from the one a caller with no token receives.
      const dashboard = await sut.organizationDashboard(signedOut, owner.organizationId);
      expect(dashboard.ok, 'a caller whose session had ended read an organisation dashboard').toBe(false);
      if (dashboard.ok) return;
      expect(dashboard.status, 'the dashboard did not refuse a logged-out caller at the session layer').toBe(401);

      const workspace = await sut.projectWorkspace(signedOut, project.id);
      expect(workspace.ok, 'a caller whose session had ended read a project workspace').toBe(false);
      if (workspace.ok) return;
      expect(workspace.status, 'the workspace did not refuse a logged-out caller at the session layer').toBe(401);

      // (2) AND THE DATA API REFUSES AT THE PRIVILEGE LAYER, on every table that holds tenant data.
      // This is where BOTH shapes are expressible, so both are driven and compared: the migrations
      // grant `anon` nothing at all, so a caller with no token is refused before any policy is
      // consulted, and `rows: null` rather than an empty array is what says so.
      for (const table of ['organizations', 'org_memberships', 'projects', 'acknowledgments'] as const) {
        const neverSignedIn = await sut.dataApiRead(null, { table, keyedBy: null, value: null });
        expect(neverSignedIn.rows, `a caller who never signed in read rows out of ${table}`).toBeNull();
        expect(neverSignedIn.status, `${table} did not refuse a caller with no session at the privilege layer`).toBe(401);

        const afterSignOut = await sut.dataApiRead(signedOut, { table, keyedBy: null, value: null });
        expect(
          afterSignOut,
          `on ${table} a caller who never signed in and one whose session had ended were answered differently`,
        ).toEqual(neverSignedIn);
      }

      // (3) AND THE PUBLIC SURFACE ANSWERS BOTH SHAPES, identically. This is the half of the criterion
      // that is a grant rather than a denial — "only public surfaces render" needs the public one to
      // render at all, or a product that answered nobody would satisfy every arm above.
      const toVisitor = await sut.publicProjectPage(project.id, null);
      expect(toVisitor.ok, 'the public project surface was hidden from a caller who never signed in').toBe(true);
      if (!toVisitor.ok) return;
      expect(toVisitor.value, 'the public projection is not the three fields the shipped module builds').toEqual({
        projectId: project.id,
        projectName: PROJECT_NAME,
        organizationName: ORGANIZATION_NAME,
      });
      const afterSignOut = await sut.publicProjectPage(project.id, signedOut);
      expect(afterSignOut.ok, 'the public project surface was hidden from a caller whose session had ended').toBe(true);
      expect(
        afterSignOut,
        'the public surface answered a caller who never signed in and one whose session had ended differently',
      ).toEqual(toVisitor);

      // (4) AND EVERY ROUTE IN THE TREE IS DECLARED PUBLIC OR AUTHENTICATED. This is the shipped
      // DECISION half of the criterion, and it is all of it this pull request may build: there is no
      // screen to render and `src/` is another territory that continuous integration forbids this
      // change to touch. The arm READS that directory and writes nothing in it, and it throws rather
      // than reporting an absence it could not measure. It is not a redirect that runs, and the
      // integration body refuses this id for exactly that reason.
      expect(
        undeclaredRoutesInTree(),
        'a route under src/routes/ is declared neither public nor authenticated in supabase/functions/_shared/route-visibility.ts',
      ).toEqual([]);
    },
    integration: at00124,
  },
);
