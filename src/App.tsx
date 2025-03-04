/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {Provider, useAtomValue} from 'jotai';
import notifee, {AndroidNotificationSetting} from '@notifee/react-native';
import {
  Appearance,
  AppState,
  BackHandler,
  Linking,
  PermissionsAndroid,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import './gesture-handler';
import {dbInit} from './db/db';
import {C_LGRAY, MIN_TO_MILLI, PURPLE} from './Constant';
import {Main} from './pages/Main';
import { Settings } from './pages/Settings';
import {getStateFromFile, getStateFromJSONOrCache} from './db/json';
import {AppTitle} from './components/AppTitle';
import {rescanDirs} from './utilities/app/Walk';
import { BatteryOptEnabled, OpenOptimizationSettings } from 'react-native-battery-optimization-check';
import BackgroundFetch, { BackgroundFetchConfig } from 'react-native-background-fetch';
import { Notifications } from './pages/Notifications';
import Orientation from 'react-native-orientation-locker';
import { isScanning, state, store } from './atoms';
import { StyleProp } from 'react-native';
import { asyncOkDialog, errorsPath, flushErrorToFile } from './utilities/Error';
import { FileSystem } from 'react-native-file-access';

function App(): React.JSX.Element {
  const [appState, setAppState] = useState(AppState.currentState);
  const st = useAtomValue(state, {
    store: store,
  });
  const [scanInterval, setScanInterval] = useState(15);
  const [rootDir, setRootDir] = useState('');
  const [startedBackground, setStartedBackground] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [forceRescan, setForceRescan] = useState(false);
  const [taskTimes, setTaskTimes] = useState('');

  useEffect(() => {
    Orientation.lockToPortrait();
  }, []);

  async function checkForPermissions() {
    let isBatteryUnrestricted = !(await BatteryOptEnabled());
    let settings = await notifee.getNotificationSettings();
    let hasAlarmPermission = settings.android.alarm === AndroidNotificationSetting.ENABLED;
    let hasNotifyPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    let hasRequiredPermissions = isBatteryUnrestricted && hasAlarmPermission && hasNotifyPermission;
    while (!hasRequiredPermissions) {
      // Unrestricted Battery Check - Requires quit/reopen
      isBatteryUnrestricted = !(await BatteryOptEnabled());
      if (!isBatteryUnrestricted) {
        await asyncOkDialog('Battery Restrictions', "'Battery Usage' must be 'Unrestricted' for notifications to work, in the next menu please select:\n\nNotifian -> Allow Background Usage -> Unrestricted\n\nAfter that, open the app again.", () => {Linking.openSettings();});
        OpenOptimizationSettings();
        BackHandler.exitApp();
      }

      // Alarm/Notifications Check - App can stay open
      settings = await notifee.getNotificationSettings();
      hasAlarmPermission = settings.android.alarm === AndroidNotificationSetting.ENABLED;
      hasNotifyPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (!hasNotifyPermission || !hasAlarmPermission) {
        await asyncOkDialog('Missing Permission', "Please accept the notification and/or alarm permissions in the next step, otherwise this app won't work");

        // Schedule Alarm
        if (!hasAlarmPermission) {
          await notifee.openAlarmPermissionSettings();
        }

        // Notifications
        if (!hasNotifyPermission) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        }
      }

      // POST check
      isBatteryUnrestricted = !(await BatteryOptEnabled());
      settings = await notifee.getNotificationSettings();
      hasAlarmPermission = settings.android.alarm === AndroidNotificationSetting.ENABLED;
      hasNotifyPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      hasRequiredPermissions = isBatteryUnrestricted && hasAlarmPermission && hasNotifyPermission;
    }
  }
  // Sometimes when the user clears storage is can reset some permissions,
  // should check that the user has the right permissions every time they
  // open the app
  useEffect(() => {
    async function startupChecks() {
      await checkForPermissions();
    }
    startupChecks();
  });

  useEffect(() => {
    if (st === null) {
      return;
    }
    if (st.lastScanTime !== lastScanTime) {
      setLastScanTime(st.lastScanTime);
    }
    const maybeNew = st.intervalMinutes < 15 ? 15 : st.intervalMinutes;
    if (scanInterval !== maybeNew) {
      setScanInterval(maybeNew);
      // Force a rescan
      setForceRescan(true);
    }
    if (st.rootURI !== rootDir) {
      setRootDir(st.rootURI);
      // Force a rescan
      setForceRescan(true);
    }
    const currTaskTimes = JSON.stringify(st.scanTasks);
    if (currTaskTimes !== taskTimes) {
      setTaskTimes(currTaskTimes);
      // Force a rescan
      setForceRescan(true);
    }
  }, [scanInterval, rootDir, st, lastScanTime, taskTimes]);


  useEffect(() => {
    async function rescan() {
      // Read JSON file (contains up to date state)
      const maybeState = await getStateFromFile();
      if (maybeState === null) {
        return;
      }
      const intervalMS = maybeState.intervalMinutes * MIN_TO_MILLI;
      const lastScan = maybeState.lastScanTime === null || forceRescan ? new Date(0) : maybeState.lastScanTime;
      const rootURI = maybeState.rootURI;
      if (rootURI === '' || new Date().getTime() - new Date(lastScan).getTime() < intervalMS) {
          return;
      } else if (forceRescan) {
        setForceRescan(false);
      }

      store.set(isScanning, true);
      await rescanDirs([rootURI]);
      store.set(isScanning, false);
    }
    const onEvent = async (taskId: string) => {
      console.log('[BackgroundFetch] task: ', taskId);
      await rescan();
      BackgroundFetch.finish(taskId);
    };

    // Timeout callback is executed when your Task has exceeded its allowed running-time.
    // You must stop what you're doing immediately BackgroundFetch.finish(taskId)
    const onTimeout = async (taskId: string) => {
      console.warn('[BackgroundFetch] TIMEOUT task: ', taskId);
      BackgroundFetch.finish(taskId);
    };

    async function restartBackgroundFetch() {
      if (rootDir === '' || scanInterval < 15) {
        return;
      }
      if (startedBackground) {
        await BackgroundFetch.stop();
      }

      await rescan();

      const bfConf: BackgroundFetchConfig = {
        minimumFetchInterval: scanInterval,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
        // TODO: For some reason, enabling `forceAlarmManager` causes headless jobs
        //       to not trigger. When it's `false` it uses `JobScheduler` instead of
        //       `AlarmManager`, which prioritises battery life over accuracy. It'd
        //       be good to be able to choose between the two.
        forceAlarmManager: false,
    };
      await BackgroundFetch.configure(bfConf, onEvent, onTimeout);

      if (!startedBackground) {
        setStartedBackground(true);
    }

      await BackgroundFetch.start();
    }
    restartBackgroundFetch();
  }, [scanInterval, startedBackground, rootDir, forceRescan]);

  const styles = StyleSheet.create({
    component: {display: 'flex', flex: 1, backgroundColor: C_LGRAY},
  });

  // Whenever app goes from !active -> active, reconnect ws
  AppState.addEventListener('change', nextAppState => {
    if (appState !== 'active' && nextAppState === 'active') {
      // TODO: Do something when app goes from 'inactive' -> 'active'
    }
    setAppState(nextAppState);
  });

  // (1) Open DB, login/validate user
  useEffect(() => {
    async function init() {
      // Startup DB
      try {
        await dbInit();
      } catch (err) {
        flushErrorToFile('Error initialising db', `${err}`);
        return;
      }

      try {
        await getStateFromJSONOrCache();
      } catch (err) {
        flushErrorToFile('Error getting state from file', `failed to get state: ${err}`);
        return;
      }

      // Create error.log file if it doesn't exist
      const exists = await FileSystem.exists(errorsPath);
      if (!exists) {
        try {
          await FileSystem.writeFile(errorsPath, '', 'utf8');
        } catch (err) {
          console.error('error occurred writing initial error file: ', err);
        }
      }
    }
    init();
  }, []);

  function getShowSectionStyle(show: boolean): StyleProp<ViewStyle> {
    return { display: show ? 'flex' : 'none', flex: 1 };
  }

  Appearance.setColorScheme('dark');
  return (
    <Provider>
      <SafeAreaView style={styles.component}>
        <StatusBar backgroundColor={PURPLE} barStyle={'light-content'} />
        <AppTitle />
        <View style={getShowSectionStyle(showSettings)}>
          <Settings setShowSettings={setShowSettings} />
        </View>
        <View style={getShowSectionStyle(showNotifications)}>
          <Notifications setShowNotifications={setShowNotifications} />
        </View>
        <View style={getShowSectionStyle(!showSettings && !showNotifications)}>
          <Main _setShowSettings={setShowSettings} setShowNotifications={setShowNotifications} />
        </View>
      </SafeAreaView>
    </Provider>
  );
}

export default App;
