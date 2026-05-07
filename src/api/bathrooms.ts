import { z } from 'zod';
import { BathroomFilters, Coordinates, RegionBounds } from '@/types';
import {
  canonicalBathroomDetailRowSchema,
  cityBrowseRowSchema,
  directoryListingRowSchema,
  nearbyBathroomRowSchema,
  parseSupabaseNullableRow,
  parseSupabaseRows,
  publicBathroomDetailRowSchema,
  sourceCandidateDetailRowSchema,
  searchBathroomRowSchema,
  searchSuggestionRowSchema,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';
import {
  applyBathroomFilters,
  calculateDistanceMeters,
  computeRegionRadiusMeters,
  getRegionBounds,
  hasActiveBathroomFilters,
  sortBathroomsByDistance,
  sortBathroomsByFilters,
  type BathroomDirectoryRow,
} from '@/utils/bathroom';
import { groupCityBrowseRows } from '@/utils/search';
import { isMissingRpcError } from '@/utils/network';

export type LegacyPublicBathroomDetailRow = z.infer<typeof publicBathroomDetailRowSchema>;
export type CanonicalBathroomDetailRow = z.infer<typeof canonicalBathroomDetailRowSchema>;
export type PublicBathroomDetailRow = CanonicalBathroomDetailRow;
export type DirectoryListingRow = z.infer<typeof directoryListingRowSchema>;
export type SourceCandidateDetailRow = z.infer<typeof sourceCandidateDetailRowSchema>;
export type NearbyBathroomRow = z.infer<typeof nearbyBathroomRowSchema>;
export type SearchBathroomRow = z.infer<typeof searchBathroomRowSchema>;
export type CityBrowseRow = z.infer<typeof cityBrowseRowSchema>;
export type SearchSuggestionRow = z.infer<typeof searchSuggestionRowSchema>;

interface NearbyBathroomsOptions {
  region: RegionBounds;
  filters: BathroomFilters;
}

interface SearchBathroomsOptions {
  query: string;
  filters: BathroomFilters;
  origin?: Coordinates | null;
  radiusMeters?: number;
  hasCode?: boolean | null;
  limit?: number;
  offset?: number;
}

interface BathroomsByIdOptions {
  bathroomIds: string[];
  origin?: Coordinates | null;
}

interface SourceCandidateByIdOptions {
  sourceRecordId: string;
}

interface CityBrowseOptions {
  limit?: number;
}

interface SearchSuggestionsOptions {
  query: string;
  origin?: Coordinates | null;
  limit?: number;
}

interface ApiErrorShape {
  code?: string;
  message: string;
}

function toAppError(error: ApiErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = 'code' in error ? error.code : undefined;
  return appError;
}

function buildSearchPattern(query: string): string {
  const normalizedQuery = query.trim().replace(/[%_']/g, '').replace(/\s+/g, ' ');
  return `%${normalizedQuery}%`;
}

function buildApproximateRadiusBounds(origin: Coordinates, radiusMeters: number) {
  const latitudeDelta = radiusMeters / 111320;
  const longitudeDivisor = Math.max(Math.cos((origin.latitude * Math.PI) / 180), 0.1);
  const longitudeDelta = radiusMeters / (111320 * longitudeDivisor);

  return {
    minLatitude: origin.latitude - latitudeDelta,
    maxLatitude: origin.latitude + latitudeDelta,
    minLongitude: origin.longitude - longitudeDelta,
    maxLongitude: origin.longitude + longitudeDelta,
  };
}

function getArchetypeMetadataRecord(
  value: LegacyPublicBathroomDetailRow['archetype_metadata']
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value;
}

function getArchetypeMetadataText(
  value: LegacyPublicBathroomDetailRow['archetype_metadata'],
  key: string
): string | null {
  const metadata = getArchetypeMetadataRecord(value);
  const rawValue = metadata[key];

  return typeof rawValue === 'string' && rawValue.trim().length > 0 ? rawValue.trim() : null;
}

function decorateLegacyBathroomDetailRow(
  row: LegacyPublicBathroomDetailRow
): CanonicalBathroomDetailRow {
  const importSource = getArchetypeMetadataText(row.archetype_metadata, 'import_source');
  const sourceDataset = getArchetypeMetadataText(row.archetype_metadata, 'source_dataset');
  const sourceUrl = getArchetypeMetadataText(row.archetype_metadata, 'website');
  const sourceTimestamp =
    getArchetypeMetadataText(row.archetype_metadata, 'source_timestamp') ??
    getArchetypeMetadataText(row.archetype_metadata, 'last_edited_at');
  const originLabel =
    importSource === 'osm-overpass-us'
      ? 'OpenStreetMap import'
      : importSource === 'seattle-parks'
        ? 'Seattle Parks import'
        : importSource
          ? importSource
              .split('-')
              .filter((segment) => segment.length > 0)
              .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
              .join(' ')
          : null;
  const originAttributionShort =
    importSource === 'osm-overpass-us'
      ? 'OpenStreetMap contributors'
      : sourceDataset;
  const sourceLicenseKey = importSource === 'osm-overpass-us' ? 'ODbL-1.0' : null;

  return {
    ...row,
    origin_source_key: importSource,
    origin_label: originLabel,
    origin_attribution_short: originAttributionShort,
    source_dataset: sourceDataset,
    source_license_key: sourceLicenseKey,
    source_url: sourceUrl,
    source_updated_at: sourceTimestamp,
    source_last_verified_at: row.imported_location_last_verified_at ?? null,
    source_confirmation_count: row.imported_location_confirmation_count ?? 0,
    source_denial_count: row.imported_location_denial_count ?? 0,
    source_weighted_confirmation_score: row.imported_location_weighted_confirmation_score ?? 0,
    source_weighted_denial_score: row.imported_location_weighted_denial_score ?? 0,
    source_freshness_status: row.imported_location_freshness_status ?? null,
    source_needs_review: row.imported_location_needs_review ?? false,
  };
}

function decorateLegacyDirectoryRow(
  row: LegacyPublicBathroomDetailRow
): BathroomDirectoryRow {
  const detailRow = decorateLegacyBathroomDetailRow(row);

  return normalizeDirectoryListingRow({
    listing_kind: 'canonical',
    bathroom_id: detailRow.id,
    source_record_id: null,
    place_name: detailRow.place_name,
    address_line1: detailRow.address_line1,
    city: detailRow.city,
    state: detailRow.state,
    postal_code: detailRow.postal_code,
    country_code: detailRow.country_code,
    latitude: detailRow.latitude,
    longitude: detailRow.longitude,
    is_locked: detailRow.is_locked,
    is_accessible: detailRow.is_accessible,
    is_customer_only: detailRow.is_customer_only,
    accessibility_features: detailRow.accessibility_features,
    accessibility_score: detailRow.accessibility_score,
    hours_json: detailRow.hours_json,
    code_id: detailRow.code_id,
    confidence_score: detailRow.confidence_score,
    up_votes: detailRow.up_votes,
    down_votes: detailRow.down_votes,
    last_verified_at: detailRow.last_verified_at,
    expires_at: detailRow.expires_at,
    cleanliness_avg: detailRow.cleanliness_avg,
    updated_at: detailRow.updated_at,
    verification_badge_type: detailRow.verification_badge_type,
    stallpass_access_tier: detailRow.stallpass_access_tier,
    show_on_free_map: detailRow.show_on_free_map,
    is_business_location_verified: detailRow.is_business_location_verified,
    location_verified_at: detailRow.location_verified_at,
    active_offer_count: detailRow.active_offer_count,
    location_archetype: detailRow.location_archetype,
    archetype_metadata: detailRow.archetype_metadata,
    code_policy: detailRow.code_policy,
    allow_user_code_submissions: detailRow.allow_user_code_submissions,
    has_official_code: detailRow.has_official_code,
    owner_code_last_verified_at: detailRow.owner_code_last_verified_at,
    official_access_instructions: detailRow.official_access_instructions,
    origin_source_key: detailRow.origin_source_key,
    origin_label: detailRow.origin_label,
    origin_attribution_short: detailRow.origin_attribution_short,
    source_dataset: detailRow.source_dataset,
    source_license_key: detailRow.source_license_key,
    source_url: detailRow.source_url,
    source_updated_at: detailRow.source_updated_at,
    source_last_verified_at: detailRow.source_last_verified_at,
    source_confirmation_count: detailRow.source_confirmation_count,
    source_denial_count: detailRow.source_denial_count,
    source_weighted_confirmation_score: detailRow.source_weighted_confirmation_score,
    source_weighted_denial_score: detailRow.source_weighted_denial_score,
    source_freshness_status: detailRow.source_freshness_status,
    source_needs_review: detailRow.source_needs_review,
    can_favorite: true,
    can_submit_code: true,
    can_report_live_status: true,
    can_claim_business: true,
    distance_meters: null,
    rank: 0,
  });
}

function normalizeDirectoryListingRow(row: DirectoryListingRow): BathroomDirectoryRow {
  return {
    ...row,
    code_policy: row.code_policy ?? undefined,
  };
}

async function fetchNearbyBathroomsFallback(
  options: NearbyBathroomsOptions
): Promise<{ data: BathroomDirectoryRow[]; error: (Error & { code?: string }) | null }> {
  try {
    const bounds = getRegionBounds(options.region);
    let query = getSupabaseClient()
      .from('v_bathroom_detail_public')
      .select('*')
      .gte('latitude', bounds.minLatitude)
      .lte('latitude', bounds.maxLatitude)
      .gte('longitude', bounds.minLongitude)
      .lte('longitude', bounds.maxLongitude)
      .order('updated_at', { ascending: false })
      .limit(150);

    if (options.filters.isAccessible) {
      query = query.eq('is_accessible', true);
    }

    if (options.filters.isLocked) {
      query = query.eq('is_locked', true);
    }

    if (options.filters.isCustomerOnly) {
      query = query.eq('is_customer_only', true);
    }

    const { data, error } = await query;

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load nearby bathrooms.'),
      };
    }

    const parsedData = parseSupabaseRows(
      publicBathroomDetailRowSchema,
      data,
      'bathroom directory',
      'Unable to load nearby bathrooms.'
    );

    if (parsedData.error) {
      return {
        data: [],
        error: parsedData.error,
      };
    }

    return {
      data: applyBathroomFilters(
        (parsedData.data as LegacyPublicBathroomDetailRow[]).map(decorateLegacyDirectoryRow),
        options.filters
      ),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load nearby bathrooms.'),
        'Unable to load nearby bathrooms.'
      ),
    };
  }
}

