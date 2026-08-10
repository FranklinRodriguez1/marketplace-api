import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Actor, ReviewResponse } from '@cerca/contract';
import { CurrentActor } from '../../../shared/auth/current-actor.decorator';
import { RequirePermission } from '../../../shared/auth/require-permission.decorator';
import { Idempotent } from '../../../shared/http/idempotent.decorator';
import { WriteReviewUseCase } from '../application/write-review.use-case';
import { WriteReviewDto } from './dto';
import { presentReview } from './review.presenter';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller({ path: 'bookings', version: '1' })
export class ReviewWriteController {
  constructor(private readonly writeReview: WriteReviewUseCase) {}

  @Post(':id/review')
  @RequirePermission('review:write')
  @Idempotent()
  @HttpCode(201)
  async create(
    @CurrentActor() actor: Actor,
    @Param('id', new ParseUUIDPipe()) bookingId: string,
    @Body() body: WriteReviewDto,
  ): Promise<ReviewResponse> {
    return presentReview(await this.writeReview.execute(actor, bookingId, body));
  }
}
