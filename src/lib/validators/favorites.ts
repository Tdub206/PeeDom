import { z } from 'zod';

const favoriteSortOptions = ['date_added', 'distance', 'name'] as const;

export const favoriteBathroomIdSchema = z.object({
  bathroomId: z.string().uuid('Bathroom identifier must be a valid UUID.'),
});

export const favoriteIdsQuerySchema = z.object({
  userId: z.string().uuid('User identifier must be a valid UUID.'),
  bathroomIds: z.array(z.string().uuid('Bathroom identifier must be a valid UUID.')).min(1),
});

export const favoriteDirectoryQuerySchema = z.object({
  userId: z.string().uuid('User identifier must be a valid UUID.'),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  sortBy: z.enum(favoriteSortOptions).default('date_added'),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type FavoriteDirectoryQueryInput = z.infer<typeof favoriteDirectoryQuerySchema>;
export type FavoriteIdsQueryInput = z.infer<typeof favoriteIdsQuerySchema>;
export type FavoriteBathroomIdInput = z.infer<typeof favoriteBathroomIdSchema>;