export async function fetchBathroomDetailById(
  bathroomId: string
): Promise<{ data: CanonicalBathroomDetailRow | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'get_canonical_bathroom_detail' as never,
      {
        p_bathroom_id: bathroomId,
      } as never
    );

    if (error) {
      if (isMissingRpcError(error)) {
        const fallbackResult = await getSupabaseClient()
          .from('v_bathroom_detail_public')
          .select('*')
          .eq('id', bathroomId)
          .maybeSingle();

        if (fallbackResult.error) {
          return {
            data: null,
            error: toAppError(fallbackResult.error, 'Unable to load bathroom details.'),
          };
        }

        if (!fallbackResult.data) {
          return {
            data: null,
            error: toAppError({ code: 'PGRST116', message: 'That bathroom could not be found.' }, 'That bathroom could not be found.'),
          };
        }

        const parsedFallback = parseSupabaseNullableRow(
          publicBathroomDetailRowSchema,
          fallbackResult.data,
          'bathroom detail',
          'Unable to load bathroom details.'
        );

        if (parsedFallback.error) {
          return {
            data: null,
            error: parsedFallback.error,
          };
        }

        return {
          data: parsedFallback.data ? decorateLegacyBathroomDetailRow(parsedFallback.data as LegacyPublicBathroomDetailRow) : null,
          error: null,
        };
      }

      return {
        data: null,
        error: toAppError(error, 'Unable to load bathroom details.'),
      };
    }

    const firstRow = Array.isArray(data) ? data[0] ?? null : data;

    if (!firstRow) {
      return {
        data: null,
        error: toAppError({ code: 'PGRST116', message: 'That bathroom could not be found.' }, 'That bathroom could not be found.'),
      };
    }

    const parsedData = parseSupabaseNullableRow(
      canonicalBathroomDetailRowSchema,
      firstRow,
      'bathroom detail',
      'Unable to load bathroom details.'
    );

    if (parsedData.error) {
      return {
        data: null,
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as CanonicalBathroomDetailRow,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load bathroom details.'),
        'Unable to load bathroom details.'
      ),
    };
  }
}

