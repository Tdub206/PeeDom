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

// Matches the mobile `business_coupons` table + `create_business_coupon`
// RPC shape so both surfaces stay wire-compatible. The DB constraints
// come from supabase/migrations/033_coupon_system.sql.
export const couponTypeSchema = z.enum([
  'percent_off',
  'dollar_off',
  'bogo',
  'free_item',
  'custom',
]);

export const businessCouponRowSchema = z.object({
  id: z.string(),
  bathroom_id: z.string(),
  business_user_id: z.string(),
  title: z.string().min(1),
  description: z.string().nullable(),
  coupon_type: couponTypeSchema,
  value: z.number().positive().nullable(),
  min_purchase: z.number().nonnegative().nullable(),
  coupon_code: z.string().min(1),
  max_redemptions: z.number().int().positive().nullable(),
  current_redemptions: z.number().int().nonnegative(),
  starts_at: dateTimeStringSchema,
  expires_at: dateTimeStringSchema.nullable(),
  is_active: z.boolean(),
  premium_only: z.boolean(),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const businessCouponRowsSchema = z.array(businessCouponRowSchema);
export const businessCouponIdSchema = z.string().uuid('Select a valid coupon before updating it.');
export const businessCouponOwnershipRowSchema = z.object({
  id: businessCouponIdSchema,
  business_user_id: z.string().uuid(),
});

export type BusinessCouponRow = z.infer<typeof businessCouponRowSchema>;

// Input schema for the create-coupon server action. We normalize to
// the same shape the RPC expects, so the action can hand it straight
// through after the ownership check.
export const createBusinessCouponSchema = z
  .object({
    bathroom_id: z.string().uuid('Pick a location before saving the coupon.'),
    title: z
      .string()
      .trim()
      .min(1, 'Give the coupon a short title.')
      .max(100, 'Keep the title under 100 characters.'),
    description: z
      .string()
      .trim()
      .max(500, 'Keep the description under 500 characters.')
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    coupon_type: couponTypeSchema,
    value: z
      .number({ invalid_type_error: 'Enter the discount value as a number.' })
      .positive('Discount value must be greater than 0.')
      .nullable(),
    min_purchase: z
      .number({ invalid_type_error: 'Enter the minimum purchase as a number.' })
      .nonnegative('Minimum purchase must be zero or more.')
      .nullable(),
    coupon_code: z
      .string()
      .trim()
      .max(30, 'Coupon codes are capped at 30 characters.')
      .optional()
      .transform((value) => (value && value.length > 0 ? value.toUpperCase() : null)),
    max_redemptions: z
      .number({ invalid_type_error: 'Enter redemption limit as a whole number.' })
      .int('Redemption limit must be a whole number.')
      .positive('Redemption limit must be greater than 0.')
      .nullable(),
    expires_at: dateTimeStringSchema.nullable(),
    premium_only: z.boolean(),
  })
  .superRefine((input, ctx) => {
    const typesNeedingValue: Array<z.infer<typeof couponTypeSchema>> = [
      'percent_off',
      'dollar_off',
    ];

    if (typesNeedingValue.includes(input.coupon_type) && input.value === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message:
          input.coupon_type === 'percent_off'
            ? 'Enter a percent-off value between 1 and 100.'
            : 'Enter a dollar-off amount greater than 0.',
      });
    }

    if (input.coupon_type === 'percent_off' && input.value !== null && input.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'Percent-off value cannot exceed 100.',
      });
    }
  });

export type CreateBusinessCouponInput = z.infer<typeof createBusinessCouponSchema>;

// -------------------------------------------------------------------
// Business Claims
// -------------------------------------------------------------------

export const businessClaimRowSchema = z.object({
  id: z.string(),
  bathroom_id: z.string(),
  claimant_user_id: z.string(),
  business_name: z.string(),
  contact_email: z.string(),
  contact_phone: z.string().nullable(),
  evidence_url: z.string().nullable(),
  review_status: z.enum(['pending', 'approved', 'rejected']),
  reviewed_by: z.string().nullable(),
  reviewed_at: dateTimeStringSchema.nullable(),
  is_lifetime_free: z.boolean(),
  invite_id: z.string().nullable(),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const businessClaimRowsSchema = z.array(businessClaimRowSchema);
export type BusinessClaimRow = z.infer<typeof businessClaimRowSchema>;

// -------------------------------------------------------------------
// Featured Placements
// -------------------------------------------------------------------

export const featuredPlacementRowSchema = z.object({
  id: z.string(),
  bathroom_id: z.string(),
  business_user_id: z.string(),
  placement_type: z.enum(['search_top', 'map_priority', 'nearby_featured']),
  geographic_scope: z.unknown(),
  start_date: dateTimeStringSchema,
  end_date: dateTimeStringSchema,
  impressions_count: z.number().int().nonnegative(),
  clicks_count: z.number().int().nonnegative(),
  status: z.enum(['active', 'paused', 'expired', 'cancelled']),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const featuredPlacementRowsSchema = z.array(featuredPlacementRowSchema);
export type FeaturedPlacementRow = z.infer<typeof featuredPlacementRowSchema>;
