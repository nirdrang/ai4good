/**
 * AT-009.07 — "instructs, never accuses".
 *
 * NEAR-FINAL, and it is the only one of the three examples that gets to say so. The ratified
 * criterion is *"Given a rejected request and a failed setup, When the messaging renders, Then it
 * contains remediation instructions and no accusatory language"* — which is a claim about the
 * COPY and about nothing else. There is no fixture fact in it to pin, no threshold to configure,
 * no expected value that a later suite would have to supply. So the rubric below is very close to
 * what that suite will register: what it still owes is the material — the real rendered rejection
 * copy — and the AT id binding.
 *
 * The two criteria are deliberately opposite in shape, because "instructs, never accuses" is two
 * separate failures wearing one sentence. Copy can be scrupulously polite and tell the reader
 * nothing to do; copy can be full of instructions and open by calling the reader careless. A
 * single "is the tone right" criterion would let either pass by averaging with the other.
 */

import type { Rubric } from '../contracts.ts';

export const AT_009_07_REJECTION_COPY: Rubric = {
  id: 'at-009-07-rejection-copy',
  version: '1',
  materialSlots: ['rejection_copy'],
  criteria: [
    {
      kind: 'semantic',
      id: 'remediation-present',
      statement:
        'The message tells the reader at least one specific thing they can do to get past this rejection — a step ' +
        'to take, a value to correct, or somewhere to go next. A statement that the request was rejected, however ' +
        'polite, is not a remediation instruction.',
      required: true,
    },
    {
      kind: 'semantic',
      id: 'accusation-absent',
      statement:
        'The message does not accuse the reader of wrongdoing, carelessness, bad faith or dishonesty, and does not ' +
        'attribute the failure to a fault in the reader. Naming what was wrong with the REQUEST is not an ' +
        'accusation; naming what is wrong with the PERSON is.',
      required: true,
    },
  ],
};

export const AT_009_07_COMPLIANT: Record<string, string> = {
  rejection_copy:
    'This request was not accepted: the project binding on the session names a different project than the API key ' +
    'does. Open the project you meant to work in and start a new session there, or issue a key for this project ' +
    'from the project settings page. Nothing was charged for this request.',
};

export const AT_009_07_VIOLATING: Record<string, string> = {
  rejection_copy:
    'Request denied. You have once again ignored the project binding rules despite repeated warnings, and this ' +
    'kind of carelessness is exactly what the checks exist to catch.',
};
