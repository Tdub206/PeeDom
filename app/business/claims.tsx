import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import {
  BusinessScreenLayout,
  BusinessSectionHeader,
  QuickStatTile,
} from '@/components/business';
import { LoadingScreen } from '@/components/LoadingScreen';
import { routes } from '@/constants/routes';
import { useBusinessClaims } from '@/hooks/useBusinessClaims';
import { pushSafely } from '@/lib/navigation';
import type { BusinessClaimListItem, BusinessClaimStatus } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

const STATUS_META: Record<
  BusinessClaimStatus,
  {
    label: string;
    chipBg: string;
    chipText: string;
    body: string;
  }
> = {
  pending: {
    label: 'Pending review',
    chipBg: 'bg-warning/15',
    chipText: 'text-warning',
    body: 'Your ownership claim is queued for moderator review. Analytics unlock as soon as this location is approved.',
  },
  approved: {
    label: 'Approved',
    chipBg: 'bg-success/15',
    chipText: 'text-success',
    body: 'This location is approved and now part of your business dashboard.',
  },
  rejected: {
    label: 'Needs changes',
    chipBg: 'bg-danger/15',
    chipText: 'text-danger',
    body: 'This claim was rejected. Review the details, gather stronger evidence, and resubmit.',
  },
};

function formatClaimDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ClaimRow({
  claim,
  onOpenBathroom,
  onResubmit,
}: {
  claim: BusinessClaimListItem;
  onOpenBathroom: (bathroomId: string) => void;
  onResubmit: (bathroomId: string) => void;
}) {
  const meta = STATUS_META[claim.review_status];
  return (
    <View className="rounded-[24px] border border-surface-strong bg-surface-card p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
            {formatClaimDate(claim.created_at)}
          </Text>
          <Text className="mt-1 text-xl font-black tracking-tight text-ink-900">
            {claim.business_name}
          </Text>
          <Text className="mt-1 text-sm text-ink-600">
            {claim.bathroom?.place_name ?? 'Bathroom details unavailable'}
          </Text>
        </View>
        <View className={['rounded-full px-3 py-1.5', meta.chipBg].join(' ')}>
          <Text
            className={[
              'text-[11px] font-bold uppercase tracking-[1px]',
              meta.chipText,
            ].join(' ')}
          >
            {meta.label}
          </Text>
        </View>
      </View>

      <Text className="mt-3 text-sm leading-5 text-ink-600">{meta.body}</Text>

      {claim.is_lifetime_free ? (
        <View className="mt-3 self-start rounded-full bg-success/10 px-3 py-1.5">
          <Text className="text-[11px] font-bold uppercase text-success">Lifetime Free</Text>
        </View>
      ) : null}

      <View className="mt-4 gap-2">
        <Button
          label="Open bathroom"
          onPress={() => onOpenBathroom(claim.bathroom_id)}
          variant="secondary"
        />
        {claim.review_status === 'rejected' ? (
          <Button label="Resubmit claim" onPress={() => onResubmit(claim.bathroom_id)} />
        ) : null}
      </View>
    </View>
  );
}

export default function BusinessClaimsScreen() {
  const router = useRouter();
  const { claims, counts, error, isFetching, isLoading, refetch } = useBusinessClaims();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(routes.tabs.business);
  }, [router]);

  const handleOpenBathroom = useCallback(
    (bathroomId: string) => {
      pushSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.business);
    },
    [router]
  );

  const handleResubmit = useCallback(
    (bathroomId: string) => {
      pushSafely(router, routes.modal.claimBusinessBathroom(bathroomId), routes.tabs.business);
    },
    [router]
  );

  if (isLoading) {
    return <LoadingScreen message="Loading claims." />;
  }

  return (
    <BusinessScreenLayout
      eyebrow="Ownership"
      title="Claim history"
      subtitle="Track every business ownership claim you have submitted."
      iconName="document-text"
      onBack={handleBack}
      isRefreshing={isFetching}
      onRefresh={() => void refetch()}
    >
      {error ? (
        <View className="rounded-[24px] border border-danger/20 bg-danger/10 p-5">
          <Text className="text-lg font-bold text-danger">Could not load claims</Text>
          <Text className="mt-2 text-sm leading-6 text-danger">
            {getErrorMessage(error, 'We could not load your ownership claims right now.')}
          </Text>
          <Button className="mt-4" label="Try Again" onPress={() => void refetch()} />
        </View>
      ) : null}

      <View className="flex-row gap-3">
        <QuickStatTile label="Pending" tone="warning" value={counts.pending} />
        <QuickStatTile label="Approved" tone="success" value={counts.approved} />
        <QuickStatTile label="Rejected" tone="danger" value={counts.rejected} />
      </View>

      <View>
        <BusinessSectionHeader
          eyebrow={`${claims.length} total`}
          title="All claims"
          iconName="list"
        />
        {claims.length > 0 ? (
          <View className="gap-3">
            {claims.map((claim) => (
              <ClaimRow
                claim={claim}
                key={claim.id}
                onOpenBathroom={handleOpenBathroom}
                onResubmit={handleResubmit}
              />
            ))}
          </View>
        ) : (
          <View className="rounded-[24px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-lg font-bold text-ink-900">No claims submitted</Text>
            <Text className="mt-2 text-sm leading-6 text-ink-600">
              Open a bathroom from the map and submit an ownership claim to start managing it.
            </Text>
            <Button
              className="mt-5"
              label="Browse bathrooms"
              onPress={() => pushSafely(router, routes.tabs.map, routes.tabs.map)}
              variant="secondary"
            />
          </View>
        )}
      </View>
    </BusinessScreenLayout>
  );
}
