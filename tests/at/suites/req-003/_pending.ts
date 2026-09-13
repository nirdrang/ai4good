import { CapabilityPending } from './_bind.ts';

export const AWAITED = {
  snapshot: 'intake.snapshot',
  referenceUpload: 'storage.reference-upload',
  uploadSurface: 'ui.reference-upload-surface',
} as const;

export type AwaitedSurface = (typeof AWAITED)[keyof typeof AWAITED];
export function awaiting(...surfaces: AwaitedSurface[]): () => Promise<void> {
  return async () => { throw new CapabilityPending(surfaces); };
}
