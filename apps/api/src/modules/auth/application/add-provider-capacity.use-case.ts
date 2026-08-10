import { Inject, Injectable } from '@nestjs/common';
import type { ActorResponse } from '@cerca/contract';
import { NotFoundError } from '../../../kernel/domain-error';
import { toActorResponse } from '../domain/user';
import { USER_REPOSITORY, type UserRepository } from './ports';

@Injectable()
export class AddProviderCapacityUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(userId: string): Promise<ActorResponse> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    }
    const updated = await this.users.addCapacity(userId, 'provider');
    return toActorResponse(updated);
  }
}
