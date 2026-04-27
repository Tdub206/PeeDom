import { useQuery } from '@tanstack/react-query';
import { fetchSourceCandidateById, type SourceCandidateDetailRow } from '@/api/bathrooms';
import type { SourceCandidateDetail } from '@/types';
import { normalizeAccessibilityFeatures } from '@/utils/bathroom';

export const SOURCE_CANDIDATE_DETAIL_STALE_TIME_MS = 60_000;

export const sourceCandidateDetailQueryKey = (sourceRecordId: string | null) =>
  ['source-candidate-detail', sourceRecordId ?? 'unknown'] as const;

function buildAddress(detail: SourceCandidateDetailRow): SourceCandidateDetail['address'] {
  return {
    line1: detail.address_line1,
    city: detail.city,
    state: detail.state,
    postal_code: detail.postal_code,
    country_code: detail.country_code,
  };
}

function buildHoursData(hoursJson: SourceCandidateDetailRow['hours_json']): SourceCandidateDetail['hours'] {
  if (!hoursJson || typeof hoursJson !== 'object' || Array.isArray(hoursJson)) {
    return null;
  }

  const hoursData = Object.entries(hoursJson).reduce<Record<string, Array<{ open: string; close: string }>>>(
    (nextHours, [day, rawEntries]) => {
      if (!Array.isArray(rawEntries)) {
        return nextHours;
      }

      const entries = rawEntries.filter(
        (entry): entry is { open: string; close: string } =>
          Boolean(entry) &&
          typeof entry === 'object' &&
          !Array.isArray(entry) &&
          typeof (entry as { open?: unknown }).open === 'string' &&
          typeof (entry as { close?: unknown }).close === 'string'
      );

      if (!entries.length) {
        return nextHours;
      }

      nextHours[day] = entries;
      return nextHours;
    },
    {}
  );

  return Object.keys(hoursData).length > 0 ? hoursData : null;
}

function mapSourceCandidateDetailRow(row: SourceCandidateDetailRow): SourceCandidateDetail {
  return {
    source_record_id: row.source_record_id,
    canonical_bathroom_id: row.canonical_bathroom_id,
    place_name: row.place_name,
    address: buildAddress(row),
    coordinates: {
      latitude: row.latitude,
      longitude: row.longitude,
    },
    flags: {
      is_locked: row.is_locked,
      is_accessible: row.is_accessible,
      is_customer_only: row.is_customer_only,
    },
    hours: buildHoursData(row.hours_json),
    accessibility_features: normalizeAccessibilityFeatures(row.accessibility_features),
    accessibility_score: row.accessibility_score,
    show_on_free_map: row.show_on_free_map,
    location_archetype: row.location_archetype,
    archetype_metadata:
      row.archetype_metadata && typeof row.archetype_metadata === 'object' && !Array.isArray(row.archetype_metadata)
        ? { ...row.archetype_metadata }
        : {},
    origin_source_key: row.origin_source_key,
    origin_label: row.origin_label,
    origin_attribution_short: row.origin_attribution_short,
    source_dataset: row.source_dataset,
    source_license_key: row.source_license_key,
    source_url: row.source_url,
    source_updated_at: row.source_updated_at,
    source_status: row.source_status,
    source_last_verified_at: row.source_last_verified_at,
    source_confirmation_count: row.source_confirmation_count,
    source_denial_count: row.source_denial_count,
    source_weighted_confirmation_score: row.source_weighted_confirmation_score,
    source_weighted_denial_score: row.source_weighted_denial_score,
    source_freshness_status: row.source_freshness_status,
    source_needs_review: row.source_needs_review,
    can_favorite: row.can_favorite,
    can_submit_code: row.can_submit_code,
    can_report_live_status: row.can_report_live_status,
    can_claim_business: row.can_claim_business,
    sync: {
      cached_at: new Date().toISOString(),
      stale: false,
    },
  };
}

export function useSourceCandidateDetail(sourceRecordId: string | null) {
  return useQuery<SourceCandidateDetail | null, Error>({
    queryKey: sourceCandidateDetailQueryKey(sourceRecordId),
    enabled: Boolean(sourceRecordId),
    staleTime: SOURCE_CANDIDATE_DETAIL_STALE_TIME_MS,
    queryFn: async () => {
      if (!sourceRecordId) {
        return null;
      }

      const result = await fetchSourceCandidateById({
        sourceRecordId,
      });

      if (result.error) {
        throw result.error;
      }

      return result.data ? mapSourceCandidateDetailRow(result.data) : null;
    },
  });
}
