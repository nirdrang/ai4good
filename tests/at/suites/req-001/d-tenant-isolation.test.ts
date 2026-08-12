/**
 * AT-REQ-001 section E — tenant isolation and visibility.
 *
 * ONE OF THIS FILE'S FIVE IDS IS NOW WRITTEN — AT-001.21, the cross-organisation denial. It arrives
 * with `loop/decomp/req-001.md` D5.L1. AT-001.22 belongs to the same leaf and lands beside it;
 * AT-001.23, AT-001.40 and AT-001.24 belong to D5.L2 and stay declared here.
 *
 * (This header used to describe the tree as the first accounts leaf left it: row-level security on
 * every table with ZERO policies, which denies everybody. That was the safe default and never the
 * requirement. It stopped being true on 2026-08-12, when this leaf's migration landed the first
 * policy set, so the paragraph is rewritten rather than kept as a statement that now reads wrong.)
 *
 * WHAT A GREEN HERE CLAIMS, said before the bodies rather than after. It claims READ isolation over
 * every kind of tenant data this tree HOLDS — an organisation, its seat, its projects and its
 * acknowledgments — through BOTH paths the criterion names: the edge surface a user interface must
 * use, and direct identifier probing at the Data API with the caller's own access token. It claims
 * that a denial and an absence are the SAME answer.
 *
 * WHAT IT DOES NOT CLAIM. The criterion's browser route: no screen exists, and `src/` is another
 * territory that CI forbids this pull request to touch. The `ui` surface tag is what enrols the id
 * in a wiring leaf's `--wired` re-run for the day the screens land (gate-1 ruling 1). It claims
 * nothing about drafts, a ledger, files or a thread — no such table exists anywhere in this tree —
 * and nothing about timing side channels.
 */

import { expect } from 'vitest';
import { atTest } from './_bind.ts';
// The INTEGRATION-tier procedures. Same criterion, same id, one registration; only the procedure
// differs — at that tier the Given is real rows on a real database, the action is the deployed
// function, and the two refusals are compared as RAW RESPONSE TEXT. See _integration.ts.
import { at00121, INTEGRATION_TIMEOUT_MS } from './_integration.ts';
import { LEAF, notLanded } from './_pending.ts';
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
      if (!a.ok || a.organizationId === null) return;

      const sessionB = await sut.registerWithEmailPassword(w.email('ngo-b-21'), PASSWORD);
      const b = await sut.completeSignup(
        sessionB,
        { accountType: 'ngo', organizationName: NAME_B, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(b, 'NGO B could not complete signup, so there is no second tenant to do the probing').toMatchObject({ ok: true });
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
      const ownRow = await sut.dataApiRead(sessionA, { table: 'organizations', keyedBy: 'id', value: a.organizationId });
      expect(ownRow.rows, 'A\'s own keyed read was refused before any row was considered').not.toBeNull();
      expect(ownRow.rows ?? [], 'A\'s own keyed read did not return exactly one row').toHaveLength(1);
      expect((ownRow.rows ?? [])[0], 'A\'s own keyed read returned a different organisation').toMatchObject({ id: a.organizationId });

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
    },
    integration: at00121,
  },
);

atTest('AT-001.22', 'an unassigned volunteer is denied a project non-public data while the public page stays visible', notLanded(LEAF.D5_L1));

atTest('AT-001.23', 'the assigned volunteer reaches that project working data, scoped to that project only', notLanded(LEAF.D5_L2));

atTest('AT-001.40', 'a platform admin reaches any NGO or project data — the admin role spans all accounts', notLanded(LEAF.D5_L2));

atTest('AT-001.24', 'a logged-out visitor renders public surfaces only; authenticated surfaces redirect to sign-in', notLanded(LEAF.D5_L2));
