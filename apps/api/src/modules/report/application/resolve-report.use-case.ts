import { Inject, Injectable } from '@nestjs/common';
import type { Actor, ResolveReportInput } from '@cerca/contract';
import { ConflictError, NotFoundError } from '../../../kernel/domain-error';
import { CLOCK, type ClockPort } from '../../../kernel/ports/clock.port';
import { TRANSACTION, type TransactionPort } from '../../../kernel/ports/transaction.port';
import { AUDIT, type AuditPort } from '../../audit/audit.port';
import type { ReportRecord } from '../domain/report';
import { REPORT_REPOSITORY, type ReportRepository } from './ports';

@Injectable()
export class ResolveReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly reports: ReportRepository,
    @Inject(AUDIT) private readonly audit: AuditPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(TRANSACTION) private readonly tx: TransactionPort,
  ) {}

  async execute(actor: Actor, reportId: string, input: ResolveReportInput): Promise<ReportRecord> {
    return this.tx.run(async () => {
      const report = await this.reports.findById(reportId);
      if (!report) {
        throw new NotFoundError({ code: 'REPORT_NOT_FOUND', message: 'Report not found.' });
      }
      if (report.status !== 'open') {
        throw new ConflictError({ code: 'REPORT_ALREADY_RESOLVED', message: 'This report is already resolved.' });
      }
      const status = input.action === 'remove' ? 'resolved' : 'dismissed';
      const updated = await this.reports.resolve(reportId, actor.id, status, input.note ?? null, this.clock.now());
      await this.audit.record({
        actor,
        action: 'report:resolve',
        targetType: 'report',
        targetId: reportId,
        metadata: { action: input.action },
      });
      return updated;
    });
  }
}
