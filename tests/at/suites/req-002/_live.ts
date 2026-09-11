/**
 * REQ-002's LIVE adapter — the integration tier's binding of the organisation system under test to
 * the one local stack.
 *
 * NO MEMBER OF THE SYSTEM UNDER TEST IS IMPLEMENTED YET. Each one throws, naming itself, until the
 * unit that lands it replaces its entry below with the deployed route, the operator read or the
 * policy consult. The world is real from the start: it namespaces addresses so the mail catcher
 * and the database can be read per world.
 *
 * What an integration green will mean once members land: the criterion holds against a database
 * this run rebuilt, the deployed edge functions and the real Auth service.
 */

import type { Stack } from '../../harness/live-stack.ts';
import type { OrganizationsSut, World } from './_contract.ts';

/** THE SELF-DECLARATION the loader checks against the requirement it was asked for. */
export const requirement = 'req-002' as const;

class OrganizationsLiveWorld implements World {
  constructor(private readonly namespace: string) {}

  email(local: string): string {
    return `${local}+${this.namespace}@example.test`;
  }

  async teardown(): Promise<void> {
    // The runner reset the database before the run; a world is a namespace, not a container.
  }
}

function notLanded(member: keyof OrganizationsSut): () => Promise<never> {
  return async () => {
    throw new Error(`REQ-002 live adapter: sut.organizations.${member} has not landed`);
  };
}

export async function createLiveAdapter(_opts: { stack: Stack }): Promise<{
  sut: { organizations: OrganizationsSut };
  fixtures: { world(name: string): Promise<OrganizationsLiveWorld> };
  teardown(): Promise<void>;
}> {
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
        const namespace = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        return new OrganizationsLiveWorld(namespace);
      },
    },
    teardown: async () => {},
  };
}
