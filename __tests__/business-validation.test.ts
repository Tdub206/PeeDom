import { describe, expect, it } from '@jest/globals';
import {
  createBusinessFeaturedPlacementSchema,
  updateBusinessBathroomSettingsSchema,
  updateBusinessHoursSchema,
  upsertBusinessPromotionSchema,
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

  it('accepts valid StallPass business settings', () => {
    const result = updateBusinessBathroomSettingsSchema.parse({
      bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      requires_premium_access: true,
      show_on_free_map: false,
      is_location_verified: true,
    });

    expect(result.requires_premium_access).toBe(true);
    expect(result.show_on_free_map).toBe(false);
  });

  it('rejects percentage offers above 100 percent', () => {
    expect(() =>
      upsertBusinessPromotionSchema.parse({
        bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Too much',
        description: 'This should fail validation immediately.',
        offer_type: 'percentage',
        offer_value: 150,
        redemption_instructions: 'Show StallPass.',
        is_active: true,
      })
    ).toThrow('Percentage discounts must stay at or below 100.');
  });
});
