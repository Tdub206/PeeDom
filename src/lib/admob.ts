import { adMobRuntimeConfig } from '@/lib/admob-config';

interface RewardedCodeRevealOptions {
  bathroomId: string;
  userId?: string | null;
}

export interface RewardedCodeRevealResult {
  outcome: 'earned' | 'dismissed' | 'unavailable';
  message: string | null;
}

export interface AdMobAvailability {
  isAvailable: boolean;
  errorMessage: string | null;
}

type GoogleMobileAdsModule = typeof import('react-native-google-mobile-ads');

interface GoogleMobileAdsModuleState {
  module: GoogleMobileAdsModule | null;
  errorMessage: string | null;
}

let initializePromise: Promise<void> | null = null;

const MISSING_NATIVE_MODULE_MESSAGE =
  'Rewarded ads are unavailable because this build does not include the Google Mobile Ads native module. Rebuild and reinstall the app to enable ad unlocks.';

function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unknown error';
}

function getPlatformOs(): string {
  try {
    const reactNativeModule = require('react-native') as { Platform?: { OS?: string } };
    return reactNativeModule.Platform?.OS ?? 'unknown';
  } catch (_error) {
    return 'unknown';
  }
}

function loadGoogleMobileAdsModule(): GoogleMobileAdsModuleState {
  if (!adMobRuntimeConfig.isEnabled) {
    return {
      module: null,
      errorMessage: adMobRuntimeConfig.errorMessage,
    };
  }

  try {
    const googleMobileAdsModule = require('react-native-google-mobile-ads') as GoogleMobileAdsModule;

    return {
      module: googleMobileAdsModule,
      errorMessage: null,
    };
  } catch (error) {
    const rawMessage = getUnknownErrorMessage(error);
    const errorMessage = rawMessage.includes('RNGoogleMobileAdsModule')
      ? MISSING_NATIVE_MODULE_MESSAGE
      : `Rewarded ads are unavailable because Google Mobile Ads failed to load: ${rawMessage}`;

    console.warn('[admob] Google Mobile Ads is unavailable in this build.', error);

    return {
      module: null,
      errorMessage,
    };
  }
}

const googleMobileAdsModuleState = loadGoogleMobileAdsModule();

export function getAdMobAvailability(): AdMobAvailability {
  if (!adMobRuntimeConfig.isEnabled) {
    return {
      isAvailable: false,
      errorMessage: adMobRuntimeConfig.errorMessage,
    };
  }

  return {
    isAvailable: googleMobileAdsModuleState.module !== null,
    errorMessage: googleMobileAdsModuleState.errorMessage,
  };
}

function getRewardedCodeRevealUnitId(): string | null {
  const googleMobileAdsModule = googleMobileAdsModuleState.module;

  if (!adMobRuntimeConfig.isEnabled || !googleMobileAdsModule) {
    return null;
  }

  if (adMobRuntimeConfig.usesTestIds) {
    return googleMobileAdsModule.TestIds.REWARDED;
  }

  return adMobRuntimeConfig.rewardedCodeRevealUnitId || null;
}

function getRewardedEarnPointsUnitId(): string | null {
  const googleMobileAdsModule = googleMobileAdsModuleState.module;

  if (!adMobRuntimeConfig.isEnabled || !googleMobileAdsModule) {
    return null;
  }

  if (adMobRuntimeConfig.usesTestIds) {
    return googleMobileAdsModule.TestIds.REWARDED;
  }

  // Fall back to the code reveal unit id if no dedicated earn-points unit is configured.
  return adMobRuntimeConfig.rewardedEarnPointsUnitId || adMobRuntimeConfig.rewardedCodeRevealUnitId || null;
}

async function ensureMobileAdsReady(): Promise<void> {
  const googleMobileAdsModule = googleMobileAdsModuleState.module;

  if (!googleMobileAdsModule) {
    throw new Error(googleMobileAdsModuleState.errorMessage ?? MISSING_NATIVE_MODULE_MESSAGE);
  }

  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = (async () => {
    try {
      await googleMobileAdsModule.AdsConsent.gatherConsent();
    } catch (error) {
      console.warn('[admob] Consent gathering failed, continuing with the previous consent state.', error);
    }

    try {
      const consentInfo = await googleMobileAdsModule.AdsConsent.getConsentInfo();

      if (consentInfo.canRequestAds === false) {
        throw new Error('Ad consent is required before loading a rewarded ad.');
      }
    } catch (error) {
      initializePromise = null;
      throw error;
    }

    await googleMobileAdsModule.default().initialize();
  })();

  return initializePromise;
}

async function buildRequestOptions({ bathroomId, userId }: RewardedCodeRevealOptions) {
  const googleMobileAdsModule = googleMobileAdsModuleState.module;
  let requestNonPersonalizedAdsOnly = getPlatformOs() === 'ios';

  if (!requestNonPersonalizedAdsOnly && googleMobileAdsModule) {
    try {
      const userChoices = await googleMobileAdsModule.AdsConsent.getUserChoices();
      requestNonPersonalizedAdsOnly = userChoices.selectPersonalisedAds === false;
    } catch (error) {
      requestNonPersonalizedAdsOnly = false;
    }
  }

  return {
    requestNonPersonalizedAdsOnly,
    serverSideVerificationOptions: {
      userId: (userId ?? 'guest').slice(0, 64),
      customData: bathroomId.slice(0, 64),
    },
  };
}

