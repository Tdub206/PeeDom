import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getCodeTrustSummary } from '@/lib/code-trust';

describe('getCodeTrustSummary', () => {
  const originalRelativeTimeFormatDescriptor = Object.getOwnPropertyDescriptor(Intl, 'RelativeTimeFormat');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-16T12:00:00.000Z'));
  });

  afterEach(() => {
    if (originalRelativeTimeFormatDescriptor) {
      Object.defineProperty(Intl, 'RelativeTimeFormat', originalRelativeTimeFormatDescriptor);
    }

    jest.useRealTimers();
  });

  it('returns an unknown trust state when no community signal exists', () => {
    const summary = getCodeTrustSummary({
      confidenceScore: null,
    });

    expect(summary.tone).toBe('unknown');
    expect(summary.score).toBe(0);
    expect(summary.approvalRatio).toBeNull();
    expect(summary.freshnessLabel).toBeNull();
    expect(summary.isStale).toBe(false);
  });

  it('falls back to the approval ratio when a stored confidence score is unavailable', () => {
    const summary = getCodeTrustSummary({
      confidenceScore: null,
      downVotes: 1,
      lastVerifiedAt: '2026-03-16T10:00:00.000Z',
      upVotes: 3,
    });

    expect(summary.score).toBe(75);
    expect(summary.approvalRatio).toBe(0.75);
    expect(summary.tone).toBe('medium');
    expect(summary.freshnessLabel).toContain('Verified');
  });

  it('marks stale trust when the last verification is older than ninety days', () => {
    const summary = getCodeTrustSummary({
      confidenceScore: 32,
      downVotes: 4,
      lastVerifiedAt: '2025-11-01T12:00:00.000Z',
      upVotes: 1,
    });

    expect(summary.tone).toBe('low');
    expect(summary.isStale).toBe(true);
  });

  it('uses the stored confidence score when it is available', () => {
    const summary = getCodeTrustSummary({
      confidenceScore: 94,
      downVotes: 1,
      lastVerifiedAt: '2026-03-16T11:30:00.000Z',
      upVotes: 12,
    });

    expect(summary.score).toBe(94);
    expect(summary.tone).toBe('high');
    expect(summary.totalVotes).toBe(13);
  });

  it('falls back when Intl.RelativeTimeFormat is unavailable', () => {
    Object.defineProperty(Intl, 'RelativeTimeFormat', {
      configurable: true,
      value: undefined,
    });

    const summary = getCodeTrustSummary({
      confidenceScore: null,
      downVotes: 1,
      lastVerifiedAt: '2026-03-16T10:00:00.000Z',
      upVotes: 3,
    });

    expect(summary.freshnessLabel).toBe('Verified 2 hours ago');
  });
});
