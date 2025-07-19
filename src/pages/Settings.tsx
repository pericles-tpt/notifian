import React, {Dispatch, SetStateAction, useEffect, useState} from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {C_GRAY, C_LGRAY, MAX_SHOW_FOLDER_LEN, NINE_AM} from '../Constant';
import {Button, IconPlacement} from '../components/Button';
import { subheadingTextStyle } from '../styles';
import { useAtomValue } from 'jotai';
import { state, store } from '../atoms';
import { DeepCopy } from '../utilities/Object';
import { setStateInDB, State } from '../db/json';
import RNDateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { equal } from '../utilities/Time';
import { resetDb } from '../db/db';
import { getPathUpToLimit } from '../utilities/String';
import { pickDirectory } from '@react-native-documents/picker';
import { isUriSubdirectoryOfChosen } from '../utilities/Path';
import { copyErrorFileToPickedDest } from '../utilities/Error';

export function Settings({setShowSettings}:{setShowSettings: Dispatch<SetStateAction<boolean>>}) {
  const styles = StyleSheet.create({
    modalBg: {
      display: 'flex',
      flex: 1,
      position: 'absolute',
      top: -20,
      left: -20,
      right: -20,
      bottom: -20,
      padding: 0,
      backgroundColor: 'rgba(1,1,1,0.5)',
      borderColor: 'rgba(0,0,0,0)',
      elevation: 10,
    },
    modal: {
      display: 'flex',
      flex: 1,
      position: 'absolute',
      top: '12.5%',
      left: 40,
      right: 40,
      bottom: '12.5%',
      padding: 25,
      backgroundColor: 'rgba(255,255,255,1)',
      borderColor: 'rgba(0,0,0,0)',
      borderRadius: 6,
      borderWidth: 2,
      elevation: 10,
    },
    modalTitle: {
      fontSize: 30,
      textAlign: 'center',
      color: 'black',
      fontWeight: 'bold',
      marginBottom: 10,
    },
    modalContent: {
      fontSize: 18,
      color: 'black',
    },
    component: {
      paddingVertical: 15,
      paddingHorizontal: 10,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: C_LGRAY,
      height: '100%',
      flex: 1,
    },
    headingRow: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginBottom: 10,
    },
    backBtn: {
        paddingLeft: 16,
      },
    heading: {
      color: 'black',
      fontSize: 30,
      marginVertical: 5,
      fontWeight: 'bold',

    },
    subheading: {
      color: 'black',
      fontSize: 30,
      textAlignVertical: 'center',
      fontWeight: 'bold',
    },
    subsubheading: {
      color: 'black',
      fontSize: 20,
      marginVertical: 5,
      fontStyle: 'italic',
      fontWeight: 'normal',
      marginBottom: 20,
    },
    settingCard: {
        backgroundColor: 'white',
        display: 'flex',
        width: '100%',
        marginBottom: 15,
        padding: 10,
        paddingLeft: 15,
        borderRadius: 6,
        borderStyle: 'solid',
        borderColor: 'rgba(0,0,0,0)',
        elevation: 5,
        shadowColor: 'black',
        shadowOffset: {
          width: 30,
          height: 30,
        },
        shadowOpacity: 0.9,
        shadowRadius: 10,
      },
      tasksDisclaimerText: {fontSize: 16, fontStyle: 'italic', color: 'black', marginBottom: 20},
      switchRow: {display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10},
      dateTimePreviewContainer: {
        height: 40,
        width: '45%',
      },
      dateTimePreviewText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        alignContent: 'center',
        backgroundColor: 'black',
        padding: 6,
        color: 'white',
        borderRadius: 6,
      },
      chooseFolderBtn: {width: undefined, height: 50},
      helpBtn: {marginLeft: 10, marginBottom: 0, justifyContent: 'center', paddingLeft: 0, paddingRight: 0, width: 40, aspectRatio: 1},
  });

  const taskBoardHelpText = `Enabling the integration with the "task board" plugin enables much faster scanning of reminder information in your notes.

  However, since the scan method is different to Notifian's default scan method it also disables all other settings.
  
  For more information about "task board's" integration with Obsidian see: [TODO: ADD LINK HERE]`;

  // const [loading, _setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [_loadingMsg, _setLoadingMsg] = useState('loading');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickFor, setPickFor] = useState('');
  const [showTaskBoardHelpText, setShowTaskBoardHelpText] = useState(false);

  const [dueTime, setDueTime] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [enabledTasks, setEnabledTasks] = useState<boolean | null>(null);
  const [enabledTaskBoardIntegration, setEnabledTaskBoardIntegration] = useState<boolean | null>(null);
  const [pickerValue, setPickerValue] = useState<Date>(NINE_AM);
  const [enabledRestrictedScan, setEnabledRestrictedScan] = useState<boolean | null>(null);
  const [restrictedScanPath, setRestrictedScanPath] = useState<string>('');
  const [restrictedScanPathShown, setRestrictedScanPathShown] = useState<string>('');

  const [resetDBCount, setResetDBCount] = useState(0);

  const s = useAtomValue(state, {
    store: store,
  });

  useEffect(() => {
    async function updateStateFromToDB() {
      if (s === null || s.scanTasks === undefined) {
        return;
      }

      if (enabledTaskBoardIntegration === true) {
        setEnabledTasks(false);
      }

      if (enabledTasks === null) {
        if (s.scanTasks !== undefined) {
          setDueTime(s.scanTasks.dueTime);
          setStartTime(s.scanTasks.startTime);
          setScheduledTime(s.scanTasks.scheduledTime);
        }
        setEnabledTasks(s.scanTasks !== undefined && s.scanTasks.enabled);
        setEnabledRestrictedScan(s.scanTasks !== undefined && s.scanTasks.restrictedToSubdirectory !== undefined);
        return;
      }

      const os: State = DeepCopy(store.get(state), 2);
      const ns: State = DeepCopy(store.get(state), 3);
      ns.enabledTaskBoardPlugin = enabledTaskBoardIntegration !== null && enabledTaskBoardIntegration;
      ns.scanTasks = {
        enabled: enabledTasks,
        scheduledTime: scheduledTime === null ? NINE_AM : scheduledTime,
        dueTime: dueTime === null ? NINE_AM : dueTime,
        startTime: startTime === null ? NINE_AM : startTime,
        restrictedToSubdirectory: enabledRestrictedScan && restrictedScanPath !== '' ? restrictedScanPath : undefined,
      };

      if (JSON.stringify(os) === JSON.stringify(ns)) {
        return;
      }

      setRestrictedScanPathShown(decodeURIComponent(restrictedScanPath));

      try {
        await setStateInDB(ns);
      } catch {
        await setStateInDB(os);
      }
    }
    updateStateFromToDB();
  }, [dueTime, enabledRestrictedScan, enabledTasks, pickFor, restrictedScanPath, s, scheduledTime, startTime, enabledTaskBoardIntegration]);

  // Currently won't update notifications when changing the due/scheduled/start times, this should force that
  useEffect(() => {
    resetDb();
  }, [resetDBCount]);

  return (
    <>
      <View style={styles.component}>
        <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 15}}>
            <Button
                buttonText={'Settings'}
                fgColor={'black'}
                bgColor={'rgba(0,0,0,0)'}
                fontSize={25}
                icons={['arrow-left']}
                iconColors={['black']}
                iconPlacement={IconPlacement.Left}
                customStyles={[styles.backBtn]}
                action={() => setShowSettings(false)}
            />
        </View>
        <Button
          buttonText={'export error logs'}
          fgColor={'black'}
          bgColor={'whitesmoke'}
          fontSize={22}
          icons={[]}
          iconColors={[]}
          iconPlacement={IconPlacement.Bottom}
          customStyles={[styles.settingCard]}
          action={async () => {
            await copyErrorFileToPickedDest();
          }}
          textAlign={'flex-start'}
        />
        <View style={styles.switchRow}>
          <Button
            buttonText={''}
            fgColor={'black'}
            bgColor={'whitesmoke'}
            fontSize={22}
            icons={['question']}
            iconColors={['black']}
            iconPlacement={IconPlacement.Right}
            customStyles={[styles.settingCard, styles.helpBtn]}
            action={async () => {
              setShowTaskBoardHelpText(true);
              setShowModal(true);
            }}
          />
          <Text style={subheadingTextStyle}>{'Enable "Task Board" Integration'}</Text>
          <Switch
            trackColor={{false: C_GRAY}}
            onValueChange={(v) => {
              setEnabledTaskBoardIntegration(v);
              setResetDBCount(c => c + 1);
            }}
            value={enabledTaskBoardIntegration !== null && enabledTaskBoardIntegration}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={subheadingTextStyle}>{'Scan for "Tasks"'}</Text>
          <Switch
            trackColor={{false: C_GRAY}}
            onValueChange={(v) => {
              setEnabledTasks(v);
              setResetDBCount(c => c + 1);
            }}
            value={enabledTasks !== null && enabledTasks}
          />
        </View>
        {enabledTasks !== null && enabledTasks &&
          <>
            <Text style={[subheadingTextStyle, {marginBottom: 20}]}>{'Notification Trigger Times'}</Text>
            <View style={styles.switchRow}>
              <Text style={[subheadingTextStyle, {fontWeight: 'normal'}]}>{'Due'}</Text>
              <Pressable
                onPress={() => {
                  setPickFor('due');
                  setShowTimePicker(true);
                }}
                style={styles.dateTimePreviewContainer}>
                <Text style={styles.dateTimePreviewText}>
                  {dueTime === null ? NINE_AM.toTimeString().split(' ')[0] : new Date(dueTime).toTimeString().split(' ')[0]}
                </Text>
              </Pressable>
            </View>
            <View style={styles.switchRow}>
              <Text style={[subheadingTextStyle, {fontWeight: 'normal'}]}>{'Scheduled'}</Text>
              <Pressable
                onPress={() => {
                  setPickFor('scheduled');
                  setShowTimePicker(true);
                }}
                style={styles.dateTimePreviewContainer}>
                <Text style={styles.dateTimePreviewText}>
                  {scheduledTime === null ? NINE_AM.toTimeString().split(' ')[0] : new Date(scheduledTime).toTimeString().split(' ')[0]}
                </Text>
              </Pressable>
            </View>
            <View style={styles.switchRow}>
              <Text style={[subheadingTextStyle, {fontWeight: 'normal'}]}>{'Start'}</Text>
              <Pressable
                onPress={() => {
                  setPickFor('start');
                  setShowTimePicker(true);
                }}
                style={styles.dateTimePreviewContainer}>
                <Text style={styles.dateTimePreviewText}>
                  {startTime === null ? NINE_AM.toTimeString().split(' ')[0] : new Date(startTime).toTimeString().split(' ')[0]}
                </Text>
              </Pressable>
            </View>
            <View style={styles.switchRow}>
            <Text style={subheadingTextStyle}>{'Restrict "Tasks" Scan to Subdirectory'}</Text>
              <Switch
                trackColor={{false: C_GRAY}}
                onValueChange={(v) => {
                  setEnabledRestrictedScan(v);
                  setResetDBCount(c => c + 1);
                }}
                value={enabledRestrictedScan !== null && enabledRestrictedScan}
              />
            </View>
            <Text style={styles.tasksDisclaimerText}>{'NOTE: If you enable "tasks" scanning it\'s recommended to also pick a subdirectory. Otherwise your scans may take a long time.'}</Text>
            {
              enabledRestrictedScan !== null && enabledRestrictedScan &&
              <>
                <Text style={[subheadingTextStyle, styles.subsubheading]}>
                  {`${restrictedScanPathShown.length === 0 ? 'none chosen' : (restrictedScanPathShown.length <= MAX_SHOW_FOLDER_LEN ? restrictedScanPathShown : '.../' +  getPathUpToLimit(restrictedScanPathShown, MAX_SHOW_FOLDER_LEN - 3))}`}
                </Text>
                <Button
                  buttonText={(restrictedScanPath.length === 0 ? 'choose' : 'change') + ' folder'}
                  fgColor={'black'}
                  bgColor={'whitesmoke'}
                  fontSize={22}
                  icons={[]}
                  iconColors={[]}
                  iconPlacement={IconPlacement.Bottom}
                  customStyles={[styles.settingCard, styles.chooseFolderBtn]}
                  action={async () => {
                    const os: State = DeepCopy(store.get(state), 1);
                    const dir = await pickDirectory();
                    if (dir === null || os.scanTasks === undefined) {
                      Alert.alert('Error', 'Failed to get folder picked by user');
                      return;
                    }

                    // If the 'picked' directory is invalid, return
                    if (!isUriSubdirectoryOfChosen(os.rootURI, dir.uri)) {
                      Alert.alert('Not a Subdirectory', 'The folder you chose is not INSIDE your scan folder');
                      return;
                    }

                    // Update URI in state
                    const uriPathPart = dir.uri.split('primary%3A')[1];
                    setRestrictedScanPath(uriPathPart);
                    setResetDBCount(c => c + 1);
                  }}
                  textAlign={'flex-start'}
                />
              </>
            }
            {showTimePicker && <RNDateTimePicker
                display="default"
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  if (date === undefined) {
                    return;
                  }

                  const dismissed = event.type === 'dismissed';
                  if (event.type === 'set' || dismissed) {
                    setShowTimePicker(false);
                  }

                  switch(pickFor) {
                    case 'due':
                      if (!dismissed && (dueTime === null || !equal(dueTime, date))) {
                        setResetDBCount(c => c + 1);
                        setDueTime(date);
                      }
                      break;
                    case 'scheduled':
                      if (!dismissed && (scheduledTime === null || !equal(scheduledTime, date))) {
                        setResetDBCount(c => c + 1);
                        setScheduledTime(date);
                      }
                      break;
                    case 'start':
                      if (!dismissed && (startTime === null || !equal(startTime, date))) {
                        setResetDBCount(c => c + 1);
                        setStartTime(date);
                      }
                      break;
                  }

                  if (!dismissed) {
                    setPickerValue(date);
                  }
                }}
                value={pickerValue}
                mode="time"
              />}
          </>
        }
      </View>
      {showModal && (
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {showTaskBoardHelpText ? 'Task Board Integration' : 'Modal'}
            </Text>
            <Text style={[styles.modalContent]}>
              {showTaskBoardHelpText ? taskBoardHelpText : 'Modal Content'}
            </Text>
            <Button
              buttonText={'Close'}
              fgColor={'black'}
              bgColor={'white'}
              fontSize={25}
              icons={[]}
              iconColors={[]}
              iconPlacement={IconPlacement.Right}
              customStyles={[{
                position: 'absolute',
                alignSelf: 'center',
                left: '39%',
                top: 0,
              }]}
              action={() => {
                setShowModal(false);
              }}
              textAlign={'flex-start'}
            />
          </View>
        </View>
      )}
    </>
  );
}
