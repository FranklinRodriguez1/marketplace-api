import { Module } from '@nestjs/common';
import { CreateReportUseCase } from './application/create-report.use-case';
import { ListReportsUseCase } from './application/list-reports.use-case';
import { LISTING_EXISTS, REPORT_REPOSITORY } from './application/ports';
import { ResolveReportUseCase } from './application/resolve-report.use-case';
import { PrismaListingExists } from './infrastructure/prisma-listing-exists';
import { PrismaReportRepository } from './infrastructure/prisma-report.repository';
import { ReportCreateController } from './presentation/report-create.controller';
import { ReportQueueController } from './presentation/report-queue.controller';

@Module({
  controllers: [ReportCreateController, ReportQueueController],
  providers: [
    CreateReportUseCase,
    ListReportsUseCase,
    ResolveReportUseCase,
    { provide: REPORT_REPOSITORY, useClass: PrismaReportRepository },
    { provide: LISTING_EXISTS, useClass: PrismaListingExists },
  ],
})
export class ReportModule {}
