import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import { ALL_PERMISSIONS, type Actor, can, type Permission } from '@cerca/contract';

export type AppAbility = MongoAbility<[Permission, 'all']>;

// Layer 1 (capability) as a CASL ability, built entirely from the shared permission matrix.
// It grants exactly the permissions `can(actor, p)` returns true for — one rule, two enforcers.
export function abilityForActor(actor: Actor): AppAbility {
  const builder = new AbilityBuilder<AppAbility>(createMongoAbility);
  for (const permission of ALL_PERMISSIONS) {
    if (can(actor, permission)) {
      builder.can(permission, 'all');
    }
  }
  return builder.build();
}
