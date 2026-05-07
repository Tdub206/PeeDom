import type { PointEventType, UserProfile } from '@/types';

const POINTS_PER_LEVEL = 100;
const MAX_LEVEL = 50;

export interface LevelProgress {
  level: number;
  tierName: 'Beginner' | 'Explorer' | 'Navigator' | 'Pathfinder' | 'Legend';
  currentFloor: number;
  nextFloor: number;
  pointsIntoLevel: number;
  pointsToNextLevel: number;
  progressPercent: number;
}

function getTierName(level: number): LevelProgress['tierName'] {
  if (level >= 40) {
    return 'Legend';
  }

  if (level >= 30) {
    return 'Pathfinder';
  }

  if (level >= 20) {
    return 'Navigator';
  }

  if (level >= 10) {
    return 'Explorer';
  }

  return 'Beginner';
}

export function hasActivePremium(profile: Pick<UserProfile, 'is_premium' | 'premium_expires_at'> | null | undefined): boolean {
  if (!profile) {
    return false;
  }

  if (profile.premium_expires_at) {
    return new Date(profile.premium_expires_at).getTime() > Date.now();
  }

  return profile.is_premium;
}

export function getLevelProgress(pointsBalance: number): LevelProgress {
  const normalizedPoints = Math.max(0, Math.floor(pointsBalance));
  const level = Math.min(MAX_LEVEL, Math.floor(normalizedPoints / POINTS_PER_LEVEL) + 1);
  const currentFloor = (level - 1) * POINTS_PER_LEVEL;
  const nextFloor = level >= MAX_LEVEL ? currentFloor : level * POINTS_PER_LEVEL;
  const pointsIntoLevel = level >= MAX_LEVEL ? POINTS_PER_LEVEL : normalizedPoints - currentFloor;
  const pointsToNextLevel = level >= MAX_LEVEL ? 0 : Math.max(nextFloor - normalizedPoints, 0);
  const progressPercent = level >= MAX_LEVEL
    ? 100
    : Math.max(0, Math.min(100, Math.round((pointsIntoLevel / POINTS_PER_LEVEL) * 100)));

  return {
    level,
    tierName: getTierName(level),
    currentFloor,
    nextFloor,
    pointsIntoLevel,
    pointsToNextLevel,
    progressPercent,
  };
}

export function getPointEventLabel(eventType: PointEventType): string {
  switch (eventType) {
    case 'bathroom_added':
      return 'Bathroom added';
    case 'bathroom_photo_uploaded':
      return 'Photo proof uploaded';
    case 'code_submitted':
      return 'Code submitted';
    case 'code_verification':
      return 'Code verified';
    case 'report_resolved':
      return 'Report resolved';
    case 'code_milestone':
      return 'Code milestone bonus';
    case 'premium_redeemed':
      return 'Premium redeemed';
    case 'ad_watched':
      return 'Rewarded ad watched';
    case 'points_spent':
      return 'Points spent';
    case 'code_verification_consensus':
      return 'Consensus verification bonus';
    case 'consensus_denial_award':
      return 'Consensus correction bonus';
    case 'code_reveal_redeemed':
      return 'Code reveal unlocked';
    case 'emergency_lookup_redeemed':
      return 'Emergency lookup unlocked';
    default:
      return 'Contribution';
  }
}
