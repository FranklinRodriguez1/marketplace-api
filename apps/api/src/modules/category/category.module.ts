import { Module } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from './category.repository';
import { CategoryController } from './category.controller';
import { ListCategoriesUseCase } from './list-categories.use-case';
import { PrismaCategoryRepository } from './prisma-category.repository';

@Module({
  controllers: [CategoryController],
  providers: [ListCategoriesUseCase, { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository }],
})
export class CategoryModule {}
