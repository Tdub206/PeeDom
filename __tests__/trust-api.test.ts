import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();
const invoke: jest.MockedFunction<(name: string, options?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc,
    functions: {
      invoke,
    },
  }),
}));

describe('trust and prediction API', () => {
  beforeEach(() => {
    rpc.mockReset();
    invoke.mockReset();
  });

  it('loads the current user trust tier through the trust RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          user_id: 'user-1',
          contributor_trust_tier: 'verified_contributor',
          normalized_tier: 'normal',
          trust_score: 67,
          trust_weight: 1.8,
          shadow_banned: false,
          fraud_flags: [],
          device_account_count: 1,
          last_calculated_at: '2026-04-14T12:00:00.000Z',
        },
      ],
      error: null,
    });

    const { fetchUserTrustTier } = await import('@/api/trust');
    const result = await fetchUserTrustTier('user-1');

    expect(result.error).toBeNull();
    expect(result.data?.normalized_tier).toBe('normal');
    expect(rpc).toHaveBeenCalledWith('get_user_trust_tier', {
      p_user_id: 'user-1',
    });
  });

  it('loads bathroom predictions through the prediction RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          bathroom_id: 'bathroom-1',
          predicted_access_confidence: 88,
          prediction_confidence: 79,
          busy_level: 'moderate',
          best_visit_hour: 14,
          signal_count: 4,
          recommended_copy: 'Signals are strong enough that this is a solid stop.',
          generated_at: '2026-04-14T12:00:00.000Z',
        },
      ],
      error: null,
    });

    const { fetchBathroomPrediction } = await import('@/api/trust');
    const result = await fetchBathroomPrediction('bathroom-1', 14);

    expect(result.error).toBeNull();
    expect(result.data?.busy_level).toBe('moderate');
    expect(rpc).toHaveBeenCalledWith('calculate_prediction_confidence', {
      p_bathroom_id: 'bathroom-1',
      p_reference_hour: 14,
    });
  });

  it('registers device fingerprints through the edge function', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        allowed: true,
        shadow_mode: false,
        reason: 'ok',
        device_account_count: 1,
        recent_contribution_count: 0,
        detected_speed_kmh: null,
        fraud_flags: [],
        checked_at: '2026-04-14T12:00:00.000Z',
      },
      error: null,
    });

    const { registerCurrentDeviceFingerprint } = await import('@/api/trust');
    const result = await registerCurrentDeviceFingerprint({
      install_fingerprint: 'device_123',
      device_metadata: {
        platform: 'ios',
        brand: 'Apple',
      },
    });

    expect(result.error).toBeNull();
    expect(result.data?.allowed).toBe(true);
    expect(invoke).toHaveBeenCalledWith('device-fingerprint', {
      body: {
        install_fingerprint: 'device_123',
        device_metadata: {
          platform: 'ios',
          brand: 'Apple',
        },
        latitude: null,
        longitude: null,
      },
    });
  });
});
