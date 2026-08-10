import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Actor, ReportResponse } from '@cerca/contract';
import { CurrentActor } from '../../../shared/auth/current-actor.decorator';
import { RequirePermission } from '../../../shared/auth/require-permission.decorator';
import { ListReportsUseCase } from '../application/list-reports.use-case';
import { ResolveReportUseCase } from '../application/resolve-report.use-case';
import { ResolveReportDto } from './dto';
import { presentReport } from './report.presenter';

@ApiTags('reports')
@ApiBearerAuth()
@Controller({ path: 'reports', version: '1' })
export class ReportQueueController {
  constructor(
    private readonly listReports: ListReportsUseCase,
    private readonly resolveReport: ResolveReportUseCase,
  ) {}

  @Get()
  @RequirePermission('report:resolve')
  async list(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<{ items: ReportResponse[]; nextCursor: string | null }> {
    const parsedLimit = Math.min(Math.max(Number.parseInt(limit ?? '20', 10) || 20, 1), 50);
    const page = await this.listReports.execute(parsedLimit, cursor);
    return { items: page.items.map(presentReport), nextCursor: page.nextCursor };
  }

  @Post(':id/resolve')
  @RequirePermission('report:resolve')
  async resolve(
    @CurrentActor() actor: Actor,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ResolveReportDto,
  ): Promise<ReportResponse> {
    return presentReport(await this.resolveReport.execute(actor, id, body));
  }
}
