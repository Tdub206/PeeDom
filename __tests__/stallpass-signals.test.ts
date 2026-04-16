import { describe, expect, it } from '@jest/globals';
import {
  getPredictionTone,
  getTrustBandLabel,
  normalizeContributorTrustTier,
  sanitizeStallPassEventProperties,
} from '@/lib/stallpass-signals';

describe('normalizeContributorTrustTier', () => {
  it('maps high-trust contributors into the power band', () => {
    expect(normalizeContributorTrustTier('highly_reliable_local')).toBe('power');
    expect(normalizeContributorTrustTier('business_verified_manager')).toBe('power');
  });

  it('maps mid-trust contributors into the normal band', () => {
    expect(normalizeContributorTrustTier('verified_contributor')).toBe('normal');
    expect(normalizeContributorTrustTier('lightly_trusted')).toBe('normal');
  });

  it('keeps brand-new and flagged contributors in newcomer', () => {
    expect(normalizeContributorTrustTier('brand_new')).toBe('newcomer');
    expect(normalizeContributorTrustTier('flagged_low_trust')).toBe('newcomer');
  });
});

describe('getTrustBandLabel', () => {
  it('returns readable contributor labels', () => {
    expect(getTrustBandLabel('power')).toBe('Power contributor');
    expect(getTrustBandLabel('normal')).toBe('Trusted contributor');
    expect(getTrustBandLabel('newcomer')).toBe('New contributor');
  });
});

describe('getPredictionTone', () => {
  it('returns strong when access and model confidence are both high', () => {
    expect(
      getPredictionTone({
        busy_level: 'moderate',
        predicted_access_confidence: 91,
        prediction_confidence: 80,
      })
    ).toBe('strong');
  });

  it('returns watch when the signal is usable but not fully reliable', () => {
    expect(
      getPredictionTone({
        busy_level: 'quiet',
        predicted_access_confidence: 68,
        prediction_confidence: 56,
      })
    ).toBe('watch');
  });

  it('returns uncertain when the signal is weak or busy', () => {
    expect(
      getPredictionTone({
        busy_level: 'busy',
        predicted_access_confidence: 82,
        prediction_confidence: 72,
      })
    ).toBe('uncertain');
  });
});

describe('sanitizeStallPassEventProperties', () => {
  it('keeps only serializable primitive event properties', () => {
    const sanitized = sanitizeStallPassEventProperties({
      bathroom_id: 'bathroom-1',
      results_count: 3,
      is_authenticated: true,
      nested: { nope: true } as never,
      skipped: undefined,
    });

    expect(sanitized).toEqual({
      bathroom_id: 'bathroom-1',
      results_count: 3,
      is_authenticated: true,
    });
  });
});
