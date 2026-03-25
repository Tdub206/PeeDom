import {
  dbBathroomStatusEventSchema,
  notificationSettingsResultSchema,
  parseSupabaseNullableRow,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';
import { DEFAULT_NOTIFICATION_PREFS, NotificationPrefs, type BathroomLiveStatus, type BathroomStatusEvent } from '@/types';

interface ApiErrorShape {
  code?: string;
  message: string;
}

function toAppError(error: ApiErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = 'code' in error ? error.code : undefined;
  return appError;
}

export async function persistPushToken(token: string): Promise<{ error: (Error & { code?: string }) | null }> {
  try {
    const { error } = await getSupabaseClient().rpc('register_push_token' as never, {
      p_token: token,
    } as never);

    if (error) {
      return {
        error: toAppError(error, 'Unable to register this device for push notifications.'),
      };
    }

    return {
      error: null,
    };
  } catch (error) {
    return {
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to register this device for push notifications.'),
        'Unable to register this device for push notifications.'
      ),
    };
  }
}

export async function clearPushToken(): Promise<{ error: (Error & { code?: string }) | null }> {
  try {
    const { error } = await getSupabaseClient().rpc('clear_push_token' as never);

    if (error) {
      return {
        error: toAppError(error, 'Unable to clear this device push registration.'),
      };
    }

    return {
      error: null,
    };
  } catch (error) {
    return {
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to clear this device push registration.'),
        'Unable to clear this device push registration.'
      ),
    };
  }
}

export async function updateNotificationSettings(input: {
  pushEnabled?: boolean;
  notificationPrefs?: Partial<NotificationPrefs>;
}): Promise<{
  data: NotificationPrefs | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const payload = input.notificationPrefs ? { ...input.notificationPrefs } : null;
    const { data, error } = await getSupabaseClient().rpc('update_notification_settings' as never, {
      p_push_enabled: typeof input.pushEnabled === 'boolean' ? input.pushEnabled : null,
      p_notification_prefs: payload,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to update your notification settings.'),
      };
    }

    const parsedResult = parseSupabaseNullableRow(
      notificationSettingsResultSchema,
      data,
      'notification settings result',
      'Unable to update your notification settings.'
    );

    if (parsedResult.error) {
      return {
        data: null,
        error: parsedResult.error,
      };
    }

    if (!parsedResult.data?.success) {
      return {
        data: null,
        error: toAppError(
          {
            code: parsedResult.data?.error ?? 'notification_settings_failed',
            message: 'Unable to update your notification settings.',
          },
          'Unable to update your notification settings.'
        ),
      };
    }

    return {
      data: {
        ...DEFAULT_NOTIFICATION_PREFS,
        ...(input.notificationPrefs ?? {}),
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to update your notification settings.'),
        'Unable to update your notification settings.'
      ),
    };
  }
}

export async function fetchCurrentBathroomStatus(
  bathroomId: string
): Promise<{ data: BathroomStatusEvent | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('bathroom_status_events')
      .select('*')
      .eq('bathroom_id', bathroomId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load live bathroom status.'),
      };
    }

    const parsedData = parseSupabaseNullableRow(
      dbBathroomStatusEventSchema,
      data,
      'bathroom live status',
      'Unable to load live bathroom status.'
    );

    if (parsedData.error) {
      return {
        data: null,
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as BathroomStatusEvent | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load live bathroom status.'),
        'Unable to load live bathroom status.'
      ),
    };
  }
}

export async function reportBathroomStatus(input: {
  bathroomId: string;
  status: BathroomLiveStatus;
  note?: string | null;
}): Promise<{ error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('report_bathroom_status' as never, {
      p_bathroom_id: input.bathroomId,
      p_status: input.status,
      p_note: input.note ?? null,
    } as never);

    if (error) {
      return {
        error: toAppError(error, 'Unable to report the live bathroom status.'),
      };
    }

    const parsedResult = parseSupabaseNullableRow(
      notificationSettingsResultSchema,
      data,
      'bathroom status report result',
      'Unable to report the live bathroom status.'
    );

    if (parsedResult.error) {
      return {
        error: parsedResult.error,
      };
    }

    if (!parsedResult.data?.success) {
      return {
        error: toAppError(
          {
            code: parsedResult.data?.error ?? 'bathroom_status_report_failed',
            message: 'Unable to report the live bathroom status.',
          },
          'Unable to report the live bathroom status.'
        ),
      };
    }

    return {
      error: null,
    };
  } catch (error) {
    return {
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to report the live bathroom status.'),
        'Unable to report the live bathroom status.'
      ),
    };
  }
}
