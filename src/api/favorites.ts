import { DbFavorite } from '@/types';
import { dbFavoriteSchema, parseSupabaseNullableRow, parseSupabaseRows } from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

interface FavoriteMutationResponse {
  data: DbFavorite | null;
  error: (Error & { code?: string }) | null;
}

function toAppError(error: { message: string; code?: string }, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = error.code;
  return appError;
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
