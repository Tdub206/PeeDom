import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { offlineSyncController } from '@/lib/offline-sync-controller';
import { formatQueuedMutationLabel, useOfflineSyncStore } from '@/store/useOfflineSyncStore';

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'Not yet';
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return 'Not yet';
  }

  return timestamp.toLocaleString();
}

export default function SyncCenterModalScreen() {
  const [isRetrying, setIsRetrying] = useState(false);
  const isOnline = useOfflineSyncStore((state) => state.isOnline);
  const phase = useOfflineSyncStore((state) => state.phase);
  const queueSnapshot = useOfflineSyncStore((state) => state.queueSnapshot);
  const lastSyncAt = useOfflineSyncStore((state) => state.lastSyncAt);
  const lastProcessedCount = useOfflineSyncStore((state) => state.lastProcessedCount);
  const lastDroppedCount = useOfflineSyncStore((state) => state.lastDroppedCount);
  const lastWarningMessage = useOfflineSyncStore((state) => state.lastWarningMessage);

  const queuedBreakdown = useMemo(
    () =>
      Object.entries(queueSnapshot.pending_by_type).filter(
        (entry): entry is [keyof typeof queueSnapshot.pending_by_type, number] => typeof entry[1] === 'number' && entry[1] > 0
      ),
    [queueSnapshot.pending_by_type]
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
        <View className="px-6 py-8">
          <View className="rounded-[30px] bg-brand-600 px-6 py-7">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/80">Sync Center</Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">Queued and cached activity.</Text>
            <Text className="mt-3 text-base leading-6 text-white/80">
              Review what is waiting to sync, when the last replay succeeded, and whether this device is currently online.
            </Text>
          </View>

          <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Current status</Text>
            <View className="mt-4 gap-3">
              <View className="rounded-2xl bg-surface-base px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Network</Text>
                <Text className="mt-1 text-base font-bold text-ink-900">{isOnline ? 'Online' : 'Offline'}</Text>
              </View>
              <View className="rounded-2xl bg-surface-base px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Sync phase</Text>
                <Text className="mt-1 text-base font-bold capitalize text-ink-900">{phase}</Text>
              </View>
              <View className="rounded-2xl bg-surface-base px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Queued actions</Text>
                <Text className="mt-1 text-base font-bold text-ink-900">{queueSnapshot.pending_count}</Text>
                <Text className="mt-1 text-sm text-ink-600">
                  Oldest queued action: {formatTimestamp(queueSnapshot.oldest_queued_at)}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Queue breakdown</Text>
            {queuedBreakdown.length > 0 ? (
              <View className="mt-4 gap-3">
                {queuedBreakdown.map(([type, count]) => (
                  <View className="rounded-2xl bg-surface-base px-4 py-4" key={type}>
                    <Text className="text-base font-bold text-ink-900">{formatQueuedMutationLabel(type)}</Text>
                    <Text className="mt-1 text-sm text-ink-600">{count} queued</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="mt-4 rounded-2xl bg-surface-base px-4 py-4">
                <Text className="text-base font-semibold text-ink-900">Nothing queued right now</Text>
                <Text className="mt-2 text-sm leading-6 text-ink-600">
                  When you make changes offline, they will show up here with per-action counts.
                </Text>
              </View>
            )}
          </View>

          <View className="mt-6 rounded-[30px] border border-surface-strong bg-surface-card p-5">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Recent sync activity</Text>
            <View className="mt-4 gap-3">
              <View className="rounded-2xl bg-surface-base px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Last sync</Text>
                <Text className="mt-1 text-base font-bold text-ink-900">{formatTimestamp(lastSyncAt)}</Text>
              </View>
              <View className="rounded-2xl bg-surface-base px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Last replay result</Text>
                <Text className="mt-1 text-base font-bold text-ink-900">
                  {lastProcessedCount} processed · {lastDroppedCount} dropped
                </Text>
              </View>
              {lastWarningMessage ? (
                <View className="rounded-2xl border border-warning/20 bg-warning/10 px-4 py-4">
                  <Text className="text-sm font-semibold text-warning">Attention needed</Text>
                  <Text className="mt-2 text-sm leading-6 text-warning">{lastWarningMessage}</Text>
                </View>
              ) : null}
            </View>
            <Button
              className="mt-5"
              label={isRetrying ? 'Retrying Sync...' : 'Retry Sync Now'}
              loading={isRetrying}
              onPress={() => {
                void (async () => {
                  setIsRetrying(true);

                  try {
                    await offlineSyncController.runNow();
                  } finally {
                    setIsRetrying(false);
                  }
                })();
              }}
              variant="secondary"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
