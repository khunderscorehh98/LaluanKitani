// Reminders scheduled on the phone ("local" notifications). No server is
// involved, so they work without an account and in Expo Go.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import i18n from 'i18next';

export const TRIPS_CHANNEL = 'trips';

// Show reminders even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Android needs a channel before it will ask for permission (Android 13+). */
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(TRIPS_CHANNEL, {
    name: i18n.t('notifications.tripsChannel'),
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/** True when reminders may be shown, asking the first time. */
export async function allowReminders() {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Schedules a reminder; returns its id, used to cancel it. `data` comes back when it's tapped. */
export function scheduleReminder({ at, title, body, data }) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: TRIPS_CHANNEL },
  });
}

export function cancelReminder(id) {
  return Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

/** Calls `onOpen(data)` when a reminder is tapped, including one that opened the app. */
export function onReminderOpened(onOpen) {
  const open = (response) => {
    if (!response) return;
    onOpen(response.notification.request.content.data ?? {});
    Notifications.clearLastNotificationResponse();
  };
  open(Notifications.getLastNotificationResponse());
  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}
