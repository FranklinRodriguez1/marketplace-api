import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { encodeCursor, type Page } from '../../../kernel/cursor';
import { ConflictError } from '../../../kernel/domain-error';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { dbClient } from '../../../shared/database/tx';
import type { ReviewRecord } from '../domain/review';
import type { CreateReviewData, ReviewRepository } from '../application/ports';

interface ReviewRow {
  id: string;
  bookingId: string;
  listingId: string;
  authorId: string;
  rating: number;
  body: string;
  createdAt: Date;
}

function toRecord(row: ReviewRow): ReviewRecord {
  return {
    id: row.id,
    bookingId: row.bookingId,
    listingId: row.listingId,
    authorId: row.authorId,
    rating: row.rating,
    body: row.body,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaReviewRepository implements ReviewRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get db() {
    return dbClient(this.prisma, this.cls);
  }

  async createForBooking(data: CreateReviewData): Promise<ReviewRecord> {
    try {
      const row = await this.db.review.create({
        data: {
          id: data.id,
          bookingId: data.bookingId,
          listingId: data.listingId,
          authorId: data.authorId,
          rating: data.rating,
          body: data.body,
        },
      });
      await this.db.booking.update({ where: { id: data.bookingId }, data: { reviewId: data.id } });
      await this.recomputeRating(data.listingId);
      return toRecord(row);
    } catch (error) {
      // Unique violation on Review.bookingId: a concurrent request already created the review.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError({
          code: 'REVIEW_ALREADY_EXISTS',
          message: 'This booking has already been reviewed.',
          reason: 'already_reviewed',
        });
      }
      throw error;
    }
  }

  async findById(id: string): Promise<ReviewRecord | null> {
    const row = await this.db.review.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async moderate(id: string, action: 'remove' | 'keep', at: Date, listingId: string): Promise<void> {
    await this.db.review.update({
      where: { id },
      data: action === 'remove' ? { removedAt: at, moderatedAt: at } : { moderatedAt: at },
    });
    if (action === 'remove') {
      await this.recomputeRating(listingId);
    }
  }

  async listByListing(
    listingId: string,
    limit: number,
    cursorCreatedAt: string | null,
    cursorId: string | null,
  ): Promise<Page<ReviewRecord>> {
    const keyset =
      cursorCreatedAt && cursorId
        ? {
            OR: [
              { createdAt: { lt: new Date(cursorCreatedAt) } },
              { createdAt: new Date(cursorCreatedAt), id: { lt: cursorId } },
            ],
          }
        : {};
    const rows = await this.db.review.findMany({
      where: { listingId, removedAt: null, ...keyset },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(toRecord);
    const last = items.at(-1);
    const nextCursor =
      hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;
    return { items, nextCursor };
  }

  private async recomputeRating(listingId: string): Promise<void> {
    const agg = await this.db.review.aggregate({
      where: { listingId, removedAt: null },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await this.db.listing.update({
      where: { id: listingId },
      data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count._all },
    });
  }
}
