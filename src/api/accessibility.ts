import type {
  BathroomAccessibilityUpdateInput,
  BathroomAccessibilityUpdateResult,
  UpdateAccessibilityPreferencesInput,
  UserAccessibilityPreferences,
} from '@/types';
import {
  bathroomAccessibilityUpdateResultSchema,
  parseSupabaseNullableRow,
  userAccessibilityPreferencesSchema,
} from '@/lib/supabase-parsers';
import {
  validateAccessibilityPreferences,
  validateBathroomAccessibilityUpdate,
} from '@/lib/validators';
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

export async function fetchUserAccessibilityPreferences(userId: string): Promise<{
  data: UserAccessibilityPreferences | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('user_accessibility_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load your accessibility preferences right now.'),
      };
    }

    const parsedResult = parseSupabaseNullableRow(
      userAccessibilityPreferencesSchema,
      data,
      'user accessibility preferences',
      'Unable to load your accessibility preferences right now.'
    );

    if (parsedResult.error) {
      return {
        data: null,
        error: parsedResult.error,
      };
    }

    return {
      data: parsedResult.data as UserAccessibilityPreferences | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error
          ? error
          : new Error('Unable to load your accessibility preferences right now.'),
        'Unable to load your accessibility preferences right now.'
      ),
    };
  }
}

export async function saveUserAccessibilityPreferences(
  userId: string,
  input: UpdateAccessibilityPreferencesInput
): Promise<{
  data: UserAccessibilityPreferences | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const validatedInput = validateAccessibilityPreferences(input);
    const { data, error } = await getSupabaseClient()
      .from('user_accessibility_preferences')
      .upsert({
        user_id: userId,
        ...validatedInput,
        updated_at: new Date().toISOString(),
      } as never)
      .select('*')
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to save your accessibility preferences right now.'),
      };
    }

    const parsedResult = parseSupabaseNullableRow(
      userAccessibilityPreferencesSchema,
      data,
      'user accessibility preferences',
      'Unable to save your accessibility preferences right now.'
    );

    if (parsedResult.error) {
      return {
        data: null,
        error: parsedResult.error,
      };
    }

    return {
      data: parsedResult.data as UserAccessibilityPreferences | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error
          ? error
          : new Error('Unable to save your accessibility preferences right now.'),
        'Unable to save your accessibility preferences right now.'
      ),
    };
  }
}

export async function submitBathroomAccessibilityUpdate(
  input: BathroomAccessibilityUpdateInput
): Promise<{
  data: BathroomAccessibilityUpdateResult | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const validatedInput = validateBathroomAccessibilityUpdate(input);
    const { bathroom_id, ...featurePayload } = validatedInput;
    const { data, error } = await getSupabaseClient().rpc(
      'upsert_bathroom_accessibility_features' as never,
      {
        p_bathroom_id: bathroom_id,
        p_accessibility_features: featurePayload,
      } as never
    );

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to save accessibility details for this bathroom right now.'),
      };
    }

    const parsedResult = parseSupabaseNullableRow(
      bathroomAccessibilityUpdateResultSchema,
      Array.isArray(data) ? (data[0] ?? null) : data,
      'bathroom accessibility update',
      'Unable to save accessibility details for this bathroom right now.'
    );

    if (parsedResult.error) {
      return {
        data: null,
        error: parsedResult.error,
      };
    }

    return {
      data: parsedResult.data as BathroomAccessibilityUpdateResult | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error
          ? error
          : new Error('Unable to save accessibility details for this bathroom right now.'),
        'Unable to save accessibility details for this bathroom right now.'
      ),
    };
  }
}
