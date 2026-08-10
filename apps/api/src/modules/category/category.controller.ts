import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { CategoryResponse } from '@cerca/contract';
import { Public } from '../../shared/auth/public.decorator';
import { ListCategoriesUseCase } from './list-categories.use-case';

@ApiTags('categories')
@Controller({ path: 'categories', version: '1' })
export class CategoryController {
  constructor(private readonly listCategories: ListCategoriesUseCase) {}

  @Public()
  @Get()
  list(): Promise<CategoryResponse[]> {
    return this.listCategories.execute();
  }
}
