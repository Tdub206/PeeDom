import type {
  BusinessDashboardData,
  BusinessDashboardBathroom,
  BusinessFeaturedPlacement,
  BusinessHoursUpdateAudit,
  BusinessHoursUpdateResult,
  UpdateBusinessHoursInput,
} from '@/types';
import {
  businessDashboardAnalyticsRowSchema,
  businessFeaturedPlacementSchema,
  businessHoursUpdateResultSchema,
  businessHoursUpdateSchema,
  parseSupabaseNullableRow,
  parseSupabaseRows,
} from '@/lib/supabase-parsers';
import { validateBusinessHoursUpdate } from '@/lib/validators';
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

function buildBusinessDashboardSummary(
  bathrooms: BusinessDashboardBathroom[]
): BusinessDashboardData['summary'] {
  const ratingsCount = bathrooms.reduce((sum, bathroom) => sum + bathroom.total_ratings, 0);
  const weightedRatings = bathrooms.reduce(
    (sum, bathroom) => sum + bathroom.avg_cleanliness * bathroom.total_ratings,
    0
  );

  return {
    total_bathrooms: bathrooms.length,
    total_favorites_across_all: bathrooms.reduce((sum, bathroom) => sum + bathroom.total_favorites, 0),
    total_open_reports: bathrooms.reduce((sum, bathroom) => sum + bathroom.open_reports, 0),
    avg_rating_across_all: ratingsCount > 0 ? Number((weightedRatings / ratingsCount).toFixed(2)) : 0,
    active_featured_placements: bathrooms.reduce(
      (sum, bathroom) => sum + bathroom.active_featured_placements,
      0
    ),
    verified_locations: bathrooms.filter((bathroom) => bathroom.has_verification_badge).length,
  };
}

export async function fetchBusinessDashboard(userId: string): Promise<{
  data: BusinessDashboardData | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'get_business_dashboard_analytics' as never,
      {
        p_user_id: userId,
      } as never
    );

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load your business analytics right now.'),
      };
    }

    const parsedRows = parseSupabaseRows(
      businessDashboardAnalyticsRowSchema,
      data,
      'business dashboard analytics',
      'Unable to load your business analytics right now.'
    );

    if (parsedRows.error) {
      return {
        data: null,
        error: parsedRows.error,
      };
    }

    const bathrooms = parsedRows.data as BusinessDashboardBathroom[];

    return {
      data: {
        bathrooms,
        summary: buildBusinessDashboardSummary(bathrooms),
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load your business analytics right now.'),
        'Unable to load your business analytics right now.'
      ),
    };
  }
}

export async function fetchBusinessFeaturedPlacements(userId: string): Promise<{
  data: BusinessFeaturedPlacement[];
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('business_featured_placements')
      .select('*')
      .eq('business_user_id', userId)
      .order('end_date', { ascending: false });

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load featured placements right now.'),
      };
    }

    const parsedRows = parseSupabaseRows(
      businessFeaturedPlacementSchema,
      data,
      'business featured placements',
      'Unable to load featured placements right now.'
    );

    if (parsedRows.error) {
      return {
        data: [],
        error: parsedRows.error,
      };
    }

    return {
      data: parsedRows.data as BusinessFeaturedPlacement[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load featured placements right now.'),
        'Unable to load featured placements right now.'
      ),
    };
  }
}

export async function fetchBusinessHoursUpdateHistory(bathroomId: string): Promise<{
  data: BusinessHoursUpdateAudit[];
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('business_hours_updates')
      .select('*')
      .eq('bathroom_id', bathroomId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load the hours audit trail right now.'),
      };
    }

    const parsedRows = parseSupabaseRows(
      businessHoursUpdateSchema,
      data,
      'business hours history',
      'Unable to load the hours audit trail right now.'
    );

    if (parsedRows.error) {
      return {
        data: [],
        error: parsedRows.error,
      };
    }

    return {
      data: parsedRows.data as BusinessHoursUpdateAudit[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load the hours audit trail right now.'),
        'Unable to load the hours audit trail right now.'
      ),
    };
  }
}

export async function updateBusinessBathroomHours(input: UpdateBusinessHoursInput): Promise<{
  data: BusinessHoursUpdateResult | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const validatedInput = validateBusinessHoursUpdate(input);
    const { data, error } = await getSupabaseClient().rpc(
      'update_business_bathroom_hours' as never,
      {
        p_bathroom_id: validatedInput.bathroom_id,
        p_new_hours: validatedInput.hours,
      } as never
    );

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to update those business hours right now.'),
      };
    }

    const parsedResult = parseSupabaseNullableRow(
      businessHoursUpdateResultSchema,
      data,
      'business hours update',
      'Unable to update those business hours right now.'
    );

    if (parsedResult.error) {
      return {
        data: null,
        error: parsedResult.error,
      };
    }

    return {
      data: parsedResult.data as BusinessHoursUpdateResult | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to update those business hours right now.'),
        'Unable to update those business hours right now.'
      ),
    };
  }
}
