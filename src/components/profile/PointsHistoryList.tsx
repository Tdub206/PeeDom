import { memo } from 'react';
import { Text, View } from 'react-native';
import { getPointEventLabel } from '@/lib/gamification';
import { DbPointEvent } from '@/types';
import { getPointEventDateLabel, getPointEventValue } from '@/utils/profile';

interface PointsHistoryListProps {
  error: string | null;
  events: DbPointEvent[];
  isLoading: boolean;
}

function PointsHistoryListComponent({ error, events, isLoading }: PointsHistoryListProps) {
  return (
    <View className="rounded-[32px] border border-surface-strong bg-surface-card px-5 py-6">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Recent activity</Text>

      {error ? <Text className="mt-4 text-sm leading-6 text-warning">{error}</Text> : null}

      {isLoading ? (
        <Text className="mt-4 text-sm leading-6 text-ink-600">Loading recent point events...</Text>
      ) : events.length ? (
        <View className="mt-5 gap-3">
          {events.slice(0, 20).map((event) => (
            <View className="rounded-[22px] bg-surface-base px-4 py-4" key={event.id}>
              <View className="flex-row items-center justify-between gap-4">
                <Text className="flex-1 text-base font-bold text-ink-900">{getPointEventLabel(event.event_type)}</Text>
                <Text className={event.points_awarded >= 0 ? 'text-base font-black text-success' : 'text-base font-black text-danger'}>
                  {getPointEventValue(event)}
                </Text>
              </View>
              <Text className="mt-2 text-sm text-ink-500">{getPointEventDateLabel(event.created_at)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="mt-4 text-sm leading-6 text-ink-600">
          Your point history will appear here after your next contribution.
        </Text>
      )}
    </View>
  );
}

export const PointsHistoryList = memo(PointsHistoryListComponent);
