/**
 * WHICH ROUTES A LOGGED-OUT VISITOR MAY RENDER — AT-001.24's decision, as shipped code.
 *
 * The criterion is that only public surfaces render for a visitor who never signed in, and that every
 * authenticated surface sends that visitor to sign in. A router obeys that rule; this module is the
 * rule the router obeys.
 *
 * IT IS UNDER THE SAME TWO CONSTRAINTS `./visibility.ts` AND `./memberships.ts` STATE OF THEMSELVES:
 *   1. ZERO NON-RELATIVE IMPORTS AND NO DENO GLOBAL. It is compiled by `tests/at/tsconfig.json`,
 *      which is `strict` with `skipLibCheck: false` and no DOM library, and it can be run by Deno
 *      inside the edge runtime. The intersection is plain TypeScript over plain data.
 *   2. NO I/O, NO CLOCK, NO RANDOMNESS. It never reads a directory. The list of files that EXIST is
 *      handed in by a caller that did the reading, which is what keeps this module pure and keeps its
 *      rule drivable with inputs no real tree holds.
 *
 * ============================================================================================
 * WHY IT SHIPS HERE RATHER THAN LIVING IN `tests/`
 * ============================================================================================
 *
 * A route's classification is PRODUCT BEHAVIOUR — it is the thing a router must obey — and a test
 * file cannot be the authority on product behaviour. `supabase/functions/_shared/` is the one place
 * in this repository that holds shipped, territory-neutral TypeScript, so a later `src/`-only pull
 * request can import this declaration without crossing the continuous-integration territory guard
 * (`.github/workflows/ci.yml` fails a diff whose file list matches both `^src/` and this change's
 * territory). That is what makes the declaration usable by the router on the day the screens land.
 *
 * ============================================================================================
 * THE RESIDUAL, SAID HERE RATHER THAN LEFT TO BE DISCOVERED
 * ============================================================================================
 *
 * NOTHING IMPORTS THIS TODAY AND NO ROUTER OBEYS IT, because there is no router: `src/routes/` holds
 * one page and a root layout, and the sign-in screens are a separate manifest leaf that has not
 * landed. What this buys is a declaration in product code and a test that fails the moment a route
 * arrives undeclared. It is not a redirect that runs, and the merge ruling says so.
 */

/**
 * WHAT ONE ROUTE IS, TO A LOGGED-OUT VISITOR.
 *
 * AN `authenticated` ROUTE NAMES ITS REDIRECT TARGET, and the target is part of the declaration
 * rather than a constant the router picks. AT-001.24's clause is "redirects to sign-in" — a
 * classification that said only "not public" would leave the half the criterion actually names
 * unstated, and a router would then supply it from somewhere nobody declared.
 *
 * NO ROUTE CARRIES THE `authenticated` SHAPE TODAY, and that is a fact about this tree rather than
 * about the type: the only route in it is the public landing page, and there is no sign-in screen to
 * redirect to yet.
 */
export type RouteVisibility = { visibility: 'public' } | { visibility: 'authenticated'; redirectTo: string };

/**
 * EVERY ROUTE UNDER `src/routes/`, CLASSIFIED — keyed by the file's path relative to that directory,
 * which is the name the router derives its URL from and the name a scan of the tree reports.
 *
 * `index.tsx` IS THE LANDING PAGE and it is public: it is what a visitor who never signed in reaches
 * first, and AT-001.24's "only public surfaces render" is a statement about exactly that page today.
 */
export const ROUTE_VISIBILITY: Readonly<Record<string, RouteVisibility>> = {
  'index.tsx': { visibility: 'public' },
};

/**
 * WHETHER ONE FILE NAME IS A ROUTE AT ALL.
 *
 * A ROUTE FILE IS ANY `.tsx` FILE WHOSE BASE NAME DOES NOT BEGIN WITH `__`. The leading double
 * underscore is this router's convention for a layout rather than a route, and `src/routes/__root.tsx`
 * is the one such file today. `README.md` is not a route because it is not `.tsx`, and a directory
 * name is not a route for the same reason.
 *
 * THE TEST IS ON THE BASE NAME, not on the whole path, so a nested `admin/__layout.tsx` is a layout
 * exactly as a top-level one is. Anything else that is `.tsx` is treated as a route and therefore
 * needs a declaration — which is the fail-closed direction: an unclassified file fails the build and
 * a person decides what it is, rather than being silently exempt.
 */
function isRouteFile(name: string): boolean {
  const base = name.slice(name.lastIndexOf('/') + 1);
  return base.endsWith('.tsx') && !base.startsWith('__');
}

/**
 * THE ROUTE FILES THAT CARRY NO DECLARATION — the rule, living with the declaration it is about.
 *
 * A REGISTRY THAT CANNOT SAY WHAT IS MISSING IS A LIST, NOT A REGISTRY. Keeping the rule here rather
 * than in the test that drives it is what lets the failure case be exercised with inputs no real tree
 * holds: a caller hands in a list of names, and the answer depends on nothing else.
 *
 * IT TAKES NAMES, NEVER A DIRECTORY. The caller does the reading and is responsible for saying so
 * loudly when it cannot read — an absence this function reported because its caller found nothing
 * would be the false green the whole arrangement exists to remove.
 */
export function undeclaredRoutes(routeFileNames: readonly string[]): string[] {
  return routeFileNames.filter((name) => isRouteFile(name) && !Object.prototype.hasOwnProperty.call(ROUTE_VISIBILITY, name));
}
