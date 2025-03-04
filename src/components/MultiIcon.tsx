import React from 'react';
import {StyleSheet, View} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { IconProp, library } from '@fortawesome/fontawesome-svg-core';
import { ICONS_IN_USE } from '../Constant';

export function MultiIcon({
  iconsKey,
  fontSize,
  icons,
  iconColors,
  customStyles,
}: {
  iconsKey: string;
  fontSize: number;
  icons: string[];
  iconColors: string[];
  customStyles: Object;
}) {
  library.add(fas, ...ICONS_IN_USE);

  const styles = StyleSheet.create({
    component: {
      alignContent: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      display: 'flex',
    },
    icon: {
      alignSelf: 'center',
      marginBottom: 6,
      position: 'absolute',
    },
  });
  return (
    <View style={[styles.component, customStyles]} key={iconsKey}>
      {icons.length > 0 &&
        icons.map((i, idx) => {
          return (
            <FontAwesomeIcon
              key={`${idx}`}
              icon={i as IconProp}
              size={fontSize}
              color={
                iconColors.length > idx
                  ? iconColors[idx]
                  : iconColors[iconColors.length - 1]
              }
              style={styles.icon}
            />
          );
        })}
    </View>
  );
}