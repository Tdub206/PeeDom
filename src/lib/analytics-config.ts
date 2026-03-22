export const DEFAULT_ANALYTICS_FLUSH_INTERVAL_MS = 15000;

const TRUTHY_ENV_VALUES = new Set(['1', 'true', 'yes', 'on']);

export type AnalyticsEnvKey =
  | 'EXPO_PUBLIC_ANALYTICS_ENABLED'
  | 'EXPO_PUBLIC_ANALYTICS_ENDPOINT'
  | 'EXPO_PUBLIC_ANALYTICS_WRITE_KEY'
  | 'EXPO_PUBLIC_ANALYTICS_FLUSH_INTERVAL_MS';

export type AnalyticsPropertyPrimitive = string | number | boolean | null;
export type AnalyticsPropertyInput = AnalyticsPropertyPrimitive | undefined;
export type AnalyticsPropertyMap = Record<string, AnalyticsPropertyPrimitive>;

export interface AnalyticsRuntimeConfig {
  enabled: boolean;
  endpoint: string;
  writeKey: string | null;
  flushIntervalMs: number;
}

function readBooleanEnv(value: string | undefined): boolean {
  return TRUTHY_ENV_VALUES.has(value?.trim().toLowerCase() ?? '');
}

function readPositiveInteger(value: string | undefined, fallbackValue: number): number {
  const parsedValue = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallbackValue;
  }

  return parsedValue;
}

export function readAnalyticsRuntimeConfig(
  env: Partial<Record<AnalyticsEnvKey, string | undefined>>
): AnalyticsRuntimeConfig {
  const endpoint = env.EXPO_PUBLIC_ANALYTICS_ENDPOINT?.trim() ?? '';
  const enabled = readBooleanEnv(env.EXPO_PUBLIC_ANALYTICS_ENABLED) && endpoint.length > 0;

  return {
    enabled,
    endpoint,
    writeKey: env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY?.trim() || null,
    flushIntervalMs: readPositiveInteger(
      env.EXPO_PUBLIC_ANALYTICS_FLUSH_INTERVAL_MS,
      DEFAULT_ANALYTICS_FLUSH_INTERVAL_MS
    ),
  };
}

export function normalizeAnalyticsProperties(
  properties: Record<string, AnalyticsPropertyInput>
): AnalyticsPropertyMap {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => key.trim().length > 0 && typeof value !== 'undefined')
  ) as AnalyticsPropertyMap;
}
