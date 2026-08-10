import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../../../shared/database/prisma.service';
import { dbClient } from '../../../shared/database/tx';
import type {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../application/ports';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get db() {
    return dbClient(this.prisma, this.cls);
  }

  async create(input: CreateRefreshTokenInput): Promise<void> {
    await this.db.refreshToken.create({ data: input });
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const row = await this.db.refreshToken.findUnique({ where: { tokenHash } });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      familyId: row.familyId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
    };
  }

  async markRotated(id: string, replacedById: string, at: Date): Promise<void> {
    await this.db.refreshToken.update({ where: { id }, data: { revokedAt: at, replacedById } });
  }

  async revoke(id: string, at: Date): Promise<void> {
    await this.db.refreshToken.update({ where: { id }, data: { revokedAt: at } });
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    await this.db.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: at } });
  }
}
