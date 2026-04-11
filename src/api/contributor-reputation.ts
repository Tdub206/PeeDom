import type { ContributorReputationProfile } from '@/types';
import { contributorReputationProfileSchema, parseSupabaseNullableRow } from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

interface ApiErrorShape {
  code?: string;
  message: string;
}

function toAppError(error: ApiErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = 'code' in error ? error.code : undefined;
  return appError;
}

export async function fetchContributorReputation(
  userId?: string
): Promise<{ data: ContributorReputationProfile | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_contributor_reputation' as never, {
      p_user_id: userId ?? null,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load contributor reputation right now.'),
      };
    }

    const parsedRow = parseSupabaseNullableRow(
      contributorReputationProfileSchema,
      Array.isArray(data) ? data[0] ?? null : data,
      'contributor reputation profile',
      'Unable to load contributor reputation right now.'
    );

    if (parsedRow.error) {
      return {
        data: null,
        error: parsedRow.error,
      };
    }

    return {
      data: parsedRow.data as ContributorReputationProfile | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load contributor reputation right now.'),
        'Unable to load contributor reputation right now.'
      ),
    };
  }
}
