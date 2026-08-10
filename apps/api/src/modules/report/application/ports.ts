import type { Page } from '../../../kernel/cursor';
import type { ReportRecord, ReportStatusValue } from '../domain/report';

export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

export interface CreateReportData {
  id: string;
  listingId: string;
  reporterId: string;
  reason: string;
}

export interface ReportRepository {
  create(data: CreateReportData): Promise<ReportRecord>;
  findById(id: string): Promise<ReportRecord | null>;
  listOpen(limit: number, cursorCreatedAt: string | null, cursorId: string | null): Promise<Page<ReportRecord>>;
  resolve(
    id: string,
    resolverId: string,
    status: Exclude<ReportStatusValue, 'open'>,
    note: string | null,
    at: Date,
  ): Promise<ReportRecord>;
}

export const LISTING_EXISTS = Symbol('REPORT_LISTING_EXISTS');

export interface ListingExistsPort {
  exists(listingId: string): Promise<boolean>;
}
