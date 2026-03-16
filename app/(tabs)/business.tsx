import { useCallback, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { LoadingScreen } from '@/components/LoadingScreen';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessClaims } from '@/hooks/useBusinessClaims';
import { pushSafely } from '@/lib/navigation';
import { BusinessClaimListItem, BusinessClaimStatus } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

const STATUS_META: Record<
  BusinessClaimStatus,
  {
    label: string;
    badgeClassName: string;
    badgeLabelClassName: string;
    body: string;
  }
> = {
  pending: {
    label: 'Pending review',
    badgeClassName: 'border border-warning/20 bg-warning/10',
    badgeLabelClassName: 'text-warning',
    body: 'Your ownership claim is queued for moderator review. We will update the status here once it changes.',
  },
  approved: {
    label: 'Approved',
    badgeClassName: 'border border-success/20 bg-success/10',
    badgeLabelClassName: 'text-success',
    body: 'This claim is approved. Business-account tooling can now build on this verified location history.',
  },
  rejected: {
    label: 'Needs changes',
    badgeClassName: 'border border-danger/20 bg-danger/10',
    badgeLabelClassName: 'text-danger',
    body: 'This claim was rejected. Review the details, gather stronger evidence, and resubmit when ready.',
  },
};

function formatClaimDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-surface-strong bg-surface-base px-4 py-4">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">{label}</Text>
      <Text className="mt-2 text-3xl font-black tracking-tight text-ink-900">{value}</Text>
    </View>
  );
}

function ClaimCard({
  claim,
  onOpenBathroom,
  onResubmitClaim,
}: {
  claim: BusinessClaimListItem;
  onOpenBathroom: (bathroomId: string) => void;
  onResubmitClaim: (bathroomId: string) => void;
}) {
  const statusMeta = STATUS_META[claim.review_status];

  return (
    <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Claimed Business</Text>
          <Text className="mt-2 text-2xl font-bold text-ink-900">{claim.business_name}</Text>
          <Text className="mt-2 text-base leading-6 text-ink-600">
            {claim.bathroom?.place_name ?? 'Bathroom details unavailable'}
          </Text>
        </View>
        <View className={['rounded-full px-3 py-2', statusMeta.badgeClassName].join(' ')}>
          <Text
            className={[
              'text-xs font-semibold uppercase tracking-[1px]',
              statusMeta.badgeLabelClassName,
            ].join(' ')}
          >
            {statusMeta.label}
          </Text>
        </View>
      </View>

      <Text className="mt-4 text-sm leading-6 text-ink-600">{statusMeta.body}</Text>

      <View className="mt-4 rounded-2xl bg-surface-base px-4 py-4">
        <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Bathroom</Text>
        <Text className="mt-2 text-base font-semibold text-ink-900">
          {claim.bathroom?.place_name ?? `Bathroom ${claim.bathroom_id}`}
        </Text>
        <Text className="mt-1 text-sm leading-5 text-ink-600">
          {claim.bathroom?.address ?? 'This bathroom is no longer visible in the public directory.'}
        </Text>
      </View>

      <View className="mt-4 rounded-2xl bg-surface-base px-4 py-4">
        <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Contact</Text>
        <Text className="mt-2 text-sm text-ink-700">{claim.contact_email}</Text>
        {claim.contact_phone ? <Text className="mt-1 text-sm text-ink-700">{claim.contact_phone}</Text> : null}
        {claim.evidence_url ? <Text className="mt-1 text-sm text-brand-700">{claim.evidence_url}</Text> : null}
      </View>

      <Text className="mt-4 text-xs font-medium uppercase tracking-[1px] text-ink-500">
        Submitted {formatClaimDate(claim.created_at)}
      </Text>

      <View className="mt-4 gap-3">
        <Button
          label="Open Bathroom"
          onPress={() => onOpenBathroom(claim.bathroom_id)}
          variant="secondary"
        />
        {claim.review_status === 'rejected' ? (
          <Button label="Resubmit Claim" onPress={() => onResubmitClaim(claim.bathroom_id)} />
        ) : null}
      </View>
    </View>
  );
}

