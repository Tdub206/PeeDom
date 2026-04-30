import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AccessibilitySummaryCard } from '@/components/accessibility/AccessibilitySummaryCard';
import { BathroomOriginBadge } from '@/components/BathroomOriginBadge';
import { Button } from '@/components/Button';
import { ImportedBathroomReviewCard } from '@/components/ImportedBathroomReviewCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { useSourceCandidateDetail } from '@/hooks/useSourceCandidateDetail';
import { useSourceRecordVerification } from '@/hooks/useSourceRecordVerification';
import { useToast } from '@/hooks/useToast';
import { openDirectionsInMaps } from '@/lib/map-navigation';
import { pushSafely } from '@/lib/navigation';
import { getErrorMessage } from '@/utils/errorMap';

type HoursEntry = { open: string; close: string };

function formatAddress(address: {
  line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string;
}): string {
  return [
    address.line1,
    [address.city, address.state].filter(Boolean).join(', '),
    address.postal_code,
    address.country_code,
  ]
    .filter(Boolean)
    .join(' ');
}

function formatHours(hours: Record<string, HoursEntry[]> | null): string[] {
  if (!hours || typeof hours !== 'object' || Array.isArray(hours)) {
    return [];
  }

  return Object.entries(hours).flatMap(([day, entries]) => {
    if (!Array.isArray(entries) || !entries.length) {
      return [];
    }

    return `${day}: ${entries.map((entry) => `${entry.open} - ${entry.close}`).join(', ')}`;
  });
}

function formatSourceUpdatedAt(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toLocaleString();
}

