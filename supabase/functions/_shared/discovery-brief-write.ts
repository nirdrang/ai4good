/** The Discovery brief write: shape the request, run the pure rules, and hand the commit a document. */

import type { Caller } from './caller.ts';
import {
  BRIEF_REASONS,
  briefVersionFrom,
  briefViewFromRead,
  decideFinish,
  evolveBrief,
  type AcceptedGap,
  type BriefCommand,
  type BriefDocument,
  type PersonLine,
} from './discovery-brief.ts';
import { DISCOVERY_TURN_DEADLINE_SECONDS } from './discovery-metering.ts';
import type { CallerReads } from './discovery-reads.ts';
import { orgAdminActionAllowed } from './memberships.ts';
import {
  booleanField,
  integerField,
  isRecord,
  parseWriteRefusalKind,
  refuseWrite,
  stringField,
  uuidField,
  type AccountWriteRouteInput,
  type WriteRouteDecision,
} from './write-routes.ts';

export type DiscoveryBriefCommitArgs = {
  p_account_id: string;
  p_organization_id: string;
  p_project_id: string;
  p_base_revision: number;
  p_action: string;
  p_document: BriefDocument | null;
  p_person_line: PersonLine | null;
  p_confirmation: { revision: number; at: string; acceptedGaps: AcceptedGap[] } | null;
  p_turn_deadline_seconds: number;
  /** Null means the action has no client revision (ask). Stripped before the commit. */
  clientBase?: number | null;
  sectionId?: string;
  text?: string;
  topicId?: string;
  label?: string;
  acks?: { reviewed: true; openGaps: boolean; data: boolean };
};

const ACTIONS = ['edit', 'accept', 'ask', 'remove-label', 'finish'] as const;
type BriefAction = (typeof ACTIONS)[number];

function isAction(value: string | null): value is BriefAction {
  return value !== null && (ACTIONS as readonly string[]).includes(value);
}

function commitArgs(
  args: DiscoveryBriefCommitArgs,
  base: number,
  document: BriefDocument | null,
  personLine: PersonLine | null,
  confirmation: DiscoveryBriefCommitArgs['p_confirmation'],
): DiscoveryBriefCommitArgs {
  return {
    p_account_id: args.p_account_id,
    p_organization_id: args.p_organization_id,
    p_project_id: args.p_project_id,
    p_base_revision: base,
    p_action: args.p_action,
    p_document: document,
    p_person_line: personLine,
    p_confirmation: confirmation,
    p_turn_deadline_seconds: DISCOVERY_TURN_DEADLINE_SECONDS,
  };
}

function ruleRefusal(kind: string, reason: string): WriteRouteDecision<DiscoveryBriefCommitArgs> {
  const parsed = parseWriteRefusalKind(kind);
  return refuseWrite(parsed, parsed === 'invalid-request' ? 400 : 409, reason);
}

export function decideDiscoveryBrief(input: AccountWriteRouteInput): WriteRouteDecision<DiscoveryBriefCommitArgs> {
  const organizationId = input.target;
  if (organizationId === null) {
    return refuseWrite('invalid-request', 400, 'the Discovery brief action must name the organisation by id (organizationId)');
  }
  if (!input.standing.orgExists) {
    return refuseWrite('no-such-organisation', 409, `no organisation ${organizationId} exists`);
  }
  const allowed = orgAdminActionAllowed(input.standing.orgRole);
  if (!allowed.ok) return { ok: false, kind: allowed.kind, reason: allowed.reason, status: 403 };

  const projectId = uuidField(input.body.projectId);
  const action = stringField(input.body.action);
  if (projectId === null || !isAction(action)) {
    return refuseWrite('invalid-request', 400, 'the Discovery brief action must name the project and be edit, accept, ask, remove-label or finish');
  }

  const held: DiscoveryBriefCommitArgs = {
    p_account_id: input.caller.id,
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_base_revision: 0,
    p_action: action,
    p_document: null,
    p_person_line: null,
    p_confirmation: null,
    p_turn_deadline_seconds: DISCOVERY_TURN_DEADLINE_SECONDS,
    clientBase: null,
  };

  if (action === 'edit') {
    const sectionId = stringField(input.body.sectionId);
    const base = integerField(input.body.baseRevision);
    if (sectionId === null || typeof input.body.text !== 'string' || base === null || base < 1) {
      return refuseWrite('invalid-request', 400, 'an edit must name the section, the text and the revision it was based on');
    }
    return { ok: true, args: { ...held, clientBase: base, sectionId, text: input.body.text } };
  }

  if (action === 'accept' || action === 'ask') {
    const topicId = stringField(input.body.topicId);
    if (topicId === null) return refuseWrite('invalid-request', 400, 'the Discovery brief action must name the topic');
    if (action === 'ask') return { ok: true, args: { ...held, topicId } };
    const base = integerField(input.body.baseRevision);
    if (base === null || base < 1) {
      return refuseWrite('invalid-request', 400, 'accepting a suggestion must name the revision it was based on');
    }
    return { ok: true, args: { ...held, clientBase: base, topicId } };
  }

  if (action === 'remove-label') {
    const label = stringField(input.body.label);
    const base = integerField(input.body.baseRevision);
    if (label === null || base === null || base < 1) {
      return refuseWrite('invalid-request', 400, 'removing a label must name the label and the revision it was based on');
    }
    return { ok: true, args: { ...held, clientBase: base, label } };
  }

  const revision = integerField(input.body.revision);
  const acks = input.body.acks;
  const openGaps = isRecord(acks) ? booleanField(acks.openGaps) : null;
  const data = isRecord(acks) ? booleanField(acks.data) : null;
  if (revision === null || revision < 1 || !isRecord(acks) || acks.reviewed !== true || openGaps === null || data === null) {
    return refuseWrite('invalid-request', 400, 'finish must name the revision and the review, gap and data acknowledgements');
  }
  return { ok: true, args: { ...held, clientBase: revision, acks: { reviewed: true, openGaps, data } } };
}

