import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { hasActivePremium } from '@/lib/gamification';
import { BathroomFilters } from '@/types';

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
    description: 'Prioritize bathrooms marked as accessible.',
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
  const isPremiumUser = hasActivePremium(profile);

  const handleToggleFilter = (filterOption: FilterOption) => {
    if (filterOption.premiumOnly && !isPremiumUser) {
      showToast({
        title: 'Premium filter',
        message: 'Premium unlocks recently verified, changing table, and family restroom filters.',
        variant: 'info',
      });
      return;
    }

    onToggleFilter(filterOption.key);
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={isOpen}
    >
      <Pressable className="flex-1 bg-black/45" onPress={onClose}>
        <SafeAreaView className="flex-1 justify-end" edges={['bottom']}>
          <Pressable className="max-h-[82%] rounded-t-[32px] bg-surface-card px-5 pb-6 pt-4" onPress={() => undefined}>
            <View className="items-center">
              <View className="h-1.5 w-14 rounded-full bg-surface-strong" />
            </View>

            <View className="mt-5 flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Map filters</Text>
                <Text className="mt-2 text-2xl font-black text-ink-900">Tune the bathroom map.</Text>
                <Text className="mt-2 text-sm leading-6 text-ink-600">
                  Keep the pin field focused on access rules, posted hours, and cleanliness signals that matter right now.
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Close map filters"
                accessibilityRole="button"
                className="h-12 w-12 items-center justify-center rounded-full border border-surface-strong bg-surface-base"
                onPress={onClose}
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
                      accessibilityRole="button"
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
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Cleanliness floor</Text>
                <Text className="mt-2 text-base font-bold text-ink-900">Only surface bathrooms rated above your minimum.</Text>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  {CLEANLINESS_OPTIONS.map((option) => {
                    const isSelected = filters.minCleanlinessRating === option.value;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        className={[
                          'rounded-full border px-4 py-2',
                          isSelected ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-card',
                        ].join(' ')}
                        key={option.label}
                        onPress={() => onSetMinCleanlinessRating(option.value)}
                      >
                        <Text className={['text-sm font-semibold', isSelected ? 'text-brand-700' : 'text-ink-700'].join(' ')}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View className="mt-6 flex-row gap-3">
              <Button fullWidth={false} className="flex-1" label="Reset" onPress={onReset} variant="secondary" />
              <Button fullWidth={false} className="flex-1" label="Apply filters" onPress={onClose} />
            </View>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

export const MapFilterDrawer = memo(MapFilterDrawerComponent);
