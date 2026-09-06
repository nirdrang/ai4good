/**
 * THE CONFORMANCE CHECK FOR THE WRITE BOUNDARY (AT-001.29).
 *
 * It proves registration and construction — that every TypeScript file under `supabase/functions/`
 * able to reach the database does so through the one constructor, and that the constructor's list
 * and the tree agree in both directions. It does not prove that the gate refuses; only the
 * integration tier does that, by deactivating an account and driving the deployed function.
 *
 * WHAT THIS SCAN DOES NOT SEE: a bypass that builds the Data API URL from fragments, so the source
 * never contains `/rest/v1/` or `createClient` as a single token.
 *
 * Precedent: `_source-scan.ts`. No sentinel, fault, vendor stand-in or fixture world. The SQL half
 * reuses `splitSqlStatements` and the definer tracking in `_policy-scan.ts`.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WRITE_ROUTES, type WriteRouteName } from '../../../../supabase/functions/_shared/write-routes.ts';
import { scanWriteGateSql, type MigrationFile } from './_policy-scan.ts';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

export type RouteProblem = { code: string; detail: string };
export type RouteFile = { name: string; text: string };

export type WriteRouteTree = {
  files: RouteFile[];
  configToml: string;
  edgeModule: string;
  migrations: MigrationFile[];
  fixtureText: string;
};

const REACHES_DATABASE =
  /writeRoute|callDatabaseFunction|\/rest\/v1\/|createClient|\.rpc\(|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/;
const BYPASS =
  /\/rest\/v1\/|createClient|\.rpc\(|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/g;
const BYPASS_TEST = /\/rest\/v1\/|createClient|\.rpc\(|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/;
const CONSTRUCTOR = 'Deno.serve(writeRoute(';
const NAME_LITERAL = /\bname:\s*['"]([^'"]+)['"]/;
const EDGE_ALLOWED_FUNCTIONS = ['callDatabaseFunction', 'publicProjectReads', 'callerReads'];

function dirOf(file: RouteFile): string {
  return file.name.replace(/\\/g, '/').replace(/\/index\.ts$/, '');
}

function edgeKeys(inventory: typeof WRITE_ROUTES): WriteRouteName[] {
  return (Object.keys(inventory) as WriteRouteName[]).filter((name) => inventory[name].surface.kind === 'edge');
}

function standInKeys(inventory: typeof WRITE_ROUTES): WriteRouteName[] {
  return (Object.keys(inventory) as WriteRouteName[]).filter((name) => inventory[name].surface.kind === 'stand-in');
}

function functionBlock(configToml: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const header = new RegExp(`^\\[functions\\.${escaped}\\]\\s*$`, 'm');
  const match = header.exec(configToml);
  if (!match) return null;
  const start = match.index + match[0].length;
  const rest = configToml.slice(start);
  const next = rest.search(/^\[/m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function exportsCallDatabaseFunction(edgeModule: string): boolean {
  return (
    /\bexport\s+async\s+function\s+callDatabaseFunction\b/.test(edgeModule) ||
    /\bexport\s+function\s+callDatabaseFunction\b/.test(edgeModule) ||
    /\bexport\s+const\s+callDatabaseFunction\b/.test(edgeModule) ||
    /\bexport\s+default\s+callDatabaseFunction\b/.test(edgeModule) ||
    /\bexport\s*\{[^}]*\bcallDatabaseFunction\b/.test(edgeModule)
  );
}

function stripTsComments(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') {
        out += ' ';
        i += 1;
      }
      continue;
    }
    if (text[i] === '/' && text[i + 1] === '*') {
      out += '  ';
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        out += ' ';
        i += 1;
      }
      if (i < text.length) {
        out += '  ';
        i += 2;
      }
      continue;
    }
    const quote = text[i];
    if (quote === '"' || quote === "'" || quote === '`') {
      out += quote;
      i += 1;
      while (i < text.length && text[i] !== quote) {
        if (text[i] === '\\') {
          out += text[i] + (text[i + 1] ?? '');
          i += 2;
          continue;
        }
        out += text[i];
        i += 1;
      }
      if (i < text.length) {
        out += text[i];
        i += 1;
      }
      continue;
    }
    out += text[i];
    i += 1;
  }
  return out;
}

function functionBodyRange(source: string, name: string): { start: number; end: number } | null {
  const match = new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  if (!match) return null;
  const brace = source.indexOf('{', match.index);
  if (brace === -1) return null;
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return { start: brace, end: i + 1 };
    }
  }
  return null;
}

function insideAny(index: number, ranges: readonly { start: number; end: number }[]): boolean {
  return ranges.some((range) => index >= range.start && index < range.end);
}

function edgeBypassOutsideConstructors(edgeModule: string): boolean {
  const stripped = stripTsComments(edgeModule);
  const ranges = EDGE_ALLOWED_FUNCTIONS.map((name) => functionBodyRange(stripped, name)).filter(
    (range): range is { start: number; end: number } => range !== null,
  );
  BYPASS.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BYPASS.exec(stripped)) !== null) {
    if (!insideAny(match.index, ranges)) return true;
  }
  return false;
}

export function scanWriteRoutes(
  inventory: typeof WRITE_ROUTES,
  files: readonly RouteFile[],
  configToml: string,
  edgeModule: string,
  migrations: readonly MigrationFile[],
  fixtureText: string,
): RouteProblem[] {
  const problems: RouteProblem[] = [];
  const byDir = new Map<string, RouteFile>();
  for (const file of files) {
    const rel = file.name.replace(/\\/g, '/');
    if (rel.endsWith('/index.ts') && !rel.startsWith('_shared/')) byDir.set(dirOf(file), file);
  }

  const edges = edgeKeys(inventory);
  const edgeSet = new Set<string>(edges);

  for (const file of files) {
    const rel = file.name.replace(/\\/g, '/');
    if (rel.startsWith('_shared/')) {
      if (rel === '_shared/edge.ts') {
        if (edgeBypassOutsideConstructors(file.text)) {
          problems.push({
            code: 'edge-reaches-database-outside-constructors',
            detail:
              '_shared/edge.ts names a database reach outside callDatabaseFunction, publicProjectReads and callerReads',
          });
        }
        continue;
      }
      if (BYPASS_TEST.test(stripTsComments(file.text))) {
        problems.push({
          code: 'shared-module-reaches-database',
          detail: `${file.name} reaches the database and is not _shared/edge.ts`,
        });
      }
      continue;
    }
    if (!rel.endsWith('/index.ts')) {
      if (BYPASS_TEST.test(stripTsComments(file.text)) || /\bcallDatabaseFunction\b/.test(file.text)) {
        problems.push({
          code: 'write-route-helper-reaches-database',
          detail: `${file.name} reaches the database and is not the route's index.ts`,
        });
      }
      continue;
    }
    const dir = dirOf(file);
    if (REACHES_DATABASE.test(stripTsComments(file.text)) && !edgeSet.has(dir)) {
      problems.push({
        code: 'write-route-unregistered',
        detail: `${file.name} reaches the database and is not an edge row of WRITE_ROUTES`,
      });
    }
  }

  for (const name of edges) {
    const file = byDir.get(name);
    if (!file) {
      problems.push({
        code: 'write-route-missing-entry',
        detail: `WRITE_ROUTES names ${name} as an edge route and supabase/functions/${name}/index.ts is absent`,
      });
      continue;
    }

    const serveCount = file.text.split('Deno.serve(').length - 1;
    if (!file.text.includes(CONSTRUCTOR) || serveCount !== 1) {
      problems.push({
        code: 'write-route-not-constructed',
        detail: `${file.name} is not constructed as a single Deno.serve(writeRoute(`,
      });
    }

    const named = NAME_LITERAL.exec(file.text)?.[1];
    if (named !== undefined && named !== name) {
      problems.push({
        code: 'write-route-registered-under-other-name',
        detail: `${file.name} registers name ${JSON.stringify(named)} rather than ${JSON.stringify(name)}`,
      });
    }

    if (
      /\bcallDatabaseFunction\b/.test(file.text) ||
      /\/rest\/v1\/|createClient|\.rpc\(|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/.test(file.text)
    ) {
      problems.push({
        code: 'write-route-bypasses-boundary',
        detail: `${file.name} still names callDatabaseFunction or a database reach other than writeRoute`,
      });
    }

    const block = functionBlock(configToml, name);
    if (block === null) {
      problems.push({
        code: 'write-route-unconfigured',
        detail: `config.toml has no [functions.${name}] block`,
      });
    } else if (!/^\s*verify_jwt\s*=\s*true\s*$/m.test(block)) {
      problems.push({
        code: 'write-route-jwt-unverified',
        detail: `[functions.${name}] does not state verify_jwt = true`,
      });
    }
  }

  for (const name of standInKeys(inventory)) {
    const needles = [
      `writeGateDecision('${name}'`,
      `writeGateDecision("${name}"`,
      `name: '${name}'`,
      `name: "${name}"`,
    ];
    if (!needles.some((needle) => fixtureText.includes(needle))) {
      problems.push({
        code: 'stand-in-not-gated',
        detail: `stand-in ${name} never appears in the fixture as writeGateDecision('${name}' or as a writePipeline spec named ${name}`,
      });
    }
  }

  if (exportsCallDatabaseFunction(edgeModule)) {
    problems.push({
      code: 'rpc-caller-exported',
      detail: '_shared/edge.ts exports callDatabaseFunction again',
    });
  }

  problems.push(...scanWriteGateSql(migrations));
  return problems;
}

function collectTs(dir: string, prefix: string): RouteFile[] {
  const files: RouteFile[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const rel = `${prefix}${name}`.replace(/\\/g, '/');
    let isDir = false;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (isDir) files.push(...collectTs(full, `${rel}/`));
    else if (name.endsWith('.ts')) files.push({ name: rel, text: readFileSync(full, 'utf8') });
  }
  return files;
}

/**
 * Reads every `.ts` under every function directory and under `_shared`, supabase/config.toml,
 * the migrations and the fixture. Throws on an empty functions directory — an absence reported
 * by a broken instrument is the false green this whole arrangement exists to remove.
 */
