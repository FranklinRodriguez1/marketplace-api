import { Inject, Injectable } from '@nestjs/common';
import type { Actor, ModerateReviewInput } from '@cerca/contract';
import { ForbiddenError, NotFoundError } from '../../../kernel/domain-error';
import { CLOCK, type ClockPort } from '../../../kernel/ports/clock.port';
import { TRANSACTION, type TransactionPort } from '../../../kernel/ports/transaction.port';
import { AUDIT, type AuditPort } from '../../audit/audit.port';
import { REVIEW_REPOSITORY, type ReviewRepository } from './ports';

// review:moderate + NOT the author. A moderator cannot moderate their own review.
@Injectable()
export class ModerateReviewUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY) private readonly reviews: ReviewRepository,
    @Inject(AUDIT) private readonly audit: AuditPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(TRANSACTION) private readonly tx: TransactionPort,
  ) {}

  async execute(actor: Actor, reviewId: string, input: ModerateReviewInput): Promise<void> {
    await this.tx.run(async () => {
      const review = await this.reviews.findById(reviewId);
      if (!review) {
        throw new NotFoundError({ code: 'REVIEW_NOT_FOUND', message: 'Review not found.' });
      }
      if (review.authorId === actor.id) {
        throw new ForbiddenError({
          code: 'CANNOT_MODERATE_OWN_REVIEW',
          message: 'You cannot moderate your own review.',
          reason: 'is_author',
        });
      }
      await this.reviews.moderate(reviewId, input.action, this.clock.now(), review.listingId);
      await this.audit.record({
        actor,
        action: 'review:moderate',
        targetType: 'review',
        targetId: reviewId,
        metadata: { action: input.action },
      });
    });
  }
}
