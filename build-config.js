function trimValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readBuildVersionConfig(env) {
  const iosBuildNumber = trimValue(env.IOS_BUILD_NUMBER) || '1';
  const parsedAndroidVersionCode = Number.parseInt(trimValue(env.ANDROID_VERSION_CODE) || '1', 10);
  const androidVersionCode =
    Number.isFinite(parsedAndroidVersionCode) && parsedAndroidVersionCode > 0 ? parsedAndroidVersionCode : 1;

  return {
    iosBuildNumber,
    androidVersionCode,
  };
}

function shouldRequireSentryBuildSecrets(env) {
  const hasSentryDsn = trimValue(env.EXPO_PUBLIC_SENTRY_DSN).length > 0;
  const isBuildEnvironment = trimValue(env.EAS_BUILD).length > 0 || trimValue(env.CI).toLowerCase() === 'true';

  return hasSentryDsn && isBuildEnvironment;
}

function readSentryBuildConfig(env, options) {
  const dsn = trimValue(env.EXPO_PUBLIC_SENTRY_DSN);
  const organization = trimValue(env.SENTRY_ORG);
  const project = trimValue(env.SENTRY_PROJECT);
  const authToken = trimValue(env.SENTRY_AUTH_TOKEN);
  const url = trimValue(env.SENTRY_URL) || null;
  const enabled = dsn.length > 0;
  const requireSecrets = options?.requireSecrets ?? false;
  const missingSecrets = enabled
    ? [
        !organization ? 'SENTRY_ORG' : null,
        !project ? 'SENTRY_PROJECT' : null,
        !authToken ? 'SENTRY_AUTH_TOKEN' : null,
      ].filter(Boolean)
    : [];

  return {
    dsn,
    organization,
    project,
    authToken,
    url,
    enabled,
    missingSecrets,
    isConfigured: !enabled || !requireSecrets || missingSecrets.length === 0,
    errorMessage:
      enabled && requireSecrets && missingSecrets.length > 0
        ? `Missing required Sentry build secrets: ${missingSecrets.join(', ')}.`
        : null,
  };
}

module.exports = {
  readBuildVersionConfig,
  readSentryBuildConfig,
  shouldRequireSentryBuildSecrets,
};
