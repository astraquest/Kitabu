import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LabelledCellModelProps } from './labelledCellModel';

/** TypeScript fallback; Metro and Expo Web select the platform-specific renderer files. */
export function LabelledCellModelView(props: LabelledCellModelProps) {
  return (
    <View accessibilityLabel="Human cell 3D model" style={styles.container}>
      <Text style={styles.title}>3D model preview</Text>
      <Text style={styles.body}>{props.fallback}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { color: '#486581', fontSize: 12, lineHeight: 17, padding: 9 },
  container: { borderColor: '#BFD2E6', borderRadius: 14, borderWidth: 1 },
  title: { color: '#173B5C', fontSize: 15, fontWeight: '800', paddingHorizontal: 9, paddingTop: 9 },
});
