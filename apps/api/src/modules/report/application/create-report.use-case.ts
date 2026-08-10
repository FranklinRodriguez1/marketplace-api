import { Inject, Injectable } from '@nestjs/common';
import type { Actor, CreateReportInput } from '@cerca/contract';
import { NotFoundError } from '../../../kernel/domain-error';
import { ID, type IdPort } from '../../../kernel/ports/id.port';
import type { ReportRecord } from '../domain/report';
import { LISTING_EXISTS, type ListingExistsPort, REPORT_REPOSITORY, type ReportRepository } from './ports';

@Injectable()
export class CreateReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly reports: ReportRepository,
    @Inject(LISTING_EXISTS) private readonly listings: ListingExistsPort,
    @Inject(ID) private readonly ids: IdPort,
  ) {}

  async execute(actor: Actor, listingId: string, input: CreateReportInput): Promise<ReportRecord> {
    if (!(await this.listings.exists(listingId))) {
      throw new NotFoundError({ code: 'LISTING_NOT_FOUND', message: 'Listing not found.' });
    }
    return this.reports.create({
      id: this.ids.generate(),
      listingId,
      reporterId: actor.id,
      reason: input.reason,
    });
  }
}
