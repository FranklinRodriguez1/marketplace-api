import { Injectable } from '@nestjs/common';
import type { Booking } from '@cerca/contract';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../../../shared/database/prisma.service';
import { dbClient } from '../../../shared/database/tx';
import { type BookingRow, toContractBooking } from '../../booking/domain/booking';
import type { BookingLookupPort } from '../application/ports';

@Injectable()
export class PrismaBookingLookup implements BookingLookupPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get db() {
    return dbClient(this.prisma, this.cls);
  }

  async forListing(listingId: string): Promise<Booking[]> {
    const rows = await this.db.booking.findMany({ where: { listingId } });
    return rows.map((row) => toContractBooking(row as BookingRow));
  }
}
