import type { LocationGeocodedAddress } from 'expo-location';
import type { Coordinates, GooglePlaceAddressResolutionResult } from '@/types';

export interface BathroomLocationFormPatch {
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: string;
  longitude: string;
}

function toTrimmedString(value?: string | null): string {
  return value?.trim() ?? '';
}

function buildAddressLine1(parts: Array<string | null | undefined>): string {
  return parts.map((part) => toTrimmedString(part)).filter(Boolean).join(' ');
}

export function formatCoordinateValue(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }

  return value.toFixed(6);
}

export function buildBathroomLocationFormPatchFromGoogleSelection(
  selection: GooglePlaceAddressResolutionResult,
  fallbackAddressLine1?: string | null
): BathroomLocationFormPatch {
  return {
    address_line1: toTrimmedString(selection.address_components.address_line1) || toTrimmedString(fallbackAddressLine1),
    city: toTrimmedString(selection.address_components.city),
    state: toTrimmedString(selection.address_components.state),
    postal_code: toTrimmedString(selection.address_components.postal_code),
    latitude: formatCoordinateValue(selection.location.latitude),
    longitude: formatCoordinateValue(selection.location.longitude),
  };
}

export function buildBathroomLocationFormPatchFromReverseGeocode(
  coordinates: Coordinates,
  address: LocationGeocodedAddress | null
): BathroomLocationFormPatch {
  return {
    address_line1:
      buildAddressLine1([address?.streetNumber, address?.street]) ||
      toTrimmedString(address?.name) ||
      toTrimmedString(address?.formattedAddress).split(',')[0]?.trim() ||
      '',
    city: toTrimmedString(address?.city),
    state: toTrimmedString(address?.region),
    postal_code: toTrimmedString(address?.postalCode),
    latitude: formatCoordinateValue(coordinates.latitude),
    longitude: formatCoordinateValue(coordinates.longitude),
  };
}

export function buildBathroomLocationSummary(location: {
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: string;
  longitude: string;
}): string | null {
  const locality = [toTrimmedString(location.city), toTrimmedString(location.state)].filter(Boolean).join(', ');
  const summary = [toTrimmedString(location.address_line1), locality, toTrimmedString(location.postal_code)]
    .filter(Boolean)
    .join(' ');

  if (summary) {
    return summary;
  }

  if (toTrimmedString(location.latitude) && toTrimmedString(location.longitude)) {
    return 'Coordinates attached to this submission.';
  }

  return null;
}
