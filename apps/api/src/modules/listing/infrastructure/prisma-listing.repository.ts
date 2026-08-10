import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ClsService } from 'nestjs-cls';
import { encodeCursor, type Page } from '../../../kernel/cursor';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { dbClient } from '../../../shared/database/tx';
import type { ListingRecord } from '../domain/listing';
import type {
  CreateListingData,
  ListingRepository,
  ListingSearchRow,
  ModerationTransition,
  PublishTransition,
  SearchListingsParams,
  UpdateListingData,
} from '../application/ports';
import { type ListingRow, toListingRecord } from './listing.mapper';

// Raw PostGIS results are untyped by definition — validate the shape with Zod. Numbers can
// arrive as strings depending on the driver, so coerce.
const searchRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  categoryId: z.string(),
  priceMinorFrom: z.coerce.number().nullable(),
  currency: z.string().nullable(),
  ratingAvg: z.coerce.number(),
  ratingCount: z.coerce.number(),
  statusKind: z.string(),
  distanceMeters: z.coerce.number(),
});

@Injectable()
export class PrismaListingRepository implements ListingRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get db() {
    return dbClient(this.prisma, this.cls);
  }

  async create(data: CreateListingData): Promise<ListingRecord> {
    const row = await this.db.listing.create({
      data: {
        id: data.id,
        ownerId: data.ownerId,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        pricing: data.pricing as unknown as Prisma.InputJsonValue,
        priceMinorFrom: data.priceMinorFrom,
        currency: data.currency,
        statusKind: 'draft',
      },
    });
    // Prisma cannot type the PostGIS column: set it with parameterized raw SQL.
    await this.db.$executeRaw`
      UPDATE "Listing"
      SET location = ST_SetSRID(ST_MakePoint(${data.location.lng}, ${data.location.lat}), 4326)::geography
      WHERE id = ${data.id}::uuid`;
    return toListingRecord(row as ListingRow);
  }

  async findById(id: string): Promise<ListingRecord | null> {
    const row = await this.db.listing.findUnique({ where: { id } });
    return row ? toListingRecord(row as ListingRow) : null;
  }

  async findByOwner(
    ownerId: string,
    limit: number,
    cursorCreatedAt: string | null,
    cursorId: string | null,
  ): Promise<Page<ListingRecord>> {
    const keyset =
      cursorCreatedAt && cursorId
        ? {
            OR: [
              { createdAt: { lt: new Date(cursorCreatedAt) } },
              { createdAt: new Date(cursorCreatedAt), id: { lt: cursorId } },
            ],
          }
        : {};
    const rows = await this.db.listing.findMany({
      where: { ownerId, ...keyset },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((r) => toListingRecord(r as ListingRow));
    const last = items.at(-1);
    const nextCursor =
      hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;
    return { items, nextCursor };
  }

  async update(id: string, data: UpdateListingData): Promise<ListingRecord> {
    const row = await this.db.listing.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.pricing !== undefined
          ? {
              pricing: data.pricing as unknown as Prisma.InputJsonValue,
              priceMinorFrom: data.priceMinorFrom ?? null,
              currency: data.currency ?? null,
            }
          : {}),
      },
    });
    return toListingRecord(row as ListingRow);
  }

  async transition(id: string, transition: PublishTransition, at: Date): Promise<ListingRecord> {
    const row = await this.db.listing.update({
      where: { id },
      data:
        transition === 'publish'
          ? { statusKind: 'published', publishedAt: at }
          : { statusKind: 'paused' },
    });
    return toListingRecord(row as ListingRow);
  }

  async moderate(
    id: string,
    transition: ModerationTransition,
    moderatorId: string,
    reason: string,
  ): Promise<ListingRecord> {
    const row = await this.db.listing.update({
      where: { id },
      data: { statusKind: transition, removedById: moderatorId, removalReason: reason },
    });
    return toListingRecord(row as ListingRow);
  }

  async search(params: SearchListingsParams): Promise<ListingSearchRow[]> {
    const radiusMeters = params.radiusKm * 1000;
    const query = params.query ?? null;
    const categoryId = params.categoryId ?? null;

    // ST_DWithin uses the GiST index to discard everything outside the radius before computing
    // distances. Keyset on (distance, id), never OFFSET. `$queryRaw` parameterizes every value.
    const rows = await this.db.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id,
             title,
             "categoryId",
             "priceMinorFrom",
             currency,
             "ratingAvg",
             "ratingCount",
             "statusKind"::text AS "statusKind",
             ST_Distance(location, ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography) AS "distanceMeters"
      FROM "Listing"
      WHERE "statusKind" = 'published'
        AND location IS NOT NULL
        AND (${categoryId}::uuid IS NULL OR "categoryId" = ${categoryId}::uuid)
        AND (${query}::text IS NULL OR title ILIKE '%' || ${query} || '%')
        AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography, ${radiusMeters})
        AND (
          ${params.cursorDistance}::float8 IS NULL
          OR ST_Distance(location, ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography) > ${params.cursorDistance}::float8
          OR (
            ST_Distance(location, ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography) = ${params.cursorDistance}::float8
            AND id > ${params.cursorId}::uuid
          )
        )
      ORDER BY "distanceMeters" ASC, id ASC
      LIMIT ${params.limit}`;

    return rows.map((row) => searchRowSchema.parse(row));
  }
}
