import { Pressable, Text, View } from 'react-native';
import type { GooglePlaceAutocompleteSuggestion } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { formatSearchDistance } from '@/utils/search';

export type PlacesAutocompleteDropdownVariant = 'search' | 'form';

interface PlacesAutocompleteDropdownProps {
  suggestions: GooglePlaceAutocompleteSuggestion[];
  isLoading: boolean;
  error: Error | null;
  visible: boolean;
  variant: PlacesAutocompleteDropdownVariant;
  showDistance?: boolean;
  onSelect: (suggestion: GooglePlaceAutocompleteSuggestion) => void;
}

/**
 * Shared business autocomplete dropdown used by the home search screen and
 * the add-bathroom modal. Renders Google Places (New) business predictions
 * with identical loading/error/selection behavior on both surfaces.
 */
export function PlacesAutocompleteDropdown({
  suggestions,
  isLoading,
  error,
  visible,
  variant,
  showDistance = true,
  onSelect,
}: PlacesAutocompleteDropdownProps) {
  if (!visible) {
    return null;
  }

  const hasSuggestions = suggestions.length > 0;

  if (!hasSuggestions && !isLoading && !error) {
    return null;
  }

  const containerClass =
    variant === 'search'
      ? 'mt-4 rounded-[28px] border border-surface-strong bg-surface-card px-5 py-4'
      : 'mt-3 rounded-[24px] border border-brand-100 bg-brand-50 p-3';

  const headerClass =
    variant === 'search'
      ? 'text-xs font-semibold uppercase tracking-[1px] text-ink-500'
      : 'px-1 text-xs font-semibold uppercase tracking-[1px] text-brand-700';

  const rowClass =
    variant === 'search'
      ? 'rounded-2xl border border-brand-100 bg-brand-50 px-4 py-4'
      : 'rounded-2xl border border-brand-100 bg-white px-4 py-4';

  return (
    <View className={containerClass}>
      <Text className={headerClass}>Nearby businesses</Text>

      {isLoading && !hasSuggestions ? (
        <Text className="mt-3 text-sm text-ink-500">Looking up nearby places...</Text>
      ) : null}

      {error && !hasSuggestions ? (
        <Text className="mt-3 text-sm text-warning">
          {getErrorMessage(error, 'Google autocomplete is unavailable right now.')}
        </Text>
      ) : null}

      {hasSuggestions ? (
        <View className="mt-3 gap-3">
          {suggestions.map((suggestion) => {
            const distanceLabel = showDistance ? formatSearchDistance(suggestion.distance_meters) : null;

            return (
              <Pressable
                accessibilityLabel={`Business suggestion ${suggestion.text}`}
                accessibilityRole="button"
                className={rowClass}
                key={suggestion.place_id}
                onPress={() => onSelect(suggestion)}
              >
                <Text className="text-base font-semibold text-brand-700">{suggestion.primary_text}</Text>
                {suggestion.secondary_text ? (
                  <Text className="mt-1 text-sm leading-5 text-brand-700">{suggestion.secondary_text}</Text>
                ) : null}
                {distanceLabel ? (
                  <Text className="mt-2 text-xs font-medium text-brand-600">{distanceLabel}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
