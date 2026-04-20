import { describe, expect, it } from '@jest/globals';

import {
  readBuildVersionConfig,
  readSentryBuildConfig,
  shouldRequireSentryBuildSecrets,
} from '../build-config';

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

  it('requires Sentry upload secrets when a build runs with Sentry enabled', () => {
    expect(
      shouldRequireSentryBuildSecrets({
        EXPO_PUBLIC_SENTRY_DSN: 'https://example@sentry.io/123',
        CI: 'true',
      })
    ).toBe(true);

    const sentryConfig = readSentryBuildConfig(
      {
        EXPO_PUBLIC_SENTRY_DSN: 'https://example@sentry.io/123',
        SENTRY_AUTH_TOKEN: '',
        SENTRY_ORG: '',
        SENTRY_PROJECT: '',
        SENTRY_URL: '',
      },
      {
        requireSecrets: true,
      }
    );

    expect(sentryConfig.enabled).toBe(true);
    expect(sentryConfig.isConfigured).toBe(false);
    expect(sentryConfig.missingSecrets).toEqual(['SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN']);
    expect(sentryConfig.errorMessage).toBe('Missing required Sentry build secrets: SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN.');
  });

  it('does not require Sentry upload secrets when Sentry is disabled', () => {
    expect(
      shouldRequireSentryBuildSecrets({
        EXPO_PUBLIC_SENTRY_DSN: '',
        CI: 'true',
      })
    ).toBe(false);

    const sentryConfig = readSentryBuildConfig(
      {
        EXPO_PUBLIC_SENTRY_DSN: '',
        SENTRY_AUTH_TOKEN: '',
        SENTRY_ORG: '',
        SENTRY_PROJECT: '',
        SENTRY_URL: '',
      },
      {
        requireSecrets: true,
      }
    );

    expect(sentryConfig.enabled).toBe(false);
    expect(sentryConfig.isConfigured).toBe(true);
    expect(sentryConfig.errorMessage).toBeNull();
  });
});
