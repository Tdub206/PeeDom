import type {
  DbPointEvent,
  DbUserBadge,
  GamificationSummary,
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardTimeframe,
  PremiumRedemptionResult,
} from '@/types';
import {
  dbPointEventSchema,
  dbUserBadgeSchema,
  gamificationSummarySchema,
  leaderboardEntrySchema,
  parseSupabaseRows,
  premiumRedemptionSchema,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

interface AppErrorShape {
  code?: string;
  message: string;
}

function normalizeAppErrorCode(error: { message?: string; code?: string } | Error): string | undefined {
  const errorMessage = error.message ?? '';

  if (/AUTH_REQUIRED/i.test(errorMessage)) {
    return 'AUTH_REQUIRED';
  }

  if (/INVALID_REDEMPTION_PERIOD/i.test(errorMessage)) {
    return 'INVALID_REDEMPTION_PERIOD';
  }

  if (/INSUFFICIENT_POINTS/i.test(errorMessage)) {
    return 'INSUFFICIENT_POINTS';
  }

  if (/PROFILE_NOT_FOUND/i.test(errorMessage)) {
    return 'PROFILE_NOT_FOUND';
  }

  return 'code' in error ? error.code : undefined;
}

function toAppError(error: AppErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = normalizeAppErrorCode(error);
  return appError;
}

export async function fetchMyGamificationSummary(): Promise<{
  data: GamificationSummary | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_my_gamification_summary' as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load your contribution summary right now.'),
      };
    }

    const parsedSummary = parseSupabaseRows(
      gamificationSummarySchema,
      data,
      'gamification summary',
      'Unable to load your contribution summary right now.'
    );

    if (parsedSummary.error) {
      return {
        data: null,
        error: parsedSummary.error,
      };
    }

    return {
      data: parsedSummary.data[0] ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load your contribution summary right now.'),
        'Unable to load your contribution summary right now.'
      ),
    };
  }
}

export async function fetchMyBadges(): Promise<{
  data: DbUserBadge[];
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('user_badges')
      .select('*')
      .order('awarded_at', { ascending: false });

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load your badges right now.'),
      };
    }

    const parsedBadges = parseSupabaseRows(
      dbUserBadgeSchema,
      data,
      'user badges',
      'Unable to load your badges right now.'
    );

    if (parsedBadges.error) {
      return {
        data: [],
        error: parsedBadges.error,
      };
    }

    return {
      data: parsedBadges.data as DbUserBadge[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load your badges right now.'),
        'Unable to load your badges right now.'
      ),
    };
  }
}

export async function fetchMyPointEvents(limit = 8): Promise<{
  data: DbPointEvent[];
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('point_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load your recent contribution history right now.'),
      };
    }

    const parsedEvents = parseSupabaseRows(
      dbPointEventSchema,
      data,
      'point events',
      'Unable to load your recent contribution history right now.'
    );

    if (parsedEvents.error) {
      return {
        data: [],
        error: parsedEvents.error,
      };
    }

    return {
      data: parsedEvents.data as DbPointEvent[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load your recent contribution history right now.'),
        'Unable to load your recent contribution history right now.'
      ),
    };
  }
}

export async function fetchContributorLeaderboard(options: {
  scope: LeaderboardScope;
  timeframe: LeaderboardTimeframe;
  state?: string | null;
  city?: string | null;
  limit?: number;
}): Promise<{
  data: LeaderboardEntry[];
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_contributor_leaderboard' as never, {
      p_scope: options.scope,
      p_timeframe: options.timeframe,
      p_state: options.state ?? null,
      p_city: options.city ?? null,
      p_limit: options.limit ?? 5,
    } as never);

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load the contributor leaderboard right now.'),
      };
    }

    const parsedRows = parseSupabaseRows(
      leaderboardEntrySchema,
      data,
      'contributor leaderboard',
      'Unable to load the contributor leaderboard right now.'
    );

    if (parsedRows.error) {
      return {
        data: [],
        error: parsedRows.error,
      };
    }

    return {
      data: parsedRows.data as LeaderboardEntry[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load the contributor leaderboard right now.'),
        'Unable to load the contributor leaderboard right now.'
      ),
    };
  }
}

export async function redeemPointsForPremium(months = 1): Promise<{
  data: PremiumRedemptionResult | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc('redeem_points_for_premium' as never, {
      p_months: months,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to redeem points for premium right now.'),
      };
    }

    const parsedRedemption = parseSupabaseRows(
      premiumRedemptionSchema,
      data,
      'premium redemption',
      'Unable to redeem points for premium right now.'
    );

    if (parsedRedemption.error) {
      return {
        data: null,
        error: parsedRedemption.error,
      };
    }

    return {
      data: parsedRedemption.data[0] ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to redeem points for premium right now.'),
        'Unable to redeem points for premium right now.'
      ),
    };
  }
}
