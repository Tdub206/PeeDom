import type { Coordinates, FavoritesSortOption } from '@/types';

export const favoritesKeys = {
  all: ['favorites'] as const,
  directory: (
    userId: string,
    sortBy: FavoritesSortOption,
    origin?: Coordinates | null
  ) =>
    [
      ...favoritesKeys.all,
      'directory',
      userId,
      sortBy,
      origin?.latitude ?? null,
      origin?.longitude ?? null,
    ] as const,
  ids: (userId: string, scopedKey: string) =>
    [...favoritesKeys.all, 'ids', userId, scopedKey] as const,
};
