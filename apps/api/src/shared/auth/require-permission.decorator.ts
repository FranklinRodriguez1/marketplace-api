import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@cerca/contract';

export const REQUIRE_PERMISSION = 'require_permission';

/** Layer 1 (capability) requirement, enforced by the CASL PolicyGuard from the shared matrix. */
export const RequirePermission = (permission: Permission): MethodDecorator =>
  SetMetadata(REQUIRE_PERMISSION, permission);
