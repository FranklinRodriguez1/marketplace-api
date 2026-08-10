import type { Actor, ActorResponse, Capacity, PlatformRole } from '@cerca/contract';

/** The user as the domain sees it — never leaves infrastructure as a Prisma row. */
export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  capacities: Capacity[];
  platformRole: PlatformRole;
  suspendedAt: Date | null;
}

export function toActor(user: UserRecord): Actor {
  return { id: user.id, capacities: user.capacities, platformRole: user.platformRole };
}

/** The public `Actor` shape on the wire — never the passwordHash. */
export function toActorResponse(user: UserRecord): ActorResponse {
  return { id: user.id, capacities: [...user.capacities], platformRole: user.platformRole };
}
