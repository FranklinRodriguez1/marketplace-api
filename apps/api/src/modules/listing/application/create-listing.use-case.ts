import { Inject, Injectable } from '@nestjs/common';
import { type Actor, type CreateListingInput, denormalizePricing } from '@cerca/contract';
import { ID, type IdPort } from '../../../kernel/ports/id.port';
import { TRANSACTION, type TransactionPort } from '../../../kernel/ports/transaction.port';
import type { ListingRecord } from '../domain/listing';
import { LISTING_REPOSITORY, type ListingRepository } from './ports';

@Injectable()
export class CreateListingUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(ID) private readonly ids: IdPort,
    @Inject(TRANSACTION) private readonly tx: TransactionPort,
  ) {}

  async execute(actor: Actor, input: CreateListingInput): Promise<ListingRecord> {
    // Denormalize price in the SAME transaction as the JSONB it mirrors.
    const { priceMinorFrom, currency } = denormalizePricing(input.pricing);
    return this.tx.run(() =>
      this.listings.create({
        id: this.ids.generate(),
        ownerId: actor.id,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        pricing: input.pricing,
        priceMinorFrom,
        currency,
        location: input.location,
      }),
    );
  }
}
