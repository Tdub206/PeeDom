import { z } from 'zod';

const coordinatesSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
});

export const googlePlaceAutocompleteInputSchema = z.object({
  query: z.string().trim().min(2).max(100),
  session_token: z.string().trim().min(8).max(128),
  origin: coordinatesSchema.nullable().optional(),
});

export const googlePlaceAddressResolutionInputSchema = z.object({
  place_id: z.string().trim().min(1).max(256),
  session_token: z.string().trim().min(8).max(128),
});

export function validateGooglePlaceAutocompleteInput(data: unknown) {
  return googlePlaceAutocompleteInputSchema.parse(data);
}

export function validateGooglePlaceAddressResolutionInput(data: unknown) {
  return googlePlaceAddressResolutionInputSchema.parse(data);
}
