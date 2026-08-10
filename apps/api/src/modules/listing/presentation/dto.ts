import {
  createListingSchema,
  moderateListingSchema,
  searchListingsQuerySchema,
  updateListingSchema,
} from '@cerca/contract';
import { createZodDto } from 'nestjs-zod';

export class CreateListingDto extends createZodDto(createListingSchema) {}
export class UpdateListingDto extends createZodDto(updateListingSchema) {}
export class SearchListingsDto extends createZodDto(searchListingsQuerySchema) {}
export class ModerateListingDto extends createZodDto(moderateListingSchema) {}
