import React, {useMemo} from 'react';
import {Alert, Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {Button, IconPlacement} from './Button';
import {C_LGRAY, MONTHS} from './../Constant';
import { FileEntryT } from './../db/schema';
import { subheadingTextStyle } from './../styles';
import { getVaultPathFromURI } from '../utilities/app/Notification';
import { MultiIcon } from './MultiIcon';

const MAX_TITLE_LEN = 12;

export function Card({
  item,
  customStyles,
}: {
  item: FileEntryT;
  customStyles: Object;
}) {
  const styles = StyleSheet.create({
    component: {
      backgroundColor: 'white',
      display: 'flex',
      width: '100%',
      borderWidth: 2,
      borderRadius: 6,
      height: 'auto',
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
    titleText: {
      fontSize: 25,
      color: 'black',
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlignVertical: 'center',
    },
    tags: {
      marginBottom: 10,
    },
    titleRow: {display: 'flex', flexDirection: 'row', justifyContent: 'space-between', borderBottomColor: C_LGRAY, borderBottomWidth: 2, paddingBottom: 10},
    checkbox: {
      display: 'flex',
      marginLeft: 20,
      marginRight: 25,
    },
    buttonRow: {
      marginTop: 10,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    propertyColumn: {
      marginTop: 10,
      display: 'flex',
      flexDirection: 'column',
      marginLeft: 10,
    },
    propertyRow: {display: 'flex', flexDirection: 'row', marginBottom: 15},
    propertyValue: {color: 'black', fontStyle: 'italic', marginLeft: 20},
    vaultLabel: {
      padding: 6,
      paddingLeft: 20,
      paddingRight: 10,
      borderRadius: 6,
    },
  });

  function getHumanDateTime(d: Date): string {
    return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}, ${d.toLocaleTimeString()}`;
  }

  const title = `${item.fileName.split('.')[0].slice(0, MAX_TITLE_LEN)}${item.fileName.length > MAX_TITLE_LEN ? '...' : ''}`;
  const cardInnerHtml = useMemo(
    () => (
      <Pressable onPress={async () => {
          // Open Obsidian to vault/note
          const [vault, path] = getVaultPathFromURI(item.fileDir, item.fileName, item.vault);
          const obsidianUrl = `obsidian://open?vault=${vault}&file=${path}`;
          try {
            await Linking.openURL(obsidianUrl);
            return;
          } catch (_err) {
            console.log('failed to open link: ' + _err);
          }

          // Show alert if failed
          Alert.alert(
            'Error',
            `Failed to open note the vault: ${vault}, and/or file: ${path} may not exist`,
          );
      }}>
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>
            {title}
          </Text>
          <Button
            buttonText={`${item.vault}`}
            fgColor={'white'}
            bgColor={'black'}
            fontSize={22}
            icons={['vault']}
            iconColors={['white']}
            iconPlacement={IconPlacement.Left}
            customStyles={[styles.vaultLabel]}
            action={() => {}}
            textAlign={'flex-start'}
          />
        </View>
        <View style={styles.propertyColumn}>
          <View style={styles.propertyRow}>
            <MultiIcon iconsKey={`${item.id}p1`} fontSize={20} icons={['bell']} iconColors={['black']} customStyles={{}} />
            <Text style={[subheadingTextStyle, styles.propertyValue]}>{`${item.triggersAt === null ? 'not scheduled' : getHumanDateTime(item.triggersAt)}`}</Text>
          </View>
          <View style={styles.propertyRow}>
            <MultiIcon iconsKey={`${item.id}p2`} fontSize={20} icons={['rotate']} iconColors={['black']} customStyles={{}} />
            <Text style={[subheadingTextStyle, styles.propertyValue]}>{`${item.repeats === null ? 'no repeats' : item.repeats}`}</Text>
          </View>
          {item.repeats !== null && <View style={styles.propertyRow}>
            <MultiIcon iconsKey={`${item.id}p3`} fontSize={20} icons={['ban']} iconColors={['black']} customStyles={{}} />
            <Text style={[subheadingTextStyle, styles.propertyValue]}>{`${item.stopOn === null ? 'never stops' : getHumanDateTime(item.stopOn)}`}</Text>
          </View> }
        </View>
      </Pressable>
    ),
    [item.fileDir, item.fileName, item.id, item.repeats, item.stopOn, item.triggersAt, item.vault, styles, title],
  );
  return (
    <View style={[styles.component, customStyles]} key={`${item.id}`}>
      {cardInnerHtml}
    </View>
  );
}