export async function prepareDiscoveryBrief(
  caller: Caller,
  args: DiscoveryBriefCommitArgs,
  reads: Pick<CallerReads, 'discoveryBriefOf'>,
): Promise<WriteRouteDecision<DiscoveryBriefCommitArgs>> {
  const read = await reads.discoveryBriefOf(args.p_project_id);
  if (!read.ok) throw new Error(read.detail);
  const version = isRecord(read.value) ? briefVersionFrom(read.value.revision, read.value.document) : null;
  if (version === null) return refuseWrite('invalid-request', 409, 'Discovery has no brief yet.');
  const stored = briefViewFromRead(read.value);
  const confirmed = stored.confirmation !== null && stored.confirmation.revision === version.revision;
  const action = args.p_action;
  if (confirmed && (action === 'accept' || action === 'ask' || action === 'remove-label')) {
    return ruleRefusal('finished', BRIEF_REASONS.finished);
  }
  const base = args.clientBase ?? version.revision;
  if (base !== version.revision) return { ok: true, args: commitArgs(args, base, null, null, null) };

  if (action === 'finish') {
    const acks = args.acks;
    if (acks === undefined) return refuseWrite('invalid-request', 400, 'finish must name the acknowledgements');
    const decision = decideFinish(version, {
      acks,
      filesReading: false,
      actor: { id: caller.id, displayName: caller.id },
      at: new Date().toISOString(),
      existing: stored.confirmation,
    });
    if (!decision.ok) return ruleRefusal(decision.kind, decision.reason);
    const confirmation = stored.confirmation === null
      ? {
          revision: decision.confirmation.revision,
          at: decision.confirmation.at,
          acceptedGaps: decision.confirmation.acceptedGaps,
        }
      : null;
    return { ok: true, args: commitArgs(args, version.revision, null, null, confirmation) };
  }

  let command: BriefCommand;
  if (action === 'edit') {
    if (args.sectionId === undefined || args.text === undefined) {
      return refuseWrite('invalid-request', 400, 'an edit must name the section and the text');
    }
    command = { kind: 'edit', sectionId: args.sectionId, text: args.text };
  } else if (action === 'accept') {
    if (args.topicId === undefined) return refuseWrite('invalid-request', 400, 'the Discovery brief action must name the topic');
    command = { kind: 'accept-suggestion', topicId: args.topicId };
  } else if (action === 'ask') {
    if (args.topicId === undefined) return refuseWrite('invalid-request', 400, 'the Discovery brief action must name the topic');
    command = { kind: 'ask-topic', topicId: args.topicId };
  } else if (action === 'remove-label') {
    if (args.label === undefined) return refuseWrite('invalid-request', 400, 'removing a label must name the label');
    command = { kind: 'remove-label', label: args.label };
  } else {
    return refuseWrite('invalid-request', 400, 'the Discovery brief action must be edit, accept, ask, remove-label or finish');
  }

  const transition = evolveBrief(version, command);
  if (transition.kind === 'refused') return ruleRefusal(transition.refusal.kind, transition.refusal.reason);
  if (transition.kind === 'unchanged') return { ok: true, args: commitArgs(args, version.revision, null, null, null) };
  return {
    ok: true,
    args: commitArgs(args, version.revision, transition.brief.document, transition.personLine, null),
  };
}

export function renderDiscoveryBrief(value: unknown): { brief: NonNullable<ReturnType<typeof briefViewFromRead>['brief']>; confirmation: ReturnType<typeof briefViewFromRead>['confirmation']; lines: PersonLine[] } {
  const view = briefViewFromRead(value);
  if (view.brief === null) throw new Error('discovery brief commit returned no brief');
  return { brief: view.brief, confirmation: view.confirmation, lines: view.lines };
}
