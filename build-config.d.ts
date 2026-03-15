export interface BuildVersionConfig {
  iosBuildNumber: string;
  androidVersionCode: number;
}

export interface MapsBuildConfig {
  androidGoogleMapsApiKey: string;
  iosGoogleMapsApiKey: string;
  missingKeys: Array<'ANDROID_GOOGLE_MAPS_API_KEY' | 'IOS_GOOGLE_MAPS_API_KEY'>;
  isConfigured: boolean;
  errorMessage: string | null;
}

interface BuildEnvironment {
  EXPO_PUBLIC_ENV?: string;
  EAS_BUILD_PROFILE?: string;
  IOS_BUILD_NUMBER?: string;
  ANDROID_VERSION_CODE?: string;
  ANDROID_GOOGLE_MAPS_API_KEY?: string;
  IOS_GOOGLE_MAPS_API_KEY?: string;
}

export function readBuildVersionConfig(env: BuildEnvironment): BuildVersionConfig;
export function shouldRequireMapsKeys(env: BuildEnvironment): boolean;
export function readMapsBuildConfig(
  env: Pick<BuildEnvironment, 'ANDROID_GOOGLE_MAPS_API_KEY' | 'IOS_GOOGLE_MAPS_API_KEY'>,
  options?: { requireKeys?: boolean }
): MapsBuildConfig;
