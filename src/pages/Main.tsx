import React, {Dispatch, SetStateAction, useEffect, useState} from 'react';
import {
  Alert,
  Linking,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {subheadingTextStyle} from '../styles';
import {C_GRAY, C_LGRAY, INTERVAL_OPTIONS, MAX_SHOW_FOLDER_LEN} from '../Constant';
import {Button, IconPlacement} from '../components/Button';
import {
  pickDirectory,
  releaseLongTermAccess,
} from '@react-native-documents/picker';
import RNPickerSelect from 'react-native-picker-select';
import {isScanning, state, store} from '../atoms';
import {useAtom, useAtomValue} from 'jotai';
import {rescanDirs} from '../utilities/app/Walk';
import {fileEntrySelectNextNotifications} from '../db/db';
import {DeepCopy} from '../utilities/Object';
import {setStateInDB, State} from '../db/json';
import {msToHumanReadable} from '../utilities/Time';
import { ScrollViewIndicator } from '@fanchenbao/react-native-scroll-indicator';

const VAULT_LIST_LIMIT = 15;

export function Main({_setShowSettings, setShowNotifications}:{_setShowSettings: Dispatch<SetStateAction<boolean>>, setShowNotifications: Dispatch<SetStateAction<boolean>>}) {
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
      flex: 1,
      fontSize: 30,
      textAlign: 'center',
      color: 'black',
      fontWeight: 'bold',
    },
    scrollStyle: {
      backgroundColor: '#adadad',
    },
    modalContent: {
      flex: 10,
      fontSize: 18,
    },
    closeBtn: {
      marginTop: 15,
      flex: 1,
      backgroundColor: 'black',
      paddingHorizontal: 10,
      alignSelf: 'center',
      paddingBottom: 2,
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
      width: '8%',
      alignItems: 'flex-start',
      paddingLeft: 8,
    },
    heading: {
      color: 'black',
      fontSize: 30,
      marginVertical: 5,
    },
    subheading: {
      color: 'black',
      fontSize: 25,
      textAlignVertical: 'center',
    },
    subsubheading: {
      color: 'black',
      fontSize: 20,
      marginVertical: 5,
      fontStyle: 'italic',
      fontWeight: 'normal',
      marginBottom: 20,
    },
    numFrequencyInput: {
      fontSize: 20,
      paddingHorizontal: 20,
      color: 'black',
      fontWeight: 'bold',
      height: '100%',
      marginRight: 10,
      borderColor: 'rgba(0,0,0,0)',
      borderWidth: 2,
      borderRadius: 6,
      backgroundColor: 'white',
      textAlign: 'center',
      marginBottom: 2,
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
    scanningStyle: {
      backgroundColor: C_LGRAY,
    },
    privacyPolicyText: {
      color: 'blue',
      textDecorationLine: 'underline',
      fontSize: 20,
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 10,
    },
    folderRow: {
      display: 'flex',
      flexDirection: 'row',
    },
    chooseFolderBtn: {width: undefined, flex: 5},
    boldText: {fontWeight: 'bold'},
    showVaultsBtn: {width: undefined, flex: 1, marginLeft: 10},
    lineDivider: {
      borderBottomColor: 'black',
      borderBottomWidth: StyleSheet.hairlineWidth,
      marginTop: 10,
      marginBottom: 20,
    },
    checkEveryColumn: {display: 'flex', flexDirection: 'column'},
    checkEveryRow: {display: 'flex', flexDirection: 'row', marginBottom: 10},
    checkEveryTitle: {fontSize: 22, flex: 4},
    pickerContainer: {
      alignSelf: 'center',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'white',
      borderWidth: 2,
      borderRadius: 6,
      borderColor: 'rgba(0,0,0,0)',
      width: 175,
      height: 40,
      marginLeft: 10,
      elevation: 5,
      shadowColor: 'black',
      shadowOffset: {
        width: 30,
        height: 30,
      },
      shadowOpacity: 0.9,
      shadowRadius: 10,
      flex: 6,
    },
    helpBtn: {marginLeft: 10, marginBottom: 0, justifyContent: 'center', paddingLeft: 0, paddingRight: 0, width: 40, aspectRatio: 1},
    intervalDisclaimerText: {fontSize: 16, fontStyle: 'italic', color: 'black', marginBottom: 20},
    lastScanText: {fontSize: 16, fontStyle: 'italic', color: 'black'},
    unlockProBtn: {
      paddingLeft: 25,
            marginBottom: 20,
            backgroundColor: 'darkgoldenrod'
    },
    proVaultsText: {fontSize: 20, color: 'darkred', marginTop: 'auto', marginBottom: 50},
  });

  const helpText = <Text>
    <Text>
      {'Choose a folder (containing at least one Obsidian vault) and a scan interval. The app will periodically scan your notes for certain properties in the \'frontmatter\'. Those properties are:'}
    </Text>
    <Text>
      <Text style={styles.boldText}>{"\n\n'remind at': "}</Text>
      <Text>{'A "date & time" property that indicates the FIRST time your notification will trigger'}</Text>
    </Text>
    <Text>
      <Text style={styles.boldText}>{"\n\n'repeats' (optional): "}</Text>
      <Text>{'A "text" property that (if included) indicates when the notification should be rescheduled, valid formats are:'}</Text>
      <Text>{'\n\t\t• "on the first/last/nth day of each month"'}</Text>
      <Text>{'\n\t\t• "every n minute(s)/hour(s)/day(s)/week(s)"'}</Text>
    </Text>
    <Text>
      <Text style={styles.boldText}>{"\n\n'stop on' (optional): "}</Text>
      <Text>{'A "date & time" property that indicates the LAST time a repeating notification can occur'}</Text>
    </Text>
  </Text>;

  const intervalHelpText = `The "check every" interval is how often Notifian scans your Obsidian notes for reminder properties.

You should set this interval to HALF the desired reminder frequency. This is because scans can often occur a few minutes late or be skipped entirely (possible, but not observed yet).

Example: If you only set reminders for events at least 1 hour in the future, set a 30 minute interval.`;

  // const [loading, _setLoading] = useState(false);
  const [scanning, setScanning] = useAtom(isScanning, {
    store: store,
  });
  const [showModal, setShowModal] = useState(false);
  const [_loadingMsg, _setLoadingMsg] = useState('loading');
  const [showHelpText, setShowHelpText] = useState(true);
  const [showIntervalHelpText, setShowIntervalHelpText] = useState(true);
  const [numNotifications, setNumNotifications] = useState<number | null>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number | null>(null);
  const [lastScanTime, setLastScanTime] = useState('never');
  const [lastTimeTaken, setLastTimeTaken] = useState('');
  const [pickerIter, setPickerIter] = useState(0);

  const [folderPath, setFolderPath] = useState<string>('');
  const s = useAtomValue(state, {
    store: store,
  });

  useEffect(() => {
    if (s === null) {
      return;
    }

    if (s.lastScanTime !== null) {
      const d = new Date(s.lastScanTime);
      setLastScanTime(d.toLocaleString());
      setLastTimeTaken(`, took ${msToHumanReadable(s.lastScanMS)}`);
    }

    if (s.rootURI !== '') {
      const decoded = decodeURIComponent(s.rootURI);
      const dirFromRoot = decoded.split('primary:').slice(-1)[0];
      setFolderPath(`/${dirFromRoot}`);
      setIntervalMinutes(s.intervalMinutes);
    }
  }, [s, folderPath]);

  useEffect(() => {
    async function getInitialNumNotifications() {
      const initalNumNotifications = await fileEntrySelectNextNotifications();
      if (initalNumNotifications.length !== numNotifications) {
        setNumNotifications(initalNumNotifications.length);
      }
    }
    getInitialNumNotifications();
  }, [numNotifications, s]);

  function getPathUpToLimit(path: string, limit: number) {
    const pathParts = path.split('/');
    const partsUnderLimit = [];
    let totalLength = 0;
    for (let i = 0; i < pathParts.length; i++) {
      const curr = pathParts[pathParts.length - 1 - i];
      totalLength += curr.length + 1;
      if (totalLength > limit) {
        break;
      }
      partsUnderLimit.unshift(curr);
    }
    return partsUnderLimit.join('/');
  }

  function getVaultsList() {
    let ret = 'no vaults found...';
    if (s === null || s.vaults.length === 0) {
      return ret;
    }
    const vaultsFound = VAULT_LIST_LIMIT;
    ret = s.vaults.length > 0 ? `\t• ${s.vaults.slice(0, vaultsFound).join('\n\t• ')}` : 'no vaults found';
    return ret;
  }

  return (
    <>
      <View style={styles.component}>
        <View>
          <Text style={[subheadingTextStyle, styles.subheading]}>
            {'Scan Folder'}
          </Text>
          <Text style={[subheadingTextStyle, styles.subsubheading]}>
            {`${folderPath.length === 0 ? 'none chosen' : (folderPath.length <= MAX_SHOW_FOLDER_LEN ? folderPath : '.../' +  getPathUpToLimit(folderPath, MAX_SHOW_FOLDER_LEN - 3))}`}
          </Text>
          <View style={styles.folderRow}>
            <Button
              buttonText={(folderPath.length === 0 ? 'choose' : 'change') + ' folder'}
              fgColor={'black'}
              bgColor={'whitesmoke'}
              fontSize={22}
              icons={[]}
              iconColors={[]}
              iconPlacement={IconPlacement.Bottom}
              customStyles={[styles.settingCard, styles.chooseFolderBtn]}
              action={async () => {
                const os: State = DeepCopy(store.get(state), 1);

                const dir = await pickDirectory({
                  requestLongTermAccess: true,
                });
                if (dir === null) {
                  Alert.alert('Error', 'Failed to get folder picked by user');
                  return;
                } else {
                  const location = dir.uri.split('tree/')[1];
                  if (!location.startsWith('primary%3ADocuments')) {
                    Alert.alert('Invalid location', 'Please choose a folder inside the INTERNAL Documents folder');
                    return;
                  }
                }

                // If the 'picked' directory is different to the old one, release it
                let oldUri = '';
                if (os !== null) {
                  oldUri = os.rootURI;
                }
                const changedDirectory = dir.uri !== oldUri;
                if (changedDirectory && oldUri !== '') {
                  const res = await releaseLongTermAccess([oldUri]);
                  if (res[0].status !== 'success') {
                    await releaseLongTermAccess([oldUri, dir.uri]);
                    Alert.alert('Error', 'Failed to get folder picked by user');
                    return;
                  }
                }

                // Update URI in state
                os.rootURI = dir.uri;
                await setStateInDB(os);
              }}
              textAlign={'flex-start'}
            />
            <Button
              buttonText={`${s === null ? 0 : s.vaults.length}`}
              fgColor={'black'}
              bgColor={'whitesmoke'}
              fontSize={22}
              icons={['vault']}
              iconColors={['black']}
              iconPlacement={IconPlacement.Right}
              customStyles={[styles.settingCard, styles.showVaultsBtn]}
              action={async () => {
                setShowHelpText(false);
                setShowIntervalHelpText(false);
                setShowModal(true);
              }}
              textAlign={'flex-start'}
            />
          </View>
        </View>
        <View
          style={styles.lineDivider}
        />
        <View style={styles.checkEveryColumn}>
          <View
            style={styles.checkEveryRow}>
            <Text
              style={[subheadingTextStyle, styles.subheading, styles.checkEveryTitle]}>
              {'check every'}
            </Text>
            <View
              style={styles.pickerContainer}>
              <RNPickerSelect
                key={pickerIter}
                onValueChange={value => {
                  if (s === null) {
                    return;
                  } else if (value < 0) {
                    setIntervalMinutes(s.intervalMinutes);
                    // The above set doesn't update picker consistently, modify key to force a re-render
                    setPickerIter(pickerIter + 1);
                    return;
                  }
                  // Update interval in state
                  const os: State = DeepCopy(store.get(state), 1);
                  os.intervalMinutes = value;
                  setStateInDB(os);
                }}
                items={INTERVAL_OPTIONS.map(opt => ({
                    label: opt.label ,
                    value: opt.value,
                    color: 'white', // Change color based on disabled state
                }))}
                style={{
                  inputAndroid: {
                    color: 'black',
                    fontSize: 20,
                    fontWeight: 'bold',
                  },
                  inputIOS: {
                    marginBottom: 5,
                    flex: 4,
                    padding: 15,
                  } as StyleProp<ViewStyle>,
                }}
                value={intervalMinutes}
              />
            </View>
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
                setShowHelpText(false);
                setShowIntervalHelpText(true);
                setShowModal(true);
              }}
            />
          </View>
          <Text style={styles.intervalDisclaimerText}>{'NOTE: the above intervals are estimates, scans may take longer (usually up to 10 minutes, sometimes more).'}</Text>
          <Button
            buttonText={folderPath === '' ? 'choose a folder to scan' : 'scan now'}
            fgColor={(scanning || folderPath === '') ? C_GRAY : 'black'}
            bgColor={'whitesmoke'}
            fontSize={22}
            icons={[]}
            iconColors={[]}
            iconPlacement={IconPlacement.Bottom}
            customStyles={[styles.settingCard, (scanning || folderPath === '') ? styles.scanningStyle : {} as ViewStyle]}
            action={async () => {
              if (s === null || s.rootURI === '' || scanning || folderPath === '') {
                return;
              }
              setScanning(true);
              await rescanDirs([s.rootURI]);
              setScanning(false);
            }}
            textAlign={'flex-start'}
            showLoadingIndicator={scanning}
          />
          <Text style={styles.lastScanText}>{`last scan: ${
            lastScanTime
          }${
            lastTimeTaken
          }`}</Text>
        </View>
        <View
          style={{
            borderBottomColor: 'black',
            borderBottomWidth: StyleSheet.hairlineWidth,
            marginVertical: 20,
          }}
        />
        <Button
          buttonText={'view notifications'}
          fgColor={'black'}
          bgColor={'whitesmoke'}
          fontSize={22}
          icons={[]}
          iconColors={[]}
          iconPlacement={IconPlacement.Bottom}
          customStyles={[{
            ...styles.settingCard,
          }]}
          action={() => {
            _setShowSettings(false);
            setShowNotifications(true);
          }}
          textAlign={'flex-start'}
          numLabelValue={numNotifications}
        />
        <View
          style={{
            borderBottomColor: 'black',
            borderBottomWidth: StyleSheet.hairlineWidth,
            marginTop: 'auto',
            marginBottom: 20,
          }}
        />
        <Button
          buttonText={'settings'}
          fgColor={'black'}
          bgColor={'whitesmoke'}
          fontSize={22}
          icons={[]}
          iconColors={[]}
          iconPlacement={IconPlacement.Bottom}
          customStyles={[{
            ...styles.settingCard,
          }]}
          action={() => {
            setShowNotifications(false);
            _setShowSettings(true);
          }}
          textAlign={'flex-start'}
        />
        <Button
          buttonText={'help'}
          fgColor={'black'}
          bgColor={'whitesmoke'}
          fontSize={22}
          icons={[]}
          iconColors={[]}
          iconPlacement={IconPlacement.Bottom}
          customStyles={[{
            ...styles.settingCard,
          }]}
          action={() => {
            setShowHelpText(true);
            setShowIntervalHelpText(false);
            setShowModal(true);
          }}
          textAlign={'flex-start'}
        />
        <Text
          style={styles.privacyPolicyText}
          onPress={() =>
            Linking.openURL(
              'https://github.com/pericles-tpt/notifian',
            )
          }>
          Source Code
        </Text>
        <Text
          style={styles.privacyPolicyText}
          onPress={() =>
            Linking.openURL(
              'https://pericles-tpt.github.io/notifian_privacy_policy/',
            )
          }>
          Privacy Policy
        </Text>
      </View>
      {showModal && (
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {showHelpText ? 'How it Works' : (showIntervalHelpText ? 'Interval Help' : 'Vaults Found')}
            </Text>
            <ScrollViewIndicator indStyle={styles.scrollStyle} containerStyle={styles.modalContent} persistentScrollbar={true}>
              <Text style={{fontSize: (showHelpText || showIntervalHelpText) ? 18 : 25, color: 'black', paddingHorizontal: 5}}>
                {showHelpText ? helpText : (showIntervalHelpText ? intervalHelpText : getVaultsList())}
              </Text>
            </ScrollViewIndicator>
            <Button
              buttonText={'Close'}
              fgColor={'white'}
              bgColor={'white'}
              fontSize={25}
              icons={[]}
              iconColors={[]}
              iconPlacement={IconPlacement.Right}
              customStyles={[styles.closeBtn]}
              action={() => {
                setShowModal(false);
              }}
              textAlign={'center'}
            />
          </View>
        </View>
      )}
    </>
  );
}