export default function SourceCandidateDetailScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const [isOpeningDirections, setIsOpeningDirections] = useState(false);

  const sourceRecordId = useMemo(() => {
    if (Array.isArray(id)) {
      return id[0] ?? '';
    }

    return id ?? '';
  }, [id]);

  const {
    data: candidateDetail,
    error,
    isLoading,
    refetch,
  } = useSourceCandidateDetail(sourceRecordId || null);
  const {
    isSubmittingVerification,
    submitVerification,
  } = useSourceRecordVerification(sourceRecordId || null);

  const address = useMemo(
    () => (candidateDetail ? formatAddress(candidateDetail.address) : 'Address unavailable'),
    [candidateDetail]
  );
  const hours = useMemo(
    () => (candidateDetail ? formatHours(candidateDetail.hours) : []),
    [candidateDetail]
  );
  const formattedSourceUpdatedAt = useMemo(
    () => formatSourceUpdatedAt(candidateDetail?.source_updated_at),
    [candidateDetail?.source_updated_at]
  );
  const badgeLabel = candidateDetail?.origin_label ?? 'Imported Candidate';
  const promotionHint =
    'Two distinct positive user verifications are required before this becomes a permanent StallPass bathroom.';

  const handleOpenDirections = useCallback(async () => {
    if (!candidateDetail) {
      return;
    }

    setIsOpeningDirections(true);

    try {
      await openDirectionsInMaps({
        placeName: candidateDetail.place_name,
        coordinates: candidateDetail.coordinates,
        address: candidateDetail.address,
      });
    } catch (error) {
      showToast({
        title: 'Navigation unavailable',
        message: getErrorMessage(error, 'We could not open navigation right now.'),
        variant: 'error',
      });
    } finally {
      setIsOpeningDirections(false);
    }
  }, [candidateDetail, showToast]);

  const handleVerification = useCallback(
    async (locationExists: boolean) => {
      try {
        await submitVerification(locationExists);
      } catch (_error) {
        // The hook already shows a user-facing toast.
      }
    },
    [submitVerification]
  );

  if (isLoading) {
    return <LoadingScreen message="Loading source candidate details." />;
  }

  if (!candidateDetail) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['left', 'right']}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-full rounded-[32px] border border-danger/20 bg-danger/10 px-6 py-6">
            <Text className="text-lg font-bold text-danger">Candidate unavailable</Text>
            <Text className="mt-2 text-sm leading-6 text-danger">
              {getErrorMessage(error, 'We could not load this source candidate right now.')}
            </Text>
          </View>

          <View className="mt-5 w-full gap-3">
            <Button
              label="Retry"
              onPress={() => {
                void refetch();
              }}
            />
            <Button
              label="Back to map"
              variant="secondary"
              onPress={() => pushSafely(router, routes.tabs.map, routes.tabs.map)}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="rounded-[32px] bg-ink-900 px-5 py-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/70">Source candidate</Text>
              <Text className="mt-2 text-3xl font-black tracking-tight text-white">{candidateDetail.place_name}</Text>
              <Text className="mt-3 text-sm leading-6 text-white/80">{address}</Text>
            </View>
            <BathroomOriginBadge label={badgeLabel} />
          </View>

          <View className="mt-5 rounded-[24px] bg-white/10 px-4 py-4">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/70">Attribution</Text>
            <Text className="mt-2 text-base font-bold text-white">
              {candidateDetail.origin_attribution_short ?? 'Public dataset'}
            </Text>
            {candidateDetail.source_dataset ? (
              <Text className="mt-1 text-sm leading-5 text-white/80">{candidateDetail.source_dataset}</Text>
            ) : null}
            {candidateDetail.source_license_key ? (
              <Text className="mt-2 text-xs font-semibold uppercase tracking-[1px] text-white/70">
                License: {candidateDetail.source_license_key}
              </Text>
            ) : null}
            {formattedSourceUpdatedAt ? (
              <Text className="mt-2 text-sm leading-5 text-white/80">Source updated: {formattedSourceUpdatedAt}</Text>
            ) : null}
          </View>
        </View>

        <View className="mt-4 rounded-[28px] border border-surface-strong bg-surface-card px-5 py-5">
          <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Candidate actions</Text>
          <Text className="mt-3 text-xl font-black text-ink-900">Navigate and verify</Text>
          <Text className="mt-2 text-sm leading-6 text-ink-600">
            Source candidates do not support favorites, codes, or business claims yet. They only exist so the community can verify whether the restroom is still real.
          </Text>

          <View className="mt-5 gap-3">
            <Button
              label={isOpeningDirections ? 'Opening maps...' : 'Navigate here'}
              loading={isOpeningDirections}
              onPress={() => {
                void handleOpenDirections();
              }}
            />
            {candidateDetail.canonical_bathroom_id ? (
              <Button
                label="Open linked bathroom"
                variant="secondary"
                onPress={() =>
                  pushSafely(
                    router,
                    routes.bathroomDetail(candidateDetail.canonical_bathroom_id as string),
                    routes.tabs.map
                  )
                }
              />
            ) : null}
          </View>
        </View>

        {hours.length > 0 ? (
          <View className="mt-4 rounded-[28px] border border-surface-strong bg-surface-card px-5 py-5">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Reported hours</Text>
            <View className="mt-4 gap-2">
              {hours.map((line) => (
                <Text className="text-sm leading-6 text-ink-700" key={line}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        <AccessibilitySummaryCard
          accessibilityFeatures={candidateDetail.accessibility_features}
          accessibilityScore={candidateDetail.accessibility_score}
          isAccessible={candidateDetail.flags.is_accessible}
          title="Accessibility details"
        />

        <ImportedBathroomReviewCard
          badgeLabel={badgeLabel}
          confirmationCount={candidateDetail.source_confirmation_count}
          denialCount={candidateDetail.source_denial_count}
          freshnessStatus={candidateDetail.source_freshness_status}
          isConfirmingCurrent={isSubmittingVerification}
          isReportingMissing={isSubmittingVerification}
          lastVerifiedAt={candidateDetail.source_last_verified_at}
          onConfirmCurrent={() => {
            void handleVerification(true);
          }}
          onReportMissing={() => {
            void handleVerification(false);
          }}
          promotionHint={promotionHint}
          title="Candidate verification"
        />

        <View className="mt-4 rounded-[28px] border border-surface-strong bg-surface-card px-5 py-5">
          <View className="flex-row items-start gap-3">
            <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-2xl bg-brand-50">
              <Ionicons color={colors.brand[600]} name="information-circle-outline" size={22} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-ink-900">Why this looks different</Text>
              <Text className="mt-2 text-sm leading-6 text-ink-600">
                This location has not been promoted into the permanent StallPass bathroom directory yet. It stays source-separated until the community verifies it.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
