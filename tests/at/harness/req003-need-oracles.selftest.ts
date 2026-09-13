import { describe, expect, it } from 'vitest';
import { needDefinerCallsAcknowledgmentHook, scanNeedDefinerAcknowledgment } from '../suites/req-003/_source-need.ts';

const definition = (body: string) => `create function public.project_need() returns void language plpgsql as $$ begin ${body} end; $$;`;
const file = (text: string, path = 'supabase/migrations/001.sql') => ({ path, text });

describe('need creation acknowledgment source arm', () => {
  it('accepts the shipped definition', () => {
    expect(needDefinerCallsAcknowledgmentHook()).toEqual([]);
  });
  it('refuses injected SQL without the hook and ignores comments and quoted text', () => {
    expect(scanNeedDefinerAcknowledgment([file(definition('perform public.has_platform_acknowledgment(p_account_id);'))])).toEqual([]);
    expect(scanNeedDefinerAcknowledgment([file(definition('return;'))])).toHaveLength(1);
    expect(scanNeedDefinerAcknowledgment([file(definition("-- public.has_platform_acknowledgment(p_account_id);\nraise notice 'public.has_platform_acknowledgment(';"))])).toHaveLength(1);
  });
  it('judges the latest definition even when supplied out of order', () => {
    const older = file(definition('perform public.has_platform_acknowledgment(p_account_id);'));
    const newer = file(definition('return;'), 'supabase/migrations/002.sql');
    expect(scanNeedDefinerAcknowledgment([newer, older])).toHaveLength(1);
  });
  it('throws when it cannot find the definer', () => {
    expect(() => scanNeedDefinerAcknowledgment([])).toThrow(/no public.project_need definition/);
    expect(() => scanNeedDefinerAcknowledgment([file('select 1;')])).toThrow(/no public.project_need definition/);
  });
});
