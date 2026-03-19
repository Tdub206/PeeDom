import { z } from 'zod';
import { fetchBathroomsByIds } from '@/api/bathrooms';
import { DbFavorite, FavoriteItem, type Coordinates } from '@/types';
import {
  dbFavoriteSchema,
  favoriteBathroomRowSchema,
  parseSupabaseNullableRow,
  parseSupabaseRows,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';
import { mapBathroomRowToFavoriteItem } from '@/utils/bathroom';
import { isMissingRpcError } from '@/utils/network';

interface FavoriteMutationResponse {
  data: DbFavorite | null;
  error: (Error & { code?: string }) | null;
}

type FavoriteBathroomRow = z.infer<typeof favoriteBathroomRowSchema>;

function toAppError(error: { message: string; code?: string }, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = error.code;
  return appError;
}

export async function fetchFavoriteBathrooms(options: {
  userId: string;
  origin?: Coordinates | null;
}): Promise<{ data: FavoriteItem[]; error: (Error & { code?: string }) | null }> {
  if (!options.userId) {
    return {
      data: [],
      error: null,
    };
  }

  try {
    const { data, error } = await getSupabaseClient().rpc(
      'get_user_favorites' as never,
      {
        p_user_lat: options.origin?.latitude ?? null,
        p_user_lng: options.origin?.longitude ?? null,
      } as never
    );

    if (error) {
      if (!isMissingRpcError(error)) {
        return {
          data: [],
          error: toAppError(error, 'Unable to load favorites.'),
        };
      }

      return fetchFavoriteBathroomsFallback(options);
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
        error: parsedData.error,
      };
    }

    const cachedAt = new Date().toISOString();

    const favoriteBathrooms = parsedData.data as FavoriteBathroomRow[];

    return {
      data: favoriteBathrooms.map((favoriteBathroom) =>
        mapBathroomRowToFavoriteItem(favoriteBathroom, favoriteBathroom.favorited_at, {
          cachedAt,
          stale: false,
          origin: options.origin,
        })
      ),
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

async function fetchFavoriteBathroomsFallback(options: {
  userId: string;
  origin?: Coordinates | null;
}): Promise<{ data: FavoriteItem[]; error: (Error & { code?: string }) | null }> {
  const favoriteRowsResult = await fetchFavoriteRows(options.userId);

  if (favoriteRowsResult.error) {
    return {
      data: [],
      error: favoriteRowsResult.error,
    };
  }

  if (!favoriteRowsResult.data.length) {
    return {
      data: [],
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
      error: bathroomsResult.error,
    };
  }

  const cachedAt = new Date().toISOString();

  return {
    data: bathroomsResult.data.map((bathroom) =>
      mapBathroomRowToFavoriteItem(bathroom, favoriteLookup.get(bathroom.id) ?? cachedAt, {
        cachedAt,
        stale: false,
        origin: options.origin,
      })
    ),
    error: null,
  };
}

export async function fetchFavoriteRows(
  userId: string
): Promise<{ data: DbFavorite[]; error: (Error & { code?: string }) | null }> {
  try {
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

export async function addFavorite(userId: string, bathroomId: string): Promise<FavoriteMutationResponse> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('favorites')
      .insert({
        user_id: userId,
        bathroom_id: bathroomId,
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
    const { data, error } = await getSupabaseClient()
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('bathroom_id', bathroomId)
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
