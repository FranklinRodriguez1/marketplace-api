import { acceptBookingSchema, bookingRoleQuerySchema, createBookingSchema, declineBookingSchema } from '@cerca/contract';
import { createZodDto } from 'nestjs-zod';

export class CreateBookingDto extends createZodDto(createBookingSchema) {}
export class AcceptBookingDto extends createZodDto(acceptBookingSchema) {}
export class DeclineBookingDto extends createZodDto(declineBookingSchema) {}
export class BookingRoleQueryDto extends createZodDto(bookingRoleQuerySchema) {}
