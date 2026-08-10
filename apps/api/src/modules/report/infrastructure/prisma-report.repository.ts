import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { encodeCursor, type Page } from '../../../kernel/cursor';
import { PrismaService } from '../../../shared/database/prisma.service';
import { dbClient } from '../../../shared/database/tx';
import type { ReportRecord, ReportStatusValue } from '../domain/report';
import type { CreateReportData, ReportRepository } from '../application/ports';

interface ReportRow {
  id: string;
  listingId: string;
  reporterId: string;
  reason: string;
  status: ReportStatusValue;
  createdAt: Date;
}

function toRecord(row: ReportRow): ReportRecord {
  return {
    id: row.id,
    listingId: row.listingId,
    reporterId: row.reporterId,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaReportRepository implements ReportRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get db() {
    return dbClient(this.prisma, this.cls);
  }

  async create(data: CreateReportData): Promise<ReportRecord> {
    const row = await this.db.report.create({
      data: { id: data.id, listingId: data.listingId, reporterId: data.reporterId, reason: data.reason },
    });
    return toRecord(row as ReportRow);
  }

  async findById(id: string): Promise<ReportRecord | null> {
    const row = await this.db.report.findUnique({ where: { id } });
    return row ? toRecord(row as ReportRow) : null;
  }

  async listOpen(limit: number, cursorCreatedAt: string | null, cursorId: string | null): Promise<Page<ReportRecord>> {
    const keyset =
      cursorCreatedAt && cursorId
        ? {
            OR: [
              { createdAt: { lt: new Date(cursorCreatedAt) } },
              { createdAt: new Date(cursorCreatedAt), id: { lt: cursorId } },
            ],
          }
        : {};
    const rows = await this.db.report.findMany({
      where: { status: 'open', ...keyset },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((r) => toRecord(r as ReportRow));
    const last = items.at(-1);
    const nextCursor =
      hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;
    return { items, nextCursor };
  }

  async resolve(
    id: string,
    resolverId: string,
    status: Exclude<ReportStatusValue, 'open'>,
    note: string | null,
    at: Date,
  ): Promise<ReportRecord> {
    const row = await this.db.report.update({
      where: { id },
      data: { status, resolvedById: resolverId, resolutionNote: note, resolvedAt: at },
    });
    return toRecord(row as ReportRow);
  }
}
