import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

const easReleaseWorkflow = readFileSync(
  path.join(process.cwd(), '.github', 'workflows', 'eas-release.yml'),
  'utf8'
);

describe('EAS release workflow', () => {
  it('wires Sentry upload secrets into the release environment', () => {
    expect(easReleaseWorkflow).toContain('SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}');
    expect(easReleaseWorkflow).toContain('SENTRY_ORG: ${{ secrets.SENTRY_ORG }}');
    expect(easReleaseWorkflow).toContain('SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}');
  });

  it('fails fast when Sentry is enabled without the upload secrets', () => {
    expect(easReleaseWorkflow).toContain('if [[ -n "${EXPO_PUBLIC_SENTRY_DSN}" ]]; then');
    expect(easReleaseWorkflow).toContain('SENTRY_AUTH_TOKEN');
    expect(easReleaseWorkflow).toContain('SENTRY_ORG');
    expect(easReleaseWorkflow).toContain('SENTRY_PROJECT');
  });

  it('wires AdMob rewarded code reveal configuration into release builds', () => {
    expect(easReleaseWorkflow).toContain(
      "EAS_BUILD_PLATFORM: ${{ github.event_name == 'workflow_dispatch' && inputs.platform || '' }}"
    );
    expect(easReleaseWorkflow).toContain('ANDROID_ADMOB_APP_ID: ${{ secrets.ANDROID_ADMOB_APP_ID }}');
    expect(easReleaseWorkflow).toContain('IOS_ADMOB_APP_ID: ${{ secrets.IOS_ADMOB_APP_ID }}');
    expect(easReleaseWorkflow).toContain(
      'EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID: ${{ secrets.EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID }}'
    );
    expect(easReleaseWorkflow).toContain(
      'EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED: ${{ secrets.EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED }}'
    );
  });

  it('fails fast when rewarded ads are enabled without SSV and platform ad ids', () => {
    expect(easReleaseWorkflow).toContain('rewarded_ads_enabled="${EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED:-true}"');
    expect(easReleaseWorkflow).toContain('EXPO_PUBLIC_ADMOB_REWARD_SSV_ENABLED must be true');
    expect(easReleaseWorkflow).toContain('ANDROID_ADMOB_APP_ID');
    expect(easReleaseWorkflow).toContain('IOS_ADMOB_APP_ID');
  });
});
