/**
 * AT-REQ-001 section D — two-layer authorization, multi-NGO membership, the single seat, and
 * acknowledgment identity capture.
 *
 * THE MEMBERSHIP IDS ARE STILL NOT LANDED. The schema carries `public.org_memberships` with an
 * `org_role` of `admin` or `member`, which is the table those ids will assert over — but the ROLE
 * SEMANTICS (what a member may do, what happens across two NGOs, that a volunteer can never hold a
 * per-NGO role) are the membership leaf's, and none of them is enforced by anything shipped yet.
 * The table existing is not the requirement being met.
 *
 * THE THREE ACKNOWLEDGMENT-IDENTITY IDS ARE. AT-001.19, AT-001.39 and AT-001.20 are written below,
 * by the leaf that lands name, title and the authority attestation on every acknowledgment
 * (`loop/decomp/req-001.md` D4.L1).
 *
 * WHAT THEIR GREEN CLAIMS, AND WHAT IT DOES NOT, said here rather than left to be inferred:
 *   * it claims that every acknowledgment written through the one acknowledgment moment this tree
 *     has — signup completion — records the three fields, that any omission or blank refuses with
 *     the field named and writes NOTHING at all, and that the shipped copy states the
 *     shared-credentials prohibition and the organisation-email recommendation;
 *   * it does NOT claim that any screen displays that copy. AT-001.20's criterion says "when
 *     displayed" and no screen exists in this tree; the copy is graded as CONTENT, by importing the
 *     shipped constant, and the display is later UI work.
 */

import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import { LEAF, notLanded } from './_pending.ts';
// The INTEGRATION-tier procedures for the two ids proved against a real stack. Same criterion, same
// id, one registration; only the procedure differs. See _integration.ts.
import { at00119, at00139 } from './_integration.ts';
// THE SHIPPED COPY, IMPORTED RATHER THAN RESTATED — the same discipline AT-001.05 applies to the
// stub statistics. AT-001.20 grades the words that ship; a literal copied into this file would
// drift from them the first time either changed, and the test would then be grading a copy.
// `validateCompleteSignup` imports the same module, so `authorityStatement` is not a constant only
// a test reads: the deployed validation refuses any attestation that is not this statement.
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

/** The version string of the ToS + Platform Promise text these tests accept on the user's behalf. */
const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
/** The address the acknowledgment records — the gateway chain's reported one, never a verified one. */
const CLIENT_IP = '203.0.113.7';
/** The password every email/password registration in this file uses. */
const PASSWORD = 'correct horse battery staple';
/** AT-001.19's three fields — who signed, and the statement they affirmed. */
const SIGNER = {
  signerName: 'Dana Okonkwo',
  signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
} as const;

atTest('AT-001.16', 'membership and role are held per-NGO — acting in one never grants access to the other', notLanded(LEAF.D3_L1));

atTest('AT-001.36', 'an admin in one NGO and a member in another succeeds only where it is the admin', notLanded(LEAF.D3_L1));

atTest('AT-001.37', 'granting a per-NGO role to a volunteer account is rejected on every path', notLanded(LEAF.D3_L1));

atTest('AT-001.17', 'no capability exists to invite or add a second member to an org', notLanded(LEAF.D3_L2));

atTest('AT-001.18', 'every NGO-side action succeeds under the one account with its own preconditions met', notLanded(LEAF.D3_L3));

