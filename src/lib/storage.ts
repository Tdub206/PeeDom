import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCurrentStorageKey,
  getPreviousStorageKey,
  isManagedStorageKey,
} from '@/lib/storage-namespace';

const STORAGE_KEYS = {
  // Cache keys
  CACHED_BATHROOMS: '@stallpass/cached_bathrooms',
  CACHED_REGION: '@stallpass/cached_region',
  CACHED_FAVORITES: '@stallpass/cached_favorites',
  CACHED_PROFILE: '@stallpass/cached_profile',

  // Offline keys
  OFFLINE_QUEUE: '@stallpass/offline_queue',

  // Intent keys
  RETURN_INTENT: '@stallpass/return_intent',

  // User preference keys
  USER_PREFERENCES: '@stallpass/user_preferences',
  CODE_UNLOCKS: '@stallpass/code_unlocks',
  ANALYTICS_ANONYMOUS_ID: '@stallpass/analytics_anonymous_id',
  SEARCH_HISTORY: '@stallpass/search_history',
  PREMIUM_CITY_PACK_INDEX: '@stallpass/premium_city_pack_index',
  PREMIUM_CITY_PACK_PREFIX: '@stallpass/premium_city_pack',
  TERMS_ACCEPTED_AT: '@stallpass/terms_accepted_at',
  HAS_COMPLETED_ONBOARDING: '@stallpass/has_completed_onboarding',
  FIRST_INSTALL_CREDITS: '@stallpass/first_install_credits',

  // Beta bug reporting
  BUG_REPORT_GUEST_ID: '@stallpass/bug_report_guest_id',
} as const;

function uniqueKeys(keys: readonly (string | null)[]): string[] {
  return [...new Set(keys.filter((key): key is string => Boolean(key)))];
}

function resolveCurrentKey(key: string): string {
  return getCurrentStorageKey(key) ?? key;
}

function getRelatedKeys(key: string): string[] {
  const currentKey = resolveCurrentKey(key);
  return uniqueKeys([currentKey, getPreviousStorageKey(currentKey)]);
}

function parseStoredValue<T>(key: string, jsonValue: string): T | null {
  try {
    return JSON.parse(jsonValue) as T;
  } catch (error) {
    console.error(`Error parsing ${key} from storage:`, error);
    return null;
  }
}

async function readWithNamespaceMigration(key: string): Promise<string | null> {
  const currentKey = resolveCurrentKey(key);
  const currentValue = await AsyncStorage.getItem(currentKey);

  if (currentValue !== null) {
    return currentValue;
  }

  const previousKey = getPreviousStorageKey(currentKey);

  if (!previousKey) {
    return null;
  }

  const previousValue = await AsyncStorage.getItem(previousKey);

  if (previousValue === null) {
    return null;
  }

  await AsyncStorage.setItem(currentKey, previousValue);
  await AsyncStorage.removeItem(previousKey);
  return previousValue;
}

export const storage = {
  keys: STORAGE_KEYS,

  async set(key: string, value: unknown): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      const currentKey = resolveCurrentKey(key);
      await AsyncStorage.setItem(currentKey, jsonValue);

      const previousKey = getPreviousStorageKey(currentKey);
      if (previousKey) {
        await AsyncStorage.removeItem(previousKey);
      }
    } catch (error) {
      console.error(`Error saving ${key} to storage:`, error);
      throw error;
    }
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await readWithNamespaceMigration(key);
      return jsonValue != null ? parseStoredValue<T>(key, jsonValue) : null;
    } catch (error) {
      console.error(`Error reading ${key} from storage:`, error);
      return null;
    }
  },

  async multiGet<T>(keys: string[]): Promise<Map<string, T>> {
    if (keys.length === 0) {
      return new Map();
    }

    try {
      const results = new Map<string, T>();

      for (const key of keys) {
        const jsonValue = await readWithNamespaceMigration(key);

        if (jsonValue != null) {
          const parsedValue = parseStoredValue<T>(key, jsonValue);

          if (parsedValue !== null) {
            results.set(resolveCurrentKey(key), parsedValue);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error in multiGet:', error);
      return new Map();
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.multiRemove(getRelatedKeys(key));
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
      throw error;
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    try {
      await AsyncStorage.multiRemove(uniqueKeys(keys.flatMap((key) => getRelatedKeys(key))));
    } catch (error) {
      console.error('Error in multiRemove:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      const namespacedKeys = await this.getAllKeys();

      if (namespacedKeys.length === 0) {
        return;
      }

      await AsyncStorage.multiRemove([...namespacedKeys]);
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },

  /**
   * Returns all app-owned keys, including entries from the pre-StallPass namespace
   * that still need migration or cleanup.
   * WARNING: This scans ALL keys on the device (O(n) where n = total device keys).
   * Prefer using multiRemove() with explicit key lists or removeByPrefix() for
   * targeted operations instead of scanning via getAllKeys().
   */
  async getAllKeys(): Promise<readonly string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys.filter(isManagedStorageKey);
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  },

  async getKeysByPrefix(prefix: string): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const currentPrefix = resolveCurrentKey(prefix);
      const matchingPrefixes = uniqueKeys([currentPrefix, getPreviousStorageKey(currentPrefix)]);
      return allKeys.filter((key) => matchingPrefixes.some((matchingPrefix) => key.startsWith(matchingPrefix)));
    } catch (error) {
      console.error(`Error getting keys by prefix ${prefix}:`, error);
      return [];
    }
  },

  async removeByPrefix(prefix: string): Promise<number> {
    const keys = await this.getKeysByPrefix(prefix);

    if (keys.length === 0) {
      return 0;
    }

    await this.multiRemove(keys);
    return keys.length;
  },
};
