import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function LearningAssetPreview({ title }: { uri: string; title: string }) {
  return (
    <View accessibilityLabel={title} style={styles.frame}>
      <Text style={styles.text}>Preview available on web, Android and iOS.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FB' },
  text: { color: '#64748B', fontWeight: '700' },
});
