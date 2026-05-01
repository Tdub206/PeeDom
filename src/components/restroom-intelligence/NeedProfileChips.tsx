import { memo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNeedProfiles } from '@/hooks/useNeedProfiles';
import { useFilterStore } from '@/store/useFilterStore';
import type { SavedNeedProfile } from '@/types';

interface NeedProfileChipProps {
  isCompact?: boolean;
}

function SavedProfileChip({
  profile,
  isActive,
  isBusy,
  onApply,
  onSetDefault,
  onDelete,
}: {
  profile: SavedNeedProfile;
  isActive: boolean;
  isBusy: boolean;
  onApply: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <View
      className={[
        'flex-row items-center gap-2 rounded-full border px-4 py-2',
        isActive ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-card',
      ].join(' ')}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isActive, busy: isBusy }}
        className="flex-row items-center gap-2"
        disabled={isBusy}
        onLongPress={onSetDefault}
        onPress={onApply}
      >
        <Text className={['text-sm font-semibold', isActive ? 'text-brand-700' : 'text-ink-700'].join(' ')}>
          {profile.name}
        </Text>
        {profile.is_default ? (
          <View className="rounded-full bg-success/15 px-2 py-0.5">
            <Text className="text-[10px] font-black uppercase tracking-[0.8px] text-success">Default</Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable
        accessibilityLabel={`Delete ${profile.name} profile`}
        accessibilityRole="button"
        className="h-5 w-5 items-center justify-center"
        disabled={isBusy}
        onPress={onDelete}
      >
        <Ionicons name="close" size={14} color="#64748b" />
      </Pressable>
    </View>
  );
}

function NeedProfileChipsComponent({ isCompact = false }: NeedProfileChipProps) {
  const resetFilters = useFilterStore((state) => state.resetFilters);
  const {
    profiles,
    presets,
    activeProfileId,
    isSavingProfile,
    isUpdatingProfile,
    isDeletingProfile,
    isSettingDefaultProfile,
    applyPreset,
    applyProfile,
    clearAppliedProfile,
    saveCurrentAsProfile,
    overwriteProfile,
    deleteProfile,
    setDefaultProfile,
  } = useNeedProfiles();

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? null;
  const hasAnyBusyMutation =
    isSavingProfile || isUpdatingProfile || isDeletingProfile || isSettingDefaultProfile;

  return (
    <View className={isCompact ? 'mt-3' : 'mt-4'}>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Need profiles</Text>
        <View className="flex-row items-center gap-3">
          {activeProfile ? (
            <Pressable
              accessibilityRole="button"
              disabled={hasAnyBusyMutation}
              onPress={() => {
                void overwriteProfile(activeProfile);
              }}
            >
              <Text className="text-xs font-semibold text-brand-700">Update active</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={hasAnyBusyMutation}
            onPress={() => {
              void saveCurrentAsProfile('custom');
            }}
          >
            <Text className="text-xs font-semibold text-brand-700">Save current</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={hasAnyBusyMutation}
            onPress={() => {
              clearAppliedProfile();
              resetFilters();
            }}
          >
            <Text className="text-xs font-semibold text-ink-600">Clear</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="mt-3"
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {presets
          .filter((preset) => preset.key !== 'custom')
          .map((preset) => (
            <Pressable
              accessibilityRole="button"
              className="rounded-full border border-surface-strong bg-surface-card px-4 py-2"
              disabled={hasAnyBusyMutation}
              key={preset.key}
              onPress={() => {
                applyPreset(preset.key);
              }}
            >
              <Text className="text-sm font-semibold text-ink-700">{preset.label}</Text>
            </Pressable>
          ))}

        {profiles.map((profile) => (
          <SavedProfileChip
            isActive={activeProfileId === profile.id}
            isBusy={hasAnyBusyMutation}
            key={profile.id}
            onApply={() => applyProfile(profile)}
            onDelete={() => {
              void deleteProfile(profile);
            }}
            onSetDefault={() => {
              void setDefaultProfile(profile);
            }}
            profile={profile}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export const NeedProfileChips = memo(NeedProfileChipsComponent);
