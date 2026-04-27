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
  is_locked: z.boolean(),
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

// Rows returned by `get_business_location_codes`. The mobile schema for
// bathroom_access_codes lives in supabase/migrations/001_foundation_schema.sql
// (table) + 047_business_owner_access_codes.sql (RPC). We only surface the
// fields the dashboard renders — submitter identity is intentionally omitted
// because the RPC already restricts output to the approved claim owner.
export const businessLocationCodeRowSchema = z.object({
  id: z.string().uuid(),
  code_value: z.string().min(1),
  confidence_score: z.number().nonnegative(),
  up_votes: z.number().int().nonnegative(),
  down_votes: z.number().int().nonnegative(),
  lifecycle_status: z.enum(['active', 'expired', 'superseded']),
  visibility_status: z.enum(['visible', 'needs_review', 'removed']),
  last_verified_at: dateTimeStringSchema.nullable(),
  created_at: dateTimeStringSchema,
});

export const businessLocationCodeRowsSchema = z.array(businessLocationCodeRowSchema);

export type BusinessLocationCodeRow = z.infer<typeof businessLocationCodeRowSchema>;

export const submitBusinessOwnerCodeSchema = z.object({
  bathroom_id: z.string().uuid('Select a valid location.'),
  code_value: z
    .string()
    .trim()
    .min(1, 'Code cannot be empty.')
    .max(20, 'Code must be 20 characters or fewer.'),
});

export type SubmitBusinessOwnerCodeInput = z.infer<typeof submitBusinessOwnerCodeSchema>;

export const createBusinessClaimSchema = z.object({
  bathroom_id: z.string().uuid('Pick a location before submitting the claim.'),
  business_name: z
    .string()
    .trim()
    .min(1, 'Enter the business name tied to this location.')
    .max(120, 'Keep the business name under 120 characters.'),
  contact_email: z
    .string()
    .trim()
    .email('Enter a valid contact email address.'),
  contact_phone: z
    .string()
    .trim()
    .max(30, 'Keep the contact phone under 30 characters.')
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  evidence_url: z
    .union([z.literal(''), z.string().trim().url('Enter a valid proof URL.')])
    .optional()
    .transform((value) => {
      if (!value) {
        return null;
      }

      const trimmedValue = value.trim();
      return trimmedValue.length > 0 ? trimmedValue : null;
    }),
});

export type CreateBusinessClaimInput = z.infer<typeof createBusinessClaimSchema>;

export const updateBusinessProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters.')
    .max(80, 'Display name must be 80 characters or fewer.'),
});

export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;

export const notificationPreferencesSchema = z.object({
  code_verified: z.boolean(),
  favorite_update: z.boolean(),
  nearby_new: z.boolean(),
  streak_reminder: z.boolean(),
  arrival_alert: z.boolean(),
});

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

export const uploadBusinessPhotoSchema = z.object({
  bathroom_id: z.string().uuid('Select a valid location before uploading a photo.'),
});

export type UploadBusinessPhotoInput = z.infer<typeof uploadBusinessPhotoSchema>;

export const deleteBusinessPhotoSchema = z.object({
  bathroom_id: z.string().uuid('Select a valid location before deleting a photo.'),
  photo_id: z.string().uuid('Select a valid photo before deleting it.'),
});

export type DeleteBusinessPhotoInput = z.infer<typeof deleteBusinessPhotoSchema>;

export const businessAiMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z
    .string()
    .trim()
    .min(1, 'Enter a message before sending it.')
    .max(4000, 'Keep each message under 4000 characters.'),
});

export type BusinessAiMessageInput = z.infer<typeof businessAiMessageSchema>;

export const businessAiRequestSchema = z
  .object({
    messages: z
      .array(businessAiMessageSchema)
      .min(1, 'Include at least one message.')
      .max(20, 'Keep the conversation under 20 messages per request.'),
    businessContext: z
      .string()
      .trim()
      .max(8000, 'Business context is too long.')
      .optional()
      .default(''),
  })
  .superRefine((input, ctx) => {
    if (input.messages[input.messages.length - 1]?.role !== 'user') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['messages'],
        message: 'Last message must come from the user.',
      });
    }
  });

export type BusinessAiRequestInput = z.infer<typeof businessAiRequestSchema>;