export async function fetchSourceCandidateById(
  options: SourceCandidateByIdOptions
): Promise<{ data: SourceCandidateDetailRow | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'get_source_candidate_detail' as never,
      {
        p_source_record_id: options.sourceRecordId,
      } as never
    );

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load this source candidate.'),
      };
    }

    const firstRow = Array.isArray(data) ? data[0] ?? null : data;

    if (!firstRow) {
      return {
        data: null,
        error: toAppError({ code: 'PGRST116', message: 'That source candidate could not be found.' }, 'That source candidate could not be found.'),
      };
    }

    const parsedData = parseSupabaseNullableRow(
      sourceCandidateDetailRowSchema,
      firstRow,
      'source candidate detail',
      'Unable to load this source candidate.'
    );

    if (parsedData.error) {
      return {
        data: null,
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as SourceCandidateDetailRow,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load this source candidate.'),
        'Unable to load this source candidate.'
      ),
    };
  }
}

export async function fetchBathroomsNearRegion(
  options: NearbyBathroomsOptions
): Promise<{ data: BathroomDirectoryRow[]; error: (Error & { code?: string }) | null }> {
  const radiusMeters = Math.max(500, Math.ceil(computeRegionRadiusMeters(options.region)));

  try {
    const { data, error } = await getSupabaseClient().rpc(
      'get_directory_listings_near' as never,
      {
        lat: options.region.latitude,
        lng: options.region.longitude,
        radius_m: radiusMeters,
      } as never
    );

    if (error) {
      if (!isMissingRpcError(error)) {
        return {
          data: [],
          error: toAppError(error, 'Unable to load nearby bathrooms.'),
        };
      }

      return fetchNearbyBathroomsFallback(options);
    }

    const parsedData = parseSupabaseRows(
      directoryListingRowSchema,
      data,
      'nearby bathrooms',
      'Unable to load nearby bathrooms.'
    );

    if (parsedData.error) {
      return {
        data: [],
        error: parsedData.error,
      };
    }

    return {
      data: sortBathroomsByFilters(
        applyBathroomFilters(
          (parsedData.data as DirectoryListingRow[]).map(normalizeDirectoryListingRow),
          options.filters
        ),
        options.filters,
        {
          latitude: options.region.latitude,
          longitude: options.region.longitude,
        }
      ),
      error: null,
    };
  } catch (error) {
    const fallbackResult = await fetchNearbyBathroomsFallback(options);

    if (!fallbackResult.error) {
      return {
        data: sortBathroomsByFilters(fallbackResult.data, options.filters, {
          latitude: options.region.latitude,
          longitude: options.region.longitude,
        }),
        error: null,
      };
    }

    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load nearby bathrooms.'),
        'Unable to load nearby bathrooms.'
      ),
    };
  }
}

