import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Actor } from '@cerca/contract';
import type { AuthedRequest } from '../http/authenticated-request';

/** Typed, mockable access to the authenticated actor — beats rummaging through @Req(). */
export const CurrentActor = createParamDecorator((_data: unknown, ctx: ExecutionContext): Actor => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  if (!req.actor) {
    throw new Error('CurrentActor used on a route the auth guard did not populate');
  }
  return req.actor;
});
