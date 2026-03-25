interface AdMobRuntimeConfigInput {
  EXPO_PUBLIC_ENV?: string;
  EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED?: string;
  EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID?: string;
  EXPO_PUBLIC_ADMOB_EARN_POINTS_UNIT_ID?: string;
}

export interface AdMobRuntimeConfig {
  environment: string;
  rewardedCodeRevealUnitId: string;
  rewardedEarnPointsUnitId: string;
  isDevelopmentBuild: boolean;
  usesTestIds: boolean;
  isEnabled: boolean;
  errorMessage: string | null;
}

function parseBooleanFlag(value?: string): boolean | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  return null;
}

export function readAdMobRuntimeConfig(input: AdMobRuntimeConfigInput): AdMobRuntimeConfig {
  const environment = input.EXPO_PUBLIC_ENV?.trim() || 'local';
  const isDevelopmentBuild = environment !== 'production';
  const rewardedCodeRevealUnitId = input.EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID?.trim() ?? '';
  const rewardedEarnPointsUnitId = input.EXPO_PUBLIC_ADMOB_EARN_POINTS_UNIT_ID?.trim() ?? '';
  const explicitEnabled = parseBooleanFlag(input.EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED);
  const usesTestIds = rewardedCodeRevealUnitId.length === 0 && isDevelopmentBuild;
  const isEnabled =
    explicitEnabled === false
      ? false
      : rewardedCodeRevealUnitId.length > 0 || usesTestIds;

  if (explicitEnabled === true && !isEnabled) {
    return {
      environment,
      rewardedCodeRevealUnitId,
      rewardedEarnPointsUnitId,
      isDevelopmentBuild,
      usesTestIds,
      isEnabled: false,
      errorMessage:
        'AdMob rewarded code reveal is enabled but EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID is missing for this environment.',
    };
  }

  return {
    environment,
    rewardedCodeRevealUnitId,
    rewardedEarnPointsUnitId,
    isDevelopmentBuild,
    usesTestIds,
    isEnabled,
    errorMessage: null,
  };
}

export const adMobRuntimeConfig = readAdMobRuntimeConfig({
  EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV,
  EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED: process.env.EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED,
  EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID,
  EXPO_PUBLIC_ADMOB_EARN_POINTS_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_EARN_POINTS_UNIT_ID,
});