export async function searchBathrooms(
  options: SearchBathroomsOptions
): Promise<{ data: BathroomDirectoryRow[]; error: (Error & { code?: string }) | null }> {
  const trimmedQuery = options.query.trim();
  const hasOrigin = Boolean(options.origin);
  const hasFilterDrivenNearbySearch =
    hasOrigin &&
    (hasActiveBathroomFilters(options.filters) ||
      typeof options.hasCode === 'boolean' ||
      typeof options.radiusMeters === 'number');

  if (trimmedQuery.length < 2 && !hasFilterDrivenNearbySearch) {
    if (!hasOrigin) {
      return {
        data: [],
        error: null,
      };
    }

    return searchBathroomsFallback(options);
  }

  try {
    const directoryRpcResult = await getSupabaseClient().rpc(
      'search_directory_listings' as never,
      {
        p_query: trimmedQuery.length >= 2 ? trimmedQuery : null,
        p_user_lat: options.origin?.latitude ?? null,
        p_user_lng: options.origin?.longitude ?? null,
        p_radius_meters: options.radiusMeters ?? 8047,
        p_is_accessible: options.filters.isAccessible,
        p_is_locked: options.filters.isLocked,
        p_has_code: options.hasCode ?? null,
        p_is_customer_only: options.filters.isCustomerOnly,
        p_limit: options.limit ?? 25,
        p_offset: options.offset ?? 0,
      } as never
    );

    if (!directoryRpcResult.error) {
      const parsedData = parseSupabaseRows(
        directoryListingRowSchema,
        directoryRpcResult.data,
        'search bathrooms',
        'Unable to search bathrooms.'
      );

      if (parsedData.error) {
        return {
          data: [],
          error: parsedData.error,
        };
      }

      return {
        data: applyBathroomFilters(
          (parsedData.data as DirectoryListingRow[]).map(normalizeDirectoryListingRow),
          options.filters
        ),
        error: null,
      };
    }

    if (!isMissingRpcError(directoryRpcResult.error)) {
      return {
        data: [],
        error: toAppError(directoryRpcResult.error, 'Unable to search bathrooms.'),
      };
    }

    const legacyRpcResult = await getSupabaseClient().rpc(
      'search_bathrooms' as never,
      {
        p_query: trimmedQuery.length >= 2 ? trimmedQuery : null,
        p_user_lat: options.origin?.latitude ?? null,
        p_user_lng: options.origin?.longitude ?? null,
        p_radius_meters: options.radiusMeters ?? 8047,
        p_is_accessible: options.filters.isAccessible,
        p_is_locked: options.filters.isLocked,
        p_has_code: options.hasCode ?? null,
        p_is_customer_only: options.filters.isCustomerOnly,
        p_limit: options.limit ?? 25,
        p_offset: options.offset ?? 0,
      } as never
    );

    if (!legacyRpcResult.error) {
      const parsedData = parseSupabaseRows(
        searchBathroomRowSchema,
        legacyRpcResult.data,
        'search bathrooms',
        'Unable to search bathrooms.'
      );

      if (parsedData.error) {
        return {
          data: [],
          error: parsedData.error,
        };
      }

      return {
        data: applyBathroomFilters(parsedData.data as SearchBathroomRow[], options.filters),
        error: null,
      };
    }

    if (!isMissingRpcError(legacyRpcResult.error)) {
      return {
        data: [],
        error: toAppError(legacyRpcResult.error, 'Unable to search bathrooms.'),
      };
    }

    return searchBathroomsFallback(options);
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to search bathrooms.'),
        'Unable to search bathrooms.'
      ),
    };
  }
}

