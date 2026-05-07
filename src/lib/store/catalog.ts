import type { Href } from 'expo-router';
import { routes } from '@/constants/routes';
import { CODE_REVEAL_UNLOCK_POINTS_COST } from '@/lib/feature-access';
import { hasActivePremium } from '@/lib/gamification';
import type { UserProfile } from '@/types';

export const STORE_REWARDED_AD_POINTS = 25;
export const STORE_REWARDED_AD_DAILY_LIMIT = 5;
export const PREMIUM_MONTH_POINTS_COST = 1000;

export type StoreCatalogItemKey =
  | 'premium_month'
  | 'code_reveal'
  | 'offline_city_packs'
  | 'route_planning'
  | 'advanced_filters'
  | 'arrival_alerts';

export type StoreCatalogActionKind = 'redeem_premium' | 'navigate' | 'contextual';

export interface StoreCatalogItem {
  key: StoreCatalogItemKey;
  title: string;
  description: string;
  pointsCost: number | null;
  valueLabel: string;
  actionLabel: string;
  actionKind: StoreCatalogActionKind;
  route: Href | null;
  canAfford: boolean;
  isActive: boolean;
  requiresPremium: boolean;
}

interface BuildStoreCatalogInput {
  profile: UserProfile | null;
}

function canAfford(profile: UserProfile | null, pointsCost: number | null): boolean {
  if (!profile || pointsCost === null) {
    return false;
  }

  return profile.points_balance >= pointsCost;
}

export function buildStoreCatalog({ profile }: BuildStoreCatalogInput): StoreCatalogItem[] {
  const isPremiumActive = hasActivePremium(profile);

  return [
    {
      key: 'premium_month',
      title: '1 month of Premium',
      description:
        'Redeem points for offline city packs, arrival alerts, premium route planning, and convenience features without blocking basic rescue.',
      pointsCost: PREMIUM_MONTH_POINTS_COST,
      valueLabel: isPremiumActive ? 'Active now' : `${PREMIUM_MONTH_POINTS_COST} points`,
      actionLabel: isPremiumActive ? 'Premium active' : 'Redeem premium',
      actionKind: 'redeem_premium',
      route: null,
      canAfford: canAfford(profile, PREMIUM_MONTH_POINTS_COST),
      isActive: isPremiumActive,
      requiresPremium: false,
    },
    {
      key: 'code_reveal',
      title: 'Single code reveal',
      description:
        'Spend points from a restroom detail page when a verified access code is useful for that specific stop.',
      pointsCost: CODE_REVEAL_UNLOCK_POINTS_COST,
      valueLabel: `${CODE_REVEAL_UNLOCK_POINTS_COST} points when used`,
      actionLabel: 'Find a restroom',
      actionKind: 'navigate',
      route: routes.tabs.search,
      canAfford: canAfford(profile, CODE_REVEAL_UNLOCK_POINTS_COST),
      isActive: false,
      requiresPremium: false,
    },
    {
      key: 'offline_city_packs',
      title: 'Offline city packs',
      description:
        'Download city restroom data before travel so search and map browsing still work with weak service.',
      pointsCost: null,
      valueLabel: 'Premium benefit',
      actionLabel: 'Open city packs',
      actionKind: 'navigate',
      route: routes.modal.cityPacks,
      canAfford: isPremiumActive,
      isActive: isPremiumActive,
      requiresPremium: true,
    },
    {
      key: 'route_planning',
      title: 'Route-aware planning',
      description:
        'Plan around bathrooms that fit your route, access friction, confidence, and need profile instead of raw distance only.',
      pointsCost: null,
      valueLabel: 'Premium convenience',
      actionLabel: 'Plan a route',
      actionKind: 'navigate',
      route: routes.modal.routeBathrooms,
      canAfford: isPremiumActive,
      isActive: isPremiumActive,
      requiresPremium: true,
    },
    {
      key: 'advanced_filters',
      title: 'Advanced filters',
      description:
        'Use need-based filters for no-code access, supplies, privacy, family needs, and accessibility constraints.',
      pointsCost: null,
      valueLabel: 'Premium convenience',
      actionLabel: 'Open search',
      actionKind: 'navigate',
      route: routes.tabs.search,
      canAfford: isPremiumActive,
      isActive: isPremiumActive,
      requiresPremium: true,
    },
    {
      key: 'arrival_alerts',
      title: 'Arrival alerts',
      description:
        'Arm a reminder before you reach a saved bathroom so access codes and live status are ready when you arrive.',
      pointsCost: null,
      valueLabel: 'Premium benefit',
      actionLabel: 'Choose a restroom',
      actionKind: 'navigate',
      route: routes.tabs.search,
      canAfford: isPremiumActive,
      isActive: isPremiumActive,
      requiresPremium: true,
    },
  ];
}