export async function showRewardedCodeRevealAd(
  options: RewardedCodeRevealOptions
): Promise<RewardedCodeRevealResult> {
  const availability = getAdMobAvailability();
  const adUnitId = getRewardedCodeRevealUnitId();

  if (!availability.isAvailable || !adUnitId) {
    return {
      outcome: 'unavailable',
      message: availability.errorMessage ?? 'Ad unlock is unavailable in this build.',
    };
  }

  await ensureMobileAdsReady();

  const requestOptions = await buildRequestOptions(options);
  const googleMobileAdsModule = googleMobileAdsModuleState.module;

  if (!googleMobileAdsModule) {
    return {
      outcome: 'unavailable',
      message: availability.errorMessage ?? MISSING_NATIVE_MODULE_MESSAGE,
    };
  }

  return new Promise((resolve, reject) => {
    const rewardedAd = googleMobileAdsModule.RewardedAd.createForAdRequest(adUnitId, requestOptions);
    let hasResolved = false;
    let earnedReward = false;

    const cleanup = () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeEarned();
      unsubscribeError();
      clearTimeout(loadTimeout);
    };

    const finish = (result: RewardedCodeRevealResult) => {
      if (hasResolved) {
        return;
      }

      hasResolved = true;
      cleanup();
      resolve(result);
    };

    const fail = (error: Error) => {
      if (hasResolved) {
        return;
      }

      hasResolved = true;
      cleanup();
      reject(error);
    };

    const unsubscribeLoaded = rewardedAd.addAdEventListener(googleMobileAdsModule.RewardedAdEventType.LOADED, () => {
      rewardedAd.show().catch((error) => {
        fail(error instanceof Error ? error : new Error('Unable to show the rewarded ad.'));
      });
    });
    const unsubscribeClosed = rewardedAd.addAdEventListener(googleMobileAdsModule.AdEventType.CLOSED, () => {
      finish({
        outcome: earnedReward ? 'earned' : 'dismissed',
        message: earnedReward ? null : 'The ad was closed before the reward completed.',
      });
    });
    const unsubscribeEarned = rewardedAd.addAdEventListener(
      googleMobileAdsModule.RewardedAdEventType.EARNED_REWARD,
      () => {
        earnedReward = true;
      }
    );
    const unsubscribeError = rewardedAd.addAdEventListener(googleMobileAdsModule.AdEventType.ERROR, (error) => {
      fail(new Error(error.message || 'Unable to load a rewarded ad right now.'));
    });
    const loadTimeout = setTimeout(() => {
      fail(new Error('Timed out while loading a rewarded ad.'));
    }, 45000);

    rewardedAd.load();
  });
}

export interface RewardedEarnPointsResult {
  outcome: 'earned' | 'dismissed' | 'unavailable';
  message: string | null;
}

/**
 * Shows a rewarded ad for the "earn points" flow (voluntary, user-initiated).
 * Uses the dedicated earn-points ad unit, falling back to the code reveal unit.
 */
export async function showRewardedEarnPointsAd(
  userId?: string | null
): Promise<RewardedEarnPointsResult> {
  const availability = getAdMobAvailability();
  const adUnitId = getRewardedEarnPointsUnitId();

  if (!availability.isAvailable || !adUnitId) {
    return {
      outcome: 'unavailable',
      message: availability.errorMessage ?? 'Rewarded ads are unavailable in this build.',
    };
  }

  await ensureMobileAdsReady();

  const requestOptions = await buildRequestOptions({
    bathroomId: 'earn_points',
    userId,
  });
  const googleMobileAdsModule = googleMobileAdsModuleState.module;

  if (!googleMobileAdsModule) {
    return {
      outcome: 'unavailable',
      message: availability.errorMessage ?? MISSING_NATIVE_MODULE_MESSAGE,
    };
  }

  return new Promise((resolve, reject) => {
    const rewardedAd = googleMobileAdsModule.RewardedAd.createForAdRequest(adUnitId, requestOptions);
    let hasResolved = false;
    let earnedReward = false;

    const cleanup = () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeEarned();
      unsubscribeError();
      clearTimeout(loadTimeout);
    };

    const finish = (result: RewardedEarnPointsResult) => {
      if (hasResolved) return;
      hasResolved = true;
      cleanup();
      resolve(result);
    };

    const fail = (error: Error) => {
      if (hasResolved) return;
      hasResolved = true;
      cleanup();
      reject(error);
    };

    const unsubscribeLoaded = rewardedAd.addAdEventListener(googleMobileAdsModule.RewardedAdEventType.LOADED, () => {
      rewardedAd.show().catch((error) => {
        fail(error instanceof Error ? error : new Error('Unable to show the rewarded ad.'));
      });
    });
    const unsubscribeClosed = rewardedAd.addAdEventListener(googleMobileAdsModule.AdEventType.CLOSED, () => {
      finish({
        outcome: earnedReward ? 'earned' : 'dismissed',
        message: earnedReward ? null : 'The ad was closed before the reward completed.',
      });
    });
    const unsubscribeEarned = rewardedAd.addAdEventListener(
      googleMobileAdsModule.RewardedAdEventType.EARNED_REWARD,
      () => {
        earnedReward = true;
      }
    );
    const unsubscribeError = rewardedAd.addAdEventListener(googleMobileAdsModule.AdEventType.ERROR, (error) => {
      fail(new Error(error.message || 'Unable to load a rewarded ad right now.'));
    });
    const loadTimeout = setTimeout(() => {
      fail(new Error('Timed out while loading a rewarded ad.'));
    }, 45000);

    rewardedAd.load();
  });
}
