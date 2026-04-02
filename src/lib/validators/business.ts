import { z } from 'zod';

const businessHoursSlotSchema = z.object({
  open: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour time in HH:MM format.'),
  close: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour time in HH:MM format.'),
});

const dayKeySchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

function toMinutes(value: string): number {
  const [hoursSegment, minutesSegment] = value.split(':');
  return Number.parseInt(hoursSegment ?? '0', 10) * 60 + Number.parseInt(minutesSegment ?? '0', 10);
}

function validateDaySlots(
  day: string,
  slots: Array<{ open: string; close: string }>,
  context: z.RefinementCtx
): void {
  const normalizedRanges = slots
    .map((slot, index) => ({
      index,
      start: toMinutes(slot.open),
      end: toMinutes(slot.close),
    }))
    .sort((leftSlot, rightSlot) => leftSlot.start - rightSlot.start);

  normalizedRanges.forEach((slot) => {
    if (slot.start === slot.end) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hours', day, slot.index, 'close'],
        message: 'Open and close times must differ.',
      });
    }
  });

  for (let index = 1; index < normalizedRanges.length; index += 1) {
    const previousSlot = normalizedRanges[index - 1];
    const currentSlot = normalizedRanges[index];

    if (!previousSlot || !currentSlot) {
      continue;
    }

    if (previousSlot.end > currentSlot.start) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hours', day, currentSlot.index],
        message: 'Daily hours cannot overlap.',
      });
    }
  }
}

export const updateBusinessHoursSchema = z
  .object({
    bathroom_id: z.string().uuid('Select a valid bathroom before saving hours.'),
    hours: z
      .record(dayKeySchema, z.array(businessHoursSlotSchema).max(3, 'Add up to three time ranges per day.'))
      .default({}),
  })
  .superRefine((value, context) => {
    Object.entries(value.hours).forEach(([day, slots]) => {
      validateDaySlots(day, slots, context);
    });
  });

export const createBusinessFeaturedPlacementSchema = z
  .object({
    bathroom_id: z.string().uuid('Select a valid bathroom before featuring it.'),
    placement_type: z.enum(['search_top', 'map_priority', 'nearby_featured']),
    geographic_scope: z
      .object({
        city: z.string().trim().min(1).max(100).optional(),
        state: z.string().trim().length(2).optional(),
        radius_km: z.number().positive().max(100).optional(),
      })
      .refine(
        (value) =>
          Boolean(
            value.city?.trim() ||
              value.state?.trim() ||
              typeof value.radius_km === 'number'
          ),
        'Set at least one geographic scope.'
      ),
    start_date: z.string().datetime('Provide a valid ISO start date.'),
    end_date: z.string().datetime('Provide a valid ISO end date.'),
  })
  .superRefine((value, context) => {
    if (new Date(value.end_date).getTime() <= new Date(value.start_date).getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_date'],
        message: 'End date must be after the start date.',
      });
    }
  });

export function validateBusinessHoursUpdate(data: unknown) {
  return updateBusinessHoursSchema.parse(data);
}

export const updateBusinessBathroomSettingsSchema = z.object({
  bathroom_id: z.string().uuid('Select a valid bathroom before saving settings.'),
  requires_premium_access: z.boolean(),
  show_on_free_map: z.boolean(),
  is_location_verified: z.boolean(),
});

export const upsertBusinessPromotionSchema = z
  .object({
    id: z.string().uuid().nullable().optional(),
    bathroom_id: z.string().uuid('Select a valid bathroom before saving an offer.'),
    title: z.string().trim().min(2, 'Offer title must be at least 2 characters long.').max(120),
    description: z.string().trim().min(8, 'Offer description must be at least 8 characters long.').max(280),
    offer_type: z.enum(['percentage', 'amount_off', 'freebie', 'custom']),
    offer_value: z.number().positive().nullable().optional(),
    promo_code: z
      .string()
      .trim()
      .max(40, 'Promo code must be 40 characters or fewer.')
      .nullable()
      .optional(),
    redemption_instructions: z
      .string()
      .trim()
      .min(8, 'Add clear redemption instructions for your staff.')
      .max(280),
    starts_at: z.string().datetime().nullable().optional(),
    ends_at: z.string().datetime().nullable().optional(),
    is_active: z.boolean(),
  })
  .superRefine((value, context) => {
    if ((value.offer_type === 'percentage' || value.offer_type === 'amount_off') && typeof value.offer_value !== 'number') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['offer_value'],
        message: 'Enter a numeric discount value.',
      });
    }

    if ((value.offer_type === 'freebie' || value.offer_type === 'custom') && typeof value.offer_value === 'number') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['offer_value'],
        message: 'This offer type should not include a numeric value.',
      });
    }

    if (value.offer_type === 'percentage' && typeof value.offer_value === 'number' && value.offer_value > 100) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['offer_value'],
        message: 'Percentage discounts must stay at or below 100.',
      });
    }

    if (value.starts_at && value.ends_at && new Date(value.ends_at).getTime() <= new Date(value.starts_at).getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ends_at'],
        message: 'Offer end time must be after the start time.',
      });
    }
  });

export function validateBusinessBathroomSettings(data: unknown) {
  return updateBusinessBathroomSettingsSchema.parse(data);
}

export function validateBusinessFeaturedPlacement(data: unknown) {
  return createBusinessFeaturedPlacementSchema.parse(data);
}

export function validateBusinessPromotion(data: unknown) {
  return upsertBusinessPromotionSchema.parse(data);
}
