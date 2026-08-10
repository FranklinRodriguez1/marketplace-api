import type { Actor } from '@cerca/contract';
import type { Request } from 'express';

/** Express request after the auth guard has resolved (and attached) the actor. */
export interface AuthedRequest extends Request {
  actor?: Actor;
}
