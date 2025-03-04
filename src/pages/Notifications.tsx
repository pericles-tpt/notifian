import React, {Dispatch, SetStateAction, useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {C_LGRAY} from '../Constant';
import {Button, IconPlacement} from '../components/Button';
import { CardList } from '../components/CardList';
import { FileEntryT } from '../db/schema';
import { useAtomValue } from 'jotai';
import { state, store } from '../atoms';
import { fileEntrySelectNextNotifications } from '../db/db';

export function Notifications({setShowNotifications}:{setShowNotifications: Dispatch<SetStateAction<boolean>>}) {
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
    headerRow: {display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 15},
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
    closeBtn: {
                position: 'absolute',
                alignSelf: 'center',
                left: '39%',
                top: 0,
              },
  });


  // const [loading, _setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [_loadingMsg, _setLoadingMsg] = useState('loading');
  const st = useAtomValue(state, {
    store: store,
  });
  const [upcomingNotifications, setUpcomingNotifications] = useState<FileEntryT[]>([]);

  useEffect(() => {
    async function refreshUpcomingNotifications() {
      const upcoming = await fileEntrySelectNextNotifications();
      if (JSON.stringify(upcoming) !== JSON.stringify(upcomingNotifications)) {
        setUpcomingNotifications(upcoming);
      }
    }
    refreshUpcomingNotifications();
  }, [st, upcomingNotifications]);

  return (
    <>
      <View style={styles.component}>
        <View style={styles.headerRow}>
            <Button
                buttonText={'Notifications'}
                fgColor={'black'}
                bgColor={'rgba(0,0,0,0)'}
                fontSize={25}
                icons={['arrow-left']}
                iconColors={['black']}
                iconPlacement={IconPlacement.Left}
                customStyles={[styles.backBtn]}
                action={() => setShowNotifications(false)}
            />
        </View>
        <CardList cardHeight={50} customStyles={{}} items={upcomingNotifications} />
      </View>
      {showModal && (
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {'Modal'}
            </Text>
            <Text style={[styles.modalContent]}>
              {'Modal Content'}
            </Text>
            <Button
              buttonText={'Close'}
              fgColor={'black'}
              bgColor={'white'}
              fontSize={25}
              icons={[]}
              iconColors={[]}
              iconPlacement={IconPlacement.Right}
              customStyles={[styles.closeBtn]}
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
