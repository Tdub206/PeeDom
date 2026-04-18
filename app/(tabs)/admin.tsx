import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAdminClaims,
  useAdminFeaturedRequests,
  useModerateClaim,
  useModerateFeaturedRequest,
} from '@/hooks/useAdminClaims';
import { ClaimReviewCard } from '@/components/admin/ClaimReviewCard';
import { FeaturedRequestReviewCard } from '@/components/admin/FeaturedRequestReviewCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import {
  assessClaimModerationRisk,
  assessFeaturedRequestPriority,
  summarizeAdminQueue,
} from '@/utils/admin-moderation';

type AdminTab = 'claims' | 'featured';

function SummaryTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <View
      className={[
        'flex-1 rounded-2xl border px-4 py-4',
        tone === 'warning' ? 'border-warning/20 bg-warning/10' : 'border-surface-strong bg-surface-card',
      ].join(' ')}
    >
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">{label}</Text>
      <Text className={['mt-2 text-2xl font-black', tone === 'warning' ? 'text-warning' : 'text-ink-900'].join(' ')}>
        {value}
      </Text>
    </View>
  );
}

export default function AdminScreen() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('claims');
  const [moderatingClaimId, setModeratingClaimId] = useState<string | null>(null);
  const [moderatingRequestId, setModeratingRequestId] = useState<string | null>(null);

  const {
    data: claims,
    isLoading: isLoadingClaims,
    refetch: refetchClaims,
    isFetching: isFetchingClaims,
  } = useAdminClaims();

  const {
    data: featuredRequests,
    isLoading: isLoadingRequests,
    refetch: refetchRequests,
    isFetching: isFetchingRequests,
  } = useAdminFeaturedRequests();

  const moderateClaim = useModerateClaim();
  const moderateRequest = useModerateFeaturedRequest();

  const isAdmin = profile?.role === 'admin';

  const pendingClaimsCount = useMemo(
    () => claims?.filter((c) => c.review_status === 'pending').length ?? 0,
    [claims],
  );
  const pendingRequestsCount = useMemo(
    () => featuredRequests?.filter((r) => r.status === 'pending').length ?? 0,
    [featuredRequests],
  );
  const queueSummary = useMemo(
    () => summarizeAdminQueue(claims ?? [], featuredRequests ?? []),
    [claims, featuredRequests]
  );
  const sortedClaims = useMemo(
    () =>
      [...(claims ?? [])].sort(
        (leftClaim, rightClaim) =>
          assessClaimModerationRisk(rightClaim).score - assessClaimModerationRisk(leftClaim).score
      ),
    [claims]
  );
  const sortedFeaturedRequests = useMemo(
    () =>
      [...(featuredRequests ?? [])]
        .filter((request) => request.status === 'pending')
        .sort(
          (leftRequest, rightRequest) =>
            assessFeaturedRequestPriority(rightRequest).score - assessFeaturedRequestPriority(leftRequest).score
        ),
    [featuredRequests]
  );

  const handleApproveClaim = useCallback(
    (claimId: string) => {
      setModeratingClaimId(claimId);
      moderateClaim.mutate(
        { claimId, action: 'approve' },
        { onSettled: () => setModeratingClaimId(null) },
      );
    },
    [moderateClaim],
  );

  const handleRejectClaim = useCallback(
    (claimId: string, reason: string) => {
      setModeratingClaimId(claimId);
      moderateClaim.mutate(
        { claimId, action: 'reject', reason },
        { onSettled: () => setModeratingClaimId(null) },
      );
    },
    [moderateClaim],
  );

  const handleApproveRequest = useCallback(
    (requestId: string, notes?: string) => {
      setModeratingRequestId(requestId);
      moderateRequest.mutate(
        { requestId, action: 'approve', adminNotes: notes },
        { onSettled: () => setModeratingRequestId(null) },
      );
    },
    [moderateRequest],
  );

  const handleRejectRequest = useCallback(
    (requestId: string, notes?: string) => {
      setModeratingRequestId(requestId);
      moderateRequest.mutate(
        { requestId, action: 'reject', adminNotes: notes },
        { onSettled: () => setModeratingRequestId(null) },
      );
    },
    [moderateRequest],
  );

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="lock-closed" size={48} color={colors.ink[400]} />
          <Text className="mt-4 text-center text-lg font-bold text-ink-900">
            Admin Access Required
          </Text>
          <Text className="mt-2 text-center text-sm text-ink-500">
            This section is restricted to administrators.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoadingClaims || isLoadingRequests) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top']}>
      <View className="px-5 pb-3 pt-6">
        <Text className="text-3xl font-black tracking-tight text-ink-900">Admin</Text>
        <Text className="mt-1 text-sm text-ink-500">Moderation queue with trust and risk signals</Text>
      </View>

      <View className="gap-3 px-5 pb-4">
        <View className="flex-row gap-3">
          <SummaryTile label="Pending Claims" value={queueSummary.pending_claims.toString()} />
          <SummaryTile
            label="High Risk"
            tone={queueSummary.high_risk_claims > 0 ? 'warning' : 'default'}
            value={queueSummary.high_risk_claims.toString()}
          />
        </View>
        <View className="flex-row gap-3">
          <SummaryTile
            label="No Evidence"
            tone={queueSummary.claims_missing_evidence > 0 ? 'warning' : 'default'}
            value={queueSummary.claims_missing_evidence.toString()}
          />
          <SummaryTile
            label="Featured Queue"
            tone={queueSummary.high_priority_featured_requests > 0 ? 'warning' : 'default'}
            value={queueSummary.pending_featured_requests.toString()}
          />
        </View>
      </View>

      {/* Tab switcher */}
      <View className="flex-row gap-2 px-5 pb-4">
        <Pressable
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl px-4 py-3 ${
            activeTab === 'claims' ? 'bg-brand-600' : 'bg-surface-card'
          }`}
          onPress={() => setActiveTab('claims')}
        >
          <Text
            className={`text-sm font-bold ${
              activeTab === 'claims' ? 'text-white' : 'text-ink-700'
            }`}
          >
            Claims
          </Text>
          {pendingClaimsCount > 0 ? (
            <View className="rounded-full bg-white/20 px-2 py-0.5">
              <Text
                className={`text-xs font-black ${
                  activeTab === 'claims' ? 'text-white' : 'text-brand-600'
                }`}
              >
                {pendingClaimsCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl px-4 py-3 ${
            activeTab === 'featured' ? 'bg-brand-600' : 'bg-surface-card'
          }`}
          onPress={() => setActiveTab('featured')}
        >
          <Text
            className={`text-sm font-bold ${
              activeTab === 'featured' ? 'text-white' : 'text-ink-700'
            }`}
          >
            Featured
          </Text>
          {pendingRequestsCount > 0 ? (
            <View className="rounded-full bg-white/20 px-2 py-0.5">
              <Text
                className={`text-xs font-black ${
                  activeTab === 'featured' ? 'text-white' : 'text-brand-600'
                }`}
              >
                {pendingRequestsCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {activeTab === 'claims' ? (
        <FlatList
          data={sortedClaims}
          keyExtractor={(item) => item.claim_id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 16 }}
          refreshControl={
            <RefreshControl refreshing={isFetchingClaims} onRefresh={refetchClaims} />
          }
          renderItem={({ item }) => (
            <ClaimReviewCard
              claim={item}
              onApprove={handleApproveClaim}
              onReject={handleRejectClaim}
              isModeratingId={moderatingClaimId}
            />
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="checkmark-circle" size={48} color={colors.ink[300]} />
              <Text className="mt-3 text-sm text-ink-500">No claims to review</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={sortedFeaturedRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 16 }}
          refreshControl={
            <RefreshControl refreshing={isFetchingRequests} onRefresh={refetchRequests} />
          }
          renderItem={({ item }) => (
            <FeaturedRequestReviewCard
              request={item}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
              isModeratingId={moderatingRequestId}
            />
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="checkmark-circle" size={48} color={colors.ink[300]} />
              <Text className="mt-3 text-sm text-ink-500">No featured requests to review</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
