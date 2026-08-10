import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { encodeCursor, type Page } from '../../../kernel/cursor';
import { PrismaService } from '../../../shared/database/prisma.service';
import { dbClient } from '../../../shared/database/tx';
import { type BookingRecord, type BookingRow, toBookingRecord } from '../domain/booking';
import type { BookingRepository, CreateBookingData } from '../application/ports';

@Injectable()
export class PrismaBookingRepository implements BookingRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get db() {
    return dbClient(this.prisma, this.cls);
  }

  async create(data: CreateBookingData): Promise<BookingRecord> {
    const row = await this.db.booking.create({
      data: { id: data.id, listingId: data.listingId, customerId: data.customerId, statusKind: 'requested' },
    });
    return toBookingRecord(row as BookingRow);
  }

  async findById(id: string): Promise<BookingRecord | null> {
    const row = await this.db.booking.findUnique({ where: { id } });
    return row ? toBookingRecord(row as BookingRow) : null;
  }

  async listByRole(
    actorId: string,
    role: 'customer' | 'provider',
    limit: number,
    cursorRequestedAt: string | null,
    cursorId: string | null,
  ): Promise<Page<BookingRecord>> {
    const scope = role === 'customer' ? { customerId: actorId } : { listing: { ownerId: actorId } };
    const keyset =
      cursorRequestedAt && cursorId
        ? {
            OR: [
              { requestedAt: { lt: new Date(cursorRequestedAt) } },
              { requestedAt: new Date(cursorRequestedAt), id: { lt: cursorId } },
            ],
          }
        : {};
    const rows = await this.db.booking.findMany({
      where: { ...scope, ...keyset },
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((r) => toBookingRecord(r as BookingRow));
    const last = items.at(-1);
    const nextCursor =
      hasMore && last ? encodeCursor({ requestedAt: last.requestedAt.toISOString(), id: last.id }) : null;
    return { items, nextCursor };
  }

  async accept(id: string, scheduledFor: Date, at: Date): Promise<BookingRecord> {
    const row = await this.db.booking.update({
      where: { id },
      data: { statusKind: 'accepted', acceptedAt: at, scheduledFor },
    });
    return toBookingRecord(row as BookingRow);
  }

  async decline(id: string, reason: string): Promise<BookingRecord> {
    const row = await this.db.booking.update({ where: { id }, data: { statusKind: 'declined', declineReason: reason } });
    return toBookingRecord(row as BookingRow);
  }

  async complete(id: string, at: Date): Promise<BookingRecord> {
    const row = await this.db.booking.update({ where: { id }, data: { statusKind: 'completed', completedAt: at } });
    return toBookingRecord(row as BookingRow);
  }

  async cancel(id: string, cancelledById: string, at: Date): Promise<BookingRecord> {
    const row = await this.db.booking.update({
      where: { id },
      data: { statusKind: 'cancelled', cancelledById, cancelledAt: at },
    });
    return toBookingRecord(row as BookingRow);
  }
}
