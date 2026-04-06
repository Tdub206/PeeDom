import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { fetchLatestVisibleBathroomCode } from '@/api/access-codes';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useNearbyBathrooms } from '@/hooks/useNearbyBathrooms';
import { useRewardedCodeUnlock } from '@/hooks/useRewardedCodeUnlock';
import type { BathroomFilters, BathroomListItem, BathroomRecommendation } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

interface NearbyBathroomsPanelProps {
  filters: BathroomFilters;
  onNavigate: (bathroom: BathroomListItem) => void;
  onOpenBathroomDetail: (bathroomId: string) => void;
}

function formatDistance(distanceMeters?: number): string {
  if (typeof distanceMeters !== 'number' || Number.isNaN(distanceMeters)) {
    return 'Distance unavailable';
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m away`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km away`;
}

function LockedBathroomCard({
  bathroom,
  onNavigate,
  onOpenBathroomDetail,
}: {
  bathroom: BathroomListItem;
  onNavigate: (bathroom: BathroomListItem) => void;
  onOpenBathroomDetail: (bathroomId: string) => void;
}) {
  const { user } = useAuth();
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [codeIssue, setCodeIssue] = useState<string | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const {
    hasUnlock,
    isAdUnlockAvailable,
    isUnlocking,
    unlockIssue,
    unlockWithAd,
  } = useRewardedCodeUnlock({
    bathroomId: bathroom.id,
    userId: user?.id ?? null,
  });

  useEffect(() => {
    let isMounted = true;

    const loadVisibleCode = async () => {
      if (!bathroom.primary_code_summary.has_code || !hasUnlock) {
        if (isMounted) {
          setRevealedCode(null);
          setCodeIssue(null);
        }
        return;
      }

      setIsLoadingCode(true);

      try {
        const result = await fetchLatestVisibleBathroomCode(bathroom.id);

        if (!isMounted) {
          return;
        }

        if (result.error) {
          setRevealedCode(null);
          setCodeIssue(getErrorMessage(result.error, 'Unable to load the current bathroom code right now.'));
          return;
        }

        if (!result.data?.code_value?.trim()) {
          setRevealedCode(null);
          setCodeIssue('No verified code is available for this bathroom right now.');
          return;
        }

        setRevealedCode(result.data.code_value.trim());
        setCodeIssue(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRevealedCode(null);
        setCodeIssue(getErrorMessage(error, 'Unable to load the current bathroom code right now.'));
      } finally {
        if (isMounted) {
          setIsLoadingCode(false);
        }
      }
    };

    void loadVisibleCode();

    return () => {
      isMounted = false;
    };
  }, [bathroom.id, bathroom.primary_code_summary.has_code, hasUnlock]);

  const canUnlockWithAd = bathroom.primary_code_summary.has_code && !hasUnlock && isAdUnlockAvailable;
  const codeStatusCopy = useMemo(() => {
    if (!bathroom.primary_code_summary.has_code) {
      return 'No community code submitted yet.';
    }

    if (revealedCode) {
      return 'Code unlocked for your account.';
    }

    if (hasUnlock && isLoadingCode) {
      return 'Loading your unlocked code…';
    }

    if (hasUnlock) {
      return codeIssue ?? 'Code access granted.';
    }

    if (canUnlockWithAd) {
      return 'Rewarded unlock available.';
    }

    return unlockIssue ?? 'Open details to check access options.';
  }, [bathroom.primary_code_summary.has_code, canUnlockWithAd, codeIssue, hasUnlock, isLoadingCode, revealedCode, unlockIssue]);

  return (
    <View className="rounded-3xl border border-surface-strong bg-surface-base px-4 py-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-ink-900">{bathroom.place_name}</Text>
          <Text className="mt-1 text-sm text-ink-600">{bathroom.address}</Text>
          <Text className="mt-2 text-sm font-semibold text-brand-700">{formatDistance(bathroom.distance_meters)}</Text>
        </View>
        <View className="rounded-full bg-warning/10 px-3 py-2">
          <Text className="text-xs font-black uppercase tracking-[1px] text-warning">Locked</Text>
        </View>
      </View>

      <Text className="mt-3 text-sm leading-5 text-ink-600">{codeStatusCopy}</Text>

      {revealedCode ? (
        <View className="mt-3 rounded-2xl bg-warning/10 px-4 py-4">
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-warning">Access Code</Text>
          <Text className="mt-2 text-2xl font-black tracking-[4px] text-ink-900">{revealedCode}</Text>
        </View>
      ) : null}

      <View className="mt-4 gap-3">
        {canUnlockWithAd ? (
          <Button
            label="Watch Ad To Unlock Code"
            loading={isUnlocking}
            onPress={() => {
              void unlockWithAd();
            }}
          />
        ) : null}
        <Button
          label="Open Details"
          onPress={() => onOpenBathroomDetail(bathroom.id)}
          variant="secondary"
        />
        <Button
          label="Navigate"
          onPress={() => onNavigate(bathroom)}
          variant="ghost"
        />
      </View>
    </View>
  );
}

function RecommendationCard({
  recommendation,
  onNavigate,
  onOpenBathroomDetail,
}: {
  recommendation: BathroomRecommendation;
  onNavigate: (bathroom: BathroomListItem) => void;
  onOpenBathroomDetail: (bathroomId: string) => void;
}) {
  if (!recommendation.bathroom) {
    return (
      <View className="rounded-3xl bg-surface-base px-4 py-4">
        <Text className="text-sm font-semibold text-ink-900">{recommendation.title}</Text>
        <Text className="mt-2 text-sm leading-5 text-ink-600">{recommendation.rationale}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-3xl border border-brand-100 bg-brand-50 px-4 py-4">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-brand-700">{recommendation.title}</Text>
      <Text className="mt-2 text-base font-bold text-ink-900">{recommendation.bathroom.place_name}</Text>
      <Text className="mt-1 text-sm text-ink-600">{formatDistance(recommendation.bathroom.distance_meters)}</Text>
      <Text className="mt-2 text-sm leading-5 text-brand-700">{recommendation.rationale}</Text>
      <View className="mt-4 gap-3">
        <Button label="Navigate" onPress={() => onNavigate(recommendation.bathroom as BathroomListItem)} />
        <Button
          label="Open Details"
          onPress={() => onOpenBathroomDetail((recommendation.bathroom as BathroomListItem).id)}
          variant="secondary"
        />
      </View>
    </View>
  );
}

function NearbyBathroomsPanelComponent({
  filters,
  onNavigate,
  onOpenBathroomDetail,
}: NearbyBathroomsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const {
    data,
    error,
    isFetching,
    isLoading,
    permission_status,
    refreshLocation,
    refetch,
    requestPermission,
  } = useNearbyBathrooms({
    filters,
  });

  const lockedCount = data?.lockedBathrooms.length ?? 0;
  const nearestBathroom = data?.nearestOpenUnlocked ?? null;
  const recommendations = data?.recommendations ?? [];
  const headerSummary = nearestBathroom
    ? `${nearestBathroom.place_name} is the closest open restroom right now.`
    : lockedCount > 0
      ? `${lockedCount} locked bathroom${lockedCount === 1 ? '' : 's'} nearby.`
      : 'No nearby highlights yet.';

  const handleRefresh = useCallback(async () => {
    await refreshLocation();
    await refetch();
  }, [refetch, refreshLocation]);

  if (permission_status !== 'granted') {
    return (
      <View className="mt-4 rounded-[28px] border border-surface-strong bg-surface-card px-5 py-5">
        <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Nearby Right Now</Text>
        <Text className="mt-2 text-base leading-6 text-ink-600">
          Enable location to surface the closest open restroom and any locked options nearby.
        </Text>
        <Button
          className="mt-4"
          label="Enable Location"
          onPress={() => {
            void requestPermission();
          }}
        />
      </View>
    );
  }

  return (
    <View className="mt-4 rounded-[28px] border border-surface-strong bg-surface-card px-5 py-5">
      <Pressable
        accessibilityRole="button"
        className="flex-row items-center justify-between gap-3"
        onPress={() => setIsExpanded((currentValue) => !currentValue)}
      >
        <View className="flex-1">
          <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Nearby Right Now</Text>
          <Text className="mt-2 text-base font-bold text-ink-900">{headerSummary}</Text>
        </View>
        <View className="flex-row items-center gap-3">
          {isFetching ? <ActivityIndicator size="small" /> : null}
          <Ionicons color="#111827" name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} />
        </View>
      </Pressable>

      {isExpanded ? (
        <View className="mt-4 gap-4">
          {isLoading ? (
            <View className="items-center justify-center rounded-3xl bg-surface-base px-4 py-8">
              <ActivityIndicator size="small" />
              <Text className="mt-3 text-sm leading-5 text-ink-600">Finding nearby bathrooms around your live location.</Text>
            </View>
          ) : error ? (
            <View className="rounded-3xl border border-danger/20 bg-danger/10 px-4 py-4">
              <Text className="text-sm font-semibold text-danger">Nearby bathrooms unavailable</Text>
              <Text className="mt-2 text-sm leading-5 text-danger">
                {getErrorMessage(error, 'We could not refresh nearby highlights right now.')}
              </Text>
              <Button
                className="mt-4"
                label="Try Again"
                onPress={() => {
                  void handleRefresh();
                }}
                variant="secondary"
              />
            </View>
          ) : (
            <>
              {recommendations.length > 0 ? (
                <View className="gap-3">
                  <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Best options right now</Text>
                  {recommendations.map((recommendation) => (
                    <RecommendationCard
                      key={recommendation.scenario}
                      onNavigate={onNavigate}
                      onOpenBathroomDetail={onOpenBathroomDetail}
                      recommendation={recommendation}
                    />
                  ))}
                </View>
              ) : null}

              {nearestBathroom ? (
                <View className="rounded-3xl border border-success/20 bg-success/10 px-4 py-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-ink-900">{nearestBathroom.place_name}</Text>
                      <Text className="mt-1 text-sm text-ink-600">{nearestBathroom.address}</Text>
                      <Text className="mt-2 text-sm font-semibold text-success">{formatDistance(nearestBathroom.distance_meters)}</Text>
                    </View>
                    <View className="rounded-full bg-success px-3 py-2">
                      <Text className="text-xs font-black uppercase tracking-[1px] text-white">Open now</Text>
                    </View>
                  </View>

                  <View className="mt-4 gap-3">
                    <Button label="Navigate" onPress={() => onNavigate(nearestBathroom)} />
                    <Button
                      label="Open Details"
                      onPress={() => onOpenBathroomDetail(nearestBathroom.id)}
                      variant="secondary"
                    />
                  </View>
                </View>
              ) : (
                <View className="rounded-3xl bg-surface-base px-4 py-4">
                  <Text className="text-base font-semibold text-ink-900">No open unlocked bathroom found right now</Text>
                  <Text className="mt-2 text-sm leading-5 text-ink-600">
                    The locked options below may still be usable if you already have access or unlock a code.
                  </Text>
                </View>
              )}

              {lockedCount > 0 ? (
                <View className="gap-3">
                  <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Locked Nearby</Text>
                  {data?.lockedBathrooms.map((bathroom) => (
                    <LockedBathroomCard
                      bathroom={bathroom}
                      key={bathroom.id}
                      onNavigate={onNavigate}
                      onOpenBathroomDetail={onOpenBathroomDetail}
                    />
                  ))}
                </View>
              ) : null}

              <Button
                label="Refresh Nearby"
                onPress={() => {
                  void handleRefresh();
                }}
                variant="ghost"
              />
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

export const NearbyBathroomsPanel = memo(NearbyBathroomsPanelComponent);
