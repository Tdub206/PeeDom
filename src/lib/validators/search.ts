import { z } from 'zod';

export const SearchQuerySchema = z.object({
  query: z.string().trim().min(2).max(200),
  limit: z.number().int().min(1).max(50).default(40),
});

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
