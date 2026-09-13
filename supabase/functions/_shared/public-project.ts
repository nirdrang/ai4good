/**
 * The public project page: one eligibility predicate and a field-by-field projection.
 *
 * Pure: relative imports only, no Deno, no I/O.
 */

import type { ReadResult } from './tenant-reads.ts';

export type PublicProjectView = { projectId: string; projectName: string; organizationName: string };
export type PublicProjectSource = { project_id: string; project_name: string; organization_name: string; need_stage: string | null };

/** ONE answer for "no such project" and "not public", with no way to tell which. Returned, never thrown. */
export const PROJECT_NOT_PUBLIC = {
  status: 404,
  body: { ok: false, reason: 'no such project page is public' },
} as const;

/** Needs stay private until the publication rule owned by REQ-010/011 lands. */
export function projectIsPublic(source: PublicProjectSource): boolean {
  return source.need_stage === null;
}

export function publicProjectView(source: PublicProjectSource): PublicProjectView {
  return {
    projectId: source.project_id,
    projectName: source.project_name,
    organizationName: source.organization_name,
  };
}

export type PublicProjectReads = { source(projectId: string): Promise<ReadResult<PublicProjectSource>> };

/** THE ONE outage answer for the public surface. Names nothing. */
export const PUBLIC_READ_FAILED = {
  status: 502,
  body: { ok: false, reason: 'the public project page could not be read, so no answer was given' },
} as const;

export type PublicProjectAnswer =
  | { status: 200; body: { ok: true } & PublicProjectView }
  | typeof PROJECT_NOT_PUBLIC
  | typeof PUBLIC_READ_FAILED;

export async function publicProjectAnswer(
  projectId: string,
  reads: PublicProjectReads,
): Promise<PublicProjectAnswer> {
  const read = await reads.source(projectId);
  if (!read.ok) return PUBLIC_READ_FAILED;
  const row = read.rows[0];
  if (row === undefined || !projectIsPublic(row)) return PROJECT_NOT_PUBLIC;
  return { status: 200, body: { ok: true, ...publicProjectView(row) } };
}
