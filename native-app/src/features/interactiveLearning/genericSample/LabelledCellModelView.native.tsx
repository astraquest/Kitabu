import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { buildLabelledCellModelHtml, type LabelledCellModelProps } from './labelledCellModel';

export function LabelledCellModelView(props: LabelledCellModelProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const html = useMemo(() => buildLabelledCellModelHtml(props), [props]);

  return (
    <View accessibilityLabel="Human cell 3D model" style={styles.container}>
      <WebView
        accessibilityLabel="Interactive labelled human cell model"
        allowsInlineMediaPlayback
        domStorageEnabled
        javaScriptEnabled
        onError={() => setLoadFailed(true)}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webView}
      />
      <Text accessibilityRole="text" style={[styles.fallback, loadFailed && styles.fallbackVisible]}>
        {loadFailed ? `3D model unavailable. ${props.fallback}` : `Five numbered markers: ${props.markers.map(marker => marker.label).join(', ')}.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', borderColor: '#BFD2E6', borderRadius: 14, borderWidth: 1 },
  fallback: { backgroundColor: '#F8FBFF', color: '#486581', fontSize: 12, lineHeight: 17, padding: 9 },
  fallbackVisible: { backgroundColor: '#FFFAF0', color: '#7C4A03' },
  webView: { backgroundColor: '#EEF6FF', height: 330, width: '100%' },
});
