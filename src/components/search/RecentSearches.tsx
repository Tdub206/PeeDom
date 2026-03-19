import { memo } from 'react';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
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
            <Text className="text-lg">🕘</Text>
            <Text className="flex-1 text-sm font-semibold text-ink-800">{historyItem.query}</Text>
            <Pressable
              accessibilityLabel={`Remove ${historyItem.query} from recent searches`}
              accessibilityRole="button"
              className="h-8 w-8 items-center justify-center rounded-full bg-surface-muted"
              onPress={(event: GestureResponderEvent) => {
                event.stopPropagation();
                onRemove(historyItem.query);
              }}
            >
              <Text className="text-sm font-bold text-ink-600">×</Text>
            </Pressable>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const RecentSearches = memo(RecentSearchesComponent);
