import { z } from 'zod';

export const displayNameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(2, 'Display name must be at least 2 characters.')
      .max(50, 'Display name must be 50 characters or fewer.')
  );

export type DisplayNameInput = z.infer<typeof displayNameSchema>;
