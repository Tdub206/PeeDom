interface AdMobRuntimeConfigInput {
  EXPO_PUBLIC_ENV?: string;
  EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED?: string;
  EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID?: string;
  EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED?: string;
}

export interface AdMobRuntimeConfig {
  environment: string;
  rewardedCodeRevealUnitId: string;
  isDevelopmentBuild: boolean;
  usesTestIds: boolean;
  isEnabled: boolean;
  isServerSideVerificationEnabled: boolean;
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
  const explicitEnabled = parseBooleanFlag(input.EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED);
  const isServerSideVerificationEnabled =
    parseBooleanFlag(input.EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED) === true;
  const usesTestIds = rewardedCodeRevealUnitId.length === 0 && isDevelopmentBuild;
  const hasRewardedUnit =
    explicitEnabled === false
      ? false
      : rewardedCodeRevealUnitId.length > 0 || usesTestIds;
  const isEnabled = hasRewardedUnit && isServerSideVerificationEnabled;

  if (explicitEnabled === true && !hasRewardedUnit) {
    return {
      environment,
      rewardedCodeRevealUnitId,
      isDevelopmentBuild,
      usesTestIds,
      isServerSideVerificationEnabled,
      isEnabled: false,
      errorMessage:
        'AdMob rewarded code reveal is enabled but EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID is missing for this environment.',
    };
  }

  if (hasRewardedUnit && !isServerSideVerificationEnabled) {
    return {
      environment,
      rewardedCodeRevealUnitId,
      isDevelopmentBuild,
      usesTestIds,
      isServerSideVerificationEnabled,
      isEnabled: false,
      errorMessage:
        'Rewarded code reveal is unavailable until EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED=true and the AdMob server-side verification callback writes rewarded unlock verifications.',
    };
  }

  return {
    environment,
    rewardedCodeRevealUnitId,
    isDevelopmentBuild,
    usesTestIds,
    isServerSideVerificationEnabled,
    isEnabled,
    errorMessage: null,
  };
}

export const adMobRuntimeConfig = readAdMobRuntimeConfig({
  EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV,
  EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED: process.env.EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED,
  EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID,
  EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED: process.env.EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED,
});
