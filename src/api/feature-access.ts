import type { Database, EmergencyLookupAccessResult, FeatureUnlockMethod } from '@/types';
import { emergencyLookupAccessResultSchema, parseSupabaseRows } from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

type EmergencyLookupRpcRow = Database['public']['Functions']['consume_emergency_lookup_access']['Returns'][number];

interface AppErrorShape {
  code?: string;
  message: string;
}

function normalizeAppErrorCode(error: { message?: string; code?: string } | Error): string | undefined {
  const errorMessage = error.message ?? '';

  if (/AUTH_REQUIRED/i.test(errorMessage)) {
    return 'AUTH_REQUIRED';
  }

  if (/PROFILE_NOT_FOUND/i.test(errorMessage)) {
    return 'PROFILE_NOT_FOUND';
  }

  if (/STARTER_UNLOCK_ALREADY_USED/i.test(errorMessage)) {
    return 'STARTER_UNLOCK_ALREADY_USED';
  }

  if (/INSUFFICIENT_UNLOCK_POINTS/i.test(errorMessage)) {
    return 'INSUFFICIENT_UNLOCK_POINTS';
  }

  if (/INVALID_UNLOCK_METHOD/i.test(errorMessage)) {
    return 'INVALID_UNLOCK_METHOD';
  }

  return 'code' in error ? error.code : undefined;
}

function toAppError(error: AppErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = normalizeAppErrorCode(error);
  return appError;
}

export async function consumeEmergencyLookupAccess(
  unlockMethod: FeatureUnlockMethod
): Promise<{ data: EmergencyLookupAccessResult | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('consume_emergency_lookup_access' as never, {
      p_unlock_method: unlockMethod,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to unlock emergency mode right now.'),
      };
    }

    const parsedAccessRows = parseSupabaseRows(
      emergencyLookupAccessResultSchema,
      data,
      'emergency lookup access',
      'Unable to unlock emergency mode right now.'
    );

    if (parsedAccessRows.error) {
      return {
        data: null,
        error: parsedAccessRows.error,
      };
    }

    return {
      data: (parsedAccessRows.data[0] as EmergencyLookupRpcRow | undefined) ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to unlock emergency mode right now.'),
        'Unable to unlock emergency mode right now.'
      ),
    };
  }
}
