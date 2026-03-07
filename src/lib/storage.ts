import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  CACHED_BATHROOMS: '@peedom/cached_bathrooms',
  CACHED_REGION: '@peedom/cached_region',
  OFFLINE_QUEUE: '@peedom/offline_queue',
  USER_PREFERENCES: '@peedom/user_preferences',
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

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
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
};
