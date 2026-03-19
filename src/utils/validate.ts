import { z } from 'zod';

const MAX_BATHROOM_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_BATHROOM_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.'),
});

export const registerSchema = loginSchema
  .extend({
    displayName: z
      .string()
      .trim()
      .min(2, 'Display name must be at least 2 characters long.')
      .max(50, 'Display name must be 50 characters or fewer.'),
    confirmPassword: z
      .string()
      .min(8, 'Confirm your password.'),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
      });
    }
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const queuedMutationSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'favorite_add',
    'favorite_remove',
    'code_submit',
    'code_vote',
    'report_create',
    'rating_create',
    'status_report',
  ]),
  payload: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
  retry_count: z.number().int().min(0),
  last_attempt_at: z.string().datetime().nullable(),
  user_id: z.string().min(1),
});

export const queuedMutationsSchema = z.array(queuedMutationSchema);

export const addBathroomSchema = z
  .object({
    place_name: z
      .string()
      .trim()
      .min(2, 'Bathroom name must be at least 2 characters long.')
      .max(120, 'Bathroom name must be 120 characters or fewer.'),
    address_line1: z
      .string()
      .trim()
      .max(160, 'Street address must be 160 characters or fewer.')
      .optional(),
    city: z
      .string()
      .trim()
      .max(80, 'City must be 80 characters or fewer.')
      .optional(),
    state: z
      .string()
      .trim()
      .max(80, 'State must be 80 characters or fewer.')
      .optional(),
    postal_code: z
      .string()
      .trim()
      .max(20, 'Postal code must be 20 characters or fewer.')
      .optional(),
    latitude: z.coerce
      .number({
        invalid_type_error: 'Latitude is required.',
      })
      .min(-90, 'Latitude must be between -90 and 90.')
      .max(90, 'Latitude must be between -90 and 90.'),
    longitude: z.coerce
      .number({
        invalid_type_error: 'Longitude is required.',
      })
      .min(-180, 'Longitude must be between -180 and 180.')
      .max(180, 'Longitude must be between -180 and 180.'),
    is_locked: z.boolean(),
    is_accessible: z.boolean(),
    is_customer_only: z.boolean(),
  })
  .superRefine((value, context) => {
    const hasAddressDetail = Boolean(value.address_line1?.trim() || value.city?.trim() || value.state?.trim());

    if (!hasAddressDetail) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['address_line1'],
        message: 'Add at least a street address or city details.',
      });
    }
  });

export const bathroomPhotoSchema = z
  .object({
    uri: z.string().trim().min(1, 'A photo URI is required.'),
    fileName: z
      .string()
      .trim()
      .max(120, 'Photo filename must be 120 characters or fewer.')
      .nullable()
      .optional(),
    mimeType: z
      .string()
      .trim()
      .max(100, 'Photo type must be 100 characters or fewer.')
      .nullable()
      .optional(),
    fileSize: z
      .number()
      .int()
      .positive('Photo size must be greater than 0 bytes.')
      .max(MAX_BATHROOM_PHOTO_SIZE_BYTES, 'Photos must be 5 MB or smaller.')
      .nullable()
      .optional(),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (
      value.mimeType &&
      !SUPPORTED_BATHROOM_PHOTO_MIME_TYPES.includes(
        value.mimeType as (typeof SUPPORTED_BATHROOM_PHOTO_MIME_TYPES)[number]
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mimeType'],
        message: 'Only JPG, PNG, and WEBP photos are supported.',
      });
    }
  });

export const bathroomPhotoProofSchema = z.object({
  bathroom_id: z.string().trim().min(1, 'Bathroom identifier is required.'),
  photo_type: z.enum(['exterior', 'interior', 'keypad', 'sign']),
  photo: bathroomPhotoSchema,
});

