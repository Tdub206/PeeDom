import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchBathroomDetailById, PublicBathroomDetailRow } from '@/api/bathrooms';
import { Button } from '@/components/Button';
import { LoadingScreen } from '@/components/LoadingScreen';
import { routes } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { pushSafely, replaceSafely } from '@/lib/navigation';
import { getErrorMessage } from '@/utils/errorMap';

type HoursEntry = { open: string; close: string };

function formatAddress(detail: PublicBathroomDetailRow): string {
  return [
    detail.address_line1,
    [detail.city, detail.state].filter(Boolean).join(', '),
    detail.postal_code,
    detail.country_code,
  ]
    .filter(Boolean)
    .join(' ');
}

function formatHours(hoursJson: PublicBathroomDetailRow['hours_json']): string[] {
  if (!hoursJson || typeof hoursJson !== 'object' || Array.isArray(hoursJson)) {
    return [];
  }

  return Object.entries(hoursJson).flatMap(([day, hours]) => {
    if (!Array.isArray(hours)) {
      return [];
    }

    const validRanges = hours.filter(
      (entry): entry is HoursEntry =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        typeof (entry as HoursEntry).open === 'string' &&
        typeof (entry as HoursEntry).close === 'string'
    );

    if (!validRanges.length) {
      return [];
    }

    return `${day}: ${validRanges.map((entry) => `${entry.open} - ${entry.close}`).join(', ')}`;
  });
}

export default function BathroomDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const { showToast } = useToast();
  const [bathroomDetail, setBathroomDetail] = useState<PublicBathroomDetailRow | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const bathroomId = useMemo(() => {
    if (Array.isArray(id)) {
      return id[0] ?? '';
    }

    return id ?? '';
  }, [id]);

  const address = useMemo(
    () => (bathroomDetail ? formatAddress(bathroomDetail) : 'Address unavailable'),
    [bathroomDetail]
  );
  const hours = useMemo(
    () => (bathroomDetail ? formatHours(bathroomDetail.hours_json) : []),
    [bathroomDetail]
  );

  const loadBathroomDetail = useCallback(async () => {
    if (!bathroomId) {
      const message = 'The bathroom identifier was missing from the route.';
      setErrorMessage(message);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await fetchBathroomDetailById(bathroomId);

      if (result.error || !result.data) {
        const message = getErrorMessage(result.error, 'Unable to load bathroom details right now.');
        setBathroomDetail(null);
        setErrorMessage(message);
        showToast({
          title: 'Detail unavailable',
          message,
          variant: 'error',
        });
        return;
      }

      setBathroomDetail(result.data);
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load bathroom details right now.');
      setBathroomDetail(null);
      setErrorMessage(message);
      showToast({
        title: 'Detail unavailable',
        message,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [bathroomId, showToast]);

  useEffect(() => {
    void loadBathroomDetail();
  }, [loadBathroomDetail]);

  if (isLoading) {
    return <LoadingScreen message="Loading this bathroom and its latest code summary." />;
  }

  if (!bathroomDetail) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base">
        <View className="flex-1 justify-center px-6 py-10">
          <View className="rounded-[28px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-3xl font-black text-ink-900">Bathroom detail unavailable</Text>
            <Text className="mt-3 text-base leading-6 text-ink-600">
              {errorMessage || 'We could not retrieve this bathroom right now.'}
            </Text>
            <Button
              className="mt-6"
              label="Try Again"
              onPress={() => {
                void loadBathroomDetail();
              }}
            />
            <Button
              className="mt-3"
              label="Back To Map"
              onPress={() => replaceSafely(router, routes.tabs.map, routes.tabs.map)}
              variant="secondary"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['bottom']}>
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
        <View className="px-6 py-8">
          <View className="rounded-[32px] bg-brand-600 px-6 py-8">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/80">Bathroom Detail</Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">{bathroomDetail.place_name}</Text>
            <Text className="mt-3 text-base leading-6 text-white/80">{address}</Text>
          </View>

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Access Summary</Text>
            <Text className="mt-3 text-2xl font-bold text-ink-900">
              {bathroomDetail.code_id ? 'Code submitted' : 'No code submitted yet'}
            </Text>
            <Text className="mt-2 text-base leading-6 text-ink-600">
              {bathroomDetail.code_id
                ? `Community confidence: ${bathroomDetail.confidence_score ?? 0}%`
                : 'This location is visible publicly, but nobody has submitted a verified code yet.'}
            </Text>

            {bathroomDetail.code_id ? (
              <View className="mt-4 gap-2 rounded-2xl bg-surface-muted px-4 py-4">
                <Text className="text-sm font-medium text-ink-700">
                  Up votes: {bathroomDetail.up_votes ?? 0} | Down votes: {bathroomDetail.down_votes ?? 0}
                </Text>
                <Text className="text-sm text-ink-600">
                  Last verified:{' '}
                  {bathroomDetail.last_verified_at
                    ? new Date(bathroomDetail.last_verified_at).toLocaleString()
                    : 'Not yet verified'}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Facility Notes</Text>
            <View className="mt-4 gap-3">
              <View className="rounded-2xl bg-surface-muted px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Locked</Text>
                <Text className="mt-1 text-base text-ink-900">
                  {bathroomDetail.is_locked ? 'Yes' : 'No or not reported'}
                </Text>
              </View>
              <View className="rounded-2xl bg-surface-muted px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Accessible</Text>
                <Text className="mt-1 text-base text-ink-900">
                  {bathroomDetail.is_accessible ? 'Accessibility information available' : 'Not reported'}
                </Text>
              </View>
              <View className="rounded-2xl bg-surface-muted px-4 py-4">
                <Text className="text-sm font-semibold text-ink-700">Customer only</Text>
                <Text className="mt-1 text-base text-ink-900">
                  {bathroomDetail.is_customer_only ? 'Yes' : 'Open to the public'}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Hours</Text>
            {hours.length ? (
              <View className="mt-4 gap-2">
                {hours.map((line) => (
                  <Text className="text-base text-ink-700" key={line}>
                    {line}
                  </Text>
                ))}
              </View>
            ) : (
              <Text className="mt-4 text-base leading-6 text-ink-600">
                Hours have not been reported for this bathroom yet.
              </Text>
            )}
          </View>

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Community Actions</Text>
            <Text className="mt-3 text-base leading-6 text-ink-600">
              Notice a problem at this location? Submit a report so we can protect map quality.
            </Text>
            <Button
              className="mt-4"
              label="Report An Issue"
              onPress={() =>
                pushSafely(
                  router,
                  routes.modal.reportBathroom(bathroomDetail.id),
                  routes.bathroomDetail(bathroomDetail.id)
                )
              }
              variant="destructive"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
