import { z } from 'zod';
import type { Json } from '@/types/database';

const dateTimeStringSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Expected an ISO-compatible timestamp.');

const jsonValueSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)])
);

const rawTextSchema = z.string().min(1);

export const notificationPrefsSchema = z.object({
  code_verified: z.boolean(),
  favorite_update: z.boolean(),
  nearby_new: z.boolean(),
  streak_reminder: z.boolean(),
});

export const dbProfileSchema = z.object({
  id: rawTextSchema,
  email: z.string().email().nullable(),
  display_name: z.string().nullable(),
  role: z.enum(['user', 'business', 'admin']),
  points_balance: z.number().int(),
  is_premium: z.boolean(),
  premium_expires_at: dateTimeStringSchema.nullable(),
  is_suspended: z.boolean(),
  current_streak: z.number().int().nonnegative(),
  longest_streak: z.number().int().nonnegative(),
  last_contribution_date: z.string().nullable(),
  streak_multiplier: z.number(),
  streak_multiplier_expires_at: dateTimeStringSchema.nullable(),
  push_token: z.string().nullable(),
  push_enabled: z.boolean(),
  notification_prefs: notificationPrefsSchema,
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const dbBathroomSchema = z.object({
  id: rawTextSchema,
  place_name: rawTextSchema,
  address_line1: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postal_code: z.string().nullable(),
  country_code: rawTextSchema,
  latitude: z.number(),
  longitude: z.number(),
  is_locked: z.boolean().nullable(),
  is_accessible: z.boolean().nullable(),
  is_customer_only: z.boolean(),
  hours_json: jsonValueSchema.nullable(),
  source_type: z.enum(['community', 'business', 'imported', 'admin']),
  moderation_status: z.enum(['active', 'flagged', 'hidden', 'deleted', 'unverified']),
  created_by: z.string().nullable(),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const dbBathroomPhotoSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  uploaded_by: rawTextSchema,
  storage_bucket: rawTextSchema,
  storage_path: rawTextSchema,
  content_type: rawTextSchema,
  file_size_bytes: z.number().int().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  is_primary: z.boolean(),
  photo_type: z.enum(['exterior', 'interior', 'keypad', 'sign']),
  moderation_status: z.enum(['approved', 'pending', 'rejected']),
  created_at: dateTimeStringSchema,
});

export const dbCodeVoteSchema = z.object({
  id: rawTextSchema,
  code_id: rawTextSchema,
  user_id: rawTextSchema,
  vote: z.union([z.literal(-1), z.literal(1)]),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const dbCodeRevealGrantSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  user_id: rawTextSchema,
  grant_source: z.literal('rewarded_ad'),
  expires_at: dateTimeStringSchema,
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const dbPointEventSchema = z.object({
  id: rawTextSchema,
  user_id: rawTextSchema,
  event_type: z.enum([
    'bathroom_added',
    'bathroom_photo_uploaded',
    'code_submitted',
    'code_verification',
    'report_resolved',
    'code_milestone',
    'premium_redeemed',
  ]),
  reference_table: rawTextSchema,
  reference_id: rawTextSchema,
  points_awarded: z.number().int(),
  metadata: jsonValueSchema,
  created_at: dateTimeStringSchema,
});

export const dbUserBadgeSchema = z.object({
  id: rawTextSchema,
  user_id: rawTextSchema,
  badge_key: rawTextSchema,
  badge_name: rawTextSchema,
  badge_description: rawTextSchema,
  badge_category: z.enum(['milestone', 'streak', 'time', 'accessibility', 'city']),
  context_city_slug: z.string().nullable(),
  awarded_at: dateTimeStringSchema,
});

export const gamificationSummarySchema = z.object({
  total_bathrooms_added: z.number().int(),
  total_codes_submitted: z.number().int(),
  total_code_verifications: z.number().int(),
  total_reports_filed: z.number().int(),
  total_photos_uploaded: z.number().int(),
  total_badges: z.number().int(),
  primary_city: z.string().nullable(),
  primary_state: z.string().nullable(),
});

export const leaderboardEntrySchema = z.object({
  user_id: rawTextSchema,
  display_name: rawTextSchema,
  total_points: z.number().int(),
  bathrooms_added: z.number().int(),
  codes_submitted: z.number().int(),
  verifications: z.number().int(),
  photos_uploaded: z.number().int(),
  reports_resolved: z.number().int(),
  leaderboard_scope: z.enum(['global', 'state', 'city']),
  scope_label: rawTextSchema,
  rank: z.number().int().positive(),
});

export const premiumRedemptionSchema = z.object({
  user_id: rawTextSchema,
  months_redeemed: z.number().int().positive(),
  points_spent: z.number().int().positive(),
  remaining_points: z.number().int().nonnegative(),
  premium_expires_at: dateTimeStringSchema,
  is_premium: z.boolean(),
});

export const dbFavoriteSchema = z.object({
  id: rawTextSchema,
  user_id: rawTextSchema,
  bathroom_id: rawTextSchema,
  created_at: dateTimeStringSchema,
});

export const dbReportSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  reported_by: rawTextSchema,
  report_type: z.enum(['wrong_code', 'closed', 'unsafe', 'duplicate', 'incorrect_hours', 'no_restroom', 'other']),
  status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']),
  notes: z.string().nullable(),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const dbBathroomStatusEventSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  reported_by: rawTextSchema,
  status: z.enum(['clean', 'dirty', 'closed', 'out_of_order', 'long_wait']),
  note: z.string().nullable(),
  expires_at: dateTimeStringSchema,
  created_at: dateTimeStringSchema,
});

export const notificationSettingsResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  key: z.string().optional(),
});

