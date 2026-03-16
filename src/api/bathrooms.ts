import { BathroomFilters, Coordinates, RegionBounds, type Database } from '@/types';
import {
  nearbyBathroomRowSchema,
  parseSupabaseNullableRow,
  parseSupabaseRows,
  publicBathroomDetailRowSchema,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';
import {
  applyBathroomFilters,
  calculateDistanceMeters,
  computeRegionRadiusMeters,
  getRegionBounds,
  type BathroomDirectoryRow,
} from '@/utils/bathroom';
import { isMissingRpcError } from '@/utils/network';

export type PublicBathroomDetailRow = Database['public']['Views']['v_bathroom_detail_public']['Row'];
export type NearbyBathroomRow = Database['public']['Functions']['get_bathrooms_near']['Returns'][number];

interface NearbyBathroomsOptions {
  region: RegionBounds;
  filters: BathroomFilters;
}

interface SearchBathroomsOptions {
  query: string;
  filters: BathroomFilters;
  origin?: Coordinates | null;
  limit?: number;
}

interface BathroomsByIdOptions {
  bathroomIds: string[];
  origin?: Coordinates | null;
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

function sortBathroomsByDistance<T extends BathroomDirectoryRow>(bathrooms: T[], origin?: Coordinates | null): T[] {
  if (!origin) {
    return bathrooms;
  }

  return [...bathrooms].sort((leftBathroom, rightBathroom) => {
    const leftDistance =
      'distance_meters' in leftBathroom && typeof leftBathroom.distance_meters === 'number'
        ? leftBathroom.distance_meters
        : calculateDistanceMeters(origin, {
            latitude: leftBathroom.latitude,
            longitude: leftBathroom.longitude,
          });
    const rightDistance =
      'distance_meters' in rightBathroom && typeof rightBathroom.distance_meters === 'number'
        ? rightBathroom.distance_meters
        : calculateDistanceMeters(origin, {
            latitude: rightBathroom.latitude,
            longitude: rightBathroom.longitude,
          });

    return leftDistance - rightDistance;
  });
}

async function fetchNearbyBathroomsFallback(
  options: NearbyBathroomsOptions
): Promise<{ data: PublicBathroomDetailRow[]; error: (Error & { code?: string }) | null }> {
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
      data: applyBathroomFilters(parsedData.data as PublicBathroomDetailRow[], options.filters),
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
): Promise<{ data: PublicBathroomDetailRow | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('v_bathroom_detail_public')
      .select('*')
      .eq('id', bathroomId)
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load bathroom details.'),
      };
    }

    if (!data) {
      return {
        data: null,
        error: toAppError({ code: 'PGRST116', message: 'That bathroom could not be found.' }, 'That bathroom could not be found.'),
      };
    }

    const parsedData = parseSupabaseNullableRow(
      publicBathroomDetailRowSchema,
      data,
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
      data: parsedData.data,
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

export async function fetchBathroomsNearRegion(
  options: NearbyBathroomsOptions
): Promise<{ data: BathroomDirectoryRow[]; error: (Error & { code?: string }) | null }> {
  const radiusMeters = Math.max(500, Math.ceil(computeRegionRadiusMeters(options.region)));

  try {
    const { data, error } = await getSupabaseClient().rpc(
      'get_bathrooms_near' as never,
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
      nearbyBathroomRowSchema,
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
      data: sortBathroomsByDistance(applyBathroomFilters(parsedData.data as NearbyBathroomRow[], options.filters), {
        latitude: options.region.latitude,
        longitude: options.region.longitude,
      }),
      error: null,
    };
  } catch (error) {
    const fallbackResult = await fetchNearbyBathroomsFallback(options);

    if (!fallbackResult.error) {
      return {
        data: sortBathroomsByDistance(fallbackResult.data, {
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
): Promise<{ data: PublicBathroomDetailRow[]; error: (Error & { code?: string }) | null }> {
  try {
    let query = getSupabaseClient()
      .from('v_bathroom_detail_public')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(options.limit ?? 40);

    if (options.filters.isAccessible) {
      query = query.eq('is_accessible', true);
    }

    if (options.filters.isLocked) {
      query = query.eq('is_locked', true);
    }

    if (options.filters.isCustomerOnly) {
      query = query.eq('is_customer_only', true);
    }

    const trimmedQuery = options.query.trim();

    if (trimmedQuery.length >= 2) {
      const searchPattern = buildSearchPattern(trimmedQuery);
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
      data: sortBathroomsByDistance(
        applyBathroomFilters(parsedData.data as PublicBathroomDetailRow[], options.filters),
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

export async function fetchBathroomsByIds(
  options: BathroomsByIdOptions
): Promise<{ data: PublicBathroomDetailRow[]; error: (Error & { code?: string }) | null }> {
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
      data: orderedBathrooms,
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
