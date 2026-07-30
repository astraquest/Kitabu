import React from 'react';
import { StyleSheet, View } from 'react-native';

export function LearningAssetPreview({ uri, title }: { uri: string; title: string }) {
  return (
    <View style={styles.frame}>
      {React.createElement('iframe', {
        src: uri,
        title,
        style: { width: '100%', height: '100%', border: 0, background: '#F4F7FB' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({ frame: { flex: 1, overflow: 'hidden', backgroundColor: '#F4F7FB' } });
