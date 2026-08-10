import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UnauthorizedError } from '../../kernel/domain-error';
import type { AuthedRequest } from '../http/authenticated-request';
import { IS_PUBLIC } from './public.decorator';
import { TokenService } from './token.service';

// Global authentication guard. Deny by default: a route is authenticated unless it is @Public().
// A valid token, if present, is attached even on public routes (some vary their output by actor).
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = this.extractToken(req);

    if (token) {
      try {
        req.actor = this.tokens.verifyAccess(token);
      } catch {
        if (!isPublic) {
          throw new UnauthorizedError({ code: 'UNAUTHENTICATED', message: 'Invalid or expired access token.' });
        }
      }
    } else if (!isPublic) {
      throw new UnauthorizedError({ code: 'UNAUTHENTICATED', message: 'A bearer access token is required.' });
    }

    return true;
  }

  private extractToken(req: AuthedRequest): string | null {
    const header = req.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    return null;
  }
}
