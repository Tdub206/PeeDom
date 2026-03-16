import mobileAds, {
  AdEventType,
  AdsConsent,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { adMobRuntimeConfig } from '@/lib/admob-config';

interface RewardedCodeRevealOptions {
  bathroomId: string;
  userId?: string | null;
}

export interface RewardedCodeRevealResult {
  outcome: 'earned' | 'dismissed' | 'unavailable';
  message: string | null;
}

let initializePromise: Promise<void> | null = null;

function getRewardedCodeRevealUnitId(): string | null {
  if (!adMobRuntimeConfig.isEnabled) {
    return null;
  }

  if (adMobRuntimeConfig.usesTestIds) {
    return TestIds.REWARDED;
  }

  return adMobRuntimeConfig.rewardedCodeRevealUnitId || null;
}

async function ensureMobileAdsReady(): Promise<void> {
  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = (async () => {
    try {
      await AdsConsent.gatherConsent();
    } catch (error) {
      console.warn('[admob] Consent gathering failed, continuing with the previous consent state.', error);
    }

    try {
      const consentInfo = await AdsConsent.getConsentInfo();

      if (consentInfo.canRequestAds === false) {
        throw new Error('Ad consent is required before loading a rewarded ad.');
      }
    } catch (error) {
      initializePromise = null;
      throw error;
    }

    await mobileAds().initialize();
  })();

  return initializePromise;
}

async function buildRequestOptions({ bathroomId, userId }: RewardedCodeRevealOptions) {
  let requestNonPersonalizedAdsOnly = false;

  try {
    const userChoices = await AdsConsent.getUserChoices();
    requestNonPersonalizedAdsOnly = userChoices.selectPersonalisedAds === false;
  } catch (error) {
    requestNonPersonalizedAdsOnly = false;
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
  const adUnitId = getRewardedCodeRevealUnitId();

  if (!adUnitId) {
    return {
      outcome: 'unavailable',
      message: adMobRuntimeConfig.errorMessage ?? 'Ad unlock is unavailable in this build.',
    };
  }

  await ensureMobileAdsReady();

  const requestOptions = await buildRequestOptions(options);

  return new Promise((resolve, reject) => {
    const rewardedAd = RewardedAd.createForAdRequest(adUnitId, requestOptions);
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

    const unsubscribeLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewardedAd.show().catch((error) => {
        fail(error instanceof Error ? error : new Error('Unable to show the rewarded ad.'));
      });
    });
    const unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      finish({
        outcome: earnedReward ? 'earned' : 'dismissed',
        message: earnedReward ? null : 'The ad was closed before the reward completed.',
      });
    });
    const unsubscribeEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earnedReward = true;
    });
    const unsubscribeError = rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
      fail(new Error(error.message || 'Unable to load a rewarded ad right now.'));
    });
    const loadTimeout = setTimeout(() => {
      fail(new Error('Timed out while loading a rewarded ad.'));
    }, 45000);

    rewardedAd.load();
  });
}
