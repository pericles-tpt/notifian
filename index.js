/**
 * @format
 */
import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';
import notifee, {EventType} from '@notifee/react-native';
import {handleNotification} from './src/utilities/app/Notification';
import { getStateFromFile } from './src/db/json';
import { rescanDirs } from './src/utilities/app/Walk';

// Subscribe to events
notifee.onForegroundEvent(async ({type, detail}) => {
  switch (type) {
    case EventType.PRESS:
      break;
    // Unhandled
    case EventType.UNKNOWN:
    case EventType.DISMISSED:
    case EventType.APP_BLOCKED:
    case EventType.CHANNEL_BLOCKED:
    case EventType.CHANNEL_GROUP_BLOCKED:
    case EventType.TRIGGER_NOTIFICATION_CREATED:
    case EventType.FG_ALREADY_EXIST:
    case EventType.DELIVERED:
    case EventType.ACTION_PRESS:
      return;
  }

  if (
    detail.notification === undefined ||
    detail.notification.id === undefined ||
    detail.notification.data === undefined
  ) {
    console.error('malformed notification');
    return;
  }

  const data = detail.notification.data;
  if (data.vault === undefined || data.path === undefined) {
    console.error('notification missing data object');
    return;
  }

  const id = detail.notification.id;
  try {
    await handleNotification(data.vault, data.path);
  } catch (err) {
    console.error(`failed to handle notification with id: ${id}`, err);
  }
});

notifee.onBackgroundEvent(async ({type, detail}) => {
  switch (type) {
    case EventType.PRESS:
      break;
    // Unhandled
    case EventType.UNKNOWN:
    case EventType.DISMISSED:
    case EventType.APP_BLOCKED:
    case EventType.CHANNEL_BLOCKED:
    case EventType.CHANNEL_GROUP_BLOCKED:
    case EventType.TRIGGER_NOTIFICATION_CREATED:
    case EventType.FG_ALREADY_EXIST:
    case EventType.ACTION_PRESS:
    case EventType.DELIVERED:
      return;
  }

  if (
    detail.notification === undefined ||
    detail.notification.id === undefined ||
    detail.notification.data === undefined
  ) {
    console.error('malformed notification');
    return;
  }

  const data = detail.notification.data;
  if (data.vault === undefined || data.path === undefined) {
    console.error('notification missing data object');
    return;
  }

  const id = detail.notification.id;
  try {
    await handleNotification(data.vault, data.path);
  } catch (err) {
    console.error(`failed to handle notification with id: ${id}`, err);
  }
});

import BackgroundFetch from 'react-native-background-fetch';
import { MIN_TO_MILLI } from './src/Constant';
import { closeDb, openDB } from './src/db/db';

const rescan = async () => {
  const maybeState = await getStateFromFile();
  if (maybeState === null) {
    return;
  }
  const intervalMS = maybeState.intervalMinutes * MIN_TO_MILLI;
  const lastScan = maybeState.lastScanTime === null ? new Date(0) : maybeState.lastScanTime;
  const rootURI = maybeState.rootURI;
  if (rootURI === '' || new Date().getTime() - new Date(lastScan).getTime() < intervalMS) {
    return;
  }

  await rescanDirs([rootURI]);
};

const MyHeadlessTask = async (event) => {
  let taskId = event.taskId;
  let isTimeout = event.timeout;  // <-- true when your background-time has expired.

  if (isTimeout) {
    // This task has exceeded its allowed running-time.
    // You must stop what you're doing immediately finish(taskId)
    console.log('[BackgroundFetch] Headless TIMEOUT:', taskId);
    BackgroundFetch.finish(taskId);
    return;
  }

  await openDB();
  await rescan();
  await closeDb();

  // Required:  Signal to native code that your task is complete.
  // If you don't do this, your app could be terminated and/or assigned
  // battery-blame for consuming too much time in background.
  BackgroundFetch.finish(taskId);
}

// Register your BackgroundFetch HeadlessTask
BackgroundFetch.registerHeadlessTask(MyHeadlessTask);
AppRegistry.registerComponent(appName, () => App);
