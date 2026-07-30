export type CapabilityProvenance = 'real' | 'stand-in';

const CAPABILITY = Symbol('at-capability');

export interface Capability<T> {
  readonly [CAPABILITY]: true;
  readonly name: string;
  readonly provenance: CapabilityProvenance;
  readonly value: T;
}

function capability<T>(name: string, provenance: CapabilityProvenance, value: T): Capability<T> {
  if (!name.trim()) throw new Error('a capability factory requires a non-empty name');
  return Object.freeze({ [CAPABILITY]: true as const, name, provenance, value });
}

export function realCapability<T>(name: string, value: T): Capability<T> {
  return capability(name, 'real', value);
}

export function standInCapability<T>(name: string, value: T): Capability<T> {
  return capability(name, 'stand-in', value);
}

export function stubbedCapabilityNames(capabilities: readonly Capability<unknown>[]): string[] {
  return capabilities
    .filter((entry) => entry[CAPABILITY] === true && entry.provenance === 'stand-in')
    .map((entry) => entry.name)
    .sort();
}

export class CapabilityPending extends Error {
  constructor(readonly capabilities: readonly string[]) {
    super(`CAPABILITY PENDING — ${capabilities.join(', ')}`);
    this.name = 'CapabilityPending';
  }
}

/** A typed seam for later slices. Any attempted use fails with the capability names, never a no-op. */
export function pendingCapability<T extends object>(...capabilities: string[]): T {
  const names = [...new Set(capabilities)];
  return new Proxy(
    {},
    {
      get() {
        throw new CapabilityPending(names);
      },
    },
  ) as T;
}
