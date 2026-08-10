import { Injectable } from '@nestjs/common';
import type { Booking as ContractBooking } from '@cerca/contract';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../../../shared/database/prisma.service';
import { dbClient } from '../../../shared/database/tx';
import { type BookingRow, toContractBooking } from '../../booking/domain/booking';
import type { BookingForReviewPort } from '../application/ports';

@Injectable()
export class PrismaBookingForReview implements BookingForReviewPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get db() {
    return dbClient(this.prisma, this.cls);
  }

  async byId(id: string): Promise<ContractBooking | null> {
    const row = await this.db.booking.findUnique({ where: { id } });
    return row ? toContractBooking(row as BookingRow) : null;
  }
}
