import { getLevelProgress } from '@/lib/gamification';
import { DbPointEvent, GamificationSummary, UserBadge, UserProfile } from '@/types';

export interface ProfileStat {
  key:
    | 'points'
    | 'streak'
    | 'bathrooms'
    | 'codes_submitted'
    | 'codes_verified'
    | 'reports'
    | 'photos'
    | 'badges';
  label: string;
  value: number;
}

const BADGE_CATEGORY_EMOJIS: Record<UserBadge['badge_category'], string> = {
  accessibility: '♿',
  city: '🗺️',
  milestone: '🏆',
  streak: '🔥',
  time: '⏱️',
};

export function getProfileInitials(profile: Pick<UserProfile, 'display_name' | 'email'> | null | undefined): string {
  const sourceValue = profile?.display_name?.trim() || profile?.email?.trim() || '?';

  if (sourceValue === '?') {
    return sourceValue;
  }

  const words = sourceValue
    .replace(/@.*/, '')
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return '?';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

export function buildProfileStats(summary: GamificationSummary | null, profile: UserProfile | null): ProfileStat[] {
  return [
    {
      key: 'points',
      label: 'Points',
      value: profile?.points_balance ?? 0,
    },
    {
      key: 'streak',
      label: 'Current Streak',
      value: profile?.current_streak ?? 0,
    },
    {
      key: 'bathrooms',
      label: 'Bathrooms Added',
      value: summary?.total_bathrooms_added ?? 0,
    },
    {
      key: 'codes_submitted',
      label: 'Codes Submitted',
      value: summary?.total_codes_submitted ?? 0,
    },
    {
      key: 'codes_verified',
      label: 'Codes Verified',
      value: summary?.total_code_verifications ?? 0,
    },
    {
      key: 'reports',
      label: 'Reports Filed',
      value: summary?.total_reports_filed ?? 0,
    },
    {
      key: 'photos',
      label: 'Photos Uploaded',
      value: summary?.total_photos_uploaded ?? 0,
    },
    {
      key: 'badges',
      label: 'Badges Earned',
      value: summary?.total_badges ?? 0,
    },
  ];
}

export function getBadgeEmoji(badge: Pick<UserBadge, 'badge_category'>): string {
  return BADGE_CATEGORY_EMOJIS[badge.badge_category] ?? '🏆';
}

export function getBadgeCountLabel(count: number): string {
  return `${count} badge${count === 1 ? '' : 's'}`;
}

export function getProfileLevelSummary(pointsBalance: number): {
  label: string;
  progressPercent: number;
  supportingCopy: string;
} {
  const progress = getLevelProgress(pointsBalance);

  return {
    label: `Level ${progress.level} · ${progress.tierName}`,
    progressPercent: progress.progressPercent,
    supportingCopy:
      progress.pointsToNextLevel === 0
        ? 'You have reached the current level cap.'
        : `${progress.pointsToNextLevel} more points to reach the next level.`,
  };
}

export function getPointEventDateLabel(createdAt: string, now = new Date()): string {
  const eventDate = new Date(createdAt);

  if (Number.isNaN(eventDate.getTime())) {
    return 'Unknown date';
  }

  const differenceMs = now.getTime() - eventDate.getTime();
  const differenceDays = Math.floor(differenceMs / 86400000);

  if (differenceDays <= 0) {
    return 'Today';
  }

  if (differenceDays === 1) {
    return 'Yesterday';
  }

  if (differenceDays < 7) {
    return `${differenceDays} days ago`;
  }

  return eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getPointEventValue(event: Pick<DbPointEvent, 'points_awarded'>): string {
  return event.points_awarded >= 0 ? `+${event.points_awarded}` : `${event.points_awarded}`;
}
