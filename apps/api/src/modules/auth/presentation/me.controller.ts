import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Actor, ActorResponse } from '@cerca/contract';
import { CurrentActor } from '../../../shared/auth/current-actor.decorator';
import { AddProviderCapacityUseCase } from '../application/add-provider-capacity.use-case';

@ApiTags('me')
@ApiBearerAuth()
@Controller({ path: 'me', version: '1' })
export class MeController {
  constructor(private readonly addProviderCapacity: AddProviderCapacityUseCase) {}

  @Get()
  me(@CurrentActor() actor: Actor): ActorResponse {
    return { id: actor.id, capacities: [...actor.capacities], platformRole: actor.platformRole };
  }

  @Post('capacities/provider')
  @HttpCode(200)
  becomeProvider(@CurrentActor() actor: Actor): Promise<ActorResponse> {
    return this.addProviderCapacity.execute(actor.id);
  }
}
