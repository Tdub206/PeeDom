import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBathroomsNearRegion, searchBathrooms } from '@/api/bathrooms';
import { BathroomFilters, BathroomListItem } from '@/types';
import { buildBathroomAddress, mapBathroomRowToListItem } from '@/utils/bathroom';

const EMPTY_FILTERS: BathroomFilters = {
  isAccessible: null,
  isLocked: null,
  isCustomerOnly: null,
  openNow: null,
  noCodeRequired: null,
  recentlyVerifiedOnly: null,
  hasChangingTable: null,
  isFamilyRestroom: null,
  requireGrabBars: null,
  requireAutomaticDoor: null,
  requireGenderNeutral: null,
  minDoorWidth: null,
  minStallWidth: null,
  prioritizeAccessible: null,
  hideNonAccessible: null,
  minCleanlinessRating: null,
};

export interface DuplicateSuggestion {
  bathroom: BathroomListItem;
  score: number;
  reason: string;
}

interface UseBathroomDuplicateSuggestionsOptions {
  placeName: string;
  addressLine1: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
}

function buildSmallRegion(latitude: number, longitude: number) {
  return {
    latitude,
    longitude,
    latitudeDelta: 0.0035,
    longitudeDelta: 0.0035,
  };
}

function getTokenOverlapScore(leftValue: string, rightValue: string): number {
  const leftTokens = new Set(normalizeText(leftValue).split(' ').filter(Boolean));
  const rightTokens = new Set(normalizeText(rightValue).split(' ').filter(Boolean));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let sharedCount = 0;

  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      sharedCount += 1;
    }
  });

  return sharedCount / Math.max(leftTokens.size, rightTokens.size);
}

function buildDuplicateReason(input: {
  distanceMeters?: number;
  nameScore: number;
  addressScore: number;
}): string {
  if (typeof input.distanceMeters === 'number' && input.distanceMeters <= 60) {
    return 'Very close to your current pin.';
  }

  if (input.addressScore >= input.nameScore && input.addressScore >= 0.45) {
    return 'Address details strongly overlap with an existing listing.';
  }

  if (input.nameScore >= 0.45) {
    return 'The location name overlaps with an existing listing nearby.';
  }

  return 'This bathroom is close enough to review before adding a duplicate.';
}

function rankDuplicateCandidates(
  candidates: BathroomListItem[],
  options: UseBathroomDuplicateSuggestionsOptions
): DuplicateSuggestion[] {
  return candidates
    .map((bathroom) => {
      const nameScore = getTokenOverlapScore(options.placeName, bathroom.place_name);
      const addressScore = getTokenOverlapScore(
        [options.addressLine1, options.city, options.state].filter(Boolean).join(' '),
        buildBathroomAddress({
          address_line1: bathroom.address,
          city: null,
          state: null,
          postal_code: null,
          country_code: '',
        })
      );
      const distanceScore =
        typeof bathroom.distance_meters === 'number'
          ? bathroom.distance_meters <= 60
            ? 1
            : bathroom.distance_meters <= 150
              ? 0.7
              : bathroom.distance_meters <= 300
                ? 0.45
                : 0.2
          : 0.15;
      const score = Number((nameScore * 0.42 + addressScore * 0.28 + distanceScore * 0.3).toFixed(2));

      return {
        bathroom,
        score,
        reason: buildDuplicateReason({
          distanceMeters: bathroom.distance_meters,
          nameScore,
          addressScore,
        }),
      };
    })
    .filter((candidate) => candidate.score >= 0.35)
    .sort((leftCandidate, rightCandidate) => rightCandidate.score - leftCandidate.score)
    .slice(0, 3);
}

export function useBathroomDuplicateSuggestions(options: UseBathroomDuplicateSuggestionsOptions) {
  const queryText = useMemo(
    () => [options.placeName, options.addressLine1, options.city, options.state].filter(Boolean).join(' ').trim(),
    [options.addressLine1, options.city, options.placeName, options.state]
  );
  const hasCoordinates = typeof options.latitude === 'number' && typeof options.longitude === 'number';

  return useQuery<DuplicateSuggestion[], Error>({
    queryKey: [
      'bathroom-duplicate-suggestions',
      options.placeName,
      options.addressLine1,
      options.city,
      options.state,
      options.latitude ?? null,
      options.longitude ?? null,
    ],
    enabled: hasCoordinates || queryText.length >= 3,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const cachedAt = new Date().toISOString();

      if (hasCoordinates) {
        const result = await fetchBathroomsNearRegion({
          region: buildSmallRegion(options.latitude as number, options.longitude as number),
          filters: EMPTY_FILTERS,
        });

        if (result.error) {
          throw result.error;
        }

        return rankDuplicateCandidates(
          result.data.map((bathroom) =>
            mapBathroomRowToListItem(bathroom, {
              cachedAt,
              stale: false,
              origin: {
                latitude: options.latitude as number,
                longitude: options.longitude as number,
              },
            })
          ),
          options
        );
      }

      const result = await searchBathrooms({
        query: queryText,
        filters: EMPTY_FILTERS,
        limit: 6,
        offset: 0,
      });

      if (result.error) {
        throw result.error;
      }

      return rankDuplicateCandidates(
        result.data.map((bathroom) =>
          mapBathroomRowToListItem(bathroom, {
            cachedAt,
            stale: false,
          })
        ),
        options
      );
    },
  });
}
