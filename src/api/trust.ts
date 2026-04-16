import type { Json } from '@/types/database';
import type { BathroomPrediction, DeviceFingerprintResult, UserTrustTierSummary } from '@/types';
import {
  bathroomPredictionSchema,
  deviceFingerprintResultSchema,
  parseSupabaseNullableRow,
  parseSupabaseRows,
  userTrustTierSummarySchema,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

interface AppErrorShape {
  code?: string;
  message: string;
}

export interface DeviceFingerprintInvocationInput {
  install_fingerprint: string;
  device_metadata: Record<string, Json>;
  latitude?: number | null;
  longitude?: number | null;
}

function normalizeAppErrorCode(error: { message?: string; code?: string } | Error): string | undefined {
  const errorMessage = error.message ?? '';

  if (/AUTH_REQUIRED/i.test(errorMessage)) {
    return 'AUTH_REQUIRED';
  }

  if (/UNAUTHORIZED/i.test(errorMessage)) {
    return 'UNAUTHORIZED';
  }

  if (/BATHROOM_NOT_FOUND/i.test(errorMessage)) {
    return 'BATHROOM_NOT_FOUND';
  }

  if (/INVALID_DEVICE_FINGERPRINT/i.test(errorMessage)) {
    return 'INVALID_DEVICE_FINGERPRINT';
  }

  return 'code' in error ? error.code : undefined;
}

function toAppError(error: AppErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = normalizeAppErrorCode(error);
  return appError;
}

export async function fetchUserTrustTier(
  userId?: string | null
): Promise<{ data: UserTrustTierSummary | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_user_trust_tier' as never, {
      p_user_id: userId ?? null,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load the current trust tier right now.'),
      };
    }

    const parsedRows = parseSupabaseRows(
      userTrustTierSummarySchema,
      data,
      'user trust tier',
      'Unable to load the current trust tier right now.'
    );

    if (parsedRows.error) {
      return {
        data: null,
        error: parsedRows.error,
      };
    }

    const firstRow = parsedRows.data[0];

    return {
      data: firstRow
        ? {
            user_id: firstRow.user_id,
            contributor_trust_tier: firstRow.contributor_trust_tier,
            normalized_tier: firstRow.normalized_tier,
            trust_score: firstRow.trust_score,
            trust_weight: firstRow.trust_weight,
            shadow_banned: firstRow.shadow_banned,
            fraud_flags: firstRow.fraud_flags ?? [],
            device_account_count: firstRow.device_account_count,
            last_calculated_at: firstRow.last_calculated_at,
          }
        : null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load the current trust tier right now.'),
        'Unable to load the current trust tier right now.'
      ),
    };
  }
}

export async function fetchBathroomPrediction(
  bathroomId: string,
  referenceHour?: number | null
): Promise<{ data: BathroomPrediction | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('calculate_prediction_confidence' as never, {
      p_bathroom_id: bathroomId,
      p_reference_hour: referenceHour ?? null,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load the current access prediction right now.'),
      };
    }

    const parsedRows = parseSupabaseRows(
      bathroomPredictionSchema,
      data,
      'bathroom prediction',
      'Unable to load the current access prediction right now.'
    );

    if (parsedRows.error) {
      return {
        data: null,
        error: parsedRows.error,
      };
    }

    const firstRow = parsedRows.data[0];

    return {
      data: firstRow
        ? {
            bathroom_id: firstRow.bathroom_id,
            predicted_access_confidence: firstRow.predicted_access_confidence,
            prediction_confidence: firstRow.prediction_confidence,
            busy_level: firstRow.busy_level,
            best_visit_hour: firstRow.best_visit_hour,
            signal_count: firstRow.signal_count,
            recommended_copy: firstRow.recommended_copy,
            generated_at: firstRow.generated_at,
          }
        : null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load the current access prediction right now.'),
        'Unable to load the current access prediction right now.'
      ),
    };
  }
}

export async function registerCurrentDeviceFingerprint(
  input: DeviceFingerprintInvocationInput
): Promise<{ data: DeviceFingerprintResult | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().functions.invoke('device-fingerprint', {
      body: {
        install_fingerprint: input.install_fingerprint,
        device_metadata: input.device_metadata,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
    });

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to register the current device right now.'),
      };
    }

    const parsedResult = parseSupabaseNullableRow(
      deviceFingerprintResultSchema,
      data,
      'device fingerprint result',
      'Unable to register the current device right now.'
    );

    if (parsedResult.error) {
      return {
        data: null,
        error: parsedResult.error,
      };
    }

    return {
      data: parsedResult.data
        ? {
            allowed: parsedResult.data.allowed,
            shadow_mode: parsedResult.data.shadow_mode,
            reason: parsedResult.data.reason,
            device_account_count: parsedResult.data.device_account_count,
            recent_contribution_count: parsedResult.data.recent_contribution_count,
            detected_speed_kmh: parsedResult.data.detected_speed_kmh,
            fraud_flags: parsedResult.data.fraud_flags ?? [],
            checked_at: parsedResult.data.checked_at,
          }
        : null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to register the current device right now.'),
        'Unable to register the current device right now.'
      ),
    };
  }
}
