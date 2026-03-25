import { memo } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { useSyncAccessibilityPreferences } from '@/hooks/useAccessibility';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { hasActivePremium } from '@/lib/gamification';
import { useFilterStore } from '@/store/useFilterStore';
import {
  selectHasActiveSearchDiscoveryFilters,
  useSearchStore,
} from '@/store/useSearchStore';
import { countActiveAccessibilityPreferences } from '@/utils/accessibility';
import { hasActiveBathroomFilters, mergeAccessibilityFilters } from '@/utils/bathroom';

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

const RADIUS_OPTIONS = [
  { label: '0.5 mi', value: 804 },
  { label: '1 mi', value: 1609 },
  { label: '3 mi', value: 4828 },
  { label: '5 mi', value: 8047 },
];

function SearchFiltersComponent() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const filters = useFilterStore((state) => state.filters);
  const resetFilters = useFilterStore((state) => state.resetFilters);
  const setMinCleanlinessRating = useFilterStore((state) => state.setMinCleanlinessRating);
  const toggleFilter = useFilterStore((state) => state.toggleFilter);
  const isAccessibilityMode = useAccessibilityStore((state) => state.isAccessibilityMode);
  const preferences = useAccessibilityStore((state) => state.preferences);
  const setAccessibilityMode = useAccessibilityStore((state) => state.setAccessibilityMode);
  const resetAccessibilityPreferences = useAccessibilityStore((state) => state.resetPreferences);
  const hasCode = useSearchStore((state) => state.discoveryFilters.hasCode);
  const radiusMeters = useSearchStore((state) => state.discoveryFilters.radiusMeters);
  const hasActiveDiscoveryFilters = useSearchStore(selectHasActiveSearchDiscoveryFilters);
  const resetDiscoveryFilters = useSearchStore((state) => state.resetDiscoveryFilters);
  const setHasCode = useSearchStore((state) => state.setHasCode);
  const setRadiusMeters = useSearchStore((state) => state.setRadiusMeters);
  const syncAccessibilityPreferences = useSyncAccessibilityPreferences();
  const resolvedFilters = mergeAccessibilityFilters(filters, isAccessibilityMode, preferences);
  const hasActiveFilters = hasActiveBathroomFilters(resolvedFilters) || hasActiveDiscoveryFilters;
  const activeAccessibilityCount = countActiveAccessibilityPreferences(preferences);
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

  const handleResetAll = async () => {
    try {
      resetFilters();
      resetAccessibilityPreferences();
      resetDiscoveryFilters();
      await syncAccessibilityPreferences();
    } catch (error) {
      showToast({
        title: 'Preferences kept locally',
        message: error instanceof Error ? error.message : 'Your accessibility preferences could not sync right now.',
        variant: 'warning',
      });
    }
  };

  const handleDisableAccessibilityMode = async () => {
    try {
      setAccessibilityMode(false);
      await syncAccessibilityPreferences();
    } catch (error) {
      showToast({
        title: 'Preferences kept locally',
        message: error instanceof Error ? error.message : 'Your accessibility preferences could not sync right now.',
        variant: 'warning',
      });
    }
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
          onPress={() => {
            void handleResetAll();
          }}
        >
          <Text className="text-sm font-semibold text-danger">Reset</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel={hasCode === true ? 'Disable has code filter' : 'Enable has code filter'}
        accessibilityRole="button"
        className={[
          'rounded-full border px-4 py-2',
          hasCode === true ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-card',
        ].join(' ')}
        onPress={() => setHasCode(hasCode === true ? null : true)}
      >
        <Text className={['text-sm font-semibold', hasCode === true ? 'text-brand-700' : 'text-ink-700'].join(' ')}>
          Has code
        </Text>
      </Pressable>

      {isAccessibilityMode ? (
        <Pressable
          accessibilityLabel="Disable accessibility mode"
          accessibilityRole="button"
          className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2"
          onPress={() => {
            void handleDisableAccessibilityMode();
          }}
        >
          <Text className="text-sm font-semibold text-brand-700">
            A11y mode {activeAccessibilityCount > 0 ? `${activeAccessibilityCount}` : 'on'}
          </Text>
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

      {RADIUS_OPTIONS.map((radiusOption) => {
        const isSelected = radiusMeters === radiusOption.value;

        return (
          <Pressable
            accessibilityLabel={`Search within ${radiusOption.label}, ${isSelected ? 'selected' : 'inactive'}`}
            accessibilityRole="button"
            className={[
              'rounded-full border px-4 py-2',
              isSelected ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-card',
            ].join(' ')}
            key={radiusOption.value}
            onPress={() => setRadiusMeters(radiusOption.value)}
          >
            <Text
              className={[
                'text-sm font-semibold',
                isSelected ? 'text-brand-700' : 'text-ink-700',
              ].join(' ')}
            >
              {radiusOption.label}
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
