import type { Database } from '@/types';
import { bathroomAccessCodeSchema, parseSupabaseNullableRow } from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

export type BathroomAccessCodeRow = Database['public']['Tables']['bathroom_access_codes']['Row'];

interface AccessCodeResponse {
  data: BathroomAccessCodeRow | null;
  error: (Error & { code?: string }) | null;
}

function toAppError(error: { message: string; code?: string } | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = 'code' in error ? error.code : undefined;
  return appError;
}

export async function fetchLatestVisibleBathroomCode(bathroomId: string): Promise<AccessCodeResponse> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('bathroom_access_codes')
      .select('*')
      .eq('bathroom_id', bathroomId)
      .eq('visibility_status', 'visible')
      .eq('lifecycle_status', 'active')
      .order('last_verified_at', { ascending: false, nullsFirst: false })
      .order('confidence_score', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load the current bathroom code.'),
      };
    }

    const parsedData = parseSupabaseNullableRow(
      bathroomAccessCodeSchema,
      data,
      'bathroom access code',
      'Unable to load the current bathroom code.'
    );

    if (parsedData.error) {
      return {
        data: null,
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as BathroomAccessCodeRow | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load the current bathroom code.'),
        'Unable to load the current bathroom code.'
      ),
    };
  }
}
