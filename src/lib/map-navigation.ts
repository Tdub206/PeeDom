import { Linking, Platform } from 'react-native';
import type { Coordinates } from '@/types';

type TravelMode = 'driving' | 'walking';

interface NavigationAddressParts {
  address_line1?: string | null;
  line1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
}

export interface MapNavigationTarget {
  placeName: string;
  coordinates: Coordinates;
  address?: NavigationAddressParts | string | null;
}

interface MapNavigationOptions {
  travelMode?: TravelMode;
}

const APPLE_TRAVEL_MODE: Record<TravelMode, string> = {
  driving: 'd',
  walking: 'w',
};

const GOOGLE_TRAVEL_MODE: Record<TravelMode, string> = {
  driving: 'd',
  walking: 'w',
};

const BROWSER_TRAVEL_MODE: Record<TravelMode, string> = {
  driving: 'driving',
  walking: 'walking',
};

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function formatMapNavigationAddress(
  address: MapNavigationTarget['address']
): string | null {
  if (!address) {
    return null;
  }

  if (typeof address === 'string') {
    return normalizeText(address);
  }

  const line1 = normalizeText(address.line1 ?? address.address_line1 ?? null);
  const city = normalizeText(address.city);
  const state = normalizeText(address.state);
  const postalCode = normalizeText(address.postal_code);
  const countryCode = normalizeText(address.country_code);
  const locationLine = [city, state].filter((value): value is string => value !== null).join(', ');
  const formattedAddress = [line1, locationLine || null, postalCode, countryCode]
    .filter((value): value is string => value !== null)
    .join(' ')
    .trim();

  return formattedAddress.length > 0 ? formattedAddress : null;
}

export function buildMapNavigationDestinationQuery(target: MapNavigationTarget): string {
  const placeName = normalizeText(target.placeName);
  const formattedAddress = formatMapNavigationAddress(target.address);

  if (placeName && formattedAddress) {
    return `${placeName}, ${formattedAddress}`;
  }

  if (formattedAddress) {
    return formattedAddress;
  }

  if (placeName) {
    return placeName;
  }

  return `${target.coordinates.latitude},${target.coordinates.longitude}`;
}

export function buildMapNavigationUrls(
  target: MapNavigationTarget,
  options: MapNavigationOptions = {}
): {
  appleMapsUrl: string;
  browserFallbackUrl: string;
  googleNavigationUrl: string;
} {
  const coordinates = `${target.coordinates.latitude},${target.coordinates.longitude}`;
  const destinationQuery = buildMapNavigationDestinationQuery(target);
  const formattedAddress = formatMapNavigationAddress(target.address);
  const appleDestination = formattedAddress ?? coordinates;
  const browserDestination = formattedAddress ?? coordinates;
  const appleParams = [`daddr=${encodeURIComponent(appleDestination)}`];
  const googleParams = [`q=${encodeURIComponent(formattedAddress ? destinationQuery : coordinates)}`];
  const browserParams = [`api=1`, `destination=${encodeURIComponent(browserDestination)}`];

  if (options.travelMode) {
    appleParams.push(`dirflg=${APPLE_TRAVEL_MODE[options.travelMode]}`);
    googleParams.push(`mode=${GOOGLE_TRAVEL_MODE[options.travelMode]}`);
    browserParams.push(`travelmode=${BROWSER_TRAVEL_MODE[options.travelMode]}`);
  }

  return {
    appleMapsUrl: `http://maps.apple.com/?${appleParams.join('&')}`,
    googleNavigationUrl: `google.navigation:${googleParams.join('&')}`,
    browserFallbackUrl: `https://www.google.com/maps/dir/?${browserParams.join('&')}`,
  };
}

export async function openDirectionsInMaps(
  target: MapNavigationTarget,
  options: MapNavigationOptions = {}
): Promise<void> {
  const { appleMapsUrl, browserFallbackUrl, googleNavigationUrl } =
    buildMapNavigationUrls(target, options);

  if (Platform.OS === 'ios') {
    const canOpenAppleMaps = await Linking.canOpenURL(appleMapsUrl);

    if (canOpenAppleMaps) {
      await Linking.openURL(appleMapsUrl);
      return;
    }
  } else {
    const canOpenGoogleNavigation = await Linking.canOpenURL(googleNavigationUrl);

    if (canOpenGoogleNavigation) {
      await Linking.openURL(googleNavigationUrl);
      return;
    }
  }

  await Linking.openURL(browserFallbackUrl);
}