export const codeSubmitSchema = z.object({
  bathroom_id: z.string().trim().min(1, 'Bathroom identifier is required.'),
  code_value: z
    .string()
    .trim()
    .min(2, 'Access code must be at least 2 characters long.')
    .max(32, 'Access code must be 32 characters or fewer.')
    .regex(/^[A-Za-z0-9\-_\s#*.]+$/, 'Use only letters, numbers, spaces, or basic keypad symbols.'),
});

export const cleanlinessRatingSchema = z.object({
  bathroom_id: z.string().trim().min(1, 'Bathroom identifier is required.'),
  rating: z.coerce
    .number({
      invalid_type_error: 'Choose a cleanliness rating.',
    })
    .int('Choose a whole-number cleanliness rating.')
    .min(1, 'Choose a cleanliness rating between 1 and 5.')
    .max(5, 'Choose a cleanliness rating between 1 and 5.'),
  notes: z
    .string()
    .trim()
      .max(300, 'Cleanliness notes must be 300 characters or fewer.')
      .optional(),
});

export const liveStatusReportSchema = z.object({
  bathroom_id: z.string().trim().min(1, 'Bathroom identifier is required.'),
  status: z.enum(['clean', 'dirty', 'closed', 'out_of_order', 'long_wait'], {
    message: 'Choose the live status you want to share.',
  }),
  note: z
    .string()
    .trim()
    .max(280, 'Live status notes must be 280 characters or fewer.')
    .optional(),
});

export const reportCreateSchema = z.object({
  bathroom_id: z.string().trim().min(1, 'Bathroom identifier is required.'),
  report_type: z.enum([
    'wrong_code',
    'closed',
    'unsafe',
    'duplicate',
    'incorrect_hours',
    'no_restroom',
    'other',
  ]),
  notes: z
    .string()
    .trim()
    .max(500, 'Report details must be 500 characters or fewer.')
    .optional(),
});

const CONTACT_PHONE_REGEX = /^[0-9+().\-\s]{7,25}$/;

export const claimBusinessSchema = z
  .object({
    bathroom_id: z.string().trim().min(1, 'Bathroom identifier is required.'),
    business_name: z
      .string()
      .trim()
      .min(2, 'Business name must be at least 2 characters long.')
      .max(120, 'Business name must be 120 characters or fewer.'),
    contact_email: z
      .string()
      .trim()
      .min(1, 'Contact email is required.')
      .email('Enter a valid contact email address.'),
    contact_phone: z
      .string()
      .trim()
      .max(25, 'Phone number must be 25 characters or fewer.')
      .optional(),
    evidence_url: z
      .string()
      .trim()
      .max(500, 'Evidence link must be 500 characters or fewer.')
      .optional(),
  })
  .superRefine((value, context) => {
    const contactPhone = value.contact_phone?.trim();

    if (contactPhone && !CONTACT_PHONE_REGEX.test(contactPhone)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contact_phone'],
        message: 'Enter a valid phone number.',
      });
    }

    const evidenceUrl = value.evidence_url?.trim();

    if (!evidenceUrl) {
      return;
    }

    try {
      // eslint-disable-next-line no-new
      new URL(evidenceUrl);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['evidence_url'],
        message: 'Enter a valid URL.',
      });
    }
  });

export type FieldErrors<T extends Record<string, unknown>> = Partial<Record<keyof T, string>>;
export type AddBathroomFormValues = z.infer<typeof addBathroomSchema>;
export type BathroomPhotoFormValues = z.infer<typeof bathroomPhotoSchema>;
export type BathroomPhotoProofFormValues = z.infer<typeof bathroomPhotoProofSchema>;
export type ClaimBusinessFormValues = z.infer<typeof claimBusinessSchema>;
export type CleanlinessRatingFormValues = z.infer<typeof cleanlinessRatingSchema>;
export type CodeSubmitFormValues = z.infer<typeof codeSubmitSchema>;
export type LiveStatusReportFormValues = z.infer<typeof liveStatusReportSchema>;
export type QueuedMutationShape = z.infer<typeof queuedMutationSchema>;
export type ReportCreateFormValues = z.infer<typeof reportCreateSchema>;

export function getFieldErrors<T extends Record<string, unknown>>(error: z.ZodError<T>): FieldErrors<T> {
  const flattened = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const entries = Object.entries(flattened).map(([key, messages]) => [key, messages?.[0] ?? '']);
  return Object.fromEntries(entries) as FieldErrors<T>;
}
