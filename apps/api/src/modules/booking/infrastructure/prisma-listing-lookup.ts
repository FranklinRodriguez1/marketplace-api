import { Injectable } from '@nestjs/common';
import type { Listing as ContractListing, ListingStatus } from '@cerca/contract';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../../../shared/database/prisma.service';
import { dbClient } from '../../../shared/database/tx';
import type { ListingLookupPort } from '../application/ports';

interface ListingLite {
  id: string;
  ownerId: string;
  statusKind: string;
  publishedAt: Date | null;
  removedById: string | null;
  removalReason: string | null;
  createdAt: Date;
}

function liteStatus(row: ListingLite): ListingStatus {
  switch (row.statusKind) {
    case 'published':
      return { kind: 'published', publishedAt: (row.publishedAt ?? row.createdAt).toISOString() };
    case 'removed':
      return { kind: 'removed', removedById: row.removedById ?? '', reason: row.removalReason ?? '' };
    case 'paused':
      return { kind: 'paused' };
    case 'under_review':
      return { kind: 'under_review' };
    default:
      return { kind: 'draft' };
  }
}

@Injectable()
export class PrismaListingLookup implements ListingLookupPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get db() {
    return dbClient(this.prisma, this.cls);
  }

  async byId(id: string): Promise<ContractListing | null> {
    const row = await this.db.listing.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        statusKind: true,
        publishedAt: true,
        removedById: true,
        removalReason: true,
        createdAt: true,
      },
    });
    if (!row) return null;
    return { id: row.id, ownerId: row.ownerId, status: liteStatus(row) };
  }
}
