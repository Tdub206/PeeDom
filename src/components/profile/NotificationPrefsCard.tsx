import { memo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { NotificationPrefs } from '@/types';

interface PreferenceRowProps {
  description: string;
  disabled: boolean;
  enabled: boolean;
  isLoading: boolean;
  label: string;
  onPress: () => void;
}

const PREFERENCE_COPY: Array<{
  description: string;
  key: keyof NotificationPrefs;
  label: string;
}> = [
  {
    key: 'favorite_update',
    label: 'Favorite updates',
    description: 'Get alerted when a saved bathroom receives a newly submitted access code.',
  },
  {
    key: 'code_verified',
    label: 'Code verified',
    description: 'Hear when one of your contributed codes is verified by the community.',
  },
  {
    key: 'streak_reminder',
    label: 'Streak reminder',
    description: 'Receive a nudge before your contribution streak goes cold.',
  },
  {
    key: 'nearby_new',
    label: 'Nearby new bathrooms',
    description: 'Be notified when new bathrooms are added around your usual area.',
  },
];

function PreferenceRow({ description, disabled, enabled, isLoading, label, onPress }: PreferenceRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled, busy: isLoading, disabled }}
      className={[
        'rounded-[24px] border px-4 py-4',
        enabled ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-base',
        disabled ? 'opacity-60' : '',
      ].join(' ')}
      disabled={disabled}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text className="text-base font-bold text-ink-900">{label}</Text>
          <Text className="mt-1 text-sm leading-6 text-ink-600">{description}</Text>
        </View>
        <View className={enabled ? 'rounded-full bg-brand-600 px-4 py-2' : 'rounded-full bg-surface-muted px-4 py-2'}>
          {isLoading ? (
            <ActivityIndicator color={enabled ? '#ffffff' : '#1f2937'} size="small" />
          ) : (
            <Text className={enabled ? 'text-sm font-bold text-white' : 'text-sm font-bold text-ink-700'}>
              {enabled ? 'On' : 'Off'}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function NotificationPrefsCardComponent() {
  const notificationPreferences = useNotificationPreferences();

  return (
    <View className="rounded-[32px] border border-surface-strong bg-surface-card px-5 py-6">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Push notifications</Text>
      <Text className="mt-3 text-2xl font-black text-ink-900">
        {notificationPreferences.isPushEnabled ? 'Alerts are live on this device' : 'Alerts are currently muted'}
      </Text>
      <Text className="mt-2 text-sm leading-6 text-ink-600">
        Save favorite bathrooms and decide which contribution updates should reach this device.
      </Text>

      <View className="mt-5 gap-3">
        <PreferenceRow
          description="Enable or mute all push notifications for this device."
          disabled={notificationPreferences.hasPendingUpdate}
          enabled={notificationPreferences.isPushEnabled}
          isLoading={notificationPreferences.isUpdating('push_enabled')}
          label="Push notifications"
          onPress={() => {
            void notificationPreferences.togglePushEnabled(!notificationPreferences.isPushEnabled);
          }}
        />

        {PREFERENCE_COPY.map((preference) => (
          <PreferenceRow
            description={preference.description}
            disabled={notificationPreferences.hasPendingUpdate}
            enabled={notificationPreferences.settings[preference.key]}
            isLoading={notificationPreferences.isUpdating(preference.key)}
            key={preference.key}
            label={preference.label}
            onPress={() => {
              void notificationPreferences.togglePreference(preference.key);
            }}
          />
        ))}
      </View>
    </View>
  );
}

export const NotificationPrefsCard = memo(NotificationPrefsCardComponent);
