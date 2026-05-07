import { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useEarnPointsAd } from '@/hooks/useEarnPointsAd';
import { useGamificationDashboard } from '@/hooks/useGamificationDashboard';
import { useToast } from '@/hooks/useToast';
import { hasActivePremium } from '@/lib/gamification';
import { pushSafely } from '@/lib/navigation';
import {
  buildStoreCatalog,
  PREMIUM_MONTH_POINTS_COST,
  STORE_REWARDED_AD_DAILY_LIMIT,
  STORE_REWARDED_AD_POINTS,
  type StoreCatalogItem,
} from '@/lib/store/catalog';

interface StoreCatalogCardProps {
  item: StoreCatalogItem;
  isRedeemingPremium: boolean;
  onAction: (item: StoreCatalogItem) => void;
}

function formatPoints(value: number): string {
  return value.toLocaleString('en-US');
}

const StoreCatalogCard = memo(function StoreCatalogCard({
  item,
  isRedeemingPremium,
  onAction,
}: StoreCatalogCardProps) {
  const isPremiumRedeem = item.actionKind === 'redeem_premium';
  const isDisabled = isPremiumRedeem
    ? !item.canAfford || item.isActive || isRedeemingPremium
    : item.route === null;

  return (
    <View className="rounded-[28px] border border-surface-strong bg-surface-card px-5 py-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-black text-ink-900">{item.title}</Text>
          <Text className="mt-2 text-sm leading-6 text-ink-600">{item.description}</Text>
        </View>
        <View className={['rounded-full px-3 py-2', item.isActive ? 'bg-success/10' : 'bg-brand-50'].join(' ')}>
          <Text className={['text-xs font-bold', item.isActive ? 'text-success' : 'text-brand-700'].join(' ')}>
            {item.valueLabel}
          </Text>
        </View>
      </View>

      {item.requiresPremium && !item.isActive ? (
        <View className="mt-4 rounded-2xl bg-warning/10 px-4 py-3">
          <Text className="text-sm font-semibold text-warning">
            Redeem Premium with points to use this convenience feature.
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: isPremiumRedeem && isRedeemingPremium, disabled: isDisabled }}
        className={[
          'mt-4 flex-row items-center justify-between rounded-2xl px-4 py-3',
          isDisabled ? 'bg-surface-muted' : 'bg-ink-900',
        ].join(' ')}
        disabled={isDisabled}
        onPress={() => onAction(item)}
      >
        <Text className={['text-sm font-bold', isDisabled ? 'text-ink-500' : 'text-white'].join(' ')}>
          {isPremiumRedeem && isRedeemingPremium ? 'Redeeming...' : item.actionLabel}
        </Text>
        {isPremiumRedeem && isRedeemingPremium ? (
          <ActivityIndicator color={colors.ink[500]} size="small" />
        ) : (
          <Ionicons color={isDisabled ? colors.ink[500] : colors.surface.card} name="chevron-forward" size={16} />
        )}
      </Pressable>
    </View>
  );
});