export function loadWriteRouteTree(repoRoot: string = REPO_ROOT): WriteRouteTree {
  const functionsDir = join(repoRoot, 'supabase', 'functions');
  let names: string[];
  try {
    names = readdirSync(functionsDir).filter((name) => name !== '_shared');
  } catch (error) {
    throw new Error(
      `write-route scan could not read supabase/functions under ${repoRoot}: ${(error as Error).message}`,
    );
  }
  if (names.length === 0) {
    throw new Error(
      'write-route scan found supabase/functions empty, which no checkout of this tree is — refusing to report an absence',
    );
  }

  const files = collectTs(functionsDir, '');

  const migrationsDir = join(repoRoot, 'supabase', 'migrations');
  const migrationNames = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  return {
    files,
    configToml: readFileSync(join(repoRoot, 'supabase', 'config.toml'), 'utf8'),
    edgeModule: readFileSync(join(functionsDir, '_shared', 'edge.ts'), 'utf8'),
    migrations: migrationNames.map((name) => ({ name, text: readFileSync(join(migrationsDir, name), 'utf8') })),
    fixtureText: readFileSync(join(repoRoot, 'tests', 'at', 'suites', 'req-001', '_fixture.ts'), 'utf8'),
  };
}

export function writeRouteProblems(): RouteProblem[] {
  const tree = loadWriteRouteTree();
  return scanWriteRoutes(WRITE_ROUTES, tree.files, tree.configToml, tree.edgeModule, tree.migrations, tree.fixtureText);
}
