import type { BusinessVisitStats, StallPassVisitSource } from '@/types';
import { businessVisitStatsSchema, parseSupabaseRows } from '@/lib/supabase-parsers';
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

export async function recordStallPassVisit(
  bathroomId: string,
  source: StallPassVisitSource = 'map_navigation'
): Promise<{
  data: { success: boolean; deduplicated: boolean } | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'record_stallpass_visit' as never,
      { p_bathroom_id: bathroomId, p_source: source } as never
    );

    if (error) {
      return { data: null, error: toAppError(error, 'Unable to record visit.') };
    }

    const result = data as { success: boolean; deduplicated: boolean };
    return { data: result, error: null };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to record visit.'),
        'Unable to record visit.'
      ),
    };
  }
}

export async function fetchBusinessVisitStats(userId: string): Promise<{
  data: BusinessVisitStats[];
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'get_business_visit_stats' as never,
      { p_user_id: userId } as never
    );

    if (error) {
      return { data: [], error: toAppError(error, 'Unable to load visit statistics.') };
    }

    const parsed = parseSupabaseRows(
      businessVisitStatsSchema,
      data,
      'business visit stats',
      'Unable to load visit statistics.'
    );

    if (parsed.error) {
      return { data: [], error: parsed.error };
    }

    return { data: parsed.data as BusinessVisitStats[], error: null };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load visit statistics.'),
        'Unable to load visit statistics.'
      ),
    };
  }
}

export async function toggleFreeMapVisibility(
  bathroomId: string,
  showOnFreeMap: boolean
): Promise<{
  data: { success: boolean } | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'toggle_free_map_visibility' as never,
      { p_bathroom_id: bathroomId, p_show_on_free_map: showOnFreeMap } as never
    );

    if (error) {
      return { data: null, error: toAppError(error, 'Unable to update map visibility.') };
    }

    const result = data as { success: boolean };
    return { data: result, error: null };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to update map visibility.'),
        'Unable to update map visibility.'
      ),
    };
  }
}
