import { Inject, Injectable } from '@nestjs/common';
import { decodeCursor, type Page } from '../../../kernel/cursor';
import type { ReviewRecord } from '../domain/review';
import { REVIEW_REPOSITORY, type ReviewRepository } from './ports';

interface ReviewCursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class ListReviewsUseCase {
  constructor(@Inject(REVIEW_REPOSITORY) private readonly reviews: ReviewRepository) {}

  execute(listingId: string, limit: number, cursor: string | undefined): Promise<Page<ReviewRecord>> {
    const decoded = decodeCursor<ReviewCursor>(cursor);
    return this.reviews.listByListing(listingId, limit, decoded?.createdAt ?? null, decoded?.id ?? null);
  }
}
