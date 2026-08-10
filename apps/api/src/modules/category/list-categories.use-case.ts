import { Inject, Injectable } from '@nestjs/common';
import type { CategoryResponse } from '@cerca/contract';
import { env } from '../../config/env';
import { CACHE, type CachePort } from '../../kernel/ports/cache.port';
import { CATEGORY_REPOSITORY, type CategoryRepository } from './category.repository';

const CACHE_KEY = 'categories:all';

// Cache-aside with a TTL — the categories list is small, hot, and rarely changes.
@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(CACHE) private readonly cache: CachePort,
  ) {}

  async execute(): Promise<CategoryResponse[]> {
    const cached = await this.cache.get(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as CategoryResponse[];
    }
    const rows = await this.categories.findAll();
    const response: CategoryResponse[] = rows.map((c) => ({ id: c.id, slug: c.slug, name: c.name }));
    await this.cache.set(CACHE_KEY, JSON.stringify(response), env.CATEGORIES_CACHE_TTL_SECONDS);
    return response;
  }
}
