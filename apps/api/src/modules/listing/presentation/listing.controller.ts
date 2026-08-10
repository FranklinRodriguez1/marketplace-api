import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Actor, ListingResponse, ListingSearchItem } from '@cerca/contract';
import { CurrentActor } from '../../../shared/auth/current-actor.decorator';
import { Public } from '../../../shared/auth/public.decorator';
import { RequirePermission } from '../../../shared/auth/require-permission.decorator';
import { CreateListingUseCase } from '../application/create-listing.use-case';
import { GetListingUseCase } from '../application/get-listing.use-case';
import { ModerateListingUseCase } from '../application/moderate-listing.use-case';
import { SearchListingsUseCase } from '../application/search-listings.use-case';
import { TransitionListingUseCase } from '../application/transition-listing.use-case';
import { UpdateListingUseCase } from '../application/update-listing.use-case';
import { CreateListingDto, ModerateListingDto, SearchListingsDto, UpdateListingDto } from './dto';
import { presentListing, toSearchItem } from './listing.presenter';

@ApiTags('listings')
@Controller({ path: 'listings', version: '1' })
export class ListingController {
  constructor(
    private readonly createUseCase: CreateListingUseCase,
    private readonly getUseCase: GetListingUseCase,
    private readonly searchUseCase: SearchListingsUseCase,
    private readonly updateUseCase: UpdateListingUseCase,
    private readonly transitionUseCase: TransitionListingUseCase,
    private readonly moderateUseCase: ModerateListingUseCase,
  ) {}

  @Public()
  @Get()
  async search(
    @Query() query: SearchListingsDto,
  ): Promise<{ items: ListingSearchItem[]; nextCursor: string | null }> {
    const result = await this.searchUseCase.execute(query);
    return { items: result.items.map(toSearchItem), nextCursor: result.nextCursor };
  }

  @Public()
  @Get(':id')
  async getOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<ListingResponse> {
    return presentListing(await this.getUseCase.execute(id));
  }

  @Post()
  @RequirePermission('listing:create')
  @ApiBearerAuth()
  @HttpCode(201)
  async create(@CurrentActor() actor: Actor, @Body() body: CreateListingDto): Promise<ListingResponse> {
    return presentListing(await this.createUseCase.execute(actor, body));
  }

  @Patch(':id')
  @RequirePermission('listing:update')
  @ApiBearerAuth()
  async update(
    @CurrentActor() actor: Actor,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateListingDto,
  ): Promise<ListingResponse> {
    return presentListing(await this.updateUseCase.execute(actor, id, body));
  }

  @Post(':id/publish')
  @RequirePermission('listing:update')
  @ApiBearerAuth()
  async publish(@CurrentActor() actor: Actor, @Param('id', new ParseUUIDPipe()) id: string): Promise<ListingResponse> {
    return presentListing(await this.transitionUseCase.execute(actor, id, 'publish'));
  }

  @Post(':id/pause')
  @RequirePermission('listing:update')
  @ApiBearerAuth()
  async pause(@CurrentActor() actor: Actor, @Param('id', new ParseUUIDPipe()) id: string): Promise<ListingResponse> {
    return presentListing(await this.transitionUseCase.execute(actor, id, 'pause'));
  }

  @Post(':id/moderate')
  @RequirePermission('listing:moderate')
  @ApiBearerAuth()
  async moderate(
    @CurrentActor() actor: Actor,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ModerateListingDto,
  ): Promise<ListingResponse> {
    return presentListing(await this.moderateUseCase.execute(actor, id, body));
  }
}
