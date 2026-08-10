import { Inject, Injectable } from '@nestjs/common';
import type { Actor, ModerateListingInput } from '@cerca/contract';
import { NotFoundError } from '../../../kernel/domain-error';
import { TRANSACTION, type TransactionPort } from '../../../kernel/ports/transaction.port';
import { AUDIT, type AuditPort } from '../../audit/audit.port';
import type { ListingRecord } from '../domain/listing';
import { LISTING_REPOSITORY, type ListingRepository } from './ports';

// Moderation transitions to under_review/removed and writes an AuditEvent with the capacity
// the moderator held at the moment — in one transaction.
@Injectable()
export class ModerateListingUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(AUDIT) private readonly audit: AuditPort,
    @Inject(TRANSACTION) private readonly tx: TransactionPort,
  ) {}

  async execute(actor: Actor, listingId: string, input: ModerateListingInput): Promise<ListingRecord> {
    return this.tx.run(async () => {
      const listing = await this.listings.findById(listingId);
      if (!listing) {
        throw new NotFoundError({ code: 'LISTING_NOT_FOUND', message: 'Listing not found.' });
      }
      const updated = await this.listings.moderate(listingId, input.action, actor.id, input.reason);
      await this.audit.record({
        actor,
        action: `listing:${input.action}`,
        targetType: 'listing',
        targetId: listingId,
        metadata: { reason: input.reason },
      });
      return updated;
    });
  }
}
