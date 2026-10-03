import type { AdapterFaultSeam } from './faults.ts';
import type { WorldLike } from './registry.ts';
import type { AdapterSentinelSeam } from './sentinels.ts';

type AdapterShape = {
  sut: Record<string, unknown>;
  fixtures: { world(name: string): Promise<WorldLike> };
  faults?: AdapterFaultSeam;
  sentinels?: AdapterSentinelSeam;
  teardown(): Promise<void>;
};

type AdapterModuleFor<R extends string> = {
  requirement: R;
  createFixtureAdapter: (...args: never[]) => Promise<AdapterShape> | AdapterShape;
};

type CheckedAdapterModules<M extends { [R in keyof M & string]: AdapterModuleFor<R> }> = M;

export type AdapterModules = CheckedAdapterModules<{
  'req-001': typeof import('../suites/req-001/_fixture.ts');
  'req-002': typeof import('../suites/req-002/_fixture.ts');
  'req-003': typeof import('../suites/req-003/_fixture.ts');
  'req-004': typeof import('../suites/req-004/_fixture.ts');
  'req-016': typeof import('../suites/req-016/_fixture.ts');
  'req-032': typeof import('../suites/req-032/_fixture.ts');
}>;

export type SuiteId = keyof AdapterModules & string;

type AdapterOf<R extends SuiteId> = Awaited<ReturnType<AdapterModules[R]['createFixtureAdapter']>>;

export type SutMapOf<R extends SuiteId> = AdapterOf<R>['sut'];

export type SutKeyOf<R extends SuiteId> = keyof SutMapOf<R> & string;

export type SutOf<R extends SuiteId, K extends SutKeyOf<R>> = SutMapOf<R>[K];

export type WorldOf<R extends SuiteId> = Awaited<ReturnType<AdapterOf<R>['fixtures']['world']>>;
