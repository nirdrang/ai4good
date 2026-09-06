/**
 * Oracle for the write-route conformance scan: each refusal the scan names, and that the real
 * tree yields none. The load-bearing case is a fourth write route that reaches `/rest/v1/rpc/`
 * without registering.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { WRITE_ROUTES } from '../../../supabase/functions/_shared/write-routes.ts';
import {
  loadWriteRouteTree,
  scanWriteRoutes,
  writeRouteProblems,
} from '../suites/req-001/_write-route-scan.ts';

const tree = loadWriteRouteTree();

function scan(overrides: {
  files?: typeof tree.files;
  configToml?: string;
  edgeModule?: string;
  migrations?: typeof tree.migrations;
  fixtureText?: string;
}) {
  return scanWriteRoutes(
    WRITE_ROUTES,
    overrides.files ?? tree.files,
    overrides.configToml ?? tree.configToml,
    overrides.edgeModule ?? tree.edgeModule,
    overrides.migrations ?? tree.migrations,
    overrides.fixtureText ?? tree.fixtureText,
  );
}

describe('writeRouteProblems over the real tree', () => {
  it('reports no problems', () => {
    expect(writeRouteProblems()).toEqual([]);
  });
});

describe('scanWriteRoutes refusals', () => {
  it('fails a write route that reaches the database without registering', () => {
    const problems = scan({
      files: [
        ...tree.files,
        {
          name: 'donate-fuel/index.ts',
          text: 'Deno.serve(async (r) => fetch(URL + "/rest/v1/rpc/donate_fuel"));',
        },
      ],
    });
    expect(problems.map((p) => p.code)).toContain('write-route-unregistered');
  });

  it('fails an edge inventory row with no function file', () => {
    const problems = scan({
      files: tree.files.filter((file) => file.name !== 'set-account-lifecycle/index.ts'),
    });
    expect(problems.map((p) => p.code)).toContain('write-route-missing-entry');
  });

  it('fails a registered route that is not constructed through writeRoute', () => {
    const files = tree.files.map((file) =>
      file.name === 'update-organization/index.ts'
        ? { ...file, text: file.text.replace('Deno.serve(writeRoute(', 'Deno.serve(edgeHandler(') }
        : file,
    );
    const problems = scan({ files });
    expect(problems.map((p) => p.code)).toContain('write-route-not-constructed');
  });

  it('fails a registered route whose name literal is not its directory', () => {
    const files = tree.files.map((file) =>
      file.name === 'update-organization/index.ts'
        ? { ...file, text: file.text.replace("name: 'update-organization'", "name: 'create-organization'") }
        : file,
    );
    const problems = scan({ files });
    expect(problems.map((p) => p.code)).toContain('write-route-registered-under-other-name');
  });

  it('fails a stand-in row the fixture never drives through the gate', () => {
    const problems = scan({ fixtureText: 'export const fixture = {};\n' });
    expect(problems.map((p) => p.code)).toContain('stand-in-not-gated');
  });

  it('fails a registered route that still reaches /rest/v1/rpc/ itself', () => {
    const files = tree.files.map((file) =>
      file.name === 'create-organization/index.ts'
        ? { ...file, text: `${file.text}\nconst bypass = "/rest/v1/rpc/create_organization";\n` }
        : file,
    );
    const problems = scan({ files });
    expect(problems.map((p) => p.code)).toContain('write-route-bypasses-boundary');
  });

  it('fails a registered route with no config.toml block', () => {
    const problems = scan({
      configToml: tree.configToml.replace(/\[functions\.set-account-lifecycle\]\r?\nverify_jwt = true\r?\n/, ''),
    });
    expect(problems.map((p) => p.code)).toContain('write-route-unconfigured');
  });

  it('fails a registered route whose block does not verify the jwt', () => {
    const problems = scan({
      configToml: tree.configToml.replace(
        /\[functions\.set-account-lifecycle\]\r?\nverify_jwt = true/,
        '[functions.set-account-lifecycle]\nverify_jwt = false',
      ),
    });
    expect(problems.map((p) => p.code)).toContain('write-route-jwt-unverified');
  });

  it('fails when callDatabaseFunction is exported again', () => {
    const problems = scan({
      edgeModule: tree.edgeModule.replace(
        'async function callDatabaseFunction(',
        'export async function callDatabaseFunction(',
      ),
    });
    expect(problems.map((p) => p.code)).toContain('rpc-caller-exported');
  });

  it('fails a service-role definer that does not call the write gate', () => {
    const problems = scan({
      migrations: [
        ...tree.migrations,
        {
          name: 'z-ungated.sql',
          text: `
create function public.donate_fuel(p_account_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$ begin return '{}'::jsonb; end; $$;
revoke execute on function public.donate_fuel(uuid) from public;
grant execute on function public.donate_fuel(uuid) to service_role;
`,
        },
      ],
    });
    expect(problems.map((p) => p.code)).toContain('definer-no-write-gate');
  });

  it('fails a function that updates or deletes public.audit_events', () => {
    const problems = scan({
      migrations: [
        ...tree.migrations,
        {
          name: 'z-audit-mutation.sql',
          text: `
create function public.rewrite_audit()
returns void language plpgsql security definer set search_path = ''
as $$ begin update public.audit_events set reason = 'tampered'; end; $$;
revoke execute on function public.rewrite_audit() from public;
`,
        },
      ],
    });
    expect(problems.map((p) => p.code)).toContain('audit-mutation-in-definer');
  });
});

describe('write-route scan empty functions directory', () => {
  it('throws when supabase/functions has no route directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'write-route-scan-'));
    mkdirSync(join(root, 'supabase', 'functions'), { recursive: true });
    try {
      expect(() => loadWriteRouteTree(root)).toThrow(/empty/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
