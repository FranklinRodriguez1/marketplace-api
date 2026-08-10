import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../kernel/domain-error';
import type { ListingRecord } from '../domain/listing';
import { LISTING_REPOSITORY, type ListingRepository } from './ports';

@Injectable()
export class GetListingUseCase {
  constructor(@Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository) {}

  async execute(id: string): Promise<ListingRecord> {
    const listing = await this.listings.findById(id);
    if (!listing || listing.status.kind === 'removed') {
      throw new NotFoundError({ code: 'LISTING_NOT_FOUND', message: 'Listing not found.' });
    }
    return listing;
  }
}
