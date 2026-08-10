import { Module } from '@nestjs/common';
import { ListReviewsUseCase } from './application/list-reviews.use-case';
import { ModerateReviewUseCase } from './application/moderate-review.use-case';
import { BOOKING_FOR_REVIEW, REVIEW_REPOSITORY } from './application/ports';
import { WriteReviewUseCase } from './application/write-review.use-case';
import { PrismaBookingForReview } from './infrastructure/prisma-booking-for-review';
import { PrismaReviewRepository } from './infrastructure/prisma-review.repository';
import { ListingReviewsController } from './presentation/listing-reviews.controller';
import { ReviewModerateController } from './presentation/review-moderate.controller';
import { ReviewWriteController } from './presentation/review-write.controller';

@Module({
  controllers: [ReviewWriteController, ReviewModerateController, ListingReviewsController],
  providers: [
    WriteReviewUseCase,
    ModerateReviewUseCase,
    ListReviewsUseCase,
    { provide: REVIEW_REPOSITORY, useClass: PrismaReviewRepository },
    { provide: BOOKING_FOR_REVIEW, useClass: PrismaBookingForReview },
  ],
})
export class ReviewModule {}
