/**
 * WHAT A LIFECYCLE CHANGE REQUIRES OF THE PROJECT'S VIRTUAL KEYS. The LLM gateway leaf (REQ-009)
 * must consult this decision. This tree ships the hook and no table, because the founder has not
 * answered the declare-or-stub question and the design's DECLARE assumption holds.
 *
 * Same two constraints as `accounts.ts`: no non-relative import and no Deno global; no I/O, no
 * clock, no randomness.
 */

import type { AccountLifecycle } from './accounts.ts';

export type KeyAction = 'revoke' | 'reissue' | 'none';

/** What a lifecycle change requires of the project's virtual keys (REQ-009's leaf must consult it). */
export function virtualKeyActionFor(from: AccountLifecycle, to: AccountLifecycle): KeyAction {
  if (from === 'active' && to === 'deactivated') return 'revoke';
  if (from === 'deactivated' && to === 'active') return 'reissue';
  return 'none';
}
