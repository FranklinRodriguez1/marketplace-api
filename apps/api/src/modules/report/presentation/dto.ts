import { createReportSchema, resolveReportSchema } from '@cerca/contract';
import { createZodDto } from 'nestjs-zod';

export class CreateReportDto extends createZodDto(createReportSchema) {}
export class ResolveReportDto extends createZodDto(resolveReportSchema) {}
