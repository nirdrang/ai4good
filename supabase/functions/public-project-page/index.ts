/**
 * `public-project-page` — AT-001.22's "the public project page remains visible" and AT-001.24's
 * "only public surfaces render (listings, project pages)".
 *
 * ============================================================================================
 * THE FIRST `verify_jwt = false` FUNCTION IN THIS REPOSITORY, AND THE ONLY ONE
 * ============================================================================================
 *
 * Every other function here operates for an already-authenticated caller and says so in
 * `supabase/config.toml`. This one answers a logged-out visitor, because that is the criterion: a
 * denial that also hid the public page would satisfy AT-001.22's first half and break its second.
 *
 * IT REVEALS THAT A PROJECT EXISTS, DELIBERATELY. AT-001.21's clause is "no existence oracle BEYOND
 * PUBLIC SURFACES", and this IS the public surface — the carve-out the criterion writes for itself.
 * Keeping it a SEPARATE FUNCTION is what stops that carve-out contaminating the no-oracle test: the
 * two authenticated surfaces have one refusal constant and no public branch to fall through to.
 *
 * WHAT IT MAY ANSWER IS THE SHARED MODULE'S — `publicProjectView` in `../_shared/visibility.ts`
 * builds the projection field by field and copies nothing wholesale, so a column added to
 * `public.projects` cannot arrive here by accident. This file chooses no fields at all.
 *
 * THE READ ORDER IS NOT LOAD-BEARING HERE, and saying so is the point rather than an omission. This
 * surface makes no access decision — it answers everyone the same way — so there is no second answer
 * for an ordering to keep indistinguishable from the first. It reads the project, then the
 * organisation whose name the projection carries.
 */

import {
  edgeHandler,
  json,
  readJsonBody,
  readRows,
  refusal,
  requireEnv,
} from '../_shared/edge.ts';
import { TENANT_NOT_FOUND, publicProjectView } from '../_shared/visibility.ts';

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');

/** An outage, naming no identifier — the same shape the two authenticated surfaces use. */
function readFailed(): Response {
  return json(
    { ok: false, reason: 'the public project page could not read what it needs, so no answer was made' },
    502,
  );
}

Deno.serve(edgeHandler('public-project-page', async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refusal('public-project-page accepts POST only', 405);

  // NO `resolveCaller` CALL, and its absence is the substance of this function. There is nobody to
  // resolve: an anonymous visitor and a signed-in one receive the same answer, so asking Auth who is
  // calling would be a round trip whose result nothing may read.
  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);

  const rawId = body.value.projectId;
  if (typeof rawId !== 'string' || rawId.trim() === '') {
    return refusal('a public project page read must name the project to read', 400);
  }
  const projectId = rawId.trim();

  const projectRead = await readRows(
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    `projects?id=eq.${encodeURIComponent(projectId)}&select=id,org_id,name`,
  );
  if (!projectRead.ok) return readFailed();
  const project = projectRead.rows[0];
  if (project === undefined) return json(TENANT_NOT_FOUND.body, TENANT_NOT_FOUND.status);

  const organizationRead = await readRows(
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    `organizations?id=eq.${encodeURIComponent(String(project.org_id))}&select=name`,
  );
  if (!organizationRead.ok) return readFailed();
  const organization = organizationRead.rows[0];
  // A project whose organisation row is gone has no public page to render — the same not-found
  // answer, because a page naming no organisation would be a projection with a hole in it.
  if (organization === undefined) return json(TENANT_NOT_FOUND.body, TENANT_NOT_FOUND.status);

  const view = publicProjectView(
    { id: String(project.id), name: String(project.name) },
    { name: String(organization.name) },
  );
  return json({ ok: true, ...view }, 200);
}));
