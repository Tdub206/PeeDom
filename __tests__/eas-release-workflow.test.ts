import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

const easReleaseWorkflow = readFileSync(
  path.join(process.cwd(), '.github', 'workflows', 'eas-release.yml'),
  'utf8'
);

describe('EAS release workflow', () => {
  it('uses EAS-managed environment variables for production release secrets', () => {
    expect(easReleaseWorkflow).toContain('eas env:list "${environment}" --format short > eas-env.txt');
    expect(easReleaseWorkflow).toContain('"ANDROID_GOOGLE_MAPS_API_KEY"');
    expect(easReleaseWorkflow).toContain('"EXPO_PUBLIC_SUPABASE_URL"');
    expect(easReleaseWorkflow).toContain('"EXPO_PUBLIC_SUPABASE_ANON_KEY"');
    expect(easReleaseWorkflow).toContain('"EXPO_PUBLIC_SENTRY_DSN"');
    expect(easReleaseWorkflow).toContain('"SENTRY_AUTH_TOKEN"');
    expect(easReleaseWorkflow).toContain('"SENTRY_ORG"');
    expect(easReleaseWorkflow).toContain('"SENTRY_PROJECT"');
  });

  it('fails fast when required EAS environment variables are missing', () => {
    expect(easReleaseWorkflow).toContain('if ! grep -q "^${var}=" eas-env.txt; then');
    expect(easReleaseWorkflow).toContain('echo "::error::${var} is missing from the EAS ${environment} environment."');
    expect(easReleaseWorkflow).toContain('exit "${missing}"');
  });

  it('evaluates Expo config and build commands inside the selected EAS environment', () => {
    expect(easReleaseWorkflow).toContain(
      'eas env:exec "${{ steps.release_args.outputs.eas_environment }}" "npx expo config --type public > /dev/null" --non-interactive'
    );
    expect(easReleaseWorkflow).toContain(
      'eas env:exec "${{ steps.release_args.outputs.eas_environment }}" "${command}" --non-interactive'
    );
  });

  it('checks store metadata and artwork before triggering EAS builds', () => {
    expect(easReleaseWorkflow).toContain('npm run store:ready');
    expect(easReleaseWorkflow).toContain('npm run store:metadata:lint');
  });

  it('auto-submits tagged production releases only', () => {
    expect(easReleaseWorkflow).toContain('if [[ "${GITHUB_REF}" == refs/tags/* ]]; then');
    expect(easReleaseWorkflow).toContain('auto_submit="true"');
    expect(easReleaseWorkflow).toContain('elif [[ "${GITHUB_EVENT_NAME}" == "push" && "${GITHUB_REF}" == "refs/heads/main" ]]; then');
    expect(easReleaseWorkflow).toContain('auto_submit="false"');
    expect(easReleaseWorkflow).not.toContain('pull_request:');
  });
});
