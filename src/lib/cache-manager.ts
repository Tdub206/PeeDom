import { storage } from './storage';
import { CacheEntry } from '@/types';

class CacheManager {
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Set a cache entry with TTL
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + (ttl || this.DEFAULT_TTL)).toISOString(),
    };

    await storage.set(key, entry);
  }

  /**
   * Get a cache entry
   * Returns null if not found or expired
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = await storage.get<CacheEntry<T>>(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (new Date(entry.expires_at) < new Date()) {
      await this.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Get cache entry with metadata
   */
  async getWithMeta<T>(key: string): Promise<{
    data: T;
    cached_at: string;
    is_stale: boolean;
  } | null> {
    const entry = await storage.get<CacheEntry<T>>(key);
    
    if (!entry) {
      return null;
    }

    const now = new Date();
    const cachedAt = new Date(entry.cached_at);
    const expiresAt = new Date(entry.expires_at);

    // Check if expired (hard expiry)
    if (expiresAt < now) {
      await this.delete(key);
      return null;
    }

    // Check if stale (older than 1 minute but not expired)
    const staleThreshold = 60 * 1000; // 1 minute
    const age = now.getTime() - cachedAt.getTime();
    const is_stale = age > staleThreshold;

    return {
      data: entry.data,
      cached_at: entry.cached_at,
      is_stale,
    };
  }

  /**
   * Delete a cache entry
   */
  async delete(key: string): Promise<void> {
    await storage.remove(key);
  }

  /**
   * Clear all cache entries matching a prefix
   */
  async clearPrefix(prefix: string): Promise<void> {
    await storage.removeByPrefix(prefix);
  }

  /**
   * Invalidate cache for a specific resource
   */
  async invalidate(resource: 'bathrooms' | 'favorites' | 'profile', id?: string): Promise<void> {
    if (resource === 'bathrooms') {
      await this.clearPrefix(storage.keys.CACHED_BATHROOMS);
    } else if (resource === 'favorites' && id) {
      await this.delete(`${storage.keys.CACHED_FAVORITES}:${id}`);
    } else if (resource === 'profile' && id) {
      await this.delete(`${storage.keys.CACHED_PROFILE}:${id}`);
    }
  }
}

export const cacheManager = new CacheManager();
