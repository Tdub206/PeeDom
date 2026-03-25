import { memo } from 'react';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { SearchHistoryItem } from '@/types';

interface RecentSearchesProps {
  history: SearchHistoryItem[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
}

function RecentSearchesComponent({
  history,
  onSelect,
  onRemove,
  onClear,
}: RecentSearchesProps) {
  if (!history.length) {
    return null;
  }

  return (
    <View className="mt-4 rounded-[28px] border border-surface-strong bg-surface-card px-5 py-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Recent searches</Text>
        <Pressable accessibilityRole="button" onPress={onClear}>
          <Text className="text-sm font-semibold text-brand-700">Clear</Text>
        </Pressable>
      </View>

      <View className="mt-4 gap-3">
        {history.map((historyItem) => (
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-2xl bg-surface-base px-4 py-3"
            key={`${historyItem.query}-${historyItem.searched_at}`}
            onPress={() => onSelect(historyItem.query)}
          >
            <Ionicons color={colors.ink[500]} name="time-outline" size={18} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-ink-800">{historyItem.query}</Text>
              {typeof historyItem.result_count === 'number' ? (
                <Text className="mt-1 text-xs text-ink-500">
                  {historyItem.result_count} result{historyItem.result_count === 1 ? '' : 's'}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel={`Remove ${historyItem.query} from recent searches`}
              accessibilityRole="button"
              className="h-8 w-8 items-center justify-center rounded-full bg-surface-muted"
              onPress={(event: GestureResponderEvent) => {
                event.stopPropagation();
                onRemove(historyItem.query);
              }}
            >
              <Ionicons color={colors.ink[600]} name="close-outline" size={16} />
            </Pressable>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const RecentSearches = memo(RecentSearchesComponent);
