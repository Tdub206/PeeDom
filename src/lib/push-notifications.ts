import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { z } from 'zod';
import type { NotificationRouteData } from '@/types';

const notificationRouteDataSchema = z.object({
  route: z.string().min(1).optional(),
});

export type PushRegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'permission_denied' }
  | { status: 'not_device' }
  | { status: 'missing_project_id' }
  | { status: 'error'; error: Error };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getExpoProjectId(): string | null {
  const easProjectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  return typeof easProjectId === 'string' && easProjectId.trim().length > 0 ? easProjectId.trim() : null;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Pee-Dom Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563eb',
    showBadge: true,
  });
}

export async function requestPushToken(): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    return {
      status: 'not_device',
    };
  }

  try {
    await ensureAndroidChannel();

    const existingPermissions = await Notifications.getPermissionsAsync();
    let finalStatus = existingPermissions.status;

    if (finalStatus !== 'granted') {
      const requestedPermissions = await Notifications.requestPermissionsAsync();
      finalStatus = requestedPermissions.status;
    }

    if (finalStatus !== 'granted') {
      return {
        status: 'permission_denied',
      };
    }

    const projectId = getExpoProjectId();

    if (!projectId) {
      return {
        status: 'missing_project_id',
      };
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return {
      status: 'registered',
      token: tokenResponse.data,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error : new Error('Unable to request push notification permissions.'),
    };
  }
}

export async function clearBadgeCount(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // Badge support varies by platform. Ignore failures.
  }
}

export function extractNotificationRoute(data: unknown): string | null {
  const parsedData = notificationRouteDataSchema.safeParse(data as NotificationRouteData);

  if (!parsedData.success) {
    return null;
  }

  return parsedData.data.route ?? null;
}
