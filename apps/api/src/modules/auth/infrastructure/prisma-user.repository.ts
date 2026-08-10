import { Injectable } from '@nestjs/common';
import type { Capacity } from '@cerca/contract';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../../../shared/database/prisma.service';
import { dbClient } from '../../../shared/database/tx';
import type { CreateUserInput, UserRepository } from '../application/ports';
import type { UserRecord } from '../domain/user';

interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  capacities: Capacity[];
  platformRole: UserRecord['platformRole'];
  suspendedAt: Date | null;
}

function toRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    displayName: row.displayName,
    capacities: row.capacities,
    platformRole: row.platformRole,
    suspendedAt: row.suspendedAt,
  };
}

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get db() {
    return dbClient(this.prisma, this.cls);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.db.user.findUnique({ where: { email } });
    return row ? toRecord(row) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const row = await this.db.user.create({
      data: {
        id: input.id,
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
        capacities: input.capacities,
        platformRole: input.platformRole,
      },
    });
    return toRecord(row);
  }

  async addCapacity(id: string, capacity: Capacity): Promise<UserRecord> {
    const current = await this.db.user.findUniqueOrThrow({ where: { id } });
    const capacities = current.capacities.includes(capacity)
      ? current.capacities
      : [...current.capacities, capacity];
    const row = await this.db.user.update({ where: { id }, data: { capacities } });
    return toRecord(row);
  }

  async setSuspended(id: string, suspendedAt: Date | null): Promise<UserRecord> {
    const row = await this.db.user.update({ where: { id }, data: { suspendedAt } });
    return toRecord(row);
  }
}
