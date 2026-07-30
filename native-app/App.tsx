import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { KitabuApp } from './src/KitabuApp';
import { captureAppException } from './src/observability/sentry';

type AppErrorBoundaryState = { hasError: boolean };

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    captureAppException(error, { componentStack: info.componentStack });
    console.error('Kitabu application error boundary', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.fallback} accessibilityRole="alert">
        <Text style={styles.fallbackTitle}>Kitabu needs a quick restart</Text>
        <Text style={styles.fallbackBody}>This screen failed to load. Your saved learning progress is safe.</Text>
        <Pressable onPress={() => this.setState({ hasError: false })} style={styles.fallbackButton}>
          <Text style={styles.fallbackButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <KitabuApp />
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}

export default App;

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F4F7FB' },
  fallbackTitle: { color: '#0F172A', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  fallbackBody: { color: '#475569', fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 360, textAlign: 'center' },
  fallbackButton: { backgroundColor: '#2563EB', borderRadius: 12, marginTop: 20, minWidth: 140, paddingHorizontal: 22, paddingVertical: 13 },
  fallbackButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', textAlign: 'center' },
});
