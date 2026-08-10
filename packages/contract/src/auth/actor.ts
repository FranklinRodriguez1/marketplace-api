import {
  CAPACITY_PERMISSIONS,
  PLATFORM_PERMISSIONS,
  type Capacity,
  type Permission,
  type PlatformRole,
} from './permissions';
import type { UserId } from '../common/ids';

/**
 * The authenticated caller. Capacities and platform role are independent, so a single
 * account can be customer + provider + moderator at once. There is no `role` field that
 * mixes them — with that, Marta would not fit.
 */
export interface Actor {
  readonly id: UserId;
  readonly capacities: readonly Capacity[];
  readonly platformRole: PlatformRole;
}

/** Layer 1: does this actor hold this permission, from any capacity OR its platform role? */
export function can(actor: Actor, permission: Permission): boolean {
  const fromCapacities = actor.capacities.some((capacity) =>
    CAPACITY_PERMISSIONS[capacity].includes(permission),
  );
  const fromRole = PLATFORM_PERMISSIONS[actor.platformRole].includes(permission);
  return fromCapacities || fromRole;
}
