import { Inject, Injectable } from '@nestjs/common';
import type { SearchListingsQuery } from '@cerca/contract';
import { decodeCursor, encodeCursor } from '../../../kernel/cursor';
import { ValidationError } from '../../../kernel/domain-error';
import { resolveCity } from '../infrastructure/city-coordinates';
import { LISTING_REPOSITORY, type ListingRepository, type ListingSearchRow } from './ports';

interface SearchCursor {
  distance: number;
  id: string;
}

export interface SearchResult {
  items: ListingSearchRow[];
  nextCursor: string | null;
}

@Injectable()
export class SearchListingsUseCase {
  constructor(@Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository) {}

  async execute(query: SearchListingsQuery): Promise<SearchResult> {
    let lat = query.lat;
    let lng = query.lng;
    if ((lat === undefined || lng === undefined) && query.cityId) {
      const city = resolveCity(query.cityId);
      if (city) {
        lat = city.lat;
        lng = city.lng;
      }
    }
    if (lat === undefined || lng === undefined) {
      throw new ValidationError({
        code: 'LOCATION_REQUIRED',
        message: 'Provide lat/lng, or a known cityId to search from.',
      });
    }

    const cursor = decodeCursor<SearchCursor>(query.cursor);
    const rows = await this.listings.search({
      query: query.query ?? null,
      categoryId: query.categoryId ?? null,
      lat,
      lng,
      radiusKm: query.radiusKm,
      limit: query.limit + 1,
      cursorDistance: cursor?.distance ?? null,
      cursorId: cursor?.id ?? null,
    });

    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    const nextCursor = hasMore && last ? encodeCursor({ distance: last.distanceMeters, id: last.id }) : null;
    return { items, nextCursor };
  }
}
