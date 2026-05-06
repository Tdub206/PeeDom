import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

const appConfigSource = readFileSync(path.join(process.cwd(), 'app.config.ts'), 'utf8');
const gitignoreSource = readFileSync(path.join(process.cwd(), '.gitignore'), 'utf8');
const easignoreSource = readFileSync(path.join(process.cwd(), '.easignore'), 'utf8');

describe('Sentry build guard', () => {
  it('wires the Sentry auth token from environment into the Expo plugin', () => {
    expect(appConfigSource).toContain('authToken: sentryBuildConfig.authToken || undefined');
  });

  it('keeps local sentry.properties files out of git and EAS uploads', () => {
    expect(gitignoreSource).toContain('sentry.properties');
    expect(easignoreSource).toContain('sentry.properties');
  });
});

describe('AdMob production build guard', () => {
  it('requires server-side verification before production rewarded ads can ship', () => {
    expect(appConfigSource).toContain('EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED?.trim() !== \'true\'');
    expect(appConfigSource).toContain(
      'Missing required environment variable for production build: EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED=true'
    );
  });

  it('allows platform-specific AdMob app IDs for Android-only or iOS-only EAS builds', () => {
    expect(appConfigSource).toContain("if (easBuildPlatform !== 'ios')");
    expect(appConfigSource).toContain("if (easBuildPlatform !== 'android')");
    expect(appConfigSource).toContain('readRequiredEnv(\'ANDROID_ADMOB_APP_ID\')');
    expect(appConfigSource).toContain('readRequiredEnv(\'IOS_ADMOB_APP_ID\')');
  });
});
