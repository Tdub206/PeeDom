import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const functionsInvoke: jest.MockedFunction<
  (fn: string, options?: unknown) => Promise<{ data: unknown; error: unknown }>
> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    functions: {
      invoke: functionsInvoke,
    },
  }),
}));

describe('google places API', () => {
  beforeEach(() => {
    functionsInvoke.mockReset();
  });

  it('requests address autocomplete suggestions through the edge function', async () => {
    functionsInvoke.mockResolvedValueOnce({
      data: [
        {
          place_id: 'ChIJ123',
          text: '123 Main St, Seattle, WA',
          primary_text: '123 Main St',
          secondary_text: 'Seattle, WA',
          distance_meters: 150,
        },
      ],
      error: null,
    });

    const { fetchGoogleAddressAutocomplete } = await import('@/api/google-places');
    const result = await fetchGoogleAddressAutocomplete({
      query: '123 Main',
      session_token: 'stallpass_test_token',
      origin: {
        latitude: 47.6062,
        longitude: -122.3321,
      },
      region: null,
    });

    expect(result.error).toBeNull();
    expect(functionsInvoke).toHaveBeenCalledWith('google-place-autocomplete', {
      body: {
        query: '123 Main',
        sessionToken: 'stallpass_test_token',
        origin: {
          latitude: 47.6062,
          longitude: -122.3321,
        },
        region: null,
      },
    });
    expect(result.data[0]?.place_id).toBe('ChIJ123');
  });

  it('resolves a selected address through the place details edge function', async () => {
    functionsInvoke.mockResolvedValueOnce({
      data: {
        place_id: 'ChIJ123',
        formatted_address: '123 Main St, Seattle, WA 98101, USA',
        location: {
          latitude: 47.609,
          longitude: -122.337,
        },
        viewport: {
          low: {
            latitude: 47.607,
            longitude: -122.339,
          },
          high: {
            latitude: 47.611,
            longitude: -122.335,
          },
        },
        address_components: {
          address_line1: '123 Main St',
          city: 'Seattle',
          state: 'WA',
          postal_code: '98101',
          country_code: 'US',
        },
      },
      error: null,
    });

    const { resolveGooglePlaceAddressSelection } = await import('@/api/google-places');
    const result = await resolveGooglePlaceAddressSelection({
      place_id: 'ChIJ123',
      session_token: 'stallpass_test_token',
    });

    expect(result.error).toBeNull();
    expect(functionsInvoke).toHaveBeenCalledWith('google-place-address', {
      body: {
        placeId: 'ChIJ123',
        sessionToken: 'stallpass_test_token',
      },
    });
    expect(result.data?.location.latitude).toBe(47.609);
    expect(result.data?.address_components).toEqual({
      address_line1: '123 Main St',
      city: 'Seattle',
      state: 'WA',
      postal_code: '98101',
      country_code: 'US',
    });
  });
});
