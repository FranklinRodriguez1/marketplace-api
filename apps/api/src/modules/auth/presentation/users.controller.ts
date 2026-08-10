import { Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Actor } from '@cerca/contract';
import { CurrentActor } from '../../../shared/auth/current-actor.decorator';
import { RequirePermission } from '../../../shared/auth/require-permission.decorator';
import { SuspendUserUseCase } from '../application/suspend-user.use-case';

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly suspendUser: SuspendUserUseCase) {}

  @Post(':id/suspend')
  @RequirePermission('user:suspend')
  @HttpCode(204)
  async suspend(
    @CurrentActor() actor: Actor,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.suspendUser.execute(actor, id);
  }
}
