import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Actor, BookingResponse } from '@cerca/contract';
import { CurrentActor } from '../../../shared/auth/current-actor.decorator';
import { RequirePermission } from '../../../shared/auth/require-permission.decorator';
import { Idempotent } from '../../../shared/http/idempotent.decorator';
import { AcceptBookingUseCase } from '../application/accept-booking.use-case';
import { CancelBookingUseCase } from '../application/cancel-booking.use-case';
import { CompleteBookingUseCase } from '../application/complete-booking.use-case';
import { DeclineBookingUseCase } from '../application/decline-booking.use-case';
import { GetBookingUseCase } from '../application/get-booking.use-case';
import { ListBookingsUseCase } from '../application/list-bookings.use-case';
import { RequestBookingUseCase } from '../application/request-booking.use-case';
import { presentBooking } from './booking.presenter';
import { AcceptBookingDto, BookingRoleQueryDto, CreateBookingDto, DeclineBookingDto } from './dto';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller({ path: 'bookings', version: '1' })
export class BookingController {
  constructor(
    private readonly requestUseCase: RequestBookingUseCase,
    private readonly getUseCase: GetBookingUseCase,
    private readonly listUseCase: ListBookingsUseCase,
    private readonly acceptUseCase: AcceptBookingUseCase,
    private readonly declineUseCase: DeclineBookingUseCase,
    private readonly completeUseCase: CompleteBookingUseCase,
    private readonly cancelUseCase: CancelBookingUseCase,
  ) {}

  @Post()
  @RequirePermission('booking:request')
  @Idempotent()
  @HttpCode(201)
  async request(@CurrentActor() actor: Actor, @Body() body: CreateBookingDto): Promise<BookingResponse> {
    return presentBooking(await this.requestUseCase.execute(actor, body));
  }

  @Get()
  async list(
    @CurrentActor() actor: Actor,
    @Query() query: BookingRoleQueryDto,
  ): Promise<{ items: BookingResponse[]; nextCursor: string | null }> {
    const page = await this.listUseCase.execute(actor, query.role, query.limit, query.cursor);
    return { items: page.items.map(presentBooking), nextCursor: page.nextCursor };
  }

  @Get(':id')
  async getOne(@CurrentActor() actor: Actor, @Param('id', new ParseUUIDPipe()) id: string): Promise<BookingResponse> {
    return presentBooking(await this.getUseCase.execute(actor, id));
  }

  @Post(':id/accept')
  @RequirePermission('booking:accept')
  async accept(
    @CurrentActor() actor: Actor,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AcceptBookingDto,
  ): Promise<BookingResponse> {
    return presentBooking(await this.acceptUseCase.execute(actor, id, body));
  }

  @Post(':id/decline')
  @RequirePermission('booking:accept')
  async decline(
    @CurrentActor() actor: Actor,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: DeclineBookingDto,
  ): Promise<BookingResponse> {
    return presentBooking(await this.declineUseCase.execute(actor, id, body));
  }

  @Post(':id/complete')
  @RequirePermission('booking:accept')
  async complete(@CurrentActor() actor: Actor, @Param('id', new ParseUUIDPipe()) id: string): Promise<BookingResponse> {
    return presentBooking(await this.completeUseCase.execute(actor, id));
  }

  @Post(':id/cancel')
  async cancel(@CurrentActor() actor: Actor, @Param('id', new ParseUUIDPipe()) id: string): Promise<BookingResponse> {
    return presentBooking(await this.cancelUseCase.execute(actor, id));
  }
}
