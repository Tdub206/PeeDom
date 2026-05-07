/**
 * auth-cache.ts — Scoped Profile Cache
 *
 * Profile data cached per user so returning users see stale data
 * while a fresh fetch is in-flight (stale-while-revalidate pattern).
 *
 * Cache key: @stallpass/profile_cache:<user_id>
 *
 * NOTE: The cache is NOT a source of truth. AuthProvider reads it only when
 * `allowCachedProfile: true` is explicitly passed. refreshUser() never allows
 * cached profiles — see spec §2 refreshUser() exact logic rule 7.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { UserProfile } from '@/types';

// ── Cache key helpers ─────────────────────────────────────────────────────────

const PROFILE_CACHE_PREFIX = '@stallpass/profile_cache';

function profileCacheKey(userId: string): string {
  return `${PROFILE_CACHE_PREFIX}:${userId}`;
}

// ── Zod schema for stored profile ────────────────────────────────────────────

const CachedProfileSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    email: z.string().nullable(),
    display_name: z.string().nullable(),
    role: z.enum(['user', 'business', 'admin']),
    points_balance: z.number().int(),
    is_premium: z.boolean(),
    is_suspended: z.boolean(),
    created_at: z.string(),
  }),
  cached_at: z.string().datetime({ offset: true }),
  /** Seconds. Used by caller to determine stale-ness if needed. */
  ttl_seconds: z.number().positive(),
});

type CachedProfileEntry = z.infer<typeof CachedProfileSchema>;

const DEFAULT_TTL_SECONDS = 5 * 60; // 5 minutes

// ── Cache operations ──────────────────────────────────────────────────────────

export const authCache = {
  /**
   * Write a profile into the scoped cache.
   */
  async cacheProfile(userId: string, profile: UserProfile): Promise<void> {
    try {
      const entry: CachedProfileEntry = {
        data: profile,
        cached_at: new Date().toISOString(),
        ttl_seconds: DEFAULT_TTL_SECONDS,
      };
      await AsyncStorage.setItem(profileCacheKey(userId), JSON.stringify(entry));
    } catch (error) {
      // Cache write failure is non-fatal — log and continue
      console.warn('[auth-cache] Failed to cache profile:', error);
    }
  },

  /**
   * Read a cached profile. Returns null if not found, expired, or corrupted.
   */
  async readCachedProfile(userId: string): Promise<UserProfile | null> {
    try {
      const raw = await AsyncStorage.getItem(profileCacheKey(userId));
      if (!raw) return null;

      const parsed = CachedProfileSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        console.warn('[auth-cache] Corrupted profile cache entry — evicting');
        await this.clearCachedProfile(userId);
        return null;
      }

      const { data: entry } = parsed;
      const ageSeconds =
        (Date.now() - new Date(entry.cached_at).getTime()) / 1000;

      if (ageSeconds > entry.ttl_seconds) {
        await this.clearCachedProfile(userId);
        return null;
      }

      return entry.data as UserProfile;
    } catch (error) {
      console.warn('[auth-cache] Failed to read cached profile:', error);
      return null;
    }
  },

  /**
   * Remove the cached profile for this user.
   * Called on explicit sign-out.
   */
  async clearCachedProfile(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(profileCacheKey(userId));
    } catch (error) {
      console.warn('[auth-cache] Failed to clear cached profile:', error);
    }
  },

  /**
   * Remove ALL profile cache entries across all users.
   * Use sparingly — prefer scoped clear.
   */
  async clearAllCachedProfiles(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((k) => k.startsWith(PROFILE_CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.warn('[auth-cache] Failed to clear all profile caches:', error);
    }
  },
};
