import { describe, expect, it } from '@jest/globals';
import {
  buildBathroomTrustSummary,
  formatConfirmationRecencyLabel,
} from '@/lib/restroom-intelligence/trust-summary';
import {
  formatLiveStatusSummary,
  getLiveStatusHeadline,
  mapLegacyStatusToRichLiveStatus,
} from '@/lib/restroom-intelligence/live-status-summary';
import {
  applyNeedProfilePresetToFilters,
  hydrateNeedProfileFilters,
} from '@/lib/restroom-intelligence/need-profiles';
import { defaultFilters } from '@/store/useFilterStore';
import type { CurrentBathroomLiveStatus } from '@/api/restroom-intelligence';
import type { BathroomAttributeConfirmation } from '@/types';

function buildConfirmation(
  input: Partial<BathroomAttributeConfirmation> & Pick<BathroomAttributeConfirmation, 'field_name' | 'last_confirmed_at'>
): BathroomAttributeConfirmation {
  return {
    id: `${input.field_name}-confirmation`,
    bathroom_id: 'bathroom-1',
    field_value_snapshot: { value: true },
    source_type: 'user_report',
    source_user_id: 'user-1',
    business_id: null,
    confidence_score: 0.62,
    evidence_photo_url: null,
    notes: null,
    created_at: input.last_confirmed_at,
    updated_at: input.last_confirmed_at,
    ...input,
  };
}

function buildStatus(input: Partial<CurrentBathroomLiveStatus>): CurrentBathroomLiveStatus {
  return {
    id: input.id ?? 'status-1',
    bathroom_id: 'bathroom-1',
    user_id: 'user-1',
    status_type: input.status_type ?? 'cleanliness',
    status_value: input.status_value ?? 'clean',
    wait_minutes: input.wait_minutes ?? null,
    occupancy_level: input.occupancy_level ?? null,
    supplies_missing: input.supplies_missing ?? [],
    reported_at: input.reported_at ?? '2026-04-18T12:00:00.000Z',
    expires_at: input.expires_at ?? '2026-04-18T14:00:00.000Z',
    confidence_score: input.confidence_score ?? 0.8,
    evidence_photo_url: input.evidence_photo_url ?? null,
    created_at: input.created_at ?? '2026-04-18T12:00:00.000Z',
    minutes_since_report: input.minutes_since_report ?? 5,
    summary_text: input.summary_text ?? '',
  };
}

describe('restroom intelligence utilities', () => {
  it('builds verified trust summaries and separates stale fields', () => {
    const now = new Date('2026-04-18T12:00:00.000Z');
    const summary = buildBathroomTrustSummary(
      [
        buildConfirmation({
          field_name: 'access_type',
          last_confirmed_at: '2026-04-18T10:00:00.000Z',
          source_type: 'business_verified',
          confidence_score: 0.83,
        }),
        buildConfirmation({
          field_name: 'has_soap',
          last_confirmed_at: '2026-03-01T10:00:00.000Z',
          confidence_score: 0.45,
        }),
      ],
      {
        now,
        staleWindowHours: 24 * 14,
      }
    );

    expect(summary.lastConfirmedAt).toBe('2026-04-18T10:00:00.000Z');
    expect(summary.freshFields).toContain('access_type');
    expect(summary.staleFields).toContain('has_soap');
    expect(summary.warningLevel).toBe('mixed');
    expect(summary.sourceTrail[0]?.sourceType).toBe('business_verified');
  });

  it('formats confirmation recency labels for urgent UI surfaces', () => {
    const now = new Date('2026-04-18T12:00:00.000Z');

    expect(formatConfirmationRecencyLabel('2026-04-18T11:42:00.000Z', now)).toBe('Confirmed 18 min ago');
    expect(formatConfirmationRecencyLabel('2026-04-01T12:00:00.000Z', now)).toBe('Stale');
  });

  it('formats and ranks short-horizon live status signals', () => {
    const headline = getLiveStatusHeadline([
      buildStatus({
        id: 'older-clean',
        status_type: 'cleanliness',
        status_value: 'clean',
        minutes_since_report: 40,
        confidence_score: 0.65,
      }),
      buildStatus({
        id: 'fresh-line',
        status_type: 'line',
        status_value: 'long_wait',
        minutes_since_report: 6,
        confidence_score: 0.9,
      }),
    ]);

    expect(formatLiveStatusSummary(buildStatus({ status_type: 'supplies', minutes_since_report: 11 }))).toBe(
      'supplies missing 11 minutes ago'
    );
    expect(headline).toBe('line reported 6 minutes ago');
    expect(mapLegacyStatusToRichLiveStatus('long_wait')).toEqual({
      statusType: 'line',
      statusValue: 'long_wait',
      waitMinutes: 15,
    });
  });

  it('sanitizes saved need profiles and applies presets deterministically', () => {
    const hydrated = hydrateNeedProfileFilters(
      {
        openNow: true,
        noCodeRequired: 'yes',
        minDoorWidth: 32,
        minCleanlinessRating: Number.NaN,
      },
      defaultFilters
    );
    const noCodeFilters = applyNeedProfilePresetToFilters(defaultFilters, 'no_code');

    expect(hydrated.openNow).toBe(true);
    expect(hydrated.noCodeRequired).toBeNull();
    expect(hydrated.minDoorWidth).toBe(32);
    expect(hydrated.minCleanlinessRating).toBeNull();
    expect(noCodeFilters.noCodeRequired).toBe(true);
    expect(noCodeFilters.openNow).toBe(true);
  });
});
