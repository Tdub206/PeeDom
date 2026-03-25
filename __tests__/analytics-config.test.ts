import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_ANALYTICS_FLUSH_INTERVAL_MS,
  normalizeAnalyticsProperties,
  readAnalyticsRuntimeConfig,
} from '@/lib/analytics-config';

describe('readAnalyticsRuntimeConfig', () => {
  it('stays disabled when the endpoint is missing', () => {
    const config = readAnalyticsRuntimeConfig({
      EXPO_PUBLIC_ANALYTICS_ENABLED: 'true',
      EXPO_PUBLIC_ANALYTICS_ENDPOINT: '',
    });

    expect(config.enabled).toBe(false);
    expect(config.endpoint).toBe('');
    expect(config.flushIntervalMs).toBe(DEFAULT_ANALYTICS_FLUSH_INTERVAL_MS);
  });

  it('enables analytics when the flag and endpoint are both present', () => {
    const config = readAnalyticsRuntimeConfig({
      EXPO_PUBLIC_ANALYTICS_ENABLED: 'true',
      EXPO_PUBLIC_ANALYTICS_ENDPOINT: 'https://analytics.example.com/ingest',
      EXPO_PUBLIC_ANALYTICS_WRITE_KEY: 'write-key',
      EXPO_PUBLIC_ANALYTICS_FLUSH_INTERVAL_MS: '25000',
    });

    expect(config.enabled).toBe(true);
    expect(config.endpoint).toBe('https://analytics.example.com/ingest');
    expect(config.writeKey).toBe('write-key');
    expect(config.flushIntervalMs).toBe(25000);
  });
});

describe('normalizeAnalyticsProperties', () => {
  it('strips undefined values and blank keys', () => {
    expect(
      normalizeAnalyticsProperties({
        retained_boolean: true,
        retained_number: 4,
        retained_string: 'value',
        retained_null: null,
        removed: undefined,
        '': 'ignored',
      })
    ).toEqual({
      retained_boolean: true,
      retained_number: 4,
      retained_null: null,
      retained_string: 'value',
    });
  });
});
