import { Inject, Injectable } from '@nestjs/common';
import { decodeCursor, type Page } from '../../../kernel/cursor';
import type { ReportRecord } from '../domain/report';
import { REPORT_REPOSITORY, type ReportRepository } from './ports';

interface ReportCursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class ListReportsUseCase {
  constructor(@Inject(REPORT_REPOSITORY) private readonly reports: ReportRepository) {}

  execute(limit: number, cursor: string | undefined): Promise<Page<ReportRecord>> {
    const decoded = decodeCursor<ReportCursor>(cursor);
    return this.reports.listOpen(limit, decoded?.createdAt ?? null, decoded?.id ?? null);
  }
}
