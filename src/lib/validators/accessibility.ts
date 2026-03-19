import { z } from 'zod';

const optionalDimensionSchema = (min: number, max: number, minMessage: string, maxMessage: string) =>
  z
    .number()
    .int()
    .min(min, minMessage)
    .max(max, maxMessage)
    .optional();

export const updateBathroomAccessibilitySchema = z
  .object({
    bathroom_id: z.string().uuid('Select a valid bathroom before saving accessibility details.'),
    has_grab_bars: z.boolean().optional(),
    door_width_inches: optionalDimensionSchema(
      24,
      48,
      'Door width must be at least 24 inches.',
      'Door width cannot exceed 48 inches.'
    ),
    is_automatic_door: z.boolean().optional(),
    has_changing_table: z.boolean().optional(),
    is_family_restroom: z.boolean().optional(),
    is_gender_neutral: z.boolean().optional(),
    has_audio_cue: z.boolean().optional(),
    has_braille_signage: z.boolean().optional(),
    has_wheelchair_ramp: z.boolean().optional(),
    has_elevator_access: z.boolean().optional(),
    stall_width_inches: optionalDimensionSchema(
      36,
      120,
      'Stall width must be at least 36 inches.',
      'Stall width cannot exceed 120 inches.'
    ),
    turning_radius_inches: optionalDimensionSchema(
      30,
      96,
      'Turning radius must be at least 30 inches.',
      'Turning radius cannot exceed 96 inches.'
    ),
    notes: z.string().trim().max(500, 'Accessibility notes must stay under 500 characters.').optional(),
    photo_urls: z.array(z.string().url('Use valid photo URLs.')).max(5, 'Add up to five photo URLs.').optional(),
  })
  .superRefine((value, context) => {
    const hasFeatureUpdate = Object.entries(value).some(([key, fieldValue]) => key !== 'bathroom_id' && typeof fieldValue !== 'undefined');

    if (!hasFeatureUpdate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bathroom_id'],
        message: 'Add at least one accessibility detail before saving.',
      });
    }
  });

export const updateAccessibilityPreferencesSchema = z.object({
  accessibility_mode_enabled: z.boolean().optional(),
  require_grab_bars: z.boolean().optional(),
  require_automatic_door: z.boolean().optional(),
  require_gender_neutral: z.boolean().optional(),
  require_family_restroom: z.boolean().optional(),
  require_changing_table: z.boolean().optional(),
  min_door_width_inches: z.number().int().min(24).max(48).nullable().optional(),
  min_stall_width_inches: z.number().int().min(36).max(120).nullable().optional(),
  prioritize_accessible: z.boolean().optional(),
  hide_non_accessible: z.boolean().optional(),
});

export function validateBathroomAccessibilityUpdate(data: unknown) {
  return updateBathroomAccessibilitySchema.parse(data);
}

export function validateAccessibilityPreferences(data: unknown) {
  return updateAccessibilityPreferencesSchema.parse(data);
}
