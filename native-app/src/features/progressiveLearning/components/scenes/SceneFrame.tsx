import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';

import { sceneTheme } from './sceneTheme';

interface SceneFrameProps {
  accessibilityLabel: string;
  children: React.ReactNode;
  sceneKey: string;
  tone?: 'sky' | 'cream' | 'mint';
}

const TONES = {
  sky: '#F4F9FF',
  cream: '#FFFBF1',
  mint: '#F2FBF8',
} as const;

export function SceneFrame({
  accessibilityLabel,
  children,
  sceneKey,
  tone = 'mint',
}: SceneFrameProps) {
  const entrance = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    let preferenceVersion = 0;
    let animation: Animated.CompositeAnimation | undefined;

    const applyMotionPreference = (reduceMotion: boolean) => {
      if (!mounted) return;
      animation?.stop();
      if (reduceMotion) {
        entrance.setValue(1);
        return;
      }
      entrance.setValue(0);
      animation = Animated.spring(entrance, {
        toValue: 1,
        damping: 17,
        stiffness: 190,
        mass: 0.8,
        useNativeDriver: true,
      });
      animation.start();
    };

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      reduceMotion => {
        preferenceVersion += 1;
        applyMotionPreference(reduceMotion);
      },
    );
    const initialPreferenceVersion = preferenceVersion;
    AccessibilityInfo.isReduceMotionEnabled().then(reduceMotion => {
      if (initialPreferenceVersion === preferenceVersion) {
        applyMotionPreference(reduceMotion);
      }
    });

    return () => {
      mounted = false;
      animation?.stop();
      subscription.remove();
    };
  }, [entrance, sceneKey]);

  return (
    <Animated.View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[
        styles.frame,
        { backgroundColor: TONES[tone] },
        {
          opacity: entrance,
          transform: [
            { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
            { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
          ],
        },
      ]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {children}
      </View>
      <Text style={styles.caption}>{accessibilityLabel}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: sceneTheme.mutedInk,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 8,
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  frame: {
    borderColor: sceneTheme.border,
    borderRadius: 26,
    borderWidth: 1,
    minHeight: 194,
    overflow: 'hidden',
    paddingBottom: 11,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
});
