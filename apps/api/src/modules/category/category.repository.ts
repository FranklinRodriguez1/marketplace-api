export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface CategoryRecord {
  id: string;
  slug: string;
  name: string;
}

export interface CategoryRepository {
  findAll(): Promise<CategoryRecord[]>;
}
