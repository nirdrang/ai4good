/**
 * REQ-002's document-content source arm: no document content is stored or returned.
 *
 * Shared posture (throws rather than report an absence the instrument could not measure;
 * naming oracles over text): `_source-scan.ts`.
 *
 * WHAT THIS IS NOT. It is a type-and-name oracle. A jsonb or text column holding a base64 PDF
 * escapes it. A download screen named `file-desk.tsx` escapes it. Rejecting attachments and
 * storing only metadata cannot prove a document was deleted from the founder's mailbox; this
 * oracle does not look at a mailbox and does not treat `registration_copies_deleted` as proof.
 */

import {
  lineOf,
  loadProductSurfaces,
  productFiles,
  rpcOf,
  type RouteInventory,
  type SourceFile,
} from './_source-scan.ts';
import { splitSqlStatements } from '../req-001/_policy-scan.ts';

const DOCUMENT_BYTE_TYPE = /\b([a-zA-Z_][\w]*)\s+bytea\b/gi;

const DOCUMENT_CONTENT_COLUMNS = [
  'attachment',
  'attachment_bytes',
  'attachment_content',
  'binary_content',
  'content_bytes',
  'document_body',
  'document_bytes',
  'document_content',
  'download_path',
  'download_url',
  'file_bytes',
  'file_content',
  'file_data',
  'object_key',
  'object_path',
  'storage_key',
  'storage_path',
] as const;

const DOCUMENT_CONTENT_COLUMN = new RegExp(
  `\\b(${DOCUMENT_CONTENT_COLUMNS.join('|')})\\s+[a-zA-Z_]`,
  'gi',
);

const DOCUMENT_RETURN_NAME =
  /\b(?:attachment[-_]?download|document[-_]?content|document[-_]?download|document[-_]?file|document[-_]?upload|download[-_]?document|get[-_]?attachment|serve[-_]?document|upload[-_]?document)\b/i;

const STORAGE_API = /\bstorage\.from\s*\(|\bcreateBucket\s*\(|\bcreateSignedUrl\s*\(/;
const DOCUMENT_CONTENT_TYPE = /['"]application\/(?:pdf|octet-stream)['"]/;

export type DocumentContentSinkInput = {
  files: readonly SourceFile[];
  routeFolders: readonly string[];
  inventory: RouteInventory;
  uiRoutes: readonly string[];
};

function namedDocumentReturn(name: string, where: string): string | null {
  return DOCUMENT_RETURN_NAME.test(name) ? `${where} ${name} names a document-content route` : null;
}

/**
 * AT-002.16's structural half: no column holds document bytes, and no route returns a document.
 */
export function scanDocumentContentSinks(input: DocumentContentSinkInput): string[] {
  if (input.files.length === 0) {
    throw new Error('scanDocumentContentSinks found no product source. Refusing to report an absence.');
  }
  const migrations = input.files.filter((file) => file.path.startsWith('supabase/migrations/') && file.path.endsWith('.sql'));
  if (migrations.length === 0) {
    throw new Error('scanDocumentContentSinks found no SQL migrations under supabase/migrations/. Refusing to report an absence.');
  }
  if (input.routeFolders.length === 0) {
    throw new Error('scanDocumentContentSinks found no edge-function route folders. Refusing to report an absence.');
  }
  if (input.uiRoutes.length === 0) {
    throw new Error('scanDocumentContentSinks found no ui routes under src/routes/. Refusing to report an absence.');
  }

  const problems: string[] = [];

  for (const file of migrations) {
    for (const statement of splitSqlStatements(file.text)) {
      DOCUMENT_BYTE_TYPE.lastIndex = 0;
      for (const match of statement.matchAll(DOCUMENT_BYTE_TYPE)) {
        problems.push(`${file.path} column ${match[1]} is bytea, which can hold document bytes`);
      }
      DOCUMENT_CONTENT_COLUMN.lastIndex = 0;
      for (const match of statement.matchAll(DOCUMENT_CONTENT_COLUMN)) {
        problems.push(`${file.path} column ${match[1]} is a document-content sink`);
      }
    }
  }

  for (const file of input.files) {
    const named = namedDocumentReturn(file.path, file.path);
    if (named) problems.push(named);
    if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) continue;
    if (STORAGE_API.test(file.text)) {
      problems.push(`${file.path}:${lineOf(file.text, file.text.search(STORAGE_API))} calls object storage that can hold a document`);
    }
    if (DOCUMENT_CONTENT_TYPE.test(file.text)) {
      problems.push(`${file.path} answers with a document content type`);
    }
  }

  for (const name of input.routeFolders) {
    const named = namedDocumentReturn(name, 'route folder');
    if (named) problems.push(named);
  }
  for (const name of Object.keys(input.inventory)) {
    const named = namedDocumentReturn(name, 'write route');
    if (named) problems.push(named);
    const rpc = rpcOf(input.inventory[name]);
    if (rpc !== null) {
      const rpcNamed = namedDocumentReturn(rpc, `write route ${name} rpc`);
      if (rpcNamed) problems.push(rpcNamed);
    }
  }
  for (const name of input.uiRoutes) {
    const named = namedDocumentReturn(name, 'ui route');
    if (named) problems.push(named);
  }

  return problems.sort();
}

function loadDocumentContentSinkInput(oracle: string): DocumentContentSinkInput {
  const surfaces = loadProductSurfaces(oracle);
  return {
    files: productFiles(oracle),
    routeFolders: surfaces.routeFolders,
    inventory: surfaces.inventory,
    uiRoutes: surfaces.uiRoutes,
  };
}

export function documentContentSinks(): string[] {
  return scanDocumentContentSinks(loadDocumentContentSinkInput('documentContentSinks'));
}
