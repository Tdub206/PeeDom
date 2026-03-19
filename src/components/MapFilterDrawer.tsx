import React, { memo, useCallback, useEffect } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { useAccessibilityInfo } from '@/hooks/useAccessibilityInfo';
import { useAccessibilityPreferences, useSyncAccessibilityPreferences } from '@/hooks/useAccessibility';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { hasActivePremium } from '@/lib/gamification';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { AccessibilityPreset, BathroomFilters } from '@/types';
import { countActiveAccessibilityPreferences } from '@/utils/accessibility';

type BooleanFilterKey =
  | 'isAccessible'
  | 'isLocked'
  | 'isCustomerOnly'
  | 'openNow'
  | 'noCodeRequired'
  | 'recentlyVerifiedOnly'
  | 'hasChangingTable'
  | 'isFamilyRestroom';

interface FilterOption {
  key: BooleanFilterKey;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  premiumOnly?: boolean;
}

interface MapFilterDrawerProps {
  isOpen: boolean;
  filters: BathroomFilters;
  onClose: () => void;
  onToggleFilter: (key: BooleanFilterKey) => void;
  onSetMinCleanlinessRating: (rating: number | null) => void;
  onReset: () => void;
}

const FILTER_OPTIONS: FilterOption[] = [
  {
    key: 'openNow',
    label: 'Open now',
    description: 'Only show bathrooms whose posted hours say they are open right now.',
    icon: 'time-outline',
  },
  {
    key: 'isAccessible',
    label: 'Accessible',
    description: 'Surface bathrooms with reported accessibility signals first.',
    icon: 'accessibility-outline',
  },
  {
    key: 'noCodeRequired',
    label: 'No code required',
    description: 'Hide locked bathrooms so only walk-in access remains.',
    icon: 'lock-open-outline',
  },
  {
    key: 'isCustomerOnly',
    label: 'Customer only',
    description: 'Focus on bathrooms with customer-only access rules.',
    icon: 'receipt-outline',
  },
  {
    key: 'isLocked',
    label: 'Locked',
    description: 'Surface bathrooms that require an access code or door unlock.',
    icon: 'lock-closed-outline',
  },
  {
    key: 'recentlyVerifiedOnly',
    label: 'Recently verified',
    description: 'Only keep bathrooms whose latest code verification happened recently.',
    icon: 'shield-checkmark-outline',
    premiumOnly: true,
  },
  {
    key: 'hasChangingTable',
    label: 'Changing table',
    description: 'Focus on bathrooms with a reported baby changing table.',
    icon: 'happy-outline',
    premiumOnly: true,
  },
  {
    key: 'isFamilyRestroom',
    label: 'Family restroom',
    description: 'Show family restroom options first.',
    icon: 'people-outline',
    premiumOnly: true,
  },
];

const CLEANLINESS_OPTIONS = [
  { label: 'Any', value: null },
  { label: '3.0+', value: 3 },
  { label: '4.0+', value: 4 },
  { label: '4.5+', value: 4.5 },
] as const;

const DOOR_WIDTH_OPTIONS = [
  { label: 'Any', value: null },
  { label: '32"+', value: 32 },
  { label: '36"+', value: 36 },
  { label: '40"+', value: 40 },
] as const;

const STALL_WIDTH_OPTIONS = [
  { label: 'Any', value: null },
  { label: '60"+', value: 60 },
  { label: '72"+', value: 72 },
  { label: '84"+', value: 84 },
] as const;

