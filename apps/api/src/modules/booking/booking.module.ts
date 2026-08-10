import { Module } from '@nestjs/common';
import { AcceptBookingUseCase } from './application/accept-booking.use-case';
import { CancelBookingUseCase } from './application/cancel-booking.use-case';
import { CompleteBookingUseCase } from './application/complete-booking.use-case';
import { DeclineBookingUseCase } from './application/decline-booking.use-case';
import { GetBookingUseCase } from './application/get-booking.use-case';
import { ListBookingsUseCase } from './application/list-bookings.use-case';
import { BOOKING_REPOSITORY, LISTING_LOOKUP } from './application/ports';
import { RequestBookingUseCase } from './application/request-booking.use-case';
import { PrismaBookingRepository } from './infrastructure/prisma-booking.repository';
import { PrismaListingLookup } from './infrastructure/prisma-listing-lookup';
import { BookingController } from './presentation/booking.controller';

@Module({
  controllers: [BookingController],
  providers: [
    RequestBookingUseCase,
    GetBookingUseCase,
    ListBookingsUseCase,
    AcceptBookingUseCase,
    DeclineBookingUseCase,
    CompleteBookingUseCase,
    CancelBookingUseCase,
    { provide: BOOKING_REPOSITORY, useClass: PrismaBookingRepository },
    { provide: LISTING_LOOKUP, useClass: PrismaListingLookup },
  ],
})
export class BookingModule {}
