import { z } from 'zod';

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
  type: z.enum(['favorite_add', 'favorite_remove', 'code_vote', 'report_create', 'rating_create']),
  payload: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
  retry_count: z.number().int().min(0),
  last_attempt_at: z.string().datetime().nullable(),
  user_id: z.string().min(1),
});

export const queuedMutationsSchema = z.array(queuedMutationSchema);

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

export type FieldErrors<T extends Record<string, unknown>> = Partial<Record<keyof T, string>>;
export type QueuedMutationShape = z.infer<typeof queuedMutationSchema>;
export type ReportCreateFormValues = z.infer<typeof reportCreateSchema>;

export function getFieldErrors<T extends Record<string, unknown>>(error: z.ZodError<T>): FieldErrors<T> {
  const flattened = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const entries = Object.entries(flattened).map(([key, messages]) => [key, messages?.[0] ?? '']);
  return Object.fromEntries(entries) as FieldErrors<T>;
}
