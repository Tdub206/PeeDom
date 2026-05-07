import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';
import {
  getCurrentStorageKey,
  getPreviousStorageKey,
} from '@/lib/storage-namespace';

function resolveCurrentKey(key: string): string {
  return getCurrentStorageKey(key) ?? key;
}

function getRelatedKeys(key: string): string[] {
  const currentKey = resolveCurrentKey(key);
  const previousKey = getPreviousStorageKey(currentKey);
  return previousKey ? [currentKey, previousKey] : [currentKey];
}

export function createStallPassStateStorage(): StateStorage {
  return {
    async getItem(name: string): Promise<string | null> {
      try {
        const currentName = resolveCurrentKey(name);
        const currentValue = await AsyncStorage.getItem(currentName);

        if (currentValue !== null) {
          return currentValue;
        }

        const previousName = getPreviousStorageKey(currentName);

        if (!previousName) {
          return null;
        }

        const previousValue = await AsyncStorage.getItem(previousName);

        if (previousValue === null) {
          return null;
        }

        await AsyncStorage.setItem(currentName, previousValue);
        await AsyncStorage.removeItem(previousName);
        return previousValue;
      } catch (error) {
        console.error(`Unable to read persisted StallPass state for ${name}:`, error);
        return null;
      }
    },
    async setItem(name: string, value: string): Promise<void> {
      try {
        const currentName = resolveCurrentKey(name);
        await AsyncStorage.setItem(currentName, value);

        const previousName = getPreviousStorageKey(currentName);
        if (previousName) {
          await AsyncStorage.removeItem(previousName);
        }
      } catch (error) {
        console.error(`Unable to persist StallPass state for ${name}:`, error);
        throw error;
      }
    },
    async removeItem(name: string): Promise<void> {
      try {
        await AsyncStorage.multiRemove(getRelatedKeys(name));
      } catch (error) {
        console.error(`Unable to remove persisted StallPass state for ${name}:`, error);
        throw error;
      }
    },
  };
}
