import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { api } from '@/services/api';

const PUSH_TOKEN_KEY = 'fiscally_push_token_v1';
let notificationHandlerConfigured = false;

type NotificationsModule = {
  setNotificationHandler?: (handler: any) => void;
  setNotificationChannelAsync?: (channelId: string, channel: any) => Promise<void>;
  getPermissionsAsync: () => Promise<{ status?: string; granted?: boolean }>;
  requestPermissionsAsync: () => Promise<{ status?: string; granted?: boolean }>;
  getExpoPushTokenAsync: (options?: { projectId?: string }) => Promise<{ data: string }>;
};

function getNotificationsModule(): NotificationsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

function getExpoConstants(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-constants').default;
  } catch {
    return null;
  }
}

async function ensureNotificationPresentationConfigured(): Promise<void> {
  if (notificationHandlerConfigured) return;

  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  if (Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }

  if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: 4,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B7E66',
      sound: 'default',
    });
  }
  notificationHandlerConfigured = true;
}

export async function registerPushTokenIfPossible(): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  try {
    const authenticated = await api.isAuthenticated();
    if (!authenticated) return;

    await ensureNotificationPresentationConfigured();

    let permission = await Notifications.getPermissionsAsync();
    const granted = permission.granted || permission.status === 'granted';
    if (!granted) {
      permission = await Notifications.requestPermissionsAsync();
    }
    const permissionGranted = permission.granted || permission.status === 'granted';
    if (!permissionGranted) return;

    const Constants = getExpoConstants();
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResponse?.data?.trim();
    if (!token) return;

    await api.registerPushToken(token, Platform.OS as 'ios' | 'android' | 'web');
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch (error) {
    console.log('Push token registration skipped:', error);
  }
}

export async function unregisterPushTokenIfPossible(): Promise<void> {
  let token: string | null = null;
  try {
    token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    await api.unregisterPushToken(token);
  } catch (error) {
    console.log('Push token unregister skipped:', error);
  } finally {
    if (token) {
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  }
}