export default function StoreTab() {
  const router = useRouter();
  const { isAuthenticated, isGuest, profile } = useAuth();
  const { showToast } = useToast();
  const { isAdAvailable, isEarning, lastError, watchAdForPoints } = useEarnPointsAd();
  const {
    isRedeemingPremium,
    isRefreshingDashboard,
    pointHistory,
    pointHistoryError,
    redeemPremium,
    refreshDashboard,
    summaryError,
  } = useGamificationDashboard();
  const pointsBalance = profile?.points_balance ?? 0;
  const isPremiumActive = hasActivePremium(profile);
  const catalogItems = useMemo(() => buildStoreCatalog({ profile }), [profile]);
  const recentStoreEvents = useMemo(
    () => pointHistory.filter((event) => event.event_type === 'ad_watched' || event.points_awarded < 0).slice(0, 5),
    [pointHistory]
  );

  const handleRefresh = useCallback(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  const handleEarnPress = useCallback(() => {
    void watchAdForPoints();
  }, [watchAdForPoints]);

  const handleCatalogAction = useCallback(
    (item: StoreCatalogItem) => {
      if (item.actionKind === 'redeem_premium') {
        if (item.isActive) {
          showToast({
            title: 'Premium active',
            message: 'Your premium benefits are already active on this account.',
            variant: 'info',
          });
          return;
        }

        if (!item.canAfford) {
          showToast({
            title: 'Not enough points',
            message: `You need ${formatPoints(PREMIUM_MONTH_POINTS_COST)} points to redeem a premium month.`,
            variant: 'warning',
          });
          return;
        }

        void redeemPremium(1);
        return;
      }

      if (!item.route) {
        return;
      }

      pushSafely(router, item.route, routes.tabs.store);
    },
    [redeemPremium, router, showToast]
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <View className="px-4 pb-2 pt-3">
        <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Store</Text>
        <Text className="mt-1 text-3xl font-black tracking-tight text-ink-900">Earn and spend</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={isRefreshingDashboard} />}
      >
        <View className="gap-4 px-4 pb-8 pt-1">
          <View className="rounded-[32px] bg-ink-900 px-5 py-6">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/70">Point balance</Text>
            <Text className="mt-2 text-5xl font-black tracking-tight text-white">{formatPoints(pointsBalance)}</Text>
            <Text className="mt-2 text-sm leading-6 text-white/75">
              Points are banked to your account. Basic nearest-restroom rescue stays free; points buy convenience such as code reveals and premium benefits.
            </Text>
            <View className="mt-4 flex-row flex-wrap gap-2">
              <View className="rounded-full bg-white/10 px-3 py-2">
                <Text className="text-xs font-semibold text-white">
                  {isPremiumActive ? 'Premium active' : `${formatPoints(PREMIUM_MONTH_POINTS_COST)} pts for Premium`}
                </Text>
              </View>
              <View className="rounded-full bg-white/10 px-3 py-2">
                <Text className="text-xs font-semibold text-white">+{STORE_REWARDED_AD_POINTS} pts per verified ad</Text>
              </View>
            </View>
          </View>

          {!isAuthenticated || isGuest ? (
            <View className="rounded-[30px] border border-surface-strong bg-surface-card px-5 py-6">
              <Text className="text-lg font-black text-ink-900">Sign in to bank points.</Text>
              <Text className="mt-2 text-sm leading-6 text-ink-600">
                Guest mode can browse the Store, but rewarded points and premium redemptions require an account so rewards cannot be lost or duplicated.
              </Text>
              <Button
                className="mt-5"
                label="Create Account"
                onPress={() => pushSafely(router, routes.auth.register, routes.tabs.store)}
              />
              <Button
                className="mt-3"
                label="Sign In"
                onPress={() => pushSafely(router, routes.auth.login, routes.tabs.store)}
                variant="secondary"
              />
            </View>
          ) : null}

          <View className="rounded-[32px] border border-brand-100 bg-brand-50 px-5 py-6">
            <View className="flex-row items-start gap-3">
              <View className="rounded-2xl bg-brand-600 p-3">
                <Ionicons color={colors.surface.card} name="play-circle-outline" size={24} />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-brand-700">Earn</Text>
                <Text className="mt-1 text-2xl font-black text-ink-900">Watch ads only when you choose.</Text>
                <Text className="mt-2 text-sm leading-6 text-ink-700">
                  Complete a rewarded ad to bank {STORE_REWARDED_AD_POINTS} points after AdMob server verification. Daily earn limit: {STORE_REWARDED_AD_DAILY_LIMIT} rewarded ads.
                </Text>
              </View>
            </View>

            {lastError ? (
              <View className="mt-4 rounded-2xl bg-warning/10 px-4 py-3">
                <Text className="text-sm font-semibold text-warning">{lastError}</Text>
              </View>
            ) : null}

            <Button
              className="mt-5"
              disabled={!isAuthenticated || isGuest || !isAdAvailable}
              label={isEarning ? 'Verifying reward...' : `Watch Ad: +${STORE_REWARDED_AD_POINTS} Points`}
              loading={isEarning}
              onPress={handleEarnPress}
            />
            {!isAdAvailable ? (
              <Text className="mt-3 text-xs leading-5 text-ink-600">
                Rewarded ads are disabled until this build includes Google Mobile Ads and server-side verification is enabled.
              </Text>
            ) : null}
          </View>

          {summaryError ? (
            <View className="rounded-[28px] border border-warning/20 bg-warning/10 px-5 py-5">
              <Text className="text-sm font-semibold text-warning">{summaryError}</Text>
            </View>
          ) : null}

          <View>
            <Text className="text-lg font-black text-ink-900">Spend</Text>
            <Text className="mt-1 text-sm leading-6 text-ink-600">
              Spend points where context matters. Code reveals still happen on a restroom page; premium unlocks the broader convenience layer.
            </Text>
          </View>

          {catalogItems.map((item) => (
            <StoreCatalogCard
              isRedeemingPremium={isRedeemingPremium}
              item={item}
              key={item.key}
              onAction={handleCatalogAction}
            />
          ))}

          <View className="rounded-[32px] border border-surface-strong bg-surface-card px-5 py-6">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Store activity</Text>
            {pointHistoryError ? (
              <Text className="mt-3 text-sm leading-6 text-warning">{pointHistoryError}</Text>
            ) : recentStoreEvents.length ? (
              <View className="mt-4 gap-3">
                {recentStoreEvents.map((event) => (
                  <View className="flex-row items-center justify-between rounded-2xl bg-surface-base px-4 py-3" key={event.id}>
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-semibold text-ink-900">
                        {event.event_type === 'ad_watched' ? 'Rewarded ad' : 'Points spent'}
                      </Text>
                      <Text className="mt-1 text-xs text-ink-500">
                        {new Date(event.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text className={['text-sm font-black', event.points_awarded >= 0 ? 'text-success' : 'text-danger'].join(' ')}>
                      {event.points_awarded >= 0 ? '+' : ''}{event.points_awarded}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="mt-3 text-sm leading-6 text-ink-600">
                Store earn and spend activity will appear here after your first verified reward or redemption.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
