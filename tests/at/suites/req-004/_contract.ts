import type { NeedsSut, Session, WriteRefusal, NeedUrgency, TenantReadOutcome } from '../req-003/_contract.ts';
import type { Allowance, SpendRow } from '../../../../supabase/functions/_shared/discovery-allowance.ts';
import type { ModelUsage } from '../../../../supabase/functions/_shared/discovery-metering.ts';
import type { DiscoveryTurnView, Elicitation, Reservation, DiscoveryConversationView } from '../../../../supabase/functions/_shared/discovery-turn.ts';
import type { NeedIntakeView } from '../../../../supabase/functions/_shared/need-intake.ts';
import type { Scope, ScopeView } from '../../../../supabase/functions/_shared/scope.ts';
export type { Session, WriteRefusal, SpendRow, ModelUsage, DiscoveryTurnView, Elicitation, Reservation };
export type { Scope, ScopeView };
export type IntakeFixture = { title: string; description: string; urgency?: NeedUrgency };
export type DiscoveryMessageRequest = { organizationId: string; projectId: string; message: string };
export type DiscoveryMessageOutcome = {
  ok: true; turn: DiscoveryTurnView; reply: string; elicitation: Elicitation | null; allowance: Allowance | null;
  scopeReady: boolean; guardrail: { offTopicCount: number; flagged: boolean; notice: string | null } | null;
} | WriteRefusal;
export type ScopeWriteRequest =
  | { organizationId: string; projectId: string; action: 'generate' }
  | { organizationId: string; projectId: string; action: 'regenerate'; reason: string }
  | { organizationId: string; projectId: string; action: 'remove-label'; label: string };
export type CauseLabelRow = { label: string; firstProjectId: string | null };
export type OperatorScopeBeginInput = {
  accountId: string; organizationId: string; projectId: string;
  action?: 'generate' | 'regenerate'; reason?: string;
};
export type OperatorScopeBeginOutcome = { ok: true; scopeId: string } | WriteRefusal;
export type OperatorScopeCommitInput = {
  accountId: string; projectId: string; scopeId: string; outcome: 'completed' | 'failed';
  contract?: Scope; markdown?: string; labels?: string[];
  servedModel?: string; inputTokens?: number; outputTokens?: number;
};
export type ScopeWriteOutcome = {
  ok: true; changed: boolean; scope: ScopeView | null; scopes: ScopeView[]; need: NeedIntakeView; escalated: boolean;
} | WriteRefusal;
export type OperatorReserveInput = { accountId: string; organizationId: string; projectId: string; message: string; countedInputTokens?: number; countedThroughSeq?: number };
export type OperatorReserveOutcome = { ok: true; reservation: Reservation } | WriteRefusal;
export type OperatorSettleInput = {
  accountId: string; turnId: string; outcome: 'completed' | 'failed'; reply?: string; usage?: ModelUsage; offTopic?: boolean;
};
export type { DiscoveryConversationView };
export type DiscoverySwitchOutcome = { ok: true; organizationId: string; discoveryEnabled: boolean; changed: boolean; disabledAt: string | null } | WriteRefusal;
export type DiscoverySwitchAuditRow = { id: string; actorAccountId: string | null; subjectOrgId: string; reason: string; detail: { enabled: boolean; previously_disabled_at: string | null } };
export type DiscoverySut = NeedsSut & {
  provisionPlatformAdmin(email: string): Promise<Session>;
  vetOrganizationAsAdmin(admin: Session, organizationId: string): Promise<void>;
  startDiscoveryNeed(session: Session, organizationId: string, intake: IntakeFixture): Promise<{ projectId: string }>;
  drainAllowance(session: Session, organizationId: string, leave?: number): Promise<void>;
  writeSpendRowAsOperator(row: SpendRow): Promise<void>;
  spendRows(organizationId: string): Promise<SpendRow[]>;
  sendMessage(session: Session | null, request: DiscoveryMessageRequest): Promise<DiscoveryMessageOutcome>;
  writeScope(session: Session | null, request: ScopeWriteRequest): Promise<ScopeWriteOutcome>;
  seedCauseLabelsAsOperator(labels: string[]): Promise<void>;
  causeLabelRows(): Promise<CauseLabelRow[]>;
  beginScopeAsOperator(input: OperatorScopeBeginInput): Promise<OperatorScopeBeginOutcome>;
  commitScopeAsOperator(input: OperatorScopeCommitInput): Promise<ScopeWriteOutcome>;
  turnRows(projectId: string): Promise<DiscoveryTurnView[]>;
  scopeRows(projectId: string): Promise<ScopeView[]>;
  reserveTurnAsOperator(input: OperatorReserveInput): Promise<OperatorReserveOutcome>;
  settleTurnAsOperator(input: OperatorSettleInput): Promise<DiscoveryMessageOutcome>;
  notificationEvents(event: string): Promise<{ event: string; payload: Record<string, unknown> }[]>;
  backdateOpenTurnAsOperator(turnId: string, openedAt: string): Promise<void>;
  readConversation(session: Session | null, projectId: string): Promise<TenantReadOutcome<{ ok: true; conversation: DiscoveryConversationView; allowance: Allowance | null }>>;
  setProjectFundingAsOperator(projectId: string, funding: { fundedAt: string | null; fuelMicros: number }): Promise<void>;
  projectFundingAsOperator(projectId: string): Promise<{ fundedAt: string | null; fuelMicros: number }>;
  setDiscoverySwitch(session: Session | null, request: { organizationId: string; enabled: boolean; reason: string }): Promise<DiscoverySwitchOutcome>;
  discoverySwitchAuditEvents(organizationId: string): Promise<DiscoverySwitchAuditRow[]>;
  setEmailVerifiedAsOperator(accountId: string, verified: boolean): Promise<void>;
  seedTurnsAsOperator(projectId: string, turns: { message: string; reply: string; usage: ModelUsage; elicitation?: Elicitation }[]): Promise<void>;
  spendLedgerInvariantProblems(organizationId: string): Promise<string[]>;
};
