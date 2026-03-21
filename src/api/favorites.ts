import { z } from 'zod';
import { fetchBathroomsByIds } from '@/api/bathrooms';
import {
  favoriteBathroomIdSchema,
  favoriteDirectoryQuerySchema,
  favoriteIdsQuerySchema,
} from '@/lib/validators';
import {
  dbFavoriteSchema,
  favoriteBathroomRowSchema,
  favoriteIdRowSchema,
  parseSupabaseNullableRow,
  parseSupabaseRows,
  toggleFavoriteResultSchema,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';
import {
  DbFavorite,
  FavoriteItem,
  FavoritesSortOption,
  type Coordinates,
} from '@/types';
import { mapBathroomRowToFavoriteItem } from '@/utils/bathroom';
import { isMissingRpcError } from '@/utils/network';

interface FavoriteMutationResponse {
  data: DbFavorite | null;
  error: (Error & { code?: string }) | null;
}

interface ToggleFavoriteResponse {
  data: z.infer<typeof toggleFavoriteResultSchema> | null;
  error: (Error & { code?: string }) | null;
}

interface FavoritePageResponse {
  data: FavoriteItem[];
  hasMore: boolean;
  error: (Error & { code?: string }) | null;
}

type FavoriteBathroomRow = z.infer<typeof favoriteBathroomRowSchema>;
type FavoriteIdRow = z.infer<typeof favoriteIdRowSchema>;

const FAVORITE_PAGE_SIZE = 50;

function toAppError(error: { message: string; code?: string }, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = error.code;
  return appError;
}

function validateFavoriteScope(userId: string, bathroomIds: string[]): { userId: string; bathroomIds: string[] } {
  return favoriteIdsQuerySchema.parse({
    userId,
    bathroomIds,
  });
}

function formatFavoriteItems(
  rows: FavoriteBathroomRow[],
  origin?: Coordinates | null
): FavoriteItem[] {
  const cachedAt = new Date().toISOString();

  return rows.map((favoriteBathroom) =>
    mapBathroomRowToFavoriteItem(favoriteBathroom, favoriteBathroom.favorited_at, {
      cachedAt,
      stale: false,
      origin,
    })
  );
}

function sortFavoriteItems(items: FavoriteItem[], sortBy: FavoritesSortOption): FavoriteItem[] {
  if (sortBy === 'date_added') {
    return [...items].sort(
      (leftItem, rightItem) =>
        new Date(rightItem.favorited_at).getTime() - new Date(leftItem.favorited_at).getTime()
    );
  }

  if (sortBy === 'name') {
    return [...items].sort((leftItem, rightItem) =>
      leftItem.place_name.localeCompare(rightItem.place_name, 'en-US', {
        sensitivity: 'base',
      })
    );
  }

  return [...items].sort((leftItem, rightItem) => {
    const leftDistance =
      typeof leftItem.distance_meters === 'number' ? leftItem.distance_meters : Number.POSITIVE_INFINITY;
    const rightDistance =
      typeof rightItem.distance_meters === 'number' ? rightItem.distance_meters : Number.POSITIVE_INFINITY;

    if (leftDistance === rightDistance) {
      return (
        new Date(rightItem.favorited_at).getTime() - new Date(leftItem.favorited_at).getTime()
      );
    }

    return leftDistance - rightDistance;
  });
}

function sliceFavoriteItems(items: FavoriteItem[], offset: number, limit: number): FavoritePageResponse {
  const pagedItems = items.slice(offset, offset + limit);

  return {
    data: pagedItems,
    hasMore: offset + limit < items.length,
    error: null,
  };
}

async function fetchFavoriteBathroomsFromLegacyRpc(options: {
  userId: string;
  origin?: Coordinates | null;
  sortBy: FavoritesSortOption;
  limit: number;
  offset: number;
}): Promise<FavoritePageResponse> {
  const { data, error } = await getSupabaseClient().rpc(
    'get_user_favorites' as never,
    {
      p_user_lat: options.origin?.latitude ?? null,
      p_user_lng: options.origin?.longitude ?? null,
    } as never
  );

  if (error) {
    if (isMissingRpcError(error)) {
      return fetchFavoriteBathroomsFallback(options);
    }

    return {
      data: [],
      hasMore: false,
      error: toAppError(error, 'Unable to load favorites.'),
    };
  }

  const parsedData = parseSupabaseRows(
    favoriteBathroomRowSchema,
    data,
    'favorite bathrooms',
    'Unable to load favorites.'
  );

  if (parsedData.error) {
    return {
      data: [],
      hasMore: false,
      error: parsedData.error,
    };
  }

  const sortedItems = sortFavoriteItems(formatFavoriteItems(parsedData.data as FavoriteBathroomRow[], options.origin), options.sortBy);
  return sliceFavoriteItems(sortedItems, options.offset, options.limit);
}

export async function fetchFavoriteBathrooms(options: {
  userId: string;
  origin?: Coordinates | null;
}): Promise<{ data: FavoriteItem[]; error: (Error & { code?: string }) | null }> {
  const pageResult = await fetchFavoriteBathroomsPage({
    userId: options.userId,
    origin: options.origin,
    sortBy: 'date_added',
    limit: 100,
    offset: 0,
  });

  return {
    data: pageResult.data,
    error: pageResult.error,
  };
}

export async function fetchFavoriteBathroomsPage(options: {
  userId: string;
  origin?: Coordinates | null;
  sortBy?: FavoritesSortOption;
  limit?: number;
  offset?: number;
}): Promise<FavoritePageResponse> {
  try {
    const validatedOptions = favoriteDirectoryQuerySchema.parse({
      userId: options.userId,
      latitude: options.origin?.latitude ?? null,
      longitude: options.origin?.longitude ?? null,
      sortBy: options.sortBy ?? 'date_added',
      limit: options.limit ?? FAVORITE_PAGE_SIZE,
      offset: options.offset ?? 0,
    });

    const { data, error } = await getSupabaseClient().rpc(
      'get_favorites_with_detail' as never,
      {
        p_user_id: validatedOptions.userId,
        p_latitude: validatedOptions.latitude,
        p_longitude: validatedOptions.longitude,
        p_sort_by: validatedOptions.sortBy,
        p_limit: validatedOptions.limit,
        p_offset: validatedOptions.offset,
      } as never
    );

    if (error) {
      if (!isMissingRpcError(error)) {
        return {
          data: [],
          hasMore: false,
          error: toAppError(error, 'Unable to load favorites.'),
        };
      }

      return fetchFavoriteBathroomsFromLegacyRpc({
        userId: validatedOptions.userId,
        origin: options.origin,
        sortBy: validatedOptions.sortBy,
        limit: validatedOptions.limit,
        offset: validatedOptions.offset,
      });
    }

    const parsedData = parseSupabaseRows(
      favoriteBathroomRowSchema,
      data,
      'favorite bathrooms',
      'Unable to load favorites.'
    );

    if (parsedData.error) {
      return {
        data: [],
        hasMore: false,
        error: parsedData.error,
      };
    }

    return {
      data: formatFavoriteItems(parsedData.data as FavoriteBathroomRow[], options.origin),
      hasMore: (parsedData.data?.length ?? 0) === validatedOptions.limit,
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      hasMore: false,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load favorites.'),
        'Unable to load favorites.'
      ),
    };
  }
}

