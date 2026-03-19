import { memo } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { hasActivePremium } from '@/lib/gamification';
import { useFilterStore } from '@/store/useFilterStore';
import { hasActiveBathroomFilters } from '@/utils/bathroom';

const FILTER_OPTIONS: Array<{
  key:
    | 'isAccessible'
    | 'isLocked'
    | 'isCustomerOnly'
    | 'openNow'
    | 'noCodeRequired'
    | 'recentlyVerifiedOnly'
    | 'hasChangingTable'
    | 'isFamilyRestroom';
  label: string;
  premiumOnly?: boolean;
}> = [
  { key: 'isAccessible', label: 'Accessible' },
  { key: 'isLocked', label: 'Locked' },
  { key: 'isCustomerOnly', label: 'Customers only' },
  { key: 'openNow', label: 'Open now' },
  { key: 'noCodeRequired', label: 'No code' },
  { key: 'recentlyVerifiedOnly', label: 'Verified', premiumOnly: true },
  { key: 'hasChangingTable', label: 'Changing table', premiumOnly: true },
  { key: 'isFamilyRestroom', label: 'Family room', premiumOnly: true },
];

function SearchFiltersComponent() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const filters = useFilterStore((state) => state.filters);
  const resetFilters = useFilterStore((state) => state.resetFilters);
  const setMinCleanlinessRating = useFilterStore((state) => state.setMinCleanlinessRating);
  const toggleFilter = useFilterStore((state) => state.toggleFilter);
  const hasActiveFilters = hasActiveBathroomFilters(filters);
  const isPremiumUser = hasActivePremium(profile);

  const handleToggleFilter = (
    filterKey: (typeof FILTER_OPTIONS)[number]['key'],
    premiumOnly?: boolean
  ) => {
    if (premiumOnly && !isPremiumUser) {
      showToast({
        title: 'Premium filter',
        message: 'Premium unlocks recently verified, changing table, and family restroom filters.',
        variant: 'info',
      });
      return;
    }

    toggleFilter(filterKey);
  };

  return (
    <ScrollView
      className="mt-4"
      contentContainerStyle={{ gap: 10, paddingRight: 4 }}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {hasActiveFilters ? (
        <Pressable
          accessibilityRole="button"
          className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2"
          onPress={resetFilters}
        >
          <Text className="text-sm font-semibold text-danger">Reset</Text>
        </Pressable>
      ) : null}

      {FILTER_OPTIONS.map((filterOption) => {
        const isActive = Boolean(filters[filterOption.key]);

        return (
          <Pressable
            accessibilityRole="button"
          className={[
            'rounded-full border px-4 py-2',
            isActive ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-card',
          ].join(' ')}
          key={filterOption.key}
          onPress={() => handleToggleFilter(filterOption.key, filterOption.premiumOnly)}
        >
          <Text
            className={[
              'text-sm font-semibold',
              isActive ? 'text-brand-700' : 'text-ink-700',
            ].join(' ')}
          >
              {filterOption.label}
              {filterOption.premiumOnly ? ' Pro' : ''}
            </Text>
          </Pressable>
        );
      })}

      {typeof filters.minCleanlinessRating === 'number' ? (
        <Pressable
          accessibilityRole="button"
          className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2"
          onPress={() => setMinCleanlinessRating(null)}
        >
          <Text className="text-sm font-semibold text-brand-700">
            Clean {filters.minCleanlinessRating}+
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

export const SearchFilters = memo(SearchFiltersComponent);
