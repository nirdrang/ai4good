/**
 * Oracle for REQ-002's document-content source arm: each refusal the scan names, over injected text.
 */

import { describe, expect, it } from 'vitest';

import { WRITE_ROUTES } from '../../../supabase/functions/_shared/write-routes.ts';
import { documentContentSinks, scanDocumentContentSinks } from '../suites/req-002/_source-documents.ts';

const TABLE = `
create table public.org_vetting (
  org_id uuid primary key,
  vetted boolean not null
)
`;

describe('REQ-002 document source oracles over the real tree', () => {
  it('report no problems', () => {
    expect(documentContentSinks()).toEqual([]);
  });
});

describe('scanDocumentContentSinks refusals', () => {
  const clean = {
    files: [{ path: 'supabase/migrations/a.sql', text: TABLE }],
    routeFolders: ['set-organization-vetting', 'organization-dashboard', 'public-project'],
    inventory: WRITE_ROUTES,
    uiRoutes: ['index.tsx', '__root.tsx'],
  };

  it('accepts the real metadata columns and the existing routes', () => {
    expect(
      scanDocumentContentSinks({
        ...clean,
        files: [{ path: 'supabase/migrations/a.sql', text: `${TABLE};\ncreate table public.org_vetting (org_id uuid, registration_document_count integer);` }],
      }),
    ).toEqual([]);
  });

  it('fails a bytea column', () => {
    const problems = scanDocumentContentSinks({
      ...clean,
      files: [{ path: 'supabase/migrations/a.sql', text: 'create table public.docs (id uuid, content bytea);' }],
    });
    expect(problems.some((problem) => /content is bytea/.test(problem))).toBe(true);
  });

  it('fails a named document-content column', () => {
    const problems = scanDocumentContentSinks({
      ...clean,
      files: [{ path: 'supabase/migrations/a.sql', text: 'create table public.docs (id uuid, document_content text);' }],
    });
    expect(problems.some((problem) => problem.includes('document_content') && /sink/.test(problem))).toBe(true);
  });

  it('fails a download-document route folder', () => {
    const problems = scanDocumentContentSinks({ ...clean, routeFolders: [...clean.routeFolders, 'download-document'] });
    expect(problems.some((problem) => problem.includes('download-document'))).toBe(true);
  });

  it('fails an object-storage call in a product module', () => {
    const problems = scanDocumentContentSinks({
      ...clean,
      files: [
        { path: 'supabase/migrations/a.sql', text: TABLE },
        { path: 'supabase/functions/_shared/docs.ts', text: "await supabase.storage.from('docs').upload('a', bytes);\n" },
      ],
    });
    expect(problems.some((problem) => /object storage/.test(problem))).toBe(true);
  });

  it('fails a document content type in a product module', () => {
    const problems = scanDocumentContentSinks({
      ...clean,
      files: [
        { path: 'supabase/migrations/a.sql', text: TABLE },
        {
          path: 'supabase/functions/download-file/index.ts',
          text: "return new Response(pdf, { headers: { 'Content-Type': 'application/pdf' } });\n",
        },
      ],
    });
    expect(problems.some((problem) => /document content type/.test(problem))).toBe(true);
  });

  it('throws when there is no product source', () => {
    expect(() =>
      scanDocumentContentSinks({ files: [], routeFolders: ['set-organization-vetting'], inventory: WRITE_ROUTES, uiRoutes: ['index.tsx'] }),
    ).toThrow(/no product source/);
  });

  it('throws when there are no migrations', () => {
    expect(() =>
      scanDocumentContentSinks({
        files: [{ path: 'supabase/functions/_shared/org-vetting.ts', text: 'export const x = 1;\n' }],
        routeFolders: ['set-organization-vetting'],
        inventory: WRITE_ROUTES,
        uiRoutes: ['index.tsx'],
      }),
    ).toThrow(/no SQL migrations/);
  });
});
