import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { notificationPreferencesSchema } from '../../../lib/business/schemas';
import type { BusinessWebDatabase } from '../../../lib/supabase/database';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { SettingsSections, type NotificationPreferences } from './settings-sections';

export const metadata: Metadata = {
  title: 'Settings',
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  code_verified: true,
  favorite_update: true,
  nearby_new: false,
  streak_reminder: true,
  arrival_alert: true,
};

type ProfileSettingsRow = Pick<
  BusinessWebDatabase['public']['Tables']['profiles']['Row'],
  'display_name' | 'notification_prefs'
>;

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, notification_prefs')
    .eq('id', user.id)
    .maybeSingle()
    .overrideTypes<ProfileSettingsRow, { merge: false }>();

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
        Settings
      </div>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">
        Account and preferences
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-ink-600">
        Business profile, notification preferences, password updates, and account lifecycle controls
        all live here.
      </p>

      <div className="mt-8">
        <SettingsSections
          initialDisplayName={profile?.display_name ?? ''}
          email={user.email ?? ''}
          initialNotificationPreferences={normalizeNotificationPreferences(profile?.notification_prefs)}
        />
      </div>
    </div>
  );
}

function normalizeNotificationPreferences(rawValue: unknown): NotificationPreferences {
  const parsedValue = notificationPreferencesSchema.safeParse(rawValue);

  if (!parsedValue.success) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...parsedValue.data,
  };
}
