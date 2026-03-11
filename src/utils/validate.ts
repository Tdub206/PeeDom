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

export type FieldErrors<T extends Record<string, unknown>> = Partial<Record<keyof T, string>>;

export function getFieldErrors<T extends Record<string, unknown>>(error: z.ZodError<T>): FieldErrors<T> {
  const flattened = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const entries = Object.entries(flattened).map(([key, messages]) => [key, messages?.[0] ?? '']);
  return Object.fromEntries(entries) as FieldErrors<T>;
}
