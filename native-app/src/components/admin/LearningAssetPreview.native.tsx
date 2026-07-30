import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function LearningAssetPreview({ uri, title }: { uri: string; title: string }) {
  const [WebViewComponent, setWebViewComponent] = useState<React.ComponentType<any> | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      // Keep native-only modules out of the application startup graph. A stale binary
      // should show a bounded fallback on this admin-only screen, not crash the app.
      const module = require('react-native-webview') as { WebView?: React.ComponentType<any> };
      if (active && module.WebView) setWebViewComponent(() => module.WebView!);
      else if (active) setLoadError(true);
    } catch {
      if (active) setLoadError(true);
    }
    return () => { active = false; };
  }, []);

  return (
    <View accessibilityLabel={title} style={styles.frame}>
      {WebViewComponent ? (
        <WebViewComponent source={{ uri }} style={styles.webView} javaScriptEnabled domStorageEnabled />
      ) : loadError ? (
        <Text style={styles.fallback}>Preview is unavailable in this app build. Open it on the admin web portal.</Text>
      ) : (
        <ActivityIndicator accessibilityLabel="Loading preview" color="#2563EB" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden', backgroundColor: '#F4F7FB' },
  webView: { flex: 1, backgroundColor: '#F4F7FB' },
  fallback: { padding: 24, color: '#64748B', fontWeight: '700', textAlign: 'center' },
});
