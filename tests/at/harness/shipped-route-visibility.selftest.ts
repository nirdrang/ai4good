/**
 * THE ORACLE FOR THE SHIPPED ROUTE REGISTRY'S RULE.
 *
 * `supabase/functions/_shared/route-visibility.ts` declares every route under `src/routes/` public or
 * authenticated, and `undeclaredRoutes` is the rule that says which route files carry no
 * declaration. AT-001.24's loop body asserts that the answer over the REAL tree is empty — which is a
 * true statement about today's tree and proves nothing at all about the rule, because today's tree
 * holds one route and it is declared.
 *
 * THIS FILE IS WHAT EXERCISES THE FAILURE CASE. The plan's step 15 requires that the arm "fails when
 * handed a synthetic file list holding an undeclared route", and that it is exercised rather than
 * asserted. A list holding a route nobody declared is a state no checkout of this repository is in,
 * so the only way to reach it is to drive the pure rule directly — which is possible only because the
 * rule ships beside the declaration instead of living inside the acceptance body that consumes it.
 *
 * WHY A SHIPPED MODULE'S SHAPE TEST RIDES THE SELFTEST LANE, the same reason
 * `shipped-visibility.selftest.ts`, `shipped-caller.selftest.ts` and `shipped-verification.selftest.ts`
 * give: an acceptance body drives an application boundary, and a direct call to a helper from one
 * would be a test of the helper wearing a criterion's name.
 *
 * IT NEEDS NO SCRIPT OR CONTINUOUS-INTEGRATION CHANGE: `tests/at/vitest.config.ts` includes
 * `harness/**\/*.selftest.ts` and the `at:selftest` script filters to `harness/`, so this file is
 * discovered by glob and never joins an acceptance run. It cannot affect any acceptance id's colour.
 *
 * WHAT A GREEN HERE CLAIMS: that the rule reports exactly the route files carrying no declaration.
 * WHAT IT DOES NOT CLAIM: that any router obeys the declaration. No router exists — the registry's own
 * header says so, and the merge ruling carries it as a residual.
 */

import { describe, expect, it } from 'vitest';

import { ROUTE_VISIBILITY, undeclaredRoutes } from '../../../supabase/functions/_shared/route-visibility.ts';

describe('the shipped route registry reports what it does not declare', () => {
  it('reports a route file that carries no declaration', () => {
    // THE CASE NO CHECKOUT IS IN, and the whole reason this file exists: somebody adds a screen and
    // nobody classifies it. The realistic version is a design asking for a dashboard, which is an
    // AUTHENTICATED surface arriving with no redirect target declared for it.
    expect(
      undeclaredRoutes(['index.tsx', 'dashboard.tsx']),
      'a route file nobody classified must be reported, or the registry cannot fail the build',
    ).toEqual(['dashboard.tsx']);
    // AND A NESTED ONE, because the key is the path relative to `src/routes/` rather than a bare
    // file name — a router derives its URL from the whole path, so two files called `index.tsx` in
    // different directories are two different routes.
    expect(
      undeclaredRoutes(['index.tsx', 'projects/index.tsx']),
      'a nested route file nobody classified must be reported under its own path',
    ).toEqual(['projects/index.tsx']);
    // AND SEVERAL AT ONCE, in the order they arrived, so the failure names every one rather than the
    // first.
    expect(
      undeclaredRoutes(['sign-in.tsx', 'index.tsx', 'admin/ledger.tsx']),
      'every undeclared route must be reported, not only the first',
    ).toEqual(['sign-in.tsx', 'admin/ledger.tsx']);
  });

  it('reports nothing for the real declared set', () => {
    // The declaration read back as a list of names is, by construction, a clean answer. This is the
    // shape the acceptance body asserts over the real tree, driven here without touching a disk.
    expect(
      undeclaredRoutes(Object.keys(ROUTE_VISIBILITY)),
      'the registry does not accept its own declared routes, so the acceptance arm can never be clean',
    ).toEqual([]);
  });

  it('ignores a layout file, whatever directory it sits in', () => {
    // A base name beginning with `__` is this router's layout convention rather than a route.
    // `src/routes/__root.tsx` is the one such file today, and it must not need a classification —
    // otherwise the arm would fail on a clean checkout.
    expect(
      undeclaredRoutes(['__root.tsx', 'index.tsx']),
      'the root layout is not a route and must not be reported',
    ).toEqual([]);
    expect(
      undeclaredRoutes(['admin/__layout.tsx']),
      'the layout test reads the BASE name, so a nested layout is a layout too',
    ).toEqual([]);
  });

  it('ignores anything that is not a .tsx file', () => {
    // `src/routes/README.md` is in that directory today, and a directory name arrives in the same
    // list because the scan walks the tree. Neither is a route.
    expect(
      undeclaredRoutes(['README.md', 'admin', 'index.tsx', 'notes.txt', 'helper.ts']),
      'a non-route file must not be reported as an undeclared route',
    ).toEqual([]);
  });

  it('reports nothing for an empty list, because judging absence is the CALLER\'s job', () => {
    // This is the fail-closed seam, and it is deliberately NOT here: an empty list answers "nothing
    // undeclared", which is correct for the input and would be a false green for a tree. The caller
    // that read the disk is what refuses to report an absence it could not measure —
    // `_route-scan.ts` throws on an unreadable directory and on an empty one, and this assertion
    // records that the pure rule is not where that guard lives.
    expect(undeclaredRoutes([]), 'the pure rule answers about the list it was given and nothing more').toEqual([]);
  });
});
