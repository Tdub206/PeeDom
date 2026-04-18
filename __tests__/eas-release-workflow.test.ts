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
});
