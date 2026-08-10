import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../../../shared/database/prisma.service';
import { dbClient } from '../../../shared/database/tx';
import type { ListingExistsPort } from '../application/ports';

@Injectable()
export class PrismaListingExists implements ListingExistsPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  async exists(listingId: string): Promise<boolean> {
    const row = await dbClient(this.prisma, this.cls).listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    return row !== null;
  }
}
