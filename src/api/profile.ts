import { DisplayNameUpdateResult } from '@/types';
import { notificationSettingsResultSchema, parseSupabaseNullableRow } from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

interface AppErrorShape {
  code?: string;
  message: string;
}

function toAppError(error: AppErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = 'code' in error ? error.code : undefined;
  return appError;
}

export async function updateDisplayName(
  displayName: string
): Promise<{ data: DisplayNameUpdateResult | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('update_display_name' as never, {
      p_display_name: displayName,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to update your display name right now.'),
      };
    }

    const parsedResult = parseSupabaseNullableRow(
      notificationSettingsResultSchema,
      data,
      'display name update result',
      'Unable to update your display name right now.'
    );

    if (parsedResult.error) {
      return {
        data: null,
        error: parsedResult.error,
      };
    }

    return {
      data: parsedResult.data as DisplayNameUpdateResult | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to update your display name right now.'),
        'Unable to update your display name right now.'
      ),
    };
  }
}
