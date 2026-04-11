import { z } from 'zod';

const dateTimeStringSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Expected an ISO-compatible timestamp.');

const rawTextSchema = z.string().min(1);

export const businessDashboardAnalyticsRowSchema = z.object({
  bathroom_id: rawTextSchema,
  claim_id: z.string().nullable(),
  place_name: rawTextSchema,
  business_name: z.string().nullable(),
  total_favorites: z.number().int().nonnegative(),
  open_reports: z.number().int().nonnegative(),
  avg_cleanliness: z.number().nonnegative(),
  total_ratings: z.number().int().nonnegative(),
  weekly_views: z.number().int().nonnegative(),
  weekly_unique_visitors: z.number().int().nonnegative(),
  monthly_unique_visitors: z.number().int().nonnegative(),
  weekly_navigation_count: z.number().int().nonnegative(),
  verification_badge_type: z.enum(['standard', 'premium', 'featured']).nullable(),
  has_verification_badge: z.boolean(),
  has_active_featured_placement: z.boolean(),
  active_featured_placements: z.number().int().nonnegative(),
  active_offer_count: z.number().int().nonnegative(),
  requires_premium_access: z.boolean(),
  show_on_free_map: z.boolean(),
  is_location_verified: z.boolean(),
  location_verified_at: dateTimeStringSchema.nullable(),
  pricing_plan: z.enum(['standard', 'lifetime']),
  last_updated: dateTimeStringSchema,
});

export const businessDashboardAnalyticsRowsSchema = z.array(businessDashboardAnalyticsRowSchema);

export const updateBusinessBathroomSettingsSchema = z.object({
  bathroom_id: z.string().uuid('Select a valid bathroom before saving settings.'),
  requires_premium_access: z.boolean(),
  show_on_free_map: z.boolean(),
  is_location_verified: z.boolean(),
});
