import { ACKNOWLEDGMENT_IDENTITY_COPY } from './acknowledgment-copy.ts';
import { stubGithubStatsFor, type GithubStats } from './github.ts';
import type { AccountWriteRouteInput, WriteRouteDecision, WriteRouteInput } from './write-routes.ts';

export const PUBLIC_SIGNUP_ACCOUNT_TYPES = ['ngo', 'volunteer'] as const;

export type PublicSignupAccountType = (typeof PUBLIC_SIGNUP_ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPES = ['ngo', 'volunteer', 'platform_admin'] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_LIFECYCLES = ['active', 'deactivated'] as const;

export type AccountLifecycle = (typeof ACCOUNT_LIFECYCLES)[number];

export function parseAccountLifecycle(raw: unknown): AccountLifecycle | null {
  if (typeof raw !== 'string') return null;
  const candidate = raw.trim();
  return (ACCOUNT_LIFECYCLES as readonly string[]).includes(candidate) ? (candidate as AccountLifecycle) : null;
}

export type Decision<T> = { ok: true; value: T } | { ok: false; reason: string };

function refuse<T>(reason: string): Decision<T> {
  return { ok: false, reason };
}

function accept<T>(value: T): Decision<T> {
  return { ok: true, value };
}

export function parseAccountType(raw: unknown): Decision<PublicSignupAccountType> {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return refuse(
      `account type is required and must be one of ${PUBLIC_SIGNUP_ACCOUNT_TYPES.join(', ')}`,
    );
  }
  const candidate = raw.trim();
  if ((PUBLIC_SIGNUP_ACCOUNT_TYPES as readonly string[]).includes(candidate)) {
    return accept(candidate as PublicSignupAccountType);
  }
  if (candidate === 'platform_admin') {
    return refuse(
      'platform_admin is not available through public signup — a platform administrator is provisioned, never self-signed-up',
    );
  }
  return refuse(
    `unknown account type ${JSON.stringify(candidate)} — public signup offers ${PUBLIC_SIGNUP_ACCOUNT_TYPES.join(', ')}`,
  );
}

export type CompleteSignupRequest = {
  accountType?: unknown;
  organizationName?: unknown;
  acknowledgmentTextVersion?: unknown;
  signerName?: unknown;
  signerTitle?: unknown;
  authorityAttestation?: unknown;
};

export type CompleteSignupCaller = {
  githubHandle: string | null;
};

export type ValidCompleteSignup = {
  accountType: PublicSignupAccountType;
  organizationName: string | null;
  acknowledgmentTextVersion: string;
  githubHandle: string | null;
  signerName: string;
  signerTitle: string;
  authorityAttestation: string;
};

export function validateCompleteSignup(
  request: CompleteSignupRequest,
  caller: CompleteSignupCaller,
): Decision<ValidCompleteSignup> {
  const parsedType = parseAccountType(request.accountType);
  if (!parsedType.ok) return refuse(parsedType.reason);
  const accountType = parsedType.value;

  const rawName = request.organizationName;
  let organizationName: string | null = null;

  if (accountType === 'ngo') {
    if (typeof rawName !== 'string' || rawName.trim() === '') {
      return refuse('an NGO signup must carry a non-empty organisation name');
    }
    organizationName = rawName.trim();
  } else if (rawName !== undefined && rawName !== null) {
    return refuse('a volunteer signup carries no organisation name — one account holds exactly one global type');
  }

  const linkedGithubHandle =
    typeof caller?.githubHandle === 'string' && caller.githubHandle.trim() !== '' ? caller.githubHandle.trim() : null;

  if (accountType === 'volunteer' && linkedGithubHandle === null) {
    return refuse(
      'a volunteer signup cannot be completed without a linked GitHub account — link GitHub to this account, then complete signup',
    );
  }

  const rawVersion = request.acknowledgmentTextVersion;
  if (typeof rawVersion !== 'string' || rawVersion.trim() === '') {
    return refuse(
      'the ToS + Platform Promise acknowledgment text version is required — an acknowledgment that does not say which text was accepted records nothing',
    );
  }

  const rawSignerName = request.signerName;
  if (typeof rawSignerName !== 'string' || rawSignerName.trim() === '') {
    return refuse(
      'the signer name is required — an acknowledgment records the person who made it, and one with no name records nobody',
    );
  }

  const rawSignerTitle = request.signerTitle;
  if (typeof rawSignerTitle !== 'string' || rawSignerTitle.trim() === '') {
    return refuse(
      'the signer title is required — an acknowledgment records the title the person held when they made it',
    );
  }

  const rawAttestation = request.authorityAttestation;
  if (typeof rawAttestation !== 'string' || rawAttestation.trim() === '') {
    return refuse(
      'the authority attestation is required — an acknowledgment with none records that nobody claimed the authority to make it',
    );
  }

  const authorityAttestation = rawAttestation.trim();
  if (authorityAttestation !== ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement) {
    return refuse(
      'the authority attestation does not match the shipped authority statement — an acknowledgment records the statement that was affirmed, and it must be affirmed as shipped, word for word',
    );
  }

  return accept({
    accountType,
    organizationName,
    acknowledgmentTextVersion: rawVersion.trim(),
    signerName: rawSignerName.trim(),
    signerTitle: rawSignerTitle.trim(),
    authorityAttestation,
    githubHandle: accountType === 'volunteer' ? linkedGithubHandle : null,
  });
}

