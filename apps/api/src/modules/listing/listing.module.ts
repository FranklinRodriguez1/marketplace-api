import { Module } from '@nestjs/common';
import { CreateListingUseCase } from './application/create-listing.use-case';
import { GetListingUseCase } from './application/get-listing.use-case';
import { ListMyListingsUseCase } from './application/list-my-listings.use-case';
import { ModerateListingUseCase } from './application/moderate-listing.use-case';
import { BOOKING_LOOKUP, LISTING_REPOSITORY } from './application/ports';
import { SearchListingsUseCase } from './application/search-listings.use-case';
import { TransitionListingUseCase } from './application/transition-listing.use-case';
import { UpdateListingUseCase } from './application/update-listing.use-case';
import { PrismaBookingLookup } from './infrastructure/prisma-booking-lookup';
import { PrismaListingRepository } from './infrastructure/prisma-listing.repository';
import { ListingController } from './presentation/listing.controller';
import { MyListingsController } from './presentation/my-listings.controller';

@Module({
  controllers: [ListingController, MyListingsController],
  providers: [
    CreateListingUseCase,
    GetListingUseCase,
    SearchListingsUseCase,
    ListMyListingsUseCase,
    UpdateListingUseCase,
    TransitionListingUseCase,
    ModerateListingUseCase,
    { provide: LISTING_REPOSITORY, useClass: PrismaListingRepository },
    { provide: BOOKING_LOOKUP, useClass: PrismaBookingLookup },
  ],
})
export class ListingModule {}
