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

export function validateBusinessFeaturedPlacement(data: unknown) {
  return createBusinessFeaturedPlacementSchema.parse(data);
}
