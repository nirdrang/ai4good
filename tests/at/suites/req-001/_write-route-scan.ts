/**
 * THE CONFORMANCE CHECK FOR THE WRITE BOUNDARY (AT-001.29).
 *
 * It proves registration and construction — that every file able to reach the database does so
 * through the one constructor, and that the constructor's list and the tree agree in both
 * directions. It does not prove that the gate refuses; only the integration tier does that, by
 * deactivating an account and driving the deployed function.
 *
 * Precedent: `_source-scan.ts`. No sentinel, fault, vendor stand-in or fixture world. The SQL half
 * reuses `splitSqlStatements` and the definer tracking in `_policy-scan.ts`.
 */

import { readdirSync, readFileSync } from 'node:fs';
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

const REACHES_DATABASE = /writeRoute|callDatabaseFunction|\/rest\/v1\/rpc\//;
const CONSTRUCTOR = 'Deno.serve(writeRoute(';
const NAME_LITERAL = /\bname:\s*['"]([^'"]+)['"]/;

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
    /\bexport\s*\{[^}]*\bcallDatabaseFunction\b/.test(edgeModule)
  );
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
  for (const file of files) byDir.set(dirOf(file), file);

  const edges = edgeKeys(inventory);
  const edgeSet = new Set<string>(edges);

  for (const file of files) {
    const dir = dirOf(file);
    if (REACHES_DATABASE.test(file.text) && !edgeSet.has(dir)) {
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

    if (/\bcallDatabaseFunction\b/.test(file.text) || /\/rest\/v1\/rpc\//.test(file.text)) {
      problems.push({
        code: 'write-route-bypasses-boundary',
        detail: `${file.name} still names callDatabaseFunction or /rest/v1/rpc/`,
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
    const needle = `writeGateDecision('${name}'`;
    const needleDouble = `writeGateDecision("${name}"`;
    if (!fixtureText.includes(needle) && !fixtureText.includes(needleDouble)) {
      problems.push({
        code: 'stand-in-not-gated',
        detail: `stand-in ${name} never appears in the fixture as writeGateDecision('${name}'`,
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

/**
 * Reads every function index.ts, supabase/config.toml, _shared/edge.ts, the migrations and
 * the fixture. Throws on an empty functions directory — an absence reported by a broken
 * instrument is the false green this whole arrangement exists to remove.
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

  const files: RouteFile[] = [];
  for (const name of names) {
    try {
      files.push({
        name: `${name}/index.ts`,
        text: readFileSync(join(functionsDir, name, 'index.ts'), 'utf8'),
      });
    } catch {
      // A directory with no index.ts is a missing entry when WRITE_ROUTES names it.
    }
  }

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
