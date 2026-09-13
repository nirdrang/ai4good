import { splitSqlStatements } from '../req-001/_policy-scan.ts';
import { migrationFiles, type SourceFile } from '../req-002/_source-scan.ts';

export function scanNeedDefinerAcknowledgment(files: readonly SourceFile[]): string[] {
  let last: SourceFile | null = null;
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    for (const statement of splitSqlStatements(file.text)) {
      if (/^create\s+(?:or\s+replace\s+)?function\s+public\.project_need\s*\(/i.test(statement)) {
        last = { path: file.path, text: statement };
      }
    }
  }
  if (last === null) throw new Error('no public.project_need definition was found; refusing to report agreement');
  const body = last.text.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '').replace(/'(?:[^']|'')*'/g, "''");
  return /public\.has_platform_acknowledgment\s*\(/i.test(body)
    ? [] : [`${last.path}: public.project_need does not call public.has_platform_acknowledgment`];
}

export function needDefinerCallsAcknowledgmentHook(): string[] {
  return scanNeedDefinerAcknowledgment(migrationFiles('needDefinerCallsAcknowledgmentHook'));
}
