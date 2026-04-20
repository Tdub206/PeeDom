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
