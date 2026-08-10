import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { ReviewResponse } from '@cerca/contract';
import { Public } from '../../../shared/auth/public.decorator';
import { ListReviewsUseCase } from '../application/list-reviews.use-case';
import { presentReview } from './review.presenter';

@ApiTags('reviews')
@Controller({ path: 'listings', version: '1' })
export class ListingReviewsController {
  constructor(private readonly listReviews: ListReviewsUseCase) {}

  @Public()
  @Get(':id/reviews')
  async list(
    @Param('id', new ParseUUIDPipe()) listingId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<{ items: ReviewResponse[]; nextCursor: string | null }> {
    const parsedLimit = Math.min(Math.max(Number.parseInt(limit ?? '20', 10) || 20, 1), 50);
    const page = await this.listReviews.execute(listingId, parsedLimit, cursor);
    return { items: page.items.map(presentReview), nextCursor: page.nextCursor };
  }
}
