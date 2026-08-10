import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@cerca/contract';
import { decodeCursor, type Page } from '../../../kernel/cursor';
import type { BookingRecord } from '../domain/booking';
import { BOOKING_REPOSITORY, type BookingRepository } from './ports';

interface BookingCursor {
  requestedAt: string;
  id: string;
}

@Injectable()
export class ListBookingsUseCase {
  constructor(@Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepository) {}

  execute(
    actor: Actor,
    role: 'customer' | 'provider',
    limit: number,
    cursor: string | undefined,
  ): Promise<Page<BookingRecord>> {
    const decoded = decodeCursor<BookingCursor>(cursor);
    return this.bookings.listByRole(actor.id, role, limit, decoded?.requestedAt ?? null, decoded?.id ?? null);
  }
}
