import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'is_public';

/** Deny by default: every route is authenticated unless it opts out with @Public(). */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC, true);
