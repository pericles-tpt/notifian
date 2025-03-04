import React from 'react';
import { ActivityIndicator, FlexAlignType, StyleSheet, Text, ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import { MultiIcon } from './MultiIcon';
import { C_GRAY } from '../Constant';

export enum IconPlacement {
  Top = 1,
  Right,
  Bottom,
  Left,
}

export function Button({
  buttonText,
  fgColor,
  bgColor,
  fontSize,
  icons,
  iconColors,
  iconPlacement,
  customStyles,
  action,
  textAlign,
  showLoadingIndicator,
  numLabelValue,
}: {
  buttonText: string;
  fgColor: string;
  bgColor: string;
  fontSize: number;
  icons: string[];
  iconColors: string[];
  iconPlacement: IconPlacement;
  customStyles: ViewStyle[];
  action: () => void;
  textAlign?: FlexAlignType;
  showLoadingIndicator?: boolean;
  numLabelValue?: number | null;
}) {
  const iconTextGap = 20;
  const iconBeforeText =
    iconPlacement === IconPlacement.Left || iconPlacement === IconPlacement.Top;
  const verticalPlacement =
    iconPlacement === IconPlacement.Top ||
    iconPlacement === IconPlacement.Bottom;

  const styles = StyleSheet.create({
    component: {
      alignContent: 'center',
      borderRadius: 6,
      display: 'flex',
      flexDirection: verticalPlacement ? 'column' : 'row',
      backgroundColor: bgColor,
    },
    text: {
      color: fgColor,
      fontSize: fontSize,
      fontWeight: 'bold',
      alignSelf: textAlign ? textAlign : 'center',
      marginBottom: 3,
    },
    textPosAfter: {
      marginLeft:
        buttonText === '' || icons.length === 0
          ? 0
          : verticalPlacement
            ? 'auto'
            : iconTextGap,
      marginTop:
        buttonText === '' || icons.length === 0
          ? 0
          : verticalPlacement
            ? iconTextGap
            : 'auto',
    },
    textPosBefore: {
      marginRight:
        buttonText === '' || icons.length === 0
          ? 0
          : verticalPlacement
            ? 'auto'
            : iconTextGap,
      marginBottom:
        buttonText === '' || icons.length === 0
          ? 0
          : verticalPlacement
            ? iconTextGap
            : 'auto',
    },
    numLabel: {
      position: 'absolute',
      color: 'white',
      elevation: 10,
      fontSize: 18,
      fontWeight: 'bold',
      backgroundColor: C_GRAY,
      borderRadius: 50,
      height: 30,
      textAlign: 'center',
      textAlignVertical: 'center',
      right: 10,
      top: 10,
      aspectRatio: 1,
    }
  });

  return (
    <Pressable style={[styles.component, ...customStyles]} onPress={action}>
      {/* Icon THEN text IF placement top OR left */}
      {iconBeforeText && (
        <>
          <MultiIcon
            iconsKey={buttonText}
            fontSize={fontSize}
            icons={icons}
            iconColors={iconColors}
            customStyles={{}}
          />
          {buttonText !== '' && (
            <Text style={[styles.text, styles.textPosAfter]}>{buttonText}</Text>
          )}
        </>
      )}
      {!iconBeforeText && (
        <>
          {buttonText !== '' && (
            <Text style={[styles.text, styles.textPosBefore]}>
              {buttonText}
            </Text>
          )}
          <MultiIcon
            iconsKey={buttonText}
            fontSize={fontSize}
            icons={icons}
            iconColors={iconColors}
            customStyles={{}}
          />
        </>
      )}
      {showLoadingIndicator !== undefined ? <ActivityIndicator animating={showLoadingIndicator} color={'black'} size={"large"} style={{ elevation: 10, position: 'absolute', right: 7, top: 7 }} /> : (numLabelValue !== undefined ? (numLabelValue === null ? <ActivityIndicator color={'white'} style={[styles.numLabel]} /> : <Text style={styles.numLabel}>{numLabelValue}</Text>) : <></>)}
    </Pressable>
  );
}
