import { describe, expect, it } from 'vitest';
import { can, type Actor, type Permission } from '../src/auth/actor';

const ALL: Permission[] = [
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

// The matrix exactly as specified in the brief. This is the highest-value correctness test.
const EXPECTED: Record<string, Permission[]> = {
  customer: ['listing:read', 'booking:request', 'review:write'],
  provider: ['listing:read', 'listing:create', 'listing:update', 'booking:request', 'booking:accept', 'review:write'],
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

const actor = (over: Partial<Actor>): Actor => ({
  id: 'u1',
  capacities: [],
  platformRole: 'user',
  ...over,
});

describe('permission matrix · can()', () => {
  it('a customer capacity grants exactly its column', () => {
    const a = actor({ capacities: ['customer'] });
    for (const p of ALL) expect(can(a, p)).toBe(EXPECTED.customer.includes(p));
  });

  it('a provider capacity grants exactly its column', () => {
    const a = actor({ capacities: ['provider'] });
    for (const p of ALL) expect(can(a, p)).toBe(EXPECTED.provider.includes(p));
  });

  it('the moderator platform role grants exactly its column', () => {
    const a = actor({ platformRole: 'moderator' });
    for (const p of ALL) expect(can(a, p)).toBe(EXPECTED.moderator.includes(p));
  });

  it('the admin platform role grants exactly its column', () => {
    const a = actor({ platformRole: 'admin' });
    for (const p of ALL) expect(can(a, p)).toBe(EXPECTED.admin.includes(p));
  });

  it('a plain user with no capacities holds nothing', () => {
    const a = actor({});
    for (const p of ALL) expect(can(a, p)).toBe(false);
  });

  it('Marta is customer AND provider at once — capacities union', () => {
    const marta = actor({ capacities: ['customer', 'provider'] });
    expect(can(marta, 'booking:request')).toBe(true); // hires
    expect(can(marta, 'booking:accept')).toBe(true); // and offers
    expect(can(marta, 'listing:create')).toBe(true);
    expect(can(marta, 'user:suspend')).toBe(false);
  });

  it('capacity and role are ORed — a moderator still books via a customer capacity', () => {
    const a = actor({ capacities: ['customer'], platformRole: 'moderator' });
    expect(can(a, 'booking:request')).toBe(true); // from capacity
    expect(can(a, 'listing:moderate')).toBe(true); // from role
    expect(can(a, 'user:suspend')).toBe(false);
  });
});
