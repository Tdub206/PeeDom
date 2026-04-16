export interface BuildVersionConfig {
  iosBuildNumber: string;
  androidVersionCode: number;
}

export interface SentryBuildConfig {
  dsn: string;
  organization: string;
  project: string;
  authToken: string;
  url: string | null;
  enabled: boolean;
  missingSecrets: Array<'SENTRY_ORG' | 'SENTRY_PROJECT' | 'SENTRY_AUTH_TOKEN'>;
  isConfigured: boolean;
  errorMessage: string | null;
}

interface BuildEnvironment {
  EXPO_PUBLIC_ENV?: string;
  EAS_BUILD_PROFILE?: string;
  EAS_BUILD?: string;
  CI?: string;
  IOS_BUILD_NUMBER?: string;
  ANDROID_VERSION_CODE?: string;
  EXPO_PUBLIC_SENTRY_DSN?: string;
  SENTRY_ORG?: string;
  SENTRY_PROJECT?: string;
  SENTRY_AUTH_TOKEN?: string;
  SENTRY_URL?: string;
}

export function readBuildVersionConfig(env: BuildEnvironment): BuildVersionConfig;
export function shouldRequireSentryBuildSecrets(env: BuildEnvironment): boolean;
export function readSentryBuildConfig(
  env: Pick<BuildEnvironment, 'EXPO_PUBLIC_SENTRY_DSN' | 'SENTRY_ORG' | 'SENTRY_PROJECT' | 'SENTRY_AUTH_TOKEN' | 'SENTRY_URL'>,
  options?: { requireSecrets?: boolean }
): SentryBuildConfig;
