import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();
const from: jest.MockedFunction<(table: string) => unknown> = jest.fn();

jest.mock('expo-file-system', () => ({
  File: class MockExpoFile {
    constructor(_uri: string) {
      void _uri;
    }

    async arrayBuffer() {
      throw new Error('arrayBuffer should not be called in this test');
    }
  },
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc,
    from,
    storage: {
      from: jest.fn(),
    },
  }),
}));

describe('bathroom submissions API', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it('creates bathrooms through the hardened submission RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        bathroom_id: 'bathroom-123',
        created_at: '2026-03-20T12:00:00.000Z',
      },
      error: null,
    });

    const { createBathroomSubmission } = await import('@/api/bathroom-submissions');
    const result = await createBathroomSubmission('user-1', {
      place_name: 'Union Station',
      address_line1: '401 S Jackson St',
      city: 'Seattle',
      state: 'WA',
      postal_code: '98104',
      latitude: 47.5984,
      longitude: -122.3295,
      is_locked: false,
      is_accessible: true,
      is_customer_only: false,
    });

    expect(result.error).toBeNull();
    expect(result.warning).toBeNull();
    expect(result.data?.bathroom_id).toBe('bathroom-123');
    expect(rpc).toHaveBeenCalledWith('create_bathroom_submission', {
      p_place_name: 'Union Station',
      p_address_line1: '401 S Jackson St',
      p_city: 'Seattle',
      p_state: 'WA',
      p_postal_code: '98104',
      p_country_code: 'US',
      p_latitude: 47.5984,
      p_longitude: -122.3295,
      p_is_locked: false,
      p_is_accessible: true,
      p_is_customer_only: false,
    });
  });

  it('maps nearby-duplicate failures into stable app codes', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'P0001',
        message: 'DUPLICATE_BATHROOM_NEARBY',
      },
    });

    const { createBathroomSubmission } = await import('@/api/bathroom-submissions');
    const result = await createBathroomSubmission('user-1', {
      place_name: 'Duplicate Bathroom',
      address_line1: '1 Main St',
      city: 'Seattle',
      state: 'WA',
      postal_code: '98101',
      latitude: 47.6,
      longitude: -122.3,
      is_locked: false,
      is_accessible: false,
      is_customer_only: false,
    });

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('DUPLICATE_BATHROOM_NEARBY');
  });
});
