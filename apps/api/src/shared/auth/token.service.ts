import { Injectable } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { Actor, Capacity, PlatformRole } from '@cerca/contract';
import { env } from '../../config/env';

interface AccessPayload {
  sub: string;
  capacities: Capacity[];
  platformRole: PlatformRole;
  typ: 'access';
}

// Access tokens are short-lived and stateless. Refresh is a separate, rotating, hashed
// credential handled by the auth module (see refresh-token.repository).
@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  signAccess(actor: Actor): string {
    const payload: AccessPayload = {
      sub: actor.id,
      capacities: [...actor.capacities],
      platformRole: actor.platformRole,
      typ: 'access',
    };
    return this.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_TTL as JwtSignOptions['expiresIn'] });
  }

  verifyAccess(token: string): Actor {
    const payload = this.jwt.verify<AccessPayload>(token);
    if (payload.typ !== 'access') {
      throw new Error('not an access token');
    }
    return { id: payload.sub, capacities: payload.capacities, platformRole: payload.platformRole };
  }
}
