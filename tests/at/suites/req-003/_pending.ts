import { CapabilityPending } from './_bind.ts';

export const AWAITED = {
  labels: 'intake.labels',
  referenceFiles: 'intake.reference-files',
  tier2Disclosure: 'intake.tier2-disclosure',
  submission: 'intake.submission',
  snapshot: 'intake.snapshot',
  referenceUpload: 'storage.reference-upload',
  uploadSurface: 'ui.reference-upload-surface',
} as const;

export type AwaitedSurface = (typeof AWAITED)[keyof typeof AWAITED];
export function awaiting(...surfaces: AwaitedSurface[]): () => Promise<void> {
  return async () => { throw new CapabilityPending(surfaces); };
}
