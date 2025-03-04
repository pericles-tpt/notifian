import React from 'react';
import {Platform, StyleSheet, Text, TextStyle, View} from 'react-native';
import {subheadingTextStyle} from '../styles';
import { PURPLE } from '../Constant';

export function AppTitle() {
  const styles = StyleSheet.create({
    component: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      zIndex: 10,
      backgroundColor: PURPLE,
      height: 50,
    },
    header: {
      flex: 1,
      opacity: 1,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    headerTitle: {
      ...subheadingTextStyle,
      color: 'white',
      margin: 10,
      marginTop: 0,
      top: Platform.OS === 'ios' ? 47 : 0,
      textAlign: 'center',
      fontSize: 25,
      opacity: 1,
    } as TextStyle,
  });

  return (
    <View style={styles.component}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{'Notifian'}</Text>
      </View>
    </View>
  );
}