atTest(
  'AT-001.19',
  'every acknowledgment records the acting person name, title and authority attestation',
  {
    default: async ({ open }) => {
      const { w, sut } = await open();

      // BOTH ACCOUNT TYPES, because the criterion's words are "any acknowledgment moment" and the
      // two types reach the one moment by different routes: an NGO completes with an organisation,
      // a volunteer completes with a linked GitHub identity. A rule that captured the fields on one
      // route and not the other would satisfy a single-type test and fail the criterion.
      const ngoSession = await sut.registerWithEmailPassword(w.email('ngo-signer'), PASSWORD);
      const ngoCompletion = await sut.completeSignup(
        ngoSession,
        {
          accountType: 'ngo',
          organizationName: 'Riverside Shelter Who Signed',
          acknowledgmentTextVersion: TEXT_VERSION,
          ...SIGNER,
        },
        CLIENT_IP,
      );
      expect(ngoCompletion, 'the NGO completion carrying all three identity fields was refused').toMatchObject({ ok: true });
      if (!ngoCompletion.ok) return;

      // The volunteer arrives through a github-established session, which is the state Auth is in
      // after a consent round trip and carries the linked identity the volunteer gate requires. No
      // handshake is simulated; see AT-001.02's own note.
      const volunteerSession = await sut.registerWithGithub(w.email('volunteer-signer'), 'riverside-signer');
      const volunteerCompletion = await sut.completeSignup(
        volunteerSession,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(volunteerCompletion, 'the volunteer completion carrying all three identity fields was refused').toMatchObject({
        ok: true,
      });
      if (!volunteerCompletion.ok) return;

      for (const [label, accountId] of [
        ['ngo', ngoCompletion.accountId],
        ['volunteer', volunteerCompletion.accountId],
      ] as const) {
        const acknowledgments = await sut.acknowledgments(accountId);
        expect(acknowledgments, `exactly one platform acknowledgment is recorded by one ${label} completion`).toHaveLength(1);
        const row = acknowledgments[0];

        // EACH FIELD BY ITS VALUE, because a row holding three empty strings records nothing while
        // looking like a record — the discipline AT-001.01 applies to its own three fields.
        expect(row.signerName, `the ${label} acknowledgment does not record the name that was submitted`).toBe(
          SIGNER.signerName,
        );
        expect(row.signerTitle, `the ${label} acknowledgment does not record the title that was submitted`).toBe(
          SIGNER.signerTitle,
        );
        // THE STATEMENT, NOT A FLAG. What is stored is WHAT was attested, so it is compared against
        // the shipped statement rather than merely being non-empty.
        expect(
          row.authorityAttestation,
          `the ${label} acknowledgment does not record the authority statement that was affirmed`,
        ).toBe(ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement);
      }
    },
    integration: at00119,
  },
);

atTest(
  'AT-001.39',
  'an acknowledgment missing any of name, title or attestation is rejected and records nothing',
  {
    default: async ({ open }) => {
      const { w, sut } = await open();

      const omitting = (field: keyof typeof SIGNER): Record<string, unknown> => {
        const identity: Record<string, unknown> = { ...SIGNER };
        delete identity[field];
        return identity;
      };
      // WHITESPACE IS NOT A VALUE. A blank field passes any "was it sent?" check and records
      // nobody, so the criterion's "omitted" has to cover it or the guard is one `'   '` wide.
      const blanking = (field: keyof typeof SIGNER): Record<string, unknown> => ({ ...SIGNER, [field]: '   ' });

      // SEVEN VARIANTS. Three omissions and three blanks are the criterion's own negative path. The
      // seventh is the one a presence check cannot catch: an attestation that is present, non-blank
      // and says the opposite of what it must attest. A rule that only asked "is it non-empty?"
      // would store `'I am not authorized'` AS an attestation of authority.
      const variants = [
        { slug: 'omitted-name', identity: omitting('signerName'), names: /signer name/i, mismatch: false },
        { slug: 'omitted-title', identity: omitting('signerTitle'), names: /signer title/i, mismatch: false },
        {
          slug: 'omitted-attestation',
          identity: omitting('authorityAttestation'),
          names: /authority attestation/i,
          mismatch: false,
        },
        { slug: 'blank-name', identity: blanking('signerName'), names: /signer name/i, mismatch: false },
        { slug: 'blank-title', identity: blanking('signerTitle'), names: /signer title/i, mismatch: false },
        {
          slug: 'blank-attestation',
          identity: blanking('authorityAttestation'),
          names: /authority attestation/i,
          mismatch: false,
        },
        {
          slug: 'wrong-attestation',
          identity: { ...SIGNER, authorityAttestation: 'I am not authorized' },
          names: /authority attestation/i,
          mismatch: true,
        },
      ];

      for (const variant of variants) {
        const session = await sut.registerWithEmailPassword(w.email(variant.slug), PASSWORD);
        const organizationName = `Riverside Shelter ${variant.slug}`;
        const refused = await sut.completeSignup(
          session,
          { accountType: 'ngo', organizationName, acknowledgmentTextVersion: TEXT_VERSION, ...variant.identity },
          CLIENT_IP,
        );

        expect(refused.ok, `signup completed with ${variant.slug}`).toBe(false);
        if (refused.ok) return;

        // THE REFUSAL NAMES ITS FIELD. A caller told only that "something is missing" has nothing to
        // correct, and the screen a later leaf builds would have nothing to display.
        expect(refused.reason, `the refusal does not name the field at fault (${variant.slug})`).toMatch(variant.names);
        if (variant.mismatch) {
          expect(
            refused.reason,
            'the refusal does not say the attestation is not the shipped authority statement',
          ).toMatch(/does not match the shipped authority statement/i);
        } else {
          // WHICH CHECK REFUSED, pinned. A missing or blank field must be refused for BEING missing,
          // not by the content comparison further down — otherwise the two checks are one and a
          // future reordering could not be noticed.
          expect(
            refused.reason,
            `a missing or blank field was refused by the content check rather than the presence check (${variant.slug})`,
          ).not.toMatch(/does not match/i);
        }

        // "NO ACKNOWLEDGMENT RECORD IS CREATED" INCLUDES EVERY OTHER WRITE THE COMPLETION MAKES. The
        // weakest implementation that passes the assertions above writes the account, the
        // organisation and the membership and then reports a refusal, which is not a rejection — it
        // is a half-completed signup with a rude message. The organisation is looked for BY THE NAME
        // that was attempted, and the memberships by the account, because a refusal hands back no
        // identifier to look either of them up by.
        expect(await sut.account(session.accountId), `the refused completion left an account row behind (${variant.slug})`).toBeNull();
        expect(
          await sut.acknowledgments(session.accountId),
          `the refused completion recorded an acknowledgment anyway (${variant.slug})`,
        ).toEqual([]);
        expect(
          await sut.hasPlatformAcknowledgment(session.accountId),
          `the refused completion left the account holding the platform acknowledgment (${variant.slug})`,
        ).toBe(false);
        expect(
          await sut.organizationsNamed(organizationName),
          `the refused completion created the organisation anyway (${variant.slug})`,
        ).toEqual([]);
        expect(
          await sut.membershipsOf(session.accountId),
          `the refused completion left a membership behind (${variant.slug})`,
        ).toEqual([]);
      }

      // THE CONTROL, AND IT IS NOT OPTIONAL. A completion path that refused everything would satisfy
      // all seven refusals above. A request differing ONLY in that it carries all three fields, as
      // shipped, must succeed — which is what makes each refusal attributable to its own field.
      const control = await sut.registerWithEmailPassword(w.email('all-three'), PASSWORD);
      const completed = await sut.completeSignup(
        control,
        {
          accountType: 'ngo',
          organizationName: 'Riverside Shelter All Three',
          acknowledgmentTextVersion: TEXT_VERSION,
          ...SIGNER,
        },
        CLIENT_IP,
      );
      expect(completed, 'the control completion carrying all three fields was refused, so the refusals prove nothing').toMatchObject(
        { ok: true },
      );
      if (!completed.ok) return;
      expect(
        await sut.acknowledgments(completed.accountId),
        'the control completion recorded no acknowledgment',
      ).toHaveLength(1);
    },
    integration: at00139,
  },
);

atTest(
  'AT-001.20',
  'acknowledgment copy prohibits shared credentials and recommends an org email',
  async ({ open }) => {
    // ONE BODY, BOTH TIERS. The article under test is the CONTENT of the shipped copy, and content
    // does not change with the tier: no deployed surface reports copy, so an integration procedure
    // would read the same constant through a longer path and prove the same thing.
    //
    // THE WORLD IS OPENED because every id in this suite runs against a real harness handshake, and
    // an id that opened nothing would be a test the harness never saw.
    await open();

    // MEANING, NOT MERE EXISTENCE. A non-empty string satisfies "copy exists"; the criterion says
    // shared credentials are STATED AS PROHIBITED and an org email is RECOMMENDED, so each clause
    // is asserted by its subject and by its verb.
    expect(
      ACKNOWLEDGMENT_IDENTITY_COPY.sharedCredentialsProhibition,
      'the copy does not mention shared credentials',
    ).toMatch(/shared credential/i);
    expect(
      ACKNOWLEDGMENT_IDENTITY_COPY.sharedCredentialsProhibition,
      'the copy mentions shared credentials without prohibiting them',
    ).toMatch(/prohibit/i);

    expect(
      ACKNOWLEDGMENT_IDENTITY_COPY.orgEmailRecommendation,
      'the copy does not mention an organisation email address',
    ).toMatch(/organi[sz]ation email/i);
    expect(
      ACKNOWLEDGMENT_IDENTITY_COPY.orgEmailRecommendation,
      'the copy mentions an organisation email without recommending one',
    ).toMatch(/recommend/i);

    // The third string is the statement AT-001.19 submits and the deployed validation enforces, so
    // it is asserted here only for being a statement at all.
    expect(
      ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement.trim(),
      'the shipped authority statement is blank — there is nothing for a person to affirm',
    ).not.toBe('');
  },
);