export const bathroomAccessCodeSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  submitted_by: rawTextSchema,
  code_value: rawTextSchema,
  confidence_score: z.number(),
  up_votes: z.number().int(),
  down_votes: z.number().int(),
  last_verified_at: dateTimeStringSchema.nullable(),
  expires_at: dateTimeStringSchema.nullable(),
  visibility_status: z.enum(['visible', 'needs_review', 'removed']),
  lifecycle_status: z.enum(['active', 'expired', 'superseded']),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const publicBathroomDetailRowSchema = z.object({
  id: rawTextSchema,
  place_name: rawTextSchema,
  address_line1: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postal_code: z.string().nullable(),
  country_code: rawTextSchema,
  latitude: z.number(),
  longitude: z.number(),
  is_locked: z.boolean().nullable(),
  is_accessible: z.boolean().nullable(),
  is_customer_only: z.boolean(),
  hours_json: jsonValueSchema.nullable(),
  code_id: z.string().nullable(),
  confidence_score: z.number().nullable(),
  up_votes: z.number().int().nullable(),
  down_votes: z.number().int().nullable(),
  last_verified_at: dateTimeStringSchema.nullable(),
  expires_at: dateTimeStringSchema.nullable(),
  cleanliness_avg: z.number().nullable(),
  updated_at: dateTimeStringSchema,
});

export const nearbyBathroomRowSchema = publicBathroomDetailRowSchema.extend({
  distance_meters: z.number(),
});

function buildValidationError(
  label: string,
  fallbackMessage: string,
  error: z.ZodError
): Error & { code?: string } {
  const issueSummary = error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.') || label}: ${issue.message}`)
    .join('; ');

  const appError = new Error(
    issueSummary.length > 0
      ? `${fallbackMessage} Invalid ${label} payload received. ${issueSummary}`
      : `${fallbackMessage} Invalid ${label} payload received.`
  ) as Error & { code?: string };

  appError.code = 'SCHEMA_VALIDATION_FAILED';
  return appError;
}

export function parseSupabaseNullableRow<T>(
  schema: z.ZodType<T>,
  data: unknown,
  label: string,
  fallbackMessage: string
): { data: T | null; error: (Error & { code?: string }) | null } {
  if (data === null || typeof data === 'undefined') {
    return {
      data: null,
      error: null,
    };
  }

  const parsedData = schema.safeParse(data);

  if (!parsedData.success) {
    return {
      data: null,
      error: buildValidationError(label, fallbackMessage, parsedData.error),
    };
  }

  return {
    data: parsedData.data,
    error: null,
  };
}

export function parseSupabaseRows<T>(
  schema: z.ZodType<T>,
  data: unknown,
  label: string,
  fallbackMessage: string
): { data: T[]; error: (Error & { code?: string }) | null } {
  const parsedData = z.array(schema).safeParse(data ?? []);

  if (!parsedData.success) {
    return {
      data: [],
      error: buildValidationError(label, fallbackMessage, parsedData.error),
    };
  }

  return {
    data: parsedData.data,
    error: null,
  };
}
