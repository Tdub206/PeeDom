import { describe, expect, it } from '@jest/globals';

import { readBuildVersionConfig, readMapsBuildConfig, shouldRequireMapsKeys } from '../build-config';

describe('build config guards', () => {
  it('parses build versions safely', () => {
    const config = readBuildVersionConfig({
      IOS_BUILD_NUMBER: '42',
      ANDROID_VERSION_CODE: '108',
    });

    expect(config.iosBuildNumber).toBe('42');
    expect(config.androidVersionCode).toBe(108);
  });

  it('falls back to first versions when values are invalid', () => {
    const config = readBuildVersionConfig({
      IOS_BUILD_NUMBER: '',
      ANDROID_VERSION_CODE: '-3',
    });

    expect(config.iosBuildNumber).toBe('1');
    expect(config.androidVersionCode).toBe(1);
  });

  it('requires maps keys for production builds', () => {
    expect(
      shouldRequireMapsKeys({
        EXPO_PUBLIC_ENV: 'production',
      })
    ).toBe(true);

    const mapsConfig = readMapsBuildConfig(
      {
        ANDROID_GOOGLE_MAPS_API_KEY: '',
        IOS_GOOGLE_MAPS_API_KEY: '',
      },
      {
        requireKeys: true,
      }
    );

    expect(mapsConfig.isConfigured).toBe(false);
    expect(mapsConfig.missingKeys).toEqual(['ANDROID_GOOGLE_MAPS_API_KEY', 'IOS_GOOGLE_MAPS_API_KEY']);
  });

  it('allows missing maps keys outside release builds', () => {
    const mapsConfig = readMapsBuildConfig(
      {
        ANDROID_GOOGLE_MAPS_API_KEY: '',
        IOS_GOOGLE_MAPS_API_KEY: '',
      },
      {
        requireKeys: false,
      }
    );

    expect(mapsConfig.isConfigured).toBe(true);
    expect(mapsConfig.errorMessage).toBeNull();
  });
});