async function fetchFavoriteBathroomsFallback(options: {
  userId: string;
  origin?: Coordinates | null;
  sortBy: FavoritesSortOption;
  limit: number;
  offset: number;
}): Promise<FavoritePageResponse> {
  const favoriteRowsResult = await fetchFavoriteRows(options.userId);

  if (favoriteRowsResult.error) {
    return {
      data: [],
      hasMore: false,
      error: favoriteRowsResult.error,
    };
  }

  if (!favoriteRowsResult.data.length) {
    return {
      data: [],
      hasMore: false,
      error: null,
    };
  }

  const favoriteLookup = new Map(
    favoriteRowsResult.data.map((favoriteRow) => [favoriteRow.bathroom_id, favoriteRow.created_at])
  );
  const favoriteBathroomIds = favoriteRowsResult.data.map((favoriteRow) => favoriteRow.bathroom_id);
  const bathroomsResult = await fetchBathroomsByIds({
    bathroomIds: favoriteBathroomIds,
    origin: options.origin,
  });

  if (bathroomsResult.error) {
    return {
      data: [],
      hasMore: false,
      error: bathroomsResult.error,
    };
  }

  const cachedAt = new Date().toISOString();
  const items = bathroomsResult.data.map((bathroom) =>
    mapBathroomRowToFavoriteItem(bathroom, favoriteLookup.get(bathroom.id) ?? cachedAt, {
      cachedAt,
      stale: false,
      origin: options.origin,
    })
  );

  const sortedItems = sortFavoriteItems(items, options.sortBy);
  return sliceFavoriteItems(sortedItems, options.offset, options.limit);
}

