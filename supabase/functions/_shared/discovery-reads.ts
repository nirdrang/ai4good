import type { NeedReads } from './need-intake.ts';
import type { ScopeSqlRow } from './scope.ts';
import type { ReadResult, TenantReads } from './tenant-reads.ts';

export type DiscoveryTurnSqlRow = {
  id: string; project_id: string; org_id: string; seq: number; status: 'open' | 'settled' | 'failed' | 'abandoned';
  billing: 'free' | 'fuel' | 'retry' | 'opening'; utc_day: string; user_message: string; assistant_message: string | null;
  user_message_id?: string | null; answers?: unknown; assistant_ui?: unknown; base_revision?: number | null;
  elicitation: {
    complete: true; facts: string[]; constraints: string[];
    userStories: { story: string; acceptanceCriteria: string[] }[]; openQuestions: string[];
  } | null;
  request_settings: {
    model: string; max_tokens: number; effort: 'low'; assistant_message_id?: string;
    guardrails?: { active: boolean; off_topic_flag_strikes: number };
  };
  max_output_tokens: number; reserved_micros: number; reserved_credits: number;
  input_tokens: number | null; output_tokens: number | null; stop_reason: string | null; served_model: string | null;
  actual_micros: number | null; charged_credits: number | null; overrun_micros: number | null;
  opened_at: string; settled_at: string | null; off_topic: boolean;
};

export type DiscoveryReads = {
  discoveryTurnsOf(projectId: string): Promise<ReadResult<DiscoveryTurnSqlRow>>;
  discoveryScopesOf(projectId: string): Promise<ReadResult<ScopeSqlRow>>;
  discoveryAllowance(organizationId: string): Promise<{ ok: true; value: unknown } | { ok: false; detail: string }>;
  discoveryBriefOf(projectId: string): Promise<{ ok: true; value: unknown } | { ok: false; detail: string }>;
};
export type CallerReads = TenantReads & NeedReads & DiscoveryReads;
