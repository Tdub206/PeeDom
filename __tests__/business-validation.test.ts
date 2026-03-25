import { describe, expect, it } from '@jest/globals';
import {
  createBusinessFeaturedPlacementSchema,
  updateBusinessHoursSchema,
} from '@/lib/validators';

describe('business validators', () => {
  it('accepts valid business hours with multiple time windows', () => {
    const result = updateBusinessHoursSchema.parse({
      bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      hours: {
        monday: [
          { open: '09:00', close: '12:00' },
          { open: '13:00', close: '17:00' },
        ],
      },
    });

    expect(result.hours.monday).toHaveLength(2);
  });

  it('rejects overlapping time windows for the same day', () => {
    expect(() =>
      updateBusinessHoursSchema.parse({
        bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
        hours: {
          monday: [
            { open: '09:00', close: '13:00' },
            { open: '12:30', close: '17:00' },
          ],
        },
      })
    ).toThrow('Daily hours cannot overlap.');
  });

  it('rejects featured placements with an invalid time window', () => {
    expect(() =>
      createBusinessFeaturedPlacementSchema.parse({
        bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
        placement_type: 'search_top',
        geographic_scope: {
          city: 'Seattle',
        },
        start_date: '2026-03-20T00:00:00.000Z',
        end_date: '2026-03-19T00:00:00.000Z',
      })
    ).toThrow('End date must be after the start date.');
  });
});
