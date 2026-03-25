import { z } from 'zod';
import { DEFAULT_SEARCH_DISCOVERY_FILTERS } from '@/types';

export const SearchQuerySchema = z.object({
  query: z.string().trim().min(2).max(200),
  limit: z.number().int().min(1).max(50).default(25),
  offset: z.number().int().min(0).default(0),
  radiusMeters: z.number().int().min(250).max(50000).default(DEFAULT_SEARCH_DISCOVERY_FILTERS.radiusMeters),
  hasCode: z.boolean().nullable().default(DEFAULT_SEARCH_DISCOVERY_FILTERS.hasCode),
});

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;

export const SearchSuggestionQuerySchema = z.object({
  query: z.string().trim().min(2).max(100),
});

export type SearchSuggestionQueryInput = z.infer<typeof SearchSuggestionQuerySchema>;
