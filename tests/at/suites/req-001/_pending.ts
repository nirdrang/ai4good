import { AtPending, type AtContext } from './_bind.ts';

export const LEAF = {
  D3_L3: 'D3.L3 (the cross-surface single-seat integration)',
} as const;

export type LeafLabel = (typeof LEAF)[keyof typeof LEAF];

export function notLanded(leaf: LeafLabel): (ctx: AtContext) => Promise<void> {
  return async (ctx: AtContext): Promise<void> => {
    throw new AtPending(ctx.atId, 'sut-missing', `REQ-001 ${leaf} has not landed`);
  };
}
