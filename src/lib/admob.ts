import { adMobRuntimeConfig } from '@/lib/admob-config';

interface RewardedCodeRevealOptions {
  bathroomId: string;
  userId?: string | null;
}

interface RewardedFeatureUnlockOptions {
  context: 'code_reveal' | 'emergency_lookup' | 'earn_points';
  bathroomId?: string | null;
  userId?: string | null;
}

export interface RewardedCodeRevealResult {
  outcome: 'earned' | 'dismissed' | 'unavailable';
  message: string | null;
  rewardVerificationToken?: string;
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

function fillRandomBytes(bytes: Uint8Array): Uint8Array {
  const cryptoSource = globalThis.crypto as
    | {
        getRandomValues?: (array: Uint8Array) => Uint8Array;
      }
    | undefined;

  if (cryptoSource?.getRandomValues) {
    return cryptoSource.getRandomValues(bytes);
  }

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }

  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function compactUuid(value: string): string {
  return value.replace(/[^a-fA-F0-9]/g, '').slice(0, 32).toLowerCase();
}

function createRewardVerificationToken({
  bathroomId,
  context,
}: RewardedFeatureUnlockOptions): string {
  const randomSegment = toHex(fillRandomBytes(new Uint8Array(8)));

  if (context === 'code_reveal' && bathroomId) {
    const compactBathroomId = compactUuid(bathroomId);

    if (compactBathroomId.length === 32) {
      return `cr_${compactBathroomId}_${randomSegment}`;
    }
  }

  if (context === 'earn_points') {
    return `ap_${Date.now().toString(36)}_${randomSegment}`;
  }

  return `el_${Date.now().toString(36)}_${randomSegment}`;
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

async function buildRequestOptions({
  bathroomId,
  context,
  userId,
}: RewardedFeatureUnlockOptions): Promise<{
  requestOptions: {
    requestNonPersonalizedAdsOnly: boolean;
    serverSideVerificationOptions: {
      userId: string;
      customData: string;
    };
  };
  rewardVerificationToken: string;
}> {
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

  const rewardVerificationToken = createRewardVerificationToken({
    bathroomId,
    context,
    userId,
  });

  return {
    requestOptions: {
      requestNonPersonalizedAdsOnly,
      serverSideVerificationOptions: {
        userId: (userId ?? 'guest').slice(0, 64),
        customData: rewardVerificationToken,
      },
    },
    rewardVerificationToken,
  };
}

export async function showRewardedFeatureUnlockAd(
  options: RewardedFeatureUnlockOptions
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

  const { requestOptions, rewardVerificationToken } = await buildRequestOptions(options);
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
        rewardVerificationToken: earnedReward ? rewardVerificationToken : undefined,
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

export async function showRewardedCodeRevealAd(
  options: RewardedCodeRevealOptions
): Promise<RewardedCodeRevealResult> {
  return showRewardedFeatureUnlockAd({
    context: 'code_reveal',
    bathroomId: options.bathroomId,
    userId: options.userId ?? null,
  });
}

export async function showRewardedEarnPointsAd(
  userId?: string | null
): Promise<RewardedCodeRevealResult> {
  return showRewardedFeatureUnlockAd({
    context: 'earn_points',
    userId: userId ?? null,
  });
}
