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

  it('requests business autocomplete predictions through the edge function with origin bias and no region', async () => {
    functionsInvoke.mockResolvedValueOnce({
      data: [
        {
          place_id: 'ChIJ123',
          text: 'Starbucks Reserve Roastery Seattle',
          primary_text: 'Starbucks Reserve Roastery',
          secondary_text: 'Seattle, WA',
          distance_meters: 150,
        },
      ],
      error: null,
    });

    const { fetchGoogleAddressAutocomplete } = await import('@/api/google-places');
    const result = await fetchGoogleAddressAutocomplete({
      query: 'st',
      session_token: 'stallpass_test_token',
      origin: {
        latitude: 47.6062,
        longitude: -122.3321,
      },
    });

    expect(result.error).toBeNull();
    expect(functionsInvoke).toHaveBeenCalledWith('google-place-autocomplete', {
      body: {
        query: 'st',
        sessionToken: 'stallpass_test_token',
        origin: {
          latitude: 47.6062,
          longitude: -122.3321,
        },
      },
    });
    // No region forwarded — both screens must bias only off the shared user location.
    const invokeBody = functionsInvoke.mock.calls[0]?.[1] as { body?: Record<string, unknown> };
    expect(invokeBody?.body).toBeDefined();
    expect(invokeBody?.body && 'region' in invokeBody.body).toBe(false);

    expect(result.data[0]?.place_id).toBe('ChIJ123');
    expect(result.data[0]?.primary_text).toBe('Starbucks Reserve Roastery');
    expect(result.data[0]?.secondary_text).toBe('Seattle, WA');
    expect(result.data[0]?.distance_meters).toBe(150);
  });

  it('forwards a null origin when shared location is unavailable', async () => {
    functionsInvoke.mockResolvedValueOnce({ data: [], error: null });

    const { fetchGoogleAddressAutocomplete } = await import('@/api/google-places');
    await fetchGoogleAddressAutocomplete({
      query: 'star',
      session_token: 'stallpass_test_token',
      origin: null,
    });

    expect(functionsInvoke).toHaveBeenCalledWith('google-place-autocomplete', {
      body: {
        query: 'star',
        sessionToken: 'stallpass_test_token',
        origin: null,
      },
    });
  });

  it('resolves a selected place through the place details edge function', async () => {
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
