import { memo } from 'react';
import { ActivityIndicator, Pressable, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

interface SearchBarProps extends Pick<TextInputProps, 'onSubmitEditing'> {
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
  isLoading?: boolean;
}

function SearchBarComponent({
  value,
  onChangeText,
  onClear,
  onSubmitEditing,
  isLoading = false,
}: SearchBarProps) {
  return (
    <View
      accessibilityRole="search"
      className="rounded-[28px] border border-surface-strong bg-surface-card px-4 py-3"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-50">
          {isLoading ? (
            <ActivityIndicator color={colors.brand[600]} size="small" />
          ) : (
            <Ionicons color={colors.brand[600]} name="search-outline" size={20} />
          )}
        </View>

        <TextInput
          accessibilityHint="Type a bathroom, address, city, or postal code and submit to search."
          accessibilityLabel="Search bathrooms"
          autoCapitalize="none"
          autoCorrect={false}
          className="flex-1 py-2 text-base text-ink-900"
          maxLength={200}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          placeholder="Coffee shop, station, neighborhood..."
          placeholderTextColor={colors.ink[400]}
          returnKeyType="search"
          value={value}
        />

        {value.length > 0 ? (
          <Pressable
            accessibilityLabel="Clear search query"
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
            onPress={onClear}
          >
            <Ionicons color={colors.ink[600]} name="close-outline" size={20} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const SearchBar = memo(SearchBarComponent);
