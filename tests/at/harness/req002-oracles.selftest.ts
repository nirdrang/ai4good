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