export async function fetchFavoriteIds(options: {
  userId: string;
  bathroomIds: string[];
}): Promise<{ data: string[]; error: (Error & { code?: string }) | null }> {
  try {
    const validatedOptions = favoriteIdsQuerySchema.parse({
      userId: options.userId,
      bathroomIds: options.bathroomIds,
    });

    const { data, error } = await getSupabaseClient().rpc(
      'get_favorite_ids' as never,
      {
        p_user_id: validatedOptions.userId,
        p_bathroom_ids: validatedOptions.bathroomIds,
      } as never
    );

    if (error) {
      if (!isMissingRpcError(error)) {
        return {
          data: [],
          error: toAppError(error, 'Unable to load favorite status.'),
        };
      }

      const fallbackResult = await getSupabaseClient()
        .from('favorites')
        .select('bathroom_id')
        .eq('user_id', validatedOptions.userId)
        .in('bathroom_id', validatedOptions.bathroomIds);

      if (fallbackResult.error) {
        return {
          data: [],
          error: toAppError(fallbackResult.error, 'Unable to load favorite status.'),
        };
      }

      const parsedFallback = parseSupabaseRows(
        favoriteIdRowSchema,
        fallbackResult.data,
        'favorite ids',
        'Unable to load favorite status.'
      );

      return {
        data: parsedFallback.error ? [] : (parsedFallback.data as FavoriteIdRow[]).map((row) => row.bathroom_id),
        error: parsedFallback.error,
      };
    }

    const parsedData = parseSupabaseRows(
      favoriteIdRowSchema,
      data,
      'favorite ids',
      'Unable to load favorite status.'
    );

    if (parsedData.error) {
      return {
        data: [],
        error: parsedData.error,
      };
    }

    return {
      data: (parsedData.data as FavoriteIdRow[]).map((row) => row.bathroom_id),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load favorite status.'),
        'Unable to load favorite status.'
      ),
    };
  }
}

export async function fetchFavoriteRows(
  userId: string
): Promise<{ data: DbFavorite[]; error: (Error & { code?: string }) | null }> {
  try {
    favoriteDirectoryQuerySchema.parse({
      userId,
      latitude: null,
      longitude: null,
      sortBy: 'date_added',
      limit: FAVORITE_PAGE_SIZE,
      offset: 0,
    });

    const { data, error } = await getSupabaseClient()
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load favorites.'),
      };
    }

    const parsedData = parseSupabaseRows(dbFavoriteSchema, data, 'favorites', 'Unable to load favorites.');

    if (parsedData.error) {
      return {
        data: [],
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as DbFavorite[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load favorites.'),
        'Unable to load favorites.'
      ),
    };
  }
}

