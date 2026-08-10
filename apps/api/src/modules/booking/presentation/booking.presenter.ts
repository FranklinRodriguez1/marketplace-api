import type { BookingResponse } from '@cerca/contract';
import type { BookingRecord } from '../domain/booking';

export function presentBooking(booking: BookingRecord): BookingResponse {
  return {
    id: booking.id,
    listingId: booking.listingId,
    customerId: booking.customerId,
    status: booking.status.kind,
    requestedAt: booking.requestedAt.toISOString(),
    scheduledFor: booking.scheduledFor ? booking.scheduledFor.toISOString() : null,
    completedAt: booking.completedAt ? booking.completedAt.toISOString() : null,
    reviewId: booking.reviewId,
  };
}
