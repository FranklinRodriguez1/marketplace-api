import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@cerca/contract';
import { NotFoundError } from '../../../kernel/domain-error';
import { CLOCK, type ClockPort } from '../../../kernel/ports/clock.port';
import { TRANSACTION, type TransactionPort } from '../../../kernel/ports/transaction.port';
import { AUDIT, type AuditPort } from '../../audit/audit.port';
import { USER_REPOSITORY, type UserRepository } from './ports';

@Injectable()
export class SuspendUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(AUDIT) private readonly audit: AuditPort,
    @Inject(TRANSACTION) private readonly tx: TransactionPort,
  ) {}

  async execute(actor: Actor, targetUserId: string): Promise<void> {
    await this.tx.run(async () => {
      const user = await this.users.findById(targetUserId);
      if (!user) {
        throw new NotFoundError({ code: 'USER_NOT_FOUND', message: 'User not found.' });
      }
      await this.users.setSuspended(targetUserId, this.clock.now());
      await this.audit.record({ actor, action: 'user:suspend', targetType: 'user', targetId: targetUserId });
    });
  }
}
