import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Actor } from '@cerca/contract';
import { CurrentActor } from '../../../shared/auth/current-actor.decorator';
import { RequirePermission } from '../../../shared/auth/require-permission.decorator';
import { ModerateReviewUseCase } from '../application/moderate-review.use-case';
import { ModerateReviewDto } from './dto';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller({ path: 'reviews', version: '1' })
export class ReviewModerateController {
  constructor(private readonly moderateReview: ModerateReviewUseCase) {}

  @Post(':id/moderate')
  @RequirePermission('review:moderate')
  @HttpCode(204)
  async moderate(
    @CurrentActor() actor: Actor,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ModerateReviewDto,
  ): Promise<void> {
    await this.moderateReview.execute(actor, id, body);
  }
}
