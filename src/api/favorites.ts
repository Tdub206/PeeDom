import { DbFavorite } from '@/types';
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

    return {
      data,
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

    return {
      data: (data as DbFavorite | null) ?? null,
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

    return {
      data: (data as DbFavorite | null) ?? null,
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
