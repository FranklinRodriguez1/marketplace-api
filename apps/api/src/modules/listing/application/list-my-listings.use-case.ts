import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@cerca/contract';
import { decodeCursor, type Page } from '../../../kernel/cursor';
import type { ListingRecord } from '../domain/listing';
import { LISTING_REPOSITORY, type ListingRepository } from './ports';

interface OwnerCursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class ListMyListingsUseCase {
  constructor(@Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository) {}

  execute(actor: Actor, limit: number, cursor: string | undefined): Promise<Page<ListingRecord>> {
    const decoded = decodeCursor<OwnerCursor>(cursor);
    return this.listings.findByOwner(actor.id, limit, decoded?.createdAt ?? null, decoded?.id ?? null);
  }
}
