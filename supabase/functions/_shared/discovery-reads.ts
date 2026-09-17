import type { NeedReads } from './need-intake.ts';
import type { ReadResult, TenantReads } from './tenant-reads.ts';

export type DiscoveryTurnSqlRow = {
  id: string; project_id: string; org_id: string; seq: number; status: 'open' | 'settled' | 'failed' | 'abandoned';
  billing: 'free' | 'fuel'; utc_day: string; user_message: string; assistant_message: string | null;
  elicitation: {
    complete: true; facts: string[]; constraints: string[];
    userStories: { story: string; acceptanceCriteria: string[] }[]; openQuestions: string[];
  } | null;
  request_settings: { model: string; max_tokens: number; effort: 'low' };
  max_output_tokens: number; estimated_input_tokens: number; micros_per_credit: number;
  input_micros_per_token: number; output_micros_per_token: number; reserved_micros: number; reserved_credits: number;
  input_tokens: number | null; output_tokens: number | null; stop_reason: string | null; served_model: string | null;
  actual_micros: number | null; charged_credits: number | null; overrun_micros: number | null;
  opened_at: string; settled_at: string | null;
};
export type DiscoveryReads = {
  discoveryTurnsOf(projectId: string): Promise<ReadResult<DiscoveryTurnSqlRow>>;
  discoveryAllowance(organizationId: string): Promise<{ ok: true; value: unknown } | { ok: false; detail: string }>;
};
export type CallerReads = TenantReads & NeedReads & DiscoveryReads;