export function validateOrganizationName(raw: unknown): Decision<string> {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return refuse('an organisation needs a non-empty name');
  }
  return accept(raw.trim());
}

export function ngoOnlyActionAllowed(accountType: unknown): Decision<'ngo'> {
  if (accountType === 'ngo') return accept('ngo');
  if (typeof accountType !== 'string' || !(ACCOUNT_TYPES as readonly string[]).includes(accountType)) {
    return refuse('this action is available to NGO accounts only, and the caller holds no recognised account type');
  }
  return refuse(
    `this action is available to NGO accounts only — the caller's account is of type ${JSON.stringify(accountType)}, ` +
      'and one account holds exactly one global type, so the NGO path requires a separate account',
  );
}

export const PLATFORM_ACKNOWLEDGMENT_KIND = 'platform_tos_and_promise';

export type SignupCompletionArgs = {
  readonly p_account_id: string;
  readonly p_account_type: PublicSignupAccountType;
  readonly p_organization_name: string | null;
  readonly p_acknowledgment_text_version: string;
  readonly p_ip: string | null;
  readonly p_signer_name: string;
  readonly p_signer_title: string;
  readonly p_authority_attestation: string;
  readonly p_github_handle?: string;
  readonly p_github_top_languages?: GithubStats['topLanguages'];
  readonly p_github_repository_count?: number;
  readonly p_github_contribution_summary?: string;
};

type GithubArguments = Pick<
  SignupCompletionArgs,
  'p_github_handle' | 'p_github_top_languages' | 'p_github_repository_count' | 'p_github_contribution_summary'
>;

function githubArguments(githubHandle: string | null): GithubArguments {
  if (githubHandle === null) return {};
  const stats = stubGithubStatsFor(githubHandle);
  return {
    p_github_handle: githubHandle,
    p_github_top_languages: stats.topLanguages,
    p_github_repository_count: stats.repositoryCount,
    p_github_contribution_summary: stats.contributionSummary,
  };
}

export function decideSignupCompletion(input: WriteRouteInput): WriteRouteDecision<SignupCompletionArgs> {
  const verifiedGithubHandle = input.caller.githubHandle;
  const decision = validateCompleteSignup(
    {
      accountType: input.body.accountType,
      organizationName: input.body.organizationName,
      acknowledgmentTextVersion: input.body.acknowledgmentTextVersion,
      signerName: input.body.signerName,
      signerTitle: input.body.signerTitle,
      authorityAttestation: input.body.authorityAttestation,
    },
    { githubHandle: verifiedGithubHandle },
  );
  if (!decision.ok) return { ok: false, kind: 'invalid-request', reason: decision.reason, status: 400 };
  const {
    accountType,
    organizationName,
    acknowledgmentTextVersion,
    githubHandle,
    signerName,
    signerTitle,
    authorityAttestation,
  } = decision.value;
  return {
    ok: true,
    args: {
      p_account_id: input.caller.id,
      p_account_type: accountType,
      p_organization_name: organizationName,
      p_acknowledgment_text_version: acknowledgmentTextVersion,
      p_ip: input.ip,
      p_signer_name: signerName,
      p_signer_title: signerTitle,
      p_authority_attestation: authorityAttestation,
      ...githubArguments(githubHandle),
    },
  };
}

export type OrganizationCreationArgs = {
  readonly p_account_id: string;
  readonly p_name: string;
};

export function decideOrganizationCreation(input: AccountWriteRouteInput): WriteRouteDecision<OrganizationCreationArgs> {
  const name = validateOrganizationName(input.body.name);
  if (!name.ok) return { ok: false, kind: 'invalid-name', reason: name.reason, status: 400 };
  return { ok: true, args: { p_account_id: input.caller.id, p_name: name.value } };
}
