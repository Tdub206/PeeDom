import type { CleanlinessRating, CleanlinessRatingCreate, Database, DbCleanlinessRating } from '@/types';
import { dbCleanlinessRatingSchema, parseSupabaseNullableRow } from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

type CleanlinessRatingInsert = Database['public']['Tables']['cleanliness_ratings']['Insert'];

interface ApiErrorShape {
  code?: string;
  message: string;
}

function toAppError(error: ApiErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = 'code' in error ? error.code : undefined;
  return appError;
}

export async function fetchUserCleanlinessRating(
  userId: string,
  bathroomId: string
): Promise<{ data: CleanlinessRating | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('cleanliness_ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('bathroom_id', bathroomId)
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load your cleanliness rating.'),
      };
    }

    const parsedRating = parseSupabaseNullableRow(
      dbCleanlinessRatingSchema,
      data,
      'cleanliness rating',
      'Unable to load your cleanliness rating.'
    );

    if (parsedRating.error) {
      return {
        data: null,
        error: parsedRating.error,
      };
    }

    return {
      data: parsedRating.data as CleanlinessRating | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load your cleanliness rating.'),
        'Unable to load your cleanliness rating.'
      ),
    };
  }
}

export async function upsertCleanlinessRating(
  userId: string,
  input: CleanlinessRatingCreate
): Promise<{ data: DbCleanlinessRating | null; error: (Error & { code?: string }) | null }> {
  try {
    const payload: CleanlinessRatingInsert = {
      bathroom_id: input.bathroom_id,
      user_id: userId,
      rating: input.rating,
      notes: input.notes?.trim() || null,
    };

    const { data, error } = await getSupabaseClient()
      .from('cleanliness_ratings')
      .upsert(payload as never, {
        onConflict: 'bathroom_id,user_id',
      })
      .select('*')
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to save your cleanliness rating.'),
      };
    }

    const parsedRating = parseSupabaseNullableRow(
      dbCleanlinessRatingSchema,
      data,
      'cleanliness rating',
      'Unable to save your cleanliness rating.'
    );

    if (parsedRating.error) {
      return {
        data: null,
        error: parsedRating.error,
      };
    }

    return {
      data: parsedRating.data as DbCleanlinessRating | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to save your cleanliness rating.'),
        'Unable to save your cleanliness rating.'
      ),
    };
  }
}