async function searchBathroomsFallback(
  options: SearchBathroomsOptions
): Promise<{ data: BathroomDirectoryRow[]; error: (Error & { code?: string }) | null }> {
  try {
    let query = getSupabaseClient()
      .from('v_bathroom_detail_public')
      .select('*')
      .order('updated_at', { ascending: false })
      .range(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 25) - 1);

    if (options.origin) {
      const radiusBounds = buildApproximateRadiusBounds(options.origin, options.radiusMeters ?? 8047);
      query = query
        .gte('latitude', radiusBounds.minLatitude)
        .lte('latitude', radiusBounds.maxLatitude)
        .gte('longitude', radiusBounds.minLongitude)
        .lte('longitude', radiusBounds.maxLongitude);
    }

    if (options.filters.isAccessible) {
      query = query.eq('is_accessible', true);
    }

    if (options.filters.isLocked) {
      query = query.eq('is_locked', true);
    }

    if (options.filters.isCustomerOnly) {
      query = query.eq('is_customer_only', true);
    }

    if (options.hasCode === true) {
      query = query.not('code_id', 'is', null);
    } else if (options.hasCode === false) {
      query = query.is('code_id', null);
    }

    if (options.query.trim().length >= 2) {
      const searchPattern = buildSearchPattern(options.query.trim());
      query = query.or(
        `place_name.ilike.${searchPattern},address_line1.ilike.${searchPattern},city.ilike.${searchPattern},state.ilike.${searchPattern},postal_code.ilike.${searchPattern}`
      );
    }

    const { data, error } = await query;

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to search bathrooms.'),
      };
    }

    const parsedData = parseSupabaseRows(
      publicBathroomDetailRowSchema,
      data,
      'search bathrooms',
      'Unable to search bathrooms.'
    );

    if (parsedData.error) {
      return {
        data: [],
        error: parsedData.error,
      };
    }

    return {
      data: sortBathroomsByFilters(
        applyBathroomFilters(
          (parsedData.data as LegacyPublicBathroomDetailRow[]).map(decorateLegacyDirectoryRow),
          options.filters
        ),
        options.filters,
        options.origin
      ),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to search bathrooms.'),
        'Unable to search bathrooms.'
      ),
    };
  }
}