function MapFilterDrawerComponent({
  isOpen,
  filters,
  onClose,
  onToggleFilter,
  onSetMinCleanlinessRating,
  onReset,
}: MapFilterDrawerProps) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { isScreenReaderEnabled, announce } = useAccessibilityInfo();
  const isPremiumUser = hasActivePremium(profile);
  const isAccessibilityMode = useAccessibilityStore((state) => state.isAccessibilityMode);
  const preferences = useAccessibilityStore((state) => state.preferences);
  const setAccessibilityMode = useAccessibilityStore((state) => state.setAccessibilityMode);
  const setPreference = useAccessibilityStore((state) => state.setPreference);
  const applyPreset = useAccessibilityStore((state) => state.applyPreset);
  const resetPreferences = useAccessibilityStore((state) => state.resetPreferences);
  const syncPreferences = useSyncAccessibilityPreferences();
  const activeAccessibilityCount = countActiveAccessibilityPreferences(preferences);

  useAccessibilityPreferences();

  useEffect(() => {
    if (!isOpen || !isScreenReaderEnabled) {
      return;
    }

    void announce('Map filters opened. Accessibility controls are available below the standard filters.');
  }, [announce, isOpen, isScreenReaderEnabled]);

  const handleToggleFilter = useCallback(
    (filterOption: FilterOption) => {
      if (filterOption.premiumOnly && !isPremiumUser) {
        showToast({
          title: 'Premium filter',
          message: 'Premium unlocks recently verified, changing table, and family restroom filters.',
          variant: 'info',
        });
        return;
      }

      onToggleFilter(filterOption.key);
    },
    [isPremiumUser, onToggleFilter, showToast]
  );

  const handleDismiss = useCallback(() => {
    const closeDrawer = async () => {
      try {
        await syncPreferences();
      } catch (error) {
        showToast({
          title: 'Preferences not synced',
          message: error instanceof Error ? error.message : 'Your local accessibility settings were kept on this device.',
          variant: 'warning',
        });
      } finally {
        onClose();

        if (isScreenReaderEnabled) {
          void announce('Map filters closed.');
        }
      }
    };

    void closeDrawer();
  }, [announce, isScreenReaderEnabled, onClose, showToast, syncPreferences]);

  const handleApply = useCallback(() => {
    handleDismiss();
  }, [handleDismiss]);

  const handleResetAll = useCallback(() => {
    onReset();
    resetPreferences();
  }, [onReset, resetPreferences]);

  const handleApplyPreset = useCallback((preset: AccessibilityPreset) => {
    applyPreset(preset);
  }, [applyPreset]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleDismiss}
      transparent
      visible={isOpen}
    >
      <Pressable className="flex-1 bg-black/45" onPress={handleDismiss}>
        <SafeAreaView className="flex-1 justify-end" edges={['bottom']}>
          <Pressable
            accessibilityViewIsModal
            className="max-h-[88%] rounded-t-[32px] bg-surface-card px-5 pb-6 pt-4"
            onPress={() => undefined}
          >
            <View className="items-center">
              <View className="h-1.5 w-14 rounded-full bg-surface-strong" />
            </View>

            <View className="mt-5 flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Map filters</Text>
                <Text className="mt-2 text-2xl font-black text-ink-900">Tune the bathroom map.</Text>
                <Text className="mt-2 text-sm leading-6 text-ink-600">
                  Blend access rules, cleanliness, and inclusive accessibility preferences without leaving the map.
                </Text>
              </View>

              <Pressable
                accessibilityHint="Closes the filter drawer and keeps your current selections."
                accessibilityLabel="Close map filters"
                accessibilityRole="button"
                className="h-12 w-12 items-center justify-center rounded-full border border-surface-strong bg-surface-base"
                onPress={handleDismiss}
              >
                <Ionicons color="#374151" name="close" size={20} />
              </Pressable>
            </View>

            <ScrollView className="mt-6" showsVerticalScrollIndicator={false}>
              <View className="gap-3">
                {FILTER_OPTIONS.map((filterOption) => {
                  const isActive = Boolean(filters[filterOption.key]);

                  return (
                    <Pressable
                      accessibilityHint={filterOption.description}
                      accessibilityLabel={`${filterOption.label} filter`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      className={[
                        'rounded-[24px] border px-4 py-4',
                        isActive ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-base',
                      ].join(' ')}
                      key={filterOption.key}
                      onPress={() => handleToggleFilter(filterOption)}
                    >
                      <View className="flex-row items-start gap-3">
                        <View
                          className={[
                            'mt-0.5 h-11 w-11 items-center justify-center rounded-2xl',
                            isActive ? 'bg-brand-600' : 'bg-surface-muted',
                          ].join(' ')}
                        >
                          <Ionicons
                            color={isActive ? '#ffffff' : '#4b596c'}
                            name={filterOption.icon}
                            size={20}
                          />
                        </View>

                        <View className="flex-1">
                          <View className="flex-row items-center justify-between gap-4">
                            <Text className="text-base font-bold text-ink-900">{filterOption.label}</Text>
                            <View className="flex-row items-center gap-2">
                              {filterOption.premiumOnly ? (
                                <View className="rounded-full bg-warning/15 px-3 py-1">
                                  <Text className="text-[11px] font-black uppercase tracking-[0.8px] text-warning">
                                    Pro
                                  </Text>
                                </View>
                              ) : null}
                              <View
                                className={[
                                  'rounded-full px-3 py-1',
                                  isActive ? 'bg-brand-600' : 'bg-surface-muted',
                                ].join(' ')}
                              >
                                <Text className={['text-xs font-black uppercase tracking-[0.8px]', isActive ? 'text-white' : 'text-ink-600'].join(' ')}>
                                  {isActive ? 'On' : 'Off'}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <Text className="mt-1 text-sm leading-5 text-ink-600">{filterOption.description}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View className="mt-6 rounded-[24px] border border-surface-strong bg-surface-base px-4 py-4">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Accessibility mode</Text>
                <View className="mt-3 flex-row items-center justify-between gap-4">
                  <View className="flex-1">
                    <Text className="text-base font-bold text-ink-900">Prioritize inclusive bathrooms</Text>
                    <Text className="mt-1 text-sm leading-5 text-ink-600">
                      Keep your accessibility preferences persistent across sessions and surface better matches first.
                    </Text>
                  </View>
                  <Switch
                    accessibilityHint="Turns the saved accessibility preferences on or off for map and search results."
                    accessibilityLabel="Accessibility mode"
                    accessibilityRole="switch"
                    onValueChange={setAccessibilityMode}
                    trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                    value={isAccessibilityMode}
                  />
                </View>

                <View className="mt-4 rounded-2xl bg-surface-muted px-4 py-3">
                  <Text className="text-sm font-semibold text-ink-900">
                    {isAccessibilityMode
                      ? `${activeAccessibilityCount} saved accessibility preferences active`
                      : 'Accessibility preferences are saved but currently paused'}
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-ink-600">
                    {profile ? 'Changes sync to your account when you apply filters.' : 'Changes stay on this device until you sign in.'}
                  </Text>
                </View>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  <PresetChip
                    active={preferences.requireGrabBars && preferences.requireAutomaticDoor}
                    icon="♿"
                    label="Wheelchair"
                    onPress={() => handleApplyPreset('wheelchair')}
                  />
                  <PresetChip
                    active={preferences.requireGenderNeutral}
                    icon="🚻"
                    label="Gender neutral"
                    onPress={() => handleApplyPreset('gender_neutral')}
                  />
                  <PresetChip
                    active={preferences.requireFamilyRestroom && preferences.requireChangingTable}
                    icon="👶"
                    label="Family"
                    onPress={() => handleApplyPreset('family')}
                  />
                </View>

                <View className="mt-5 gap-4">
                  <AccessibilitySwitchRow
                    description="Only show bathrooms with grab bars."
                    label="Grab bars"
                    onValueChange={(value) => setPreference('requireGrabBars', value)}
                    value={preferences.requireGrabBars}
                  />
                  <AccessibilitySwitchRow
                    description="Require an automatic door opener."
                    label="Automatic door"
                    onValueChange={(value) => setPreference('requireAutomaticDoor', value)}
                    value={preferences.requireAutomaticDoor}
                  />
                  <AccessibilitySwitchRow
                    description="Require a gender-neutral restroom."
                    label="Gender neutral"
                    onValueChange={(value) => setPreference('requireGenderNeutral', value)}
                    value={preferences.requireGenderNeutral}
                  />
                  <AccessibilitySwitchRow
                    description="Require a family restroom layout."
                    label="Family restroom"
                    onValueChange={(value) => setPreference('requireFamilyRestroom', value)}
                    value={preferences.requireFamilyRestroom}
                  />
                  <AccessibilitySwitchRow
                    description="Require a baby changing table."
                    label="Changing table"
                    onValueChange={(value) => setPreference('requireChangingTable', value)}
                    value={preferences.requireChangingTable}
                  />
                  <AccessibilitySwitchRow
                    description="Sort bathrooms with stronger accessibility coverage first."
                    label="Accessible first"
                    onValueChange={(value) => setPreference('prioritizeAccessible', value)}
                    value={preferences.prioritizeAccessible}
                  />
                  <AccessibilitySwitchRow
                    description="Hide bathrooms without reported accessibility support."
                    label="Hide weak matches"
                    onValueChange={(value) => setPreference('hideNonAccessible', value)}
                    value={preferences.hideNonAccessible}
                  />
                </View>

                <View className="mt-5">
                  <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Minimum door width</Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {DOOR_WIDTH_OPTIONS.map((option) => {
                      const isSelected = preferences.minDoorWidth === option.value;

                      return (
                        <OptionChip
                          key={option.label}
                          label={option.label}
                          onPress={() => setPreference('minDoorWidth', option.value)}
                          selected={isSelected}
                        />
                      );
                    })}
                  </View>
                </View>

                <View className="mt-5">
                  <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Minimum stall width</Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {STALL_WIDTH_OPTIONS.map((option) => {
                      const isSelected = preferences.minStallWidth === option.value;

                      return (
                        <OptionChip
                          key={option.label}
                          label={option.label}
                          onPress={() => setPreference('minStallWidth', option.value)}
                          selected={isSelected}
                        />
                      );
                    })}
                  </View>
                </View>
              </View>

              <View className="mt-6 rounded-[24px] border border-surface-strong bg-surface-base px-4 py-4">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Cleanliness floor</Text>
                <Text className="mt-2 text-base font-bold text-ink-900">Only surface bathrooms rated above your minimum.</Text>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  {CLEANLINESS_OPTIONS.map((option) => {
                    const isSelected = filters.minCleanlinessRating === option.value;

                    return (
                      <OptionChip
                        key={option.label}
                        label={option.label}
                        onPress={() => onSetMinCleanlinessRating(option.value)}
                        selected={isSelected}
                      />
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View className="mt-6 flex-row gap-3">
              <Button fullWidth={false} className="flex-1" label="Reset all" onPress={handleResetAll} variant="secondary" />
              <Button fullWidth={false} className="flex-1" label="Apply filters" onPress={handleApply} />
            </View>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

function AccessibilitySwitchRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-start justify-between gap-4 rounded-2xl bg-surface-card px-4 py-3">
      <View className="flex-1">
        <Text className="text-sm font-bold text-ink-900">{label}</Text>
        <Text className="mt-1 text-xs leading-5 text-ink-600">{description}</Text>
      </View>
      <Switch
        accessibilityHint={description}
        accessibilityLabel={label}
        accessibilityRole="switch"
        onValueChange={onValueChange}
        trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
        value={value}
      />
    </View>
  );
}

function PresetChip({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label} accessibility preset`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={[
        'flex-row items-center gap-2 rounded-full border px-4 py-2',
        active ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-card',
      ].join(' ')}
      onPress={onPress}
    >
      <Text>{icon}</Text>
      <Text className={['text-sm font-semibold', active ? 'text-brand-700' : 'text-ink-700'].join(' ')}>{label}</Text>
    </Pressable>
  );
}

function OptionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label} option`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={[
        'rounded-full border px-4 py-2',
        selected ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-card',
      ].join(' ')}
      onPress={onPress}
    >
      <Text className={['text-sm font-semibold', selected ? 'text-brand-700' : 'text-ink-700'].join(' ')}>{label}</Text>
    </Pressable>
  );
}

export const MapFilterDrawer = memo(MapFilterDrawerComponent);
