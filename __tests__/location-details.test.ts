import { describe, expect, it } from '@jest/globals';
import {
  buildBathroomLocationFormPatchFromGoogleSelection,
  buildBathroomLocationFormPatchFromReverseGeocode,
  buildBathroomLocationSummary,
} from '@/utils/location-details';

describe('location details helpers', () => {
  it('maps a Google place selection into bathroom form fields', () => {
    const result = buildBathroomLocationFormPatchFromGoogleSelection(
      {
        place_id: 'place-123',
        formatted_address: '123 Main St, Seattle, WA 98101, USA',
        location: {
          latitude: 47.609,
          longitude: -122.337,
        },
        viewport: null,
        address_components: {
          address_line1: '123 Main St',
          city: 'Seattle',
          state: 'WA',
          postal_code: '98101',
          country_code: 'US',
        },
      }
    );

    expect(result).toEqual({
      address_line1: '123 Main St',
      city: 'Seattle',
      state: 'WA',
      postal_code: '98101',
      latitude: '47.609000',
      longitude: '-122.337000',
    });
  });

  it('maps reverse geocode results into bathroom form fields', () => {
    const result = buildBathroomLocationFormPatchFromReverseGeocode(
      {
        latitude: 47.6062,
        longitude: -122.3321,
      },
      {
        city: 'Seattle',
        country: 'United States',
        district: null,
        formattedAddress: '111 Pine St, Seattle, WA 98101, USA',
        isoCountryCode: 'US',
        name: 'Pine Street',
        postalCode: '98101',
        region: 'WA',
        street: 'Pine St',
        streetNumber: '111',
        subregion: null,
        timezone: null,
      }
    );

    expect(result).toEqual({
      address_line1: '111 Pine St',
      city: 'Seattle',
      state: 'WA',
      postal_code: '98101',
      latitude: '47.606200',
      longitude: '-122.332100',
    });
  });

  it('builds a readable location summary from the captured fields', () => {
    const summary = buildBathroomLocationSummary({
      address_line1: '111 Pine St',
      city: 'Seattle',
      state: 'WA',
      postal_code: '98101',
      latitude: '47.606200',
      longitude: '-122.332100',
    });

    expect(summary).toBe('111 Pine St Seattle, WA 98101');
  });
});
