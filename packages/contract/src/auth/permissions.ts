/**
 * The permission matrix — layer 1 of authorization ("capacity").
 *
 * A marketplace of two sides has a property almost no practice API has: permissions
 * are NOT resolved by a single role. Marta teaches guitar AND hires a plumber — she is
 * both `customer` and `provider`. So an account carries a SET of capacities, and,
 * separately, a platform role (`user | moderator | admin`) in its own column — a
 * moderator also hires services like anyone, which is exactly why the two are apart.
 *
 * `can(actor, permission)` ORs the two sources. This file is the single definition of
 * the matrix; the API's CASL PolicyGuard is built from it, and the mobile app imports
 * the very same file. One place defines the rule, two enforce it.
 */
export type Capacity = 'customer' | 'provider';
export type PlatformRole = 'user' | 'moderator' | 'admin';

export type Permission =
  | 'listing:read'
  | 'listing:create'
  | 'listing:update'
  | 'listing:moderate'
  | 'booking:request'
  | 'booking:accept'
  | 'review:write'
  | 'review:moderate'
  | 'report:resolve'
  | 'user:suspend';

/** Every permission, for building the CASL ability from an actor. */
export const ALL_PERMISSIONS: readonly Permission[] = [
  'listing:read',
  'listing:create',
  'listing:update',
  'listing:moderate',
  'booking:request',
  'booking:accept',
  'review:write',
  'review:moderate',
  'report:resolve',
  'user:suspend',
];

/** What each capacity grants. */
export const CAPACITY_PERMISSIONS: Readonly<Record<Capacity, readonly Permission[]>> = {
  customer: ['listing:read', 'booking:request', 'review:write'],
  provider: ['listing:read', 'listing:create', 'listing:update', 'booking:request', 'booking:accept', 'review:write'],
};

/** What each platform role grants, on top of any capacities the account holds. */
export const PLATFORM_PERMISSIONS: Readonly<Record<PlatformRole, readonly Permission[]>> = {
  user: [],
  moderator: ['listing:read', 'listing:moderate', 'booking:request', 'review:write', 'review:moderate', 'report:resolve'],
  admin: [
    'listing:read',
    'listing:create',
    'listing:update',
    'listing:moderate',
    'booking:request',
    'review:write',
    'review:moderate',
    'report:resolve',
    'user:suspend',
  ],
};
