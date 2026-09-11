/**
 * Cross-family smoke for REQ-002's source arms over the real tree.
 * Refusal cases live in req002-vetting-oracles.selftest.ts,
 * req002-documents-oracles.selftest.ts, req002-pins-oracles.selftest.ts,
 * and req002-absences-oracles.selftest.ts.
 */

import { describe, expect, it } from 'vitest';

import { documentContentSinks } from '../suites/req-002/_source-documents.ts';
import {
  absentPublishFlowProblems,
  discoveryWalletProblems,
  trustWordingProblems,
} from '../suites/req-002/_source-absences.ts';
import {
  emailUnverifiedSentenceProblems,
  exhaustedSentenceProblems,
  noticeChannelPinProblems,
} from '../suites/req-002/_source-pins.ts';
import {
  kycSurfaceProblems,
  orgVettingWriterProblems,
  scheduledVettingProblems,
  vettedStateProblems,
  vettingRouteProblems,
} from '../suites/req-002/_source-vetting.ts';

describe('REQ-002 source oracles over the real tree', () => {
  it('report no problems', () => {
    expect(vettingRouteProblems()).toEqual([]);
    expect(orgVettingWriterProblems()).toEqual([]);
    expect(scheduledVettingProblems()).toEqual([]);
    expect(kycSurfaceProblems()).toEqual([]);
    expect(vettedStateProblems()).toEqual([]);
    expect(documentContentSinks()).toEqual([]);
    expect(trustWordingProblems()).toEqual([]);
    expect(exhaustedSentenceProblems()).toEqual([]);
    expect(emailUnverifiedSentenceProblems()).toEqual([]);
    expect(noticeChannelPinProblems()).toEqual([]);
    expect(discoveryWalletProblems()).toEqual([]);
    expect(absentPublishFlowProblems()).toEqual([]);
  });
});
