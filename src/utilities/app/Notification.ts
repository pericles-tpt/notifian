import {Alert, Linking} from 'react-native';
import notifee, {
  AndroidNotificationSetting,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import {FileEntryT} from '../../db/schema';
import { flushErrorToFile } from '../Error';

// Handle Triggered Notification
export async function handleNotification(vault: string, path: string) {
  // Open Obsidian to vault/note
  const obsidianUrl = `obsidian://open?vault=${vault}&file=${path}`;
  try {
    await Linking.openURL(obsidianUrl);
    return;
  } catch (err) {
    await flushErrorToFile('Error opening Obsidian link', `failed to open Obsidian link: ${err}`, true);
  }

  // Show alert if failed
  Alert.alert(
    'Error',
    `Failed to open note the vault: ${vault}, and/or file: ${path} may not exist`,
  );
}

// Create/Update Triggers on ScheduledNotes Change
export async function resetNotifications(
  entriesToDelete: FileEntryT[],
  entriesToAdd: FileEntryT[],
) {
  const settings = await notifee.getNotificationSettings();
  if (settings.android.alarm !== AndroidNotificationSetting.ENABLED) {
    await notifee.openAlarmPermissionSettings();
  }

  // Cancel notifications AND delete db entries
  // TODO: Maybe this should be separate as it isn't notification related...
  const idsToDelete = entriesToDelete.map(e => `${e.id}`);
  if (idsToDelete.length > 0) {
    await notifee.cancelTriggerNotifications(idsToDelete);
  }

  let channelId: string;
  try {
    channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      sound: 'default',
    });
  } catch (err) {
    throw `failed to create notification channel: ${err}`;
  }

  for (let i = 0; i < entriesToAdd.length; i++) {
    const e = entriesToAdd[i];
    const trigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: new Date(e.triggersAt as Date).getTime(),
      repeatFrequency: RepeatFrequency.NONE,
      alarmManager: {
        allowWhileIdle: true,
      },
    } as TimestampTrigger;

    const [vault, path] = getVaultPathFromURI(e.fileDir, e.fileName, e.vault);

    const notification = {
      id: `${e.id}`,
      title: `${e.fileName.split('.')[0]}`,
      body: `${e.content}`,
      android: {
        channelId: channelId,
        pressAction: {
          id: 'default',
        },
        smallIcon: 'ic_stat_name',
      },
      data: {
        vault: vault,
        path: path,
      },
    };

    try {
      await notifee.createTriggerNotification(notification, trigger);
    } catch (err) {
      throw `failed to set notifications: ${err}`;
    }
  }
}

export function getVaultPathFromURI(
  uri: string,
  filename: string,
  vault: string,
): [string, string] {
  let dir = decodeURIComponent(uri)
    .split('primary:')
    .slice(-1)[0]
    .split(`${vault}`)[1];
  dir = dir.startsWith('/') ? dir.slice(1) : dir;
  dir = dir.length > 0 && !dir.endsWith('/') ? `${dir}/` : dir;
  const filenameNoExt = filename.split('.').slice(0, -1).join('.');
  const path = `${dir}${filenameNoExt}`;
  return [vault, encodeURIComponent(path)];
}
