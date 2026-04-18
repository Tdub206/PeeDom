import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  buildSupabaseAuthStorageKey,
  splitLegacySupabaseSessionValue,
} from '@/lib/supabase-auth-storage-shared';

type SupabaseStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function isUserStorageKey(key: string): boolean {
  return key.endsWith('-user');
}

function isCodeVerifierKey(key: string): boolean {
  return key.endsWith('-code-verifier');
}

async function safeGetSecureValue(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Unable to read secure auth storage for ${key}:`, error);
    return null;
  }
}

async function safeSetSecureValue(key: string, value: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch (error) {
    console.error(`Unable to write secure auth storage for ${key}:`, error);
    return false;
  }
}

async function safeRemoveSecureValue(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Unable to remove secure auth storage for ${key}:`, error);
  }
}

async function safeRemoveLegacyValue(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Unable to remove legacy auth storage for ${key}:`, error);
  }
}

async function writeSecureValueOrThrow(key: string, value: string): Promise<void> {
  const wroteSecureValue = await safeSetSecureValue(key, value);

  if (!wroteSecureValue) {
    throw new Error(`Unable to securely persist Supabase auth data for ${key}.`);
  }
}

async function migrateLegacyAuthValue(key: string): Promise<string | null> {
  try {
    const legacyValue = await AsyncStorage.getItem(key);

    if (legacyValue === null) {
      return null;
    }

    if (isUserStorageKey(key) || isCodeVerifierKey(key)) {
      await writeSecureValueOrThrow(key, legacyValue);
      await safeRemoveLegacyValue(key);
      return legacyValue;
    }

    const splitSessionValue = splitLegacySupabaseSessionValue(legacyValue);
    await writeSecureValueOrThrow(key, splitSessionValue.secureSessionValue);

    if (splitSessionValue.userStorageValue) {
      const userStorageKey = `${key}-user`;
      await writeSecureValueOrThrow(userStorageKey, splitSessionValue.userStorageValue);
      await safeRemoveLegacyValue(userStorageKey);
    }

    await safeRemoveLegacyValue(key);
    return splitSessionValue.secureSessionValue;
  } catch (error) {
    console.error(`Unable to migrate legacy auth storage for ${key}:`, error);
    return null;
  }
}

function createSecureSupabaseStorageAdapter(): SupabaseStorageAdapter {
  return {
    async getItem(key: string): Promise<string | null> {
      const secureValue = await safeGetSecureValue(key);

      if (secureValue !== null) {
        return secureValue;
      }

      return migrateLegacyAuthValue(key);
    },
    async setItem(key: string, value: string): Promise<void> {
      await writeSecureValueOrThrow(key, value);
      await safeRemoveLegacyValue(key);
    },
    async removeItem(key: string): Promise<void> {
      await safeRemoveSecureValue(key);
      await safeRemoveLegacyValue(key);
    },
  };
}

export const supabaseAuthStorage = createSecureSupabaseStorageAdapter();
export const supabaseUserStorage = createSecureSupabaseStorageAdapter();
export { buildSupabaseAuthStorageKey };
