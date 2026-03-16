import { describe, expect, it } from '@jest/globals';
import {
  dbProfileSchema,
  parseSupabaseNullableRow,
  parseSupabaseRows,
  publicBathroomDetailRowSchema,
} from '@/lib/supabase-parsers';

describe('parseSupabaseNullableRow', () => {
  it('parses a valid profile row', () => {
    const result = parseSupabaseNullableRow(
      dbProfileSchema,
      {
        id: 'user-123',
        email: 'person@example.com',
        display_name: 'Person',
        role: 'user',
        points_balance: 10,
        is_premium: false,
        is_suspended: false,
        created_at: '2026-03-15T12:00:00.000Z',
        updated_at: '2026-03-15T12:00:00.000Z',
      },
      'profile',
      'Unable to parse profile.'
    );

    expect(result.error).toBeNull();
    expect(result.data?.id).toBe('user-123');
  });

  it('returns a schema error for invalid rows', () => {
    const result = parseSupabaseNullableRow(
      dbProfileSchema,
      {
        id: 'user-123',
        email: 'not-an-email',
        display_name: 'Person',
        role: 'user',
        points_balance: 10,
        is_premium: false,
        is_suspended: false,
        created_at: '2026-03-15T12:00:00.000Z',
        updated_at: '2026-03-15T12:00:00.000Z',
      },
      'profile',
      'Unable to parse profile.'
    );

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('SCHEMA_VALIDATION_FAILED');
  });
});

describe('parseSupabaseRows', () => {
  it('parses public bathroom rows', () => {
    const result = parseSupabaseRows(
      publicBathroomDetailRowSchema,
      [
        {
          id: 'bathroom-123',
          place_name: 'Pike Place Bathroom',
          address_line1: '123 Pike St',
          city: 'Seattle',
          state: 'WA',
          postal_code: '98101',
          country_code: 'US',
          latitude: 47.6097,
          longitude: -122.3422,
          is_locked: true,
          is_accessible: true,
          is_customer_only: false,
          hours_json: null,
          code_id: 'code-123',
          confidence_score: 92,
          up_votes: 10,
          down_votes: 1,
          last_verified_at: '2026-03-15T12:00:00.000Z',
          expires_at: null,
          updated_at: '2026-03-15T12:00:00.000Z',
        },
      ],
      'bathroom directory',
      'Unable to parse bathrooms.'
    );

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.place_name).toBe('Pike Place Bathroom');
  });
});
