import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Actor, ReportResponse } from '@cerca/contract';
import { CurrentActor } from '../../../shared/auth/current-actor.decorator';
import { CreateReportUseCase } from '../application/create-report.use-case';
import { CreateReportDto } from './dto';
import { presentReport } from './report.presenter';

@ApiTags('reports')
@ApiBearerAuth()
@Controller({ path: 'listings', version: '1' })
export class ReportCreateController {
  constructor(private readonly createReport: CreateReportUseCase) {}

  @Post(':id/report')
  @HttpCode(201)
  async create(
    @CurrentActor() actor: Actor,
    @Param('id', new ParseUUIDPipe()) listingId: string,
    @Body() body: CreateReportDto,
  ): Promise<ReportResponse> {
    return presentReport(await this.createReport.execute(actor, listingId, body));
  }
}
