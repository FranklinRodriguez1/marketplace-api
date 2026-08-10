import type { ReportResponse } from '@cerca/contract';
import type { ReportRecord } from '../domain/report';

export function presentReport(report: ReportRecord): ReportResponse {
  return {
    id: report.id,
    listingId: report.listingId,
    reporterId: report.reporterId,
    reason: report.reason,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
  };
}
