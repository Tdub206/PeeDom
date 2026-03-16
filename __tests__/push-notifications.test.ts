import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const getPermissionsAsync: jest.MockedFunction<() => Promise<{ status: string }>> = jest.fn();
const getExpoPushTokenAsync: jest.MockedFunction<() => Promise<{ data: string }>> = jest.fn();
const requestPermissionsAsync: jest.MockedFunction<() => Promise<{ status: string }>> = jest.fn();
const setBadgeCountAsync: jest.MockedFunction<(badgeCount: number) => Promise<boolean>> = jest.fn();
const setNotificationChannelAsync: jest.MockedFunction<
  (channelId: string, config: unknown) => Promise<null>
> = jest.fn();
const setNotificationHandler: jest.MockedFunction<(handler: unknown) => void> = jest.fn();

jest.mock('expo-notifications', () => ({
  AndroidImportance: {
    HIGH: 'high',
  },
  clearLastNotificationResponseAsync: jest.fn(),
  getPermissionsAsync,
  getExpoPushTokenAsync,
  requestPermissionsAsync,
  setBadgeCountAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    easConfig: {
      projectId: 'project-123',
    },
    expoConfig: {
      extra: {
        eas: {
          projectId: 'project-123',
        },
      },
    },
  },
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('push notifications library', () => {
  beforeEach(() => {
    getPermissionsAsync.mockReset();
    getExpoPushTokenAsync.mockReset();
    requestPermissionsAsync.mockReset();
    setBadgeCountAsync.mockReset();
    setNotificationChannelAsync.mockReset();
  });

  it('registers the foreground handler on import', async () => {
    await import('@/lib/push-notifications');

    expect(setNotificationHandler).toHaveBeenCalledTimes(1);
  });

  it('returns a registered token when permission is granted', async () => {
    const { requestPushToken } = await import('@/lib/push-notifications');

    getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExpoPushToken[token-123]' });

    await expect(requestPushToken()).resolves.toEqual({
      status: 'registered',
      token: 'ExpoPushToken[token-123]',
    });
  });

  it('requests permission when needed and returns permission_denied when rejected', async () => {
    const { requestPushToken } = await import('@/lib/push-notifications');

    getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
    requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

    await expect(requestPushToken()).resolves.toEqual({
      status: 'permission_denied',
    });
  });

  it('returns not_device on simulators', async () => {
    jest.resetModules();
    jest.doMock('expo-device', () => ({
      isDevice: false,
    }));

    const { requestPushToken } = await import('@/lib/push-notifications');

    await expect(requestPushToken()).resolves.toEqual({
      status: 'not_device',
    });
  });

  it('extracts safe routes from notification data', async () => {
    const { extractNotificationRoute } = await import('@/lib/push-notifications');

    expect(extractNotificationRoute({ route: '/bathroom/abc-123' })).toBe('/bathroom/abc-123');
    expect(extractNotificationRoute({ bathroom_id: 'abc-123' })).toBeNull();
  });
});
