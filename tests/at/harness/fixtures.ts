export const LIFECYCLE_STATES = [
  'draft',
  'discovery_in_progress',
  'scoped',
  'triage',
  'open',
  'matched_pending_fuel',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

export interface FixtureProject {
  id: string;
  title: string;
  state: LifecycleState;
}

export interface FixtureLedgerRow {
  id: string;
  amount: number;
  kind: string;
}

export interface FixtureBlocker {
  id: string;
  projectId: string;
  status: 'open' | 'resolved';
  raisedAt: string;
}

export interface FixtureThreadMessage {
  id: string;
  projectId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface FixtureState {
  ngo: { id: string; name: string };
  actors: {
    ngo: string;
    volunteer: string;
    ex_volunteer: string;
    platform_admin: string;
  };
  projects: FixtureProject[];
  ledger: FixtureLedgerRow[];
  blockers: FixtureBlocker[];
  threadMessages: FixtureThreadMessage[];
}

export function createFixtureSeed(): FixtureState {
  const actors = {
    ngo: 'actor-ngo',
    volunteer: 'actor-volunteer',
    ex_volunteer: 'actor-ex-volunteer',
    platform_admin: 'actor-platform-admin',
  };
  return {
    ngo: { id: 'ngo-1', name: 'Fixture NGO' },
    actors,
    projects: LIFECYCLE_STATES.map((state, index) => ({
      id: `project-${index + 1}`,
      title: `${state.replaceAll('_', ' ')} project`,
      state,
    })),
    ledger: [
      { id: 'ledger-funding', amount: 100, kind: 'funding' },
      { id: 'ledger-consumption', amount: -5, kind: 'consumption' },
    ],
    blockers: [
      {
        id: 'blocker-open',
        projectId: 'project-7',
        status: 'open',
        raisedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    threadMessages: [
      {
        id: 'message-1',
        projectId: 'project-7',
        authorId: actors.ngo,
        body: 'Fixture question',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class FixtureWorld {
  private active = true;

  constructor(
    readonly name: string,
    readonly state: FixtureState,
  ) {}

  assertActive(): void {
    if (!this.active) throw new Error(`fixture world ${JSON.stringify(this.name)} was torn down`);
  }

  async teardown(): Promise<void> {
    this.active = false;
  }
}

export class FixtureWorldStore {
  private active = true;
  private readonly worlds = new Set<FixtureWorld>();

  constructor(private readonly seed: FixtureState) {}

  async world(name: string): Promise<FixtureWorld> {
    if (!this.active) throw new Error('fixture store was torn down');
    const world = new FixtureWorld(name, clone(this.seed));
    this.worlds.add(world);
    return world;
  }

  async teardown(): Promise<void> {
    this.active = false;
    await Promise.all([...this.worlds].map((world) => world.teardown()));
    this.worlds.clear();
  }
}
