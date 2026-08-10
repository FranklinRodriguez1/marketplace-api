import { moderateReviewSchema, writeReviewSchema } from '@cerca/contract';
import { createZodDto } from 'nestjs-zod';

export class WriteReviewDto extends createZodDto(writeReviewSchema) {}
export class ModerateReviewDto extends createZodDto(moderateReviewSchema) {}
