import { Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CLOCK, type ClockPort } from '../../kernel/ports/clock.port';
import { ID, type IdPort } from '../../kernel/ports/id.port';
import { PrismaService } from '../../shared/database/prisma.service';
import { dbClient } from '../../shared/database/tx';
import type { AuditInput, AuditPort } from './audit.port';

@Injectable()
export class PrismaAuditRepository implements AuditPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(ID) private readonly ids: IdPort,
  ) {}

  private get db() {
    return dbClient(this.prisma, this.cls);
  }

  async record(input: AuditInput): Promise<void> {
    await this.db.auditEvent.create({
      data: {
        id: this.ids.generate(),
        actorId: input.actor.id,
        capacitySnapshot: [...input.actor.capacities],
        platformRoleSnapshot: input.actor.platformRole,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: (input.metadata ?? undefined) as object | undefined,
        at: this.clock.now(),
      },
    });
  }
}
