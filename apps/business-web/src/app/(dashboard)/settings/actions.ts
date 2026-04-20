'use server';

import { revalidatePath } from 'next/cache';
import {
  notificationPreferencesSchema,
  updateBusinessProfileSchema,
} from '@/lib/business/schemas';
import type { BusinessWebDatabase } from '@/lib/supabase/database';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type UpdateBusinessProfileResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type UpdateNotificationPreferencesResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

interface UpdateDisplayNameRpcClient {
  rpc(
    fn: 'update_display_name',
    args: BusinessWebDatabase['public']['Functions']['update_display_name']['Args']
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

interface UpdateNotificationSettingsRpcClient {
  rpc(
    fn: 'update_notification_settings',
    args: BusinessWebDatabase['public']['Functions']['update_notification_settings']['Args']
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

export async function updateBusinessProfile(input: unknown): Promise<UpdateBusinessProfileResult> {
  const parsedInput = updateBusinessProfileSchema.safeParse(input);

  if (!parsedInput.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsedInput.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }

    return {
      ok: false,
      error: parsedInput.error.issues[0]?.message ?? 'Check the profile fields and try again.',
      fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Your session expired. Sign in again and retry.' };
  }

  const rpcClient = supabase as unknown as UpdateDisplayNameRpcClient;
  const { error } = await rpcClient.rpc('update_display_name', {
    p_display_name: parsedInput.data.display_name,
  });

  if (error) {
    return {
      ok: false,
      error: mapProfileError(error.message),
    };
  }

  revalidatePath('/settings');
  revalidatePath('/hub');

  return { ok: true };
}

export async function updateBusinessNotificationPreferences(
  input: unknown
): Promise<UpdateNotificationPreferencesResult> {
  const parsedInput = notificationPreferencesSchema.safeParse(input);

  if (!parsedInput.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsedInput.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }

    return {
      ok: false,
      error: parsedInput.error.issues[0]?.message ?? 'Check the notification settings and try again.',
      fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Your session expired. Sign in again and retry.' };
  }

  const rpcClient = supabase as unknown as UpdateNotificationSettingsRpcClient;
  const { error } = await rpcClient.rpc('update_notification_settings', {
    p_push_enabled: null,
    p_notification_prefs: parsedInput.data,
  });

  if (error) {
    return {
      ok: false,
      error: 'Unable to update notification preferences right now. Try again in a moment.',
    };
  }

  revalidatePath('/settings');

  return { ok: true };
}

function mapProfileError(message: string): string {
  if (/AUTH_REQUIRED|not_authenticated/i.test(message)) {
    return 'Your session expired. Sign in again and retry.';
  }

  if (/name_too_short/i.test(message)) {
    return 'Display name must be at least 2 characters.';
  }

  if (/name_too_long/i.test(message)) {
    return 'Display name must be 80 characters or fewer.';
  }

  return 'Unable to update your business profile right now. Try again in a moment.';
}
