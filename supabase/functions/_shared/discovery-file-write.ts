import { FILE_MAX_BYTES, FILE_MEDIA_TYPES } from './discovery-files.ts';
import { orgAdminActionAllowed } from './memberships.ts';
import { integerField, isRecord, refuseWrite, stringField, uuidField, type AccountWriteRouteInput } from './write-routes.ts';

export function decideDiscoveryFile(input: AccountWriteRouteInput) {
  if (input.target === null) return refuseWrite('invalid-request', 400, 'Name the organisation for this file.');
  if (!input.standing.orgExists) return refuseWrite('no-such-organisation', 409, 'No such organisation.');
  const allowed = orgAdminActionAllowed(input.standing.orgRole);
  if (!allowed.ok) return refuseWrite(allowed.kind, 403, allowed.reason);
  const projectId = uuidField(input.body.projectId);
  const file = input.body.file;
  const action = input.body.action;
  if (projectId === null || !isRecord(file) || uuidField(file.id) === null || (action !== 'add' && action !== 'remove')) {
    return refuseWrite('invalid-request', 400, 'Name the project, file and add or remove action.');
  }
  if (action === 'add') {
    const size = integerField(file.sizeBytes);
    if (size !== null && size > FILE_MAX_BYTES) return refuseWrite('file-too-large', 413, 'Choose a file of 10 MB or less.');
    if (typeof file.mediaType !== 'string' || !(FILE_MEDIA_TYPES as readonly string[]).includes(file.mediaType)) {
      return refuseWrite('unsupported-file-type', 415, 'Choose a PDF, image, CSV, TSV, text, Word or Excel file.');
    }
    const name = stringField(file.name);
    if (name === null || name.length > 255 || size === null || size <= 0 || typeof file.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(file.contentHash)) {
      return refuseWrite('invalid-request', 400, 'The upload needs a name, nonempty content and a content hash.');
    }
  }
  return { ok: true as const, args: { p_account_id: input.caller.id, p_organization_id: input.target,
    p_project_id: projectId, p_action: action, p_file: file } };
}
