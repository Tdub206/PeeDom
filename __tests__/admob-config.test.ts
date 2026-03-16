import { describe, expect, it } from '@jest/globals';

import { readAdMobRuntimeConfig } from '@/lib/admob-config';

describe('readAdMobRuntimeConfig', () => {
  it('uses Google test ids for non-production builds when no rewarded unit id is configured', () => {
    const config = readAdMobRuntimeConfig({
      EXPO_PUBLIC_ENV: 'local',
      EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED: 'true',
      EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID: '',
    });

    expect(config.isDevelopmentBuild).toBe(true);
    expect(config.usesTestIds).toBe(true);
    expect(config.isEnabled).toBe(true);
    expect(config.errorMessage).toBeNull();
  });

  it('disables rewarded unlocks when the feature flag is explicitly turned off', () => {
    const config = readAdMobRuntimeConfig({
      EXPO_PUBLIC_ENV: 'staging',
      EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED: 'false',
      EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID: 'ca-app-pub-1234567890123456/1234567890',
    });

    expect(config.isEnabled).toBe(false);
    expect(config.usesTestIds).toBe(false);
    expect(config.errorMessage).toBeNull();
  });

  it('reports a production configuration error when rewarded ads are enabled without a unit id', () => {
    const config = readAdMobRuntimeConfig({
      EXPO_PUBLIC_ENV: 'production',
      EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED: 'true',
      EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID: '',
    });

    expect(config.isDevelopmentBuild).toBe(false);
    expect(config.usesTestIds).toBe(false);
    expect(config.isEnabled).toBe(false);
    expect(config.errorMessage).toContain('EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID');
  });
});
