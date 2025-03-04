import React, {
  FlatList,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Card } from './Card';
import { FileEntryT } from '../db/schema';

export function CardList({
  items,
  cardHeight,
  customStyles,
}: {
  items: FileEntryT[];
  cardHeight: number;
  customStyles: StyleProp<ViewStyle>;
}) {
  const styles = StyleSheet.create({
    sectionHeaderStyle: {
      marginBottom: 10,
      textAlign: 'center',
    },
    list: {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'scroll',
    },
    miniCard: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: cardHeight,
      padding: 10,
      borderWidth: 2,
      borderColor: 'white',
      borderRadius: 6,
      marginBottom: 15,
    },
  });

  return (
    <FlatList
      style={[styles.list, customStyles]}
      data={items}
      renderItem={({item}) => (
        <Card
          item={item}
          customStyles={styles.miniCard}
        />
      )}
      keyExtractor={item => `${item.id}`}
    />
  );
}
