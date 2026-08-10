import type { Actor } from '@cerca/contract';

export const AUDIT = Symbol('AUDIT');

export interface AuditInput {
  actor: Actor;
  action: string; // 'listing:moderate', 'review:write', 'user:suspend'...
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

// Append-only audit. Records the capacity the actor held AT THE MOMENT — if Marta later stops
// being a provider, the record must still say she acted as one.
export interface AuditPort {
  record(input: AuditInput): Promise<void>;
}
