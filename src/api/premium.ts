import { z } from 'zod';
import type { PremiumArrivalAlert, PremiumCityPackManifest } from '@/types';
import {
  dbPremiumArrivalAlertSchema,
  parseSupabaseRows,
  premiumCityPackManifestSchema,
  publicBathroomDetailRowSchema,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

export type PremiumCityPackBathroomRow = z.infer<typeof publicBathroomDetailRowSchema>;

interface AppErrorShape {
  code?: string;
  message: string;
}

function normalizeAppErrorCode(error: { message?: string; code?: string } | Error): string | undefined {
  const errorMessage = error.message ?? '';

  if (/AUTH_REQUIRED/i.test(errorMessage)) {
    return 'AUTH_REQUIRED';
  }

  if (/PREMIUM_REQUIRED/i.test(errorMessage)) {
    return 'PREMIUM_REQUIRED';
  }

  if (/INVALID_LEAD_TIME/i.test(errorMessage)) {
    return 'INVALID_LEAD_TIME';
  }

  if (/INVALID_ARRIVAL_WINDOW/i.test(errorMessage)) {
    return 'INVALID_ARRIVAL_WINDOW';
  }

  return 'code' in error ? error.code : undefined;
}

function toAppError(error: AppErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = normalizeAppErrorCode(error);
  return appError;
}

export async function fetchPremiumCityPackCatalog(limit = 12): Promise<{
  data: PremiumCityPackManifest[];
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_premium_city_packs' as never, {
      p_limit: limit,
    } as never);

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load premium city packs right now.'),
      };
    }

    const parsedPacks = parseSupabaseRows(
      premiumCityPackManifestSchema,
      data,
      'premium city packs',
      'Unable to load premium city packs right now.'
    );

    if (parsedPacks.error) {
      return {
        data: [],
        error: parsedPacks.error,
      };
    }

    return {
      data: parsedPacks.data as PremiumCityPackManifest[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load premium city packs right now.'),
        'Unable to load premium city packs right now.'
      ),
    };
  }
}

export async function fetchPremiumCityPackBathrooms(pack: Pick<PremiumCityPackManifest, 'city' | 'state' | 'country_code'>): Promise<{
  data: PremiumCityPackBathroomRow[];
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_premium_city_pack_bathrooms' as never, {
      p_city: pack.city,
      p_state: pack.state,
      p_country_code: pack.country_code,
    } as never);

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to download this city pack right now.'),
      };
    }

    const parsedBathrooms = parseSupabaseRows(
      publicBathroomDetailRowSchema,
      data,
      'premium city pack bathrooms',
      'Unable to download this city pack right now.'
    );

    if (parsedBathrooms.error) {
      return {
        data: [],
        error: parsedBathrooms.error,
      };
    }

    return {
      data: parsedBathrooms.data as PremiumCityPackBathroomRow[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to download this city pack right now.'),
        'Unable to download this city pack right now.'
      ),
    };
  }
}

export async function fetchPremiumArrivalAlerts(
  bathroomId: string
): Promise<{ data: PremiumArrivalAlert[]; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('premium_arrival_alerts')
      .select('*')
      .eq('bathroom_id', bathroomId)
      .eq('status', 'active')
      .gt('target_arrival_at', new Date().toISOString())
      .order('target_arrival_at', { ascending: true });

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load your arrival alert right now.'),
      };
    }

    const parsedAlerts = parseSupabaseRows(
      dbPremiumArrivalAlertSchema,
      data,
      'premium arrival alerts',
      'Unable to load your arrival alert right now.'
    );

    if (parsedAlerts.error) {
      return {
        data: [],
        error: parsedAlerts.error,
      };
    }

    return {
      data: parsedAlerts.data as PremiumArrivalAlert[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load your arrival alert right now.'),
        'Unable to load your arrival alert right now.'
      ),
    };
  }
}

export async function upsertPremiumArrivalAlert(input: {
  bathroomId: string;
  targetArrivalAt: string;
  leadMinutes: 15 | 30 | 60;
}): Promise<{ data: PremiumArrivalAlert | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('upsert_premium_arrival_alert' as never, {
      p_bathroom_id: input.bathroomId,
      p_target_arrival_at: input.targetArrivalAt,
      p_lead_minutes: input.leadMinutes,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to arm this arrival alert right now.'),
      };
    }

    const parsedAlerts = parseSupabaseRows(
      dbPremiumArrivalAlertSchema,
      data,
      'premium arrival alert',
      'Unable to arm this arrival alert right now.'
    );

    if (parsedAlerts.error) {
      return {
        data: null,
        error: parsedAlerts.error,
      };
    }

    return {
      data: parsedAlerts.data[0] ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to arm this arrival alert right now.'),
        'Unable to arm this arrival alert right now.'
      ),
    };
  }
}

export async function cancelPremiumArrivalAlert(
  bathroomId: string
): Promise<{ error: (Error & { code?: string }) | null }> {
  try {
    const { error } = await getSupabaseClient().rpc('cancel_premium_arrival_alert' as never, {
      p_bathroom_id: bathroomId,
    } as never);

    if (error) {
      return {
        error: toAppError(error, 'Unable to cancel this arrival alert right now.'),
      };
    }

    return {
      error: null,
    };
  } catch (error) {
    return {
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to cancel this arrival alert right now.'),
        'Unable to cancel this arrival alert right now.'
      ),
    };
  }
}
