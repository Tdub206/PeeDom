import AsyncStorage from '@react-native-async-storage/async-storage';

const NAMESPACE = '@peedom/';

const STORAGE_KEYS = {
  // Cache keys
  CACHED_BATHROOMS: '@peedom/cached_bathrooms',
  CACHED_REGION: '@peedom/cached_region',
  CACHED_FAVORITES: '@peedom/cached_favorites',
  CACHED_PROFILE: '@peedom/cached_profile',

  // Offline keys
  OFFLINE_QUEUE: '@peedom/offline_queue',

  // Intent keys
  RETURN_INTENT: '@peedom/return_intent',

  // User preference keys
  USER_PREFERENCES: '@peedom/user_preferences',
  CODE_UNLOCKS: '@peedom/code_unlocks',
  ANALYTICS_ANONYMOUS_ID: '@peedom/analytics_anonymous_id',
  SEARCH_HISTORY: '@peedom/search_history',
  PREMIUM_CITY_PACK_INDEX: '@peedom/premium_city_pack_index',
  PREMIUM_CITY_PACK_PREFIX: '@peedom/premium_city_pack',
} as const;

export const storage = {
  keys: STORAGE_KEYS,

  async set(key: string, value: unknown): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error saving ${key} to storage:`, error);
      throw error;
    }
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
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
      const pairs = await AsyncStorage.multiGet(keys);
      const results = new Map<string, T>();

      for (const [key, jsonValue] of pairs) {
        if (jsonValue != null) {
          try {
            results.set(key, JSON.parse(jsonValue) as T);
          } catch (_e) {
            // Skip malformed entries silently
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
      await AsyncStorage.removeItem(key);
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
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error in multiRemove:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },

  /**
   * Returns all keys in the @peedom/ namespace.
   * WARNING: This scans ALL keys on the device (O(n) where n = total device keys).
   * Prefer using multiRemove() with explicit key lists or removeByPrefix() for
   * targeted operations instead of scanning via getAllKeys().
   */
  async getAllKeys(): Promise<readonly string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys.filter((key) => key.startsWith(NAMESPACE));
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  },

  async getKeysByPrefix(prefix: string): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys.filter((key) => key.startsWith(prefix));
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
