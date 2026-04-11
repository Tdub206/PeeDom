import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const asyncStorageMock: {
  getItem: jest.Mock<(key: string) => Promise<string | null>>;
  setItem: jest.Mock<(key: string, value: string) => Promise<void>>;
  removeItem: jest.Mock<(key: string) => Promise<void>>;
} = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

const secureStoreMock: {
  getItemAsync: jest.Mock<(key: string) => Promise<string | null>>;
  setItemAsync: jest.Mock<(key: string, value: string) => Promise<void>>;
  deleteItemAsync: jest.Mock<(key: string) => Promise<void>>;
} = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: asyncStorageMock,
}));

jest.mock('expo-secure-store', () => secureStoreMock);

import {
  buildSupabaseAuthStorageKey,
  splitLegacySupabaseSessionValue,
} from '@/lib/supabase-auth-storage-shared';
import { supabaseAuthStorage, supabaseUserStorage } from '@/lib/supabase-auth-storage';

describe('Supabase auth storage helpers', () => {
  beforeEach(() => {
    asyncStorageMock.getItem.mockReset();
    asyncStorageMock.setItem.mockReset();
    asyncStorageMock.removeItem.mockReset();
    secureStoreMock.getItemAsync.mockReset();
    secureStoreMock.setItemAsync.mockReset();
    secureStoreMock.deleteItemAsync.mockReset();

    asyncStorageMock.getItem.mockResolvedValue(null);
    asyncStorageMock.setItem.mockResolvedValue(undefined);
    asyncStorageMock.removeItem.mockResolvedValue(undefined);
    secureStoreMock.getItemAsync.mockResolvedValue(null);
    secureStoreMock.setItemAsync.mockResolvedValue(undefined);
    secureStoreMock.deleteItemAsync.mockResolvedValue(undefined);
  });

  it('builds the default Supabase auth storage key', () => {
    expect(buildSupabaseAuthStorageKey('https://peedom.supabase.co')).toBe('sb-peedom-auth-token');
  });

  it('splits legacy session payloads into secure and user storage values', () => {
    const splitResult = splitLegacySupabaseSessionValue(
      JSON.stringify({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: 'user-123',
          email: 'rider@example.com',
        },
      })
    );

    expect(JSON.parse(splitResult.secureSessionValue)).toEqual({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(splitResult.userStorageValue).not.toBeNull();
    expect(splitResult.userStorageValue && JSON.parse(splitResult.userStorageValue)).toEqual({
      user: {
        id: 'user-123',
        email: 'rider@example.com',
      },
    });
  });

  it('returns non-session payloads unchanged', () => {
    const splitResult = splitLegacySupabaseSessionValue('plain-text-value');

    expect(splitResult.secureSessionValue).toBe('plain-text-value');
    expect(splitResult.userStorageValue).toBeNull();
  });

  it('persists auth session values in SecureStore only', async () => {
    await supabaseAuthStorage.setItem('sb-peedom-auth-token', 'secure-session');

    expect(secureStoreMock.setItemAsync).toHaveBeenCalledWith('sb-peedom-auth-token', 'secure-session');
    expect(asyncStorageMock.setItem).not.toHaveBeenCalled();
    expect(asyncStorageMock.removeItem).toHaveBeenCalledWith('sb-peedom-auth-token');
  });

  it('persists auth user records in SecureStore only', async () => {
    await supabaseUserStorage.setItem('sb-peedom-auth-token-user', '{"user":{"id":"user-123"}}');

    expect(secureStoreMock.setItemAsync).toHaveBeenCalledWith(
      'sb-peedom-auth-token-user',
      '{"user":{"id":"user-123"}}'
    );
    expect(asyncStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('migrates legacy AsyncStorage sessions into SecureStore', async () => {
    const storageKey = 'sb-peedom-auth-token';
    const legacySessionValue = JSON.stringify({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: {
        id: 'user-123',
        email: 'rider@example.com',
      },
    });

    asyncStorageMock.getItem.mockImplementation(async (key: string) => {
      return key === storageKey ? legacySessionValue : null;
    });

    const migratedValue = await supabaseAuthStorage.getItem(storageKey);

    expect(migratedValue).toBe(
      JSON.stringify({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      })
    );
    expect(secureStoreMock.setItemAsync).toHaveBeenNthCalledWith(
      1,
      storageKey,
      JSON.stringify({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      })
    );
    expect(secureStoreMock.setItemAsync).toHaveBeenNthCalledWith(
      2,
      `${storageKey}-user`,
      JSON.stringify({
        user: {
          id: 'user-123',
          email: 'rider@example.com',
        },
      })
    );
    expect(asyncStorageMock.removeItem).toHaveBeenCalledWith(storageKey);
    expect(asyncStorageMock.removeItem).toHaveBeenCalledWith(`${storageKey}-user`);
  });

  it('fails closed when SecureStore cannot persist auth data', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    secureStoreMock.setItemAsync.mockRejectedValueOnce(new Error('write failed'));

    try {
      await expect(supabaseAuthStorage.setItem('sb-peedom-auth-token', 'secure-session')).rejects.toThrow(
        'Unable to securely persist Supabase auth data for sb-peedom-auth-token.'
      );
      expect(asyncStorageMock.setItem).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
