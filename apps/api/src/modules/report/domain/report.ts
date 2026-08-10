export type ReportStatusValue = 'open' | 'resolved' | 'dismissed';

export interface ReportRecord {
  id: string;
  listingId: string;
  reporterId: string;
  reason: string;
  status: ReportStatusValue;
  createdAt: Date;
}
