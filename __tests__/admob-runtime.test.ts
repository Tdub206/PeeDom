import { afterEach, describe, expect, it, jest } from '@jest/globals';

const ORIGINAL_ENV = { ...process.env };

function configureAdMobEnvironment() {
  process.env.EXPO_PUBLIC_ENV = 'local';
  process.env.EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED = 'true';
  delete process.env.EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID;
}

describe('admob runtime availability', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
    jest.restoreAllMocks();
    jest.unmock('react-native-google-mobile-ads');
  });

  it('fails closed when the Google Mobile Ads native module is missing', async () => {
    configureAdMobEnvironment();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    jest.doMock('react-native-google-mobile-ads', () => {
      throw new Error("TurboModuleRegistry.getEnforcing(...): 'RNGoogleMobileAdsModule' could not be found.");
    });

    const admob = require('../src/lib/admob') as typeof import('../src/lib/admob');
    const availability = admob.getAdMobAvailability();
    const result = await admob.showRewardedCodeRevealAd({ bathroomId: 'bathroom-123' });

    expect(availability.isAvailable).toBe(false);
    expect(availability.errorMessage).toContain('native module');
    expect(result.outcome).toBe('unavailable');
    expect(result.message).toContain('native module');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('reports rewarded ads as available when the native module loads successfully', () => {
    configureAdMobEnvironment();

    jest.doMock('react-native-google-mobile-ads', () => ({
      __esModule: true,
      default: () => ({
        initialize: async () => undefined,
      }),
      AdsConsent: {
        gatherConsent: async () => undefined,
        getConsentInfo: async () => ({ canRequestAds: true }),
        getUserChoices: async () => ({ selectPersonalisedAds: true }),
      },
      AdEventType: {
        CLOSED: 'closed',
        ERROR: 'error',
      },
      RewardedAd: {
        createForAdRequest: jest.fn(),
      },
      RewardedAdEventType: {
        LOADED: 'loaded',
        EARNED_REWARD: 'earned_reward',
      },
      TestIds: {
        REWARDED: 'test-rewarded-id',
      },
    }));

    const admob = require('../src/lib/admob') as typeof import('../src/lib/admob');
    const availability = admob.getAdMobAvailability();

    expect(availability).toEqual({
      isAvailable: true,
      errorMessage: null,
    });
  });
});
