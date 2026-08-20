import React from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AnimatedOnboardingBackground } from './AnimatedOnboardingBackground';

type Props = {
  children: React.ReactNode;
  reduceMotion?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function OnboardingVisualShell({ children, reduceMotion, style }: Props) {
  return (
    <View style={[styles.root, style]} testID="onboarding-visual-shell">
      <AnimatedOnboardingBackground reduceMotion={reduceMotion} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#DDF3F5',
    flex: 1,
  },
  content: {
    elevation: 4,
    flex: 1,
    zIndex: 4,
  },
});