export default function BusinessTab() {
  const router = useRouter();
  const { isGuest, profile } = useAuth();
  const { claims, counts, error, isFetching, isLoading, refetch } = useBusinessClaims();

  const headerCopy = useMemo(() => {
    if (profile?.role === 'business') {
      return {
        eyebrow: 'Business Account',
        title: 'Manage verified ownership claims.',
        body: 'Your account already has business access. Use this portal to track claim history and future moderation-linked tools.',
      };
    }

    return {
      eyebrow: 'Phase 6 Business Portal',
      title: 'Track claims and ownership review.',
      body: 'This portal shows where each ownership claim stands so businesses are not guessing what happened after submission.',
    };
  }, [profile?.role]);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenBathroom = useCallback(
    (bathroomId: string) => {
      pushSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.business);
    },
    [router]
  );

  const handleResubmitClaim = useCallback(
    (bathroomId: string) => {
      pushSafely(router, routes.modal.claimBusinessBathroom(bathroomId), routes.tabs.business);
    },
    [router]
  );

  if (isGuest) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
        <View className="flex-1 px-6 py-8">
          <View className="rounded-[32px] bg-ink-900 px-6 py-8">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/70">Business Portal</Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">Sign in to track business claims.</Text>
            <Text className="mt-3 text-base leading-6 text-white/80">
              Ownership claims are account-scoped and reviewed through the portal after submission.
            </Text>
          </View>

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-base leading-6 text-ink-600">
              Start from a bathroom detail screen, open the claim flow, and this tab will track pending, approved, and rejected submissions.
            </Text>
            <Button
              className="mt-6"
              label="Sign In"
              onPress={() => pushSafely(router, routes.auth.login, routes.auth.login)}
            />
            <Button
              className="mt-3"
              label="Create Account"
              onPress={() => pushSafely(router, routes.auth.register, routes.auth.register)}
              variant="secondary"
            />
            <Button
              className="mt-3"
              label="Browse Bathrooms"
              onPress={() => pushSafely(router, routes.tabs.map, routes.tabs.map)}
              variant="ghost"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading your business claims and review status." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
        <View className="px-6 py-8">
          <View className="rounded-[32px] bg-brand-600 px-6 py-8">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/80">{headerCopy.eyebrow}</Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">{headerCopy.title}</Text>
            <Text className="mt-3 text-base leading-6 text-white/80">{headerCopy.body}</Text>
          </View>

          <View className="mt-6 flex-row gap-3">
            <SummaryCard label="Pending" value={counts.pending} />
            <SummaryCard label="Approved" value={counts.approved} />
            <SummaryCard label="Needs Changes" value={counts.rejected} />
          </View>

          {error ? (
            <View className="mt-6 rounded-[28px] border border-danger/20 bg-danger/10 p-5">
              <Text className="text-xl font-bold text-danger">Business portal unavailable</Text>
              <Text className="mt-2 text-sm leading-6 text-danger">
                {getErrorMessage(error, 'We could not load your ownership claims right now.')}
              </Text>
              <Button className="mt-5" label="Try Again" loading={isFetching} onPress={handleRefresh} />
            </View>
          ) : null}

          {!error && !claims.length ? (
            <View className="mt-6 rounded-[28px] border border-surface-strong bg-surface-card p-6">
              <Text className="text-2xl font-bold text-ink-900">No ownership claims yet</Text>
              <Text className="mt-3 text-base leading-6 text-ink-600">
                Open any bathroom detail screen from the map or search tab to submit your first claim.
              </Text>
              <View className="mt-6 gap-3">
                <Button
                  label="Open Map"
                  onPress={() => pushSafely(router, routes.tabs.map, routes.tabs.map)}
                />
                <Button
                  label="Search Bathrooms"
                  onPress={() => pushSafely(router, routes.tabs.search, routes.tabs.map)}
                  variant="secondary"
                />
                <Button
                  label="Refresh"
                  loading={isFetching}
                  onPress={handleRefresh}
                  variant="ghost"
                />
              </View>
            </View>
          ) : null}

          {!error && claims.length ? (
            <View className="mt-6 gap-4">
              {claims.map((claim) => (
                <ClaimCard
                  claim={claim}
                  key={claim.id}
                  onOpenBathroom={handleOpenBathroom}
                  onResubmitClaim={handleResubmitClaim}
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
