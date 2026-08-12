/**
 * THE ACKNOWLEDGMENT COPY, AS A SHIPPED CONSTANT — the words a person reads and affirms when they
 * make an acknowledgment, stated once, in the deployed function graph.
 *
 * WHY A MODULE AND NOT A DOCUMENT. REQ-001's guard has three clauses about the acknowledgment
 * moment: the acting person's authority to bind the organisation, the prohibition on shared
 * credentials, and the recommendation of an organisation email address. A sentence living only in
 * a specification cannot be graded, and a sentence living only in a screen would be graded by
 * whichever screen happened to exist. Here the words are a value, so the acceptance suite reads
 * the SHIPPED text rather than a copy of it, and so does the server.
 *
 * `authorityStatement` HAS BEHAVIOURAL FORCE, and that is the difference between this module and a
 * bag of strings a test reads back to itself. `validateCompleteSignup` in `./accounts.ts` imports
 * it and refuses any completion whose attestation is not this exact statement — so an
 * acknowledgment records WHAT was affirmed, and only one statement can be affirmed today. When a
 * second version of the statement is one day shipped, the stored value is what keeps the two
 * distinguishable on rows already written.
 *
 * WHAT THE OTHER TWO STRINGS DO AND DO NOT CLAIM. `sharedCredentialsProhibition` and
 * `orgEmailRecommendation` have no behavioural form at any tier — their CONTENT is the article.
 * AT-001.20's criterion says "when displayed", and no screen exists in this tree to display them;
 * the screen is later UI work. What is proved here is that the shipped copy states the
 * prohibition and the recommendation, never that anything shows them to anybody.
 *
 * THE TWO CONSTRAINTS `./accounts.ts` IS UNDER APPLY HERE TOO, for the same measured reasons: zero
 * non-relative imports and no `Deno` global (this module is compiled by `tests/at/tsconfig.json`
 * and run by Deno inside the edge runtime, and only plain TypeScript over plain data resolves in
 * both), and no I/O, no clock, no randomness.
 */

export const ACKNOWLEDGMENT_IDENTITY_COPY = {
  /**
   * The statement the acting person affirms. It is the ONE attestation the server accepts, and the
   * three obligations in it are the requirement's own words: to bind the organisation, to fund
   * non-refundable model fuel, and to accept services that carry no service-level agreement.
   */
  authorityStatement:
    'I attest that I have the authority to make this acknowledgment for my organisation — ' +
    'to bind it, to fund non-refundable model-fuel purchases, and to accept services that ' +
    'carry no SLA.',
  /** Acknowledgments are per named human, so a shared sign-in makes the record name nobody. */
  sharedCredentialsProhibition:
    'Shared credentials are prohibited. Every acknowledgment is made by one named person ' +
    'under their own sign-in.',
  /** Recommended, not required — the requirement's word is "preferred". */
  orgEmailRecommendation:
    'An organisation email address is recommended for the account that makes acknowledgments.',
} as const;