export async function fetchCityBrowse(
  options: CityBrowseOptions = {}
): Promise<{ data: CityBrowseRow[]; error: (Error & { code?: string }) | null }> {
  const limit = options.limit ?? 12;

  try {
    const { data, error } = await getSupabaseClient().rpc(
      'get_city_browse' as never,
      {
        p_limit: limit,
      } as never
    );

    if (error) {
      if (!isMissingRpcError(error)) {
        return {
          data: [],
          error: toAppError(error, 'Unable to load cities right now.'),
        };
      }

      return fetchCityBrowseFallback(limit);
    }

    const parsedData = parseSupabaseRows(
      cityBrowseRowSchema,
      data,
      'city browse',
      'Unable to load cities right now.'
    );

    if (parsedData.error) {
      return {
        data: [],
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as CityBrowseRow[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load cities right now.'),
        'Unable to load cities right now.'
      ),
    };
  }
}

export async function fetchSearchSuggestions(
  options: SearchSuggestionsOptions
): Promise<{ data: SearchSuggestionRow[]; error: (Error & { code?: string }) | null }> {
  const trimmedQuery = options.query.trim();

  if (trimmedQuery.length < 2) {
    return {
      data: [],
      error: null,
    };
  }

  try {
    const { data, error } = await getSupabaseClient().rpc(
      'get_search_suggestions' as never,
      {
        p_query: trimmedQuery,
        p_user_lat: options.origin?.latitude ?? null,
        p_user_lng: options.origin?.longitude ?? null,
        p_limit: options.limit ?? 8,
      } as never
    );

    if (error) {
      if (!isMissingRpcError(error)) {
        return {
          data: [],
          error: toAppError(error, 'Unable to load search suggestions.'),
        };
      }

      return fetchSearchSuggestionsFallback(options);
    }

    const parsedData = parseSupabaseRows(
      searchSuggestionRowSchema,
      data,
      'search suggestions',
      'Unable to load search suggestions.'
    );

    if (parsedData.error) {
      return {
        data: [],
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as SearchSuggestionRow[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load search suggestions.'),
        'Unable to load search suggestions.'
      ),
    };
  }
}

async function fetchSearchSuggestionsFallback(
  options: SearchSuggestionsOptions
): Promise<{ data: SearchSuggestionRow[]; error: (Error & { code?: string }) | null }> {
  try {
    const searchPattern = buildSearchPattern(options.query.trim());
    let query = getSupabaseClient()
      .from('v_bathroom_detail_public')
      .select('id,place_name,city,state,latitude,longitude')
      .or(
        `place_name.ilike.${searchPattern},address_line1.ilike.${searchPattern},city.ilike.${searchPattern},state.ilike.${searchPattern},postal_code.ilike.${searchPattern}`
      )
      .order('updated_at', { ascending: false })
      .limit(options.limit ?? 8);

    if (options.origin) {
      const radiusBounds = buildApproximateRadiusBounds(options.origin, 25000);
      query = query
        .gte('latitude', radiusBounds.minLatitude)
        .lte('latitude', radiusBounds.maxLatitude)
        .gte('longitude', radiusBounds.minLongitude)
        .lte('longitude', radiusBounds.maxLongitude);
    }

    const { data, error } = await query;

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load search suggestions.'),
      };
    }

    const suggestionRows = (data ?? []) as Array<{
      id: string;
      place_name: string;
      city: string | null;
      state: string | null;
      latitude: number | null;
      longitude: number | null;
    }>;

    const normalizedRows = suggestionRows.map((row) => ({
      bathroom_id: row.id,
      place_name: row.place_name,
      city: row.city,
      state: row.state,
      distance_meters:
        options.origin &&
        typeof row.latitude === 'number' &&
        typeof row.longitude === 'number'
          ? calculateDistanceMeters(options.origin, {
              latitude: row.latitude,
              longitude: row.longitude,
            })
          : null,
    }));

    normalizedRows.sort((leftRow, rightRow) => {
      const leftDistance = leftRow.distance_meters;
      const rightDistance = rightRow.distance_meters;

      if (typeof leftDistance === 'number' && typeof rightDistance === 'number') {
        return leftDistance - rightDistance;
      }

      return leftRow.place_name.localeCompare(rightRow.place_name);
    });

    const parsedData = parseSupabaseRows(
      searchSuggestionRowSchema,
      normalizedRows.slice(0, options.limit ?? 8),
      'search suggestions',
      'Unable to load search suggestions.'
    );

    if (parsedData.error) {
      return {
        data: [],
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as SearchSuggestionRow[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load search suggestions.'),
        'Unable to load search suggestions.'
      ),
    };
  }
}

async function fetchCityBrowseFallback(
  limit: number
): Promise<{ data: CityBrowseRow[]; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('v_bathrooms_public')
      .select('city,state')
      .limit(Math.max(limit * 40, 200));

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load cities right now.'),
      };
    }

    return {
      data: groupCityBrowseRows((data ?? []) as Array<{ city: string | null; state: string | null }>, limit) as CityBrowseRow[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load cities right now.'),
        'Unable to load cities right now.'
      ),
    };
  }
}

