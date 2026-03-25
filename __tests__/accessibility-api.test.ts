import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const maybeSingle: jest.MockedFunction<() => Promise<{ data: unknown; error: unknown }>> = jest.fn();
const select: jest.MockedFunction<() => unknown> = jest.fn();
const eq: jest.MockedFunction<(column: string, value: unknown) => unknown> = jest.fn();
const upsert: jest.MockedFunction<(values: unknown, options?: unknown) => unknown> = jest.fn();
const from: jest.MockedFunction<(table: string) => unknown> = jest.fn();
const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from,
    rpc,
  }),
}));

describe('accessibility API', () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    select.mockReset();
    eq.mockReset();
    upsert.mockReset();
    from.mockReset();
    rpc.mockReset();
  });

  it('loads the current user accessibility preferences', async () => {
    eq.mockReturnThis();
    select.mockReturnThis();
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'prefs-1',
        user_id: 'user-1',
        accessibility_mode_enabled: true,
        require_grab_bars: true,
        require_automatic_door: false,
        require_gender_neutral: false,
        require_family_restroom: true,
        require_changing_table: true,
        min_door_width_inches: 32,
        min_stall_width_inches: 60,
        prioritize_accessible: true,
        hide_non_accessible: false,
        created_at: '2026-03-19T10:00:00.000Z',
        updated_at: '2026-03-19T10:05:00.000Z',
      },
      error: null,
    });

    from.mockReturnValueOnce({
      select,
      eq,
      maybeSingle,
    });

    const { fetchUserAccessibilityPreferences } = await import('@/api/accessibility');
    const result = await fetchUserAccessibilityPreferences('user-1');

    expect(result.error).toBeNull();
    expect(result.data?.require_grab_bars).toBe(true);
    expect(from).toHaveBeenCalledWith('user_accessibility_preferences');
  });

  it('saves user accessibility preferences through upsert', async () => {
    select.mockReturnThis();
    upsert.mockReturnValueOnce({
      select,
      maybeSingle,
    });
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'prefs-2',
        user_id: 'user-2',
        accessibility_mode_enabled: true,
        require_grab_bars: false,
        require_automatic_door: true,
        require_gender_neutral: true,
        require_family_restroom: false,
        require_changing_table: true,
        min_door_width_inches: 34,
        min_stall_width_inches: null,
        prioritize_accessible: true,
        hide_non_accessible: true,
        created_at: '2026-03-19T11:00:00.000Z',
        updated_at: '2026-03-19T11:05:00.000Z',
      },
      error: null,
    });

    from.mockReturnValueOnce({
      upsert,
    });

    const { saveUserAccessibilityPreferences } = await import('@/api/accessibility');
    const result = await saveUserAccessibilityPreferences('user-2', {
      accessibility_mode_enabled: true,
      require_automatic_door: true,
      require_gender_neutral: true,
      require_changing_table: true,
      min_door_width_inches: 34,
      prioritize_accessible: true,
      hide_non_accessible: true,
    });

    expect(result.error).toBeNull();
    expect(result.data?.require_automatic_door).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-2',
        accessibility_mode_enabled: true,
        require_automatic_door: true,
        require_gender_neutral: true,
        require_changing_table: true,
        min_door_width_inches: 34,
        prioritize_accessible: true,
        hide_non_accessible: true,
      })
    );
  });

  it('submits structured bathroom accessibility details through the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
        accessibility_features: {
          has_grab_bars: true,
          door_width_inches: 34,
          is_automatic_door: true,
          has_changing_table: false,
          is_family_restroom: false,
          is_gender_neutral: true,
          has_audio_cue: false,
          has_braille_signage: true,
          has_wheelchair_ramp: true,
          has_elevator_access: false,
          stall_width_inches: 60,
          turning_radius_inches: 64,
          notes: 'Automatic opener at the entrance.',
          photo_urls: [],
          verification_date: '2026-03-19T12:00:00.000Z',
        },
        is_accessible: true,
        accessibility_score: 78,
        updated_at: '2026-03-19T12:00:00.000Z',
      },
      error: null,
    });

    const { submitBathroomAccessibilityUpdate } = await import('@/api/accessibility');
    const result = await submitBathroomAccessibilityUpdate({
      bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      has_grab_bars: true,
      door_width_inches: 34,
      is_automatic_door: true,
      is_gender_neutral: true,
      has_braille_signage: true,
      has_wheelchair_ramp: true,
      stall_width_inches: 60,
      turning_radius_inches: 64,
      notes: 'Automatic opener at the entrance.',
    });

    expect(result.error).toBeNull();
    expect(result.data?.accessibility_score).toBe(78);
    expect(rpc).toHaveBeenCalledWith('upsert_bathroom_accessibility_features', {
      p_bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      p_accessibility_features: {
        has_grab_bars: true,
        door_width_inches: 34,
        is_automatic_door: true,
        is_gender_neutral: true,
        has_braille_signage: true,
        has_wheelchair_ramp: true,
        stall_width_inches: 60,
        turning_radius_inches: 64,
        notes: 'Automatic opener at the entrance.',
      },
    });
  });
});
