import { z } from 'zod';
import type { CleanlinessRating, CleanlinessRatingCreate } from '@/types';
import {
  cleanlinessRatingMutationResultSchema,
  dbCleanlinessRatingSchema,
  parseSupabaseNullableRow,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

type CleanlinessRatingMutationResult = z.infer<typeof cleanlinessRatingMutationResultSchema>;

interface ApiErrorShape {
  code?: string;
  message: string;
}

function toAppError(error: ApiErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  const errorMessage = error.message ?? '';

  if (/AUTH_REQUIRED/i.test(errorMessage)) {
    appError.code = 'AUTH_REQUIRED';
  } else if (/BATHROOM_NOT_FOUND/i.test(errorMessage)) {
    appError.code = 'BATHROOM_NOT_FOUND';
  } else if (/INVALID_CLEANLINESS_RATING/i.test(errorMessage)) {
    appError.code = 'INVALID_CLEANLINESS_RATING';
  } else if (/INVALID_CLEANLINESS_NOTES/i.test(errorMessage)) {
    appError.code = 'INVALID_CLEANLINESS_NOTES';
  } else {
    appError.code = 'code' in error ? error.code : undefined;
  }
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
  _userId: string,
  input: CleanlinessRatingCreate
): Promise<{ data: CleanlinessRatingMutationResult | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('upsert_cleanliness_rating' as never, {
      p_bathroom_id: input.bathroom_id,
      p_rating: input.rating,
      p_notes: input.notes?.trim() || null,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to save your cleanliness rating.'),
      };
    }

    const parsedRating = parseSupabaseNullableRow(
      cleanlinessRatingMutationResultSchema,
      data,
      'cleanliness rating result',
      'Unable to save your cleanliness rating.'
    );

    if (parsedRating.error) {
      return {
        data: null,
        error: parsedRating.error,
      };
    }

    return {
      data: parsedRating.data as CleanlinessRatingMutationResult | null,
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