export async function fetchBathroomsByIds(
  options: BathroomsByIdOptions
): Promise<{ data: CanonicalBathroomDetailRow[]; error: (Error & { code?: string }) | null }> {
  if (!options.bathroomIds.length) {
    return {
      data: [],
      error: null,
    };
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('v_bathroom_detail_public')
      .select('*')
      .in('id', options.bathroomIds);

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load the selected bathrooms.'),
      };
    }

    const orderLookup = new Map(options.bathroomIds.map((bathroomId, index) => [bathroomId, index]));
    const parsedData = parseSupabaseRows(
      publicBathroomDetailRowSchema,
      data,
      'selected bathrooms',
      'Unable to load the selected bathrooms.'
    );

    if (parsedData.error) {
      return {
        data: [],
        error: parsedData.error,
      };
    }

    const orderedBathrooms = sortBathroomsByDistance(parsedData.data as PublicBathroomDetailRow[], options.origin).sort(
      (leftBathroom, rightBathroom) =>
        (orderLookup.get(leftBathroom.id) ?? Number.MAX_SAFE_INTEGER) -
        (orderLookup.get(rightBathroom.id) ?? Number.MAX_SAFE_INTEGER)
    );

    return {
      data: orderedBathrooms.map((bathroom) => decorateLegacyBathroomDetailRow(bathroom as LegacyPublicBathroomDetailRow)),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load the selected bathrooms.'),
        'Unable to load the selected bathrooms.'
      ),
    };
  }
}

export async function recordBathroomNavigationOpen(
  bathroomId: string
): Promise<{ error: (Error & { code?: string }) | null }> {
  try {
    const { error } = await getSupabaseClient().rpc(
      'record_bathroom_navigation' as never,
      {
        p_bathroom_id: bathroomId,
      } as never
    );

    if (error) {
      return {
        error: toAppError(error, 'Unable to record the navigation event right now.'),
      };
    }

    return {
      error: null,
    };
  } catch (error) {
    return {
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to record the navigation event right now.'),
        'Unable to record the navigation event right now.'
      ),
    };
  }
}
