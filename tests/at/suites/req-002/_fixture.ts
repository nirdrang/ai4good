/**
 * REQ-002's fixture adapter — the loop tier's binding of the organisation system under test.
 *
 * NO MEMBER OF THE SYSTEM UNDER TEST IS IMPLEMENTED YET. Each one throws, naming itself, until the
 * unit that lands it replaces its entry below with storage plus the shipped decision. The world is
 * real from the start, so a body that opens one and then reaches an unlanded member fails on that
 * member and on nothing else.
 *
 * What a loop-tier green will mean once members land: the shipped decisions and the arithmetic are
 * right over storage that is a Map. What it will not mean: that any migration, policy or deployed
 * function behaves. That is the integration tier's claim, in `_live.ts`.
 */

import type { ControlledClock } from '../../harness/clock.ts';
import type { FixtureWorld, FixtureWorldStore } from '../../harness/fixtures.ts';
import type { ConfigRegistry, OrganizationsSut, World } from './_contract.ts';

/**
 * WHICH REQUIREMENT THIS ADAPTER IS, declared by the adapter itself. The map entry in
 * `harness/suite-adapters.ts` is constrained to match it, and `loadAdapter()` re-checks it against
 * the requirement it was asked for.
 */
export const requirement = 'req-002' as const;

interface AdapterOptions {
  clock: ControlledClock;
  worlds: FixtureWorldStore;
  config: ConfigRegistry;
}

class OrganizationsFixtureWorld implements World {
  constructor(
    private readonly base: FixtureWorld,
    private readonly serial: number,
  ) {}

  email(local: string): string {
    return `${local}+w${this.serial}@example.test`;
  }

  async teardown(): Promise<void> {
    await this.base.teardown();
  }
}

function notLanded(member: keyof OrganizationsSut): () => Promise<never> {
  return async () => {
    throw new Error(`REQ-002 loop adapter: sut.organizations.${member} has not landed`);
  };
}

export function createFixtureAdapter({ worlds }: AdapterOptions) {
  const openedWorlds = new Set<OrganizationsFixtureWorld>();
  let worldSerial = 0;

  const sut: OrganizationsSut = {
    provisionNgo: notLanded('provisionNgo'),
    provisionVolunteer: notLanded('provisionVolunteer'),
    provisionPlatformAdmin: notLanded('provisionPlatformAdmin'),
    deactivateAccountAsOperator: notLanded('deactivateAccountAsOperator'),

    setProfile: notLanded('setProfile'),
    profile: notLanded('profile'),
    organizationDashboard: notLanded('organizationDashboard'),

    setVetting: notLanded('setVetting'),
    vettingRecord: notLanded('vettingRecord'),
    attemptVettingRowAsOperator: notLanded('attemptVettingRowAsOperator'),
    vettingAuditEvents: notLanded('vettingAuditEvents'),

    notificationEvents: notLanded('notificationEvents'),
    notificationDeliveries: notLanded('notificationDeliveries'),

    readAllowance: notLanded('readAllowance'),
    debitAllowance: notLanded('debitAllowance'),
    spendRows: notLanded('spendRows'),
    writeSpendRowAsOperator: notLanded('writeSpendRowAsOperator'),

    publishingAllowed: notLanded('publishingAllowed'),
    fundingAllowed: notLanded('fundingAllowed'),

    createProjectAsOperator: notLanded('createProjectAsOperator'),
    publicProjectPage: notLanded('publicProjectPage'),
  };

  return {
    sut: { organizations: sut },
    fixtures: {
      world: async (name: string) => {
        const base = await worlds.world(name);
        const world = new OrganizationsFixtureWorld(base, ++worldSerial);
        openedWorlds.add(world);
        return world;
      },
    },
    teardown: async () => {
      await Promise.all([...openedWorlds].map((world) => world.teardown()));
      openedWorlds.clear();
    },
  };
}