export async function toggleFavorite(userId: string, bathroomId: string): Promise<ToggleFavoriteResponse> {
  try {
    const validatedScope = validateFavoriteScope(userId, [bathroomId]);

    const { data, error } = await getSupabaseClient().rpc(
      'toggle_favorite' as never,
      {
        p_bathroom_id: validatedScope.bathroomIds[0],
      } as never
    );

    if (error) {
      if (!isMissingRpcError(error)) {
        return {
          data: null,
          error: toAppError(error, 'Unable to update this favorite.'),
        };
      }

      const existingFavoriteResult = await getSupabaseClient()
        .from('favorites')
        .select('*')
        .eq('user_id', validatedScope.userId)
        .eq('bathroom_id', validatedScope.bathroomIds[0])
        .maybeSingle();

      if (existingFavoriteResult.error) {
        return {
          data: null,
          error: toAppError(existingFavoriteResult.error, 'Unable to update this favorite.'),
        };
      }

      const mutationResult = existingFavoriteResult.data
        ? await removeFavorite(validatedScope.userId, validatedScope.bathroomIds[0])
        : await addFavorite(validatedScope.userId, validatedScope.bathroomIds[0]);

      if (mutationResult.error) {
        return {
          data: null,
          error: mutationResult.error,
        };
      }

      return {
        data: {
          action: existingFavoriteResult.data ? 'removed' : 'added',
          bathroom_id: validatedScope.bathroomIds[0],
          user_id: validatedScope.userId,
          toggled_at: new Date().toISOString(),
        },
        error: null,
      };
    }

    const parsedData = parseSupabaseNullableRow(
      toggleFavoriteResultSchema,
      data,
      'favorite toggle result',
      'Unable to update this favorite.'
    );

    if (parsedData.error) {
      return {
        data: null,
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to update this favorite.'),
        'Unable to update this favorite.'
      ),
    };
  }
}

export async function addFavorite(userId: string, bathroomId: string): Promise<FavoriteMutationResponse> {
  try {
    const validatedBathroomId = favoriteBathroomIdSchema.parse({ bathroomId }).bathroomId;
    const validatedScope = validateFavoriteScope(userId, [validatedBathroomId]);

    const { data, error } = await getSupabaseClient()
      .from('favorites')
      .insert({
        user_id: validatedScope.userId,
        bathroom_id: validatedScope.bathroomIds[0],
      } as never)
      .select('*')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        return {
          data: null,
          error: null,
        };
      }

      return {
        data: null,
        error: toAppError(error, 'Unable to save this favorite.'),
      };
    }

    const parsedData = parseSupabaseNullableRow(
      dbFavoriteSchema,
      data,
      'favorite',
      'Unable to save this favorite.'
    );

    if (parsedData.error) {
      return {
        data: null,
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as DbFavorite | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to save this favorite.'),
        'Unable to save this favorite.'
      ),
    };
  }
}

export async function removeFavorite(userId: string, bathroomId: string): Promise<FavoriteMutationResponse> {
  try {
    const validatedBathroomId = favoriteBathroomIdSchema.parse({ bathroomId }).bathroomId;
    const validatedScope = validateFavoriteScope(userId, [validatedBathroomId]);

    const { data, error } = await getSupabaseClient()
      .from('favorites')
      .delete()
      .eq('user_id', validatedScope.userId)
      .eq('bathroom_id', validatedScope.bathroomIds[0])
      .select('*')
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to remove this favorite.'),
      };
    }

    const parsedData = parseSupabaseNullableRow(
      dbFavoriteSchema,
      data,
      'favorite',
      'Unable to remove this favorite.'
    );

    if (parsedData.error) {
      return {
        data: null,
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as DbFavorite | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to remove this favorite.'),
        'Unable to remove this favorite.'
      ),
    };
  }
}
