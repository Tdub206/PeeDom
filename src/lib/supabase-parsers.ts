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

export const dbProfileSchema = z.object({
  id: rawTextSchema,
  email: z.string().email().nullable(),
  display_name: z.string().nullable(),
  role: z.enum(['user', 'business', 'admin']),
  points_balance: z.number().int(),
  is_premium: z.boolean(),
  is_suspended: z.boolean(),
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
  created_at: dateTimeStringSchema,
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
