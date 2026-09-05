/**
 * The public project page: one eligibility predicate and a field-by-field projection.
 *
 * Pure: relative imports only, no Deno, no I/O.
 */

import type { ReadResult } from './tenant-reads.ts';

export type PublicProjectView = { projectId: string; projectName: string; organizationName: string };
export type PublicProjectSource = { project_id: string; project_name: string; organization_name: string };

/** ONE answer for "no such project" and "not public", with no way to tell which. Returned, never thrown. */
export const PROJECT_NOT_PUBLIC = {
  status: 404,
  body: { ok: false, reason: 'no such project page is public' },
} as const;

/**
 * Whether a project row may be shown to the world. TRUE FOR EVERY ROW TODAY: projects carries no
 * visibility or lifecycle column, and the requirement that owns publication (REQ-010/011) has not landed.
 * This is the one place that requirement puts its rule.
 */
export function projectIsPublic(_source: PublicProjectSource): boolean {
  return true;
}

/** Built field by field, so a wider row cannot leak a field through. */
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

/** A page, or one of the two constants. There is no fourth member, so a handler has nowhere to put a second refusal. */
export type PublicProjectAnswer =
  | { status: 200; body: { ok: true } & PublicProjectView }
  | typeof PROJECT_NOT_PUBLIC
  | typeof PUBLIC_READ_FAILED;

/** One read, then the predicate, then ONE `return PROJECT_NOT_PUBLIC` for both refusals. */
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
