import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@cerca/contract';
import { ForbiddenError, UnauthorizedError } from '../../kernel/domain-error';
import type { AuthedRequest } from '../http/authenticated-request';
import { abilityForActor } from './ability.factory';
import { REQUIRE_PERMISSION } from './require-permission.decorator';

// Layer 1 (capability) enforcement. The finer layers — ownership, relation, state, time —
// live in the pure policies and are checked inside the use-cases with the resource loaded.
@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission | undefined>(REQUIRE_PERMISSION, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!req.actor) {
      throw new UnauthorizedError({ code: 'UNAUTHENTICATED', message: 'Authentication is required.' });
    }

    const ability = abilityForActor(req.actor);
    if (!ability.can(required, 'all')) {
      throw new ForbiddenError({
        code: 'MISSING_CAPABILITY',
        message: `The permission "${required}" is required.`,
        reason: 'no_capacity',
      });
    }
    return true;
  }
}
