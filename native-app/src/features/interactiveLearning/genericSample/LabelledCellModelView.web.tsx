import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { buildLabelledCellModelHtml, type LabelledCellModelProps } from './labelledCellModel';

export function LabelledCellModelView(props: LabelledCellModelProps) {
  return (
    <View accessibilityLabel="Human cell 3D model" style={styles.container}>
      {React.createElement('iframe', {
        allow: 'fullscreen',
        frameBorder: '0',
        loading: 'lazy',
        srcDoc: buildLabelledCellModelHtml(props),
        title: 'Interactive labelled human cell model',
        style: styles.iframe,
      })}
      <Text accessibilityRole="text" style={styles.fallback}>
        If the 3D model is unavailable: {props.fallback}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', borderColor: '#BFD2E6', borderRadius: 14, borderWidth: 1 },
  fallback: { backgroundColor: '#F8FBFF', color: '#486581', fontSize: 12, lineHeight: 17, padding: 9 },
  iframe: { backgroundColor: '#EEF6FF', borderWidth: 0, height: 330, width: '100%' },
});
