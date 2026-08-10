import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Actor, ListingResponse } from '@cerca/contract';
import { CurrentActor } from '../../../shared/auth/current-actor.decorator';
import { RequirePermission } from '../../../shared/auth/require-permission.decorator';
import { ListMyListingsUseCase } from '../application/list-my-listings.use-case';
import { presentListing } from './listing.presenter';

@ApiTags('listings')
@ApiBearerAuth()
@Controller({ path: 'me/listings', version: '1' })
export class MyListingsController {
  constructor(private readonly listMyListings: ListMyListingsUseCase) {}

  @Get()
  @RequirePermission('listing:read')
  async list(
    @CurrentActor() actor: Actor,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<{ items: ListingResponse[]; nextCursor: string | null }> {
    const parsedLimit = Math.min(Math.max(Number.parseInt(limit ?? '20', 10) || 20, 1), 50);
    const page = await this.listMyListings.execute(actor, parsedLimit, cursor);
    return { items: page.items.map(presentListing), nextCursor: page.nextCursor };
  }
}
