import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { OnboardingMascotKey } from '../../../types/app';

export const LEARNING_MASCOT_SOURCES: Record<OnboardingMascotKey, ImageSourcePropType> = {
  rabbit: require('../../../assets/mascot/sungura-rabbit.png'),
  lion: require('../../../assets/mascot/simba-lion.png'),
  elephant: require('../../../assets/mascot/ndovu-elephant.png'),
};

export type LearningMascotReactionKind =
  | 'idle'
  | 'thinking'
  | 'encourage'
  | 'correct'
  | 'complete';

interface LearningMascotReactionProps {
  mascotKey: OnboardingMascotKey;
  reaction: LearningMascotReactionKind;
  message?: string;
  size?: number;
}

export function LearningMascotReaction({
  mascotKey,
  reaction,
  message,
  size = 92,
}: LearningMascotReactionProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    scale.stopAnimation();
    translateX.stopAnimation();
    translateY.stopAnimation();
    rotate.stopAnimation();
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    rotate.setValue(0);

    if (reduceMotion || reaction === 'idle') {
      return;
    }

    if (reaction === 'thinking') {
      Animated.sequence([
        Animated.spring(rotate, { toValue: -1, damping: 12, stiffness: 170, useNativeDriver: true }),
        Animated.spring(rotate, { toValue: 0, damping: 14, stiffness: 180, useNativeDriver: true }),
      ]).start();
      return;
    }

    if (reaction === 'encourage') {
      Animated.sequence([
        Animated.timing(translateX, { toValue: -4, duration: 70, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 4, duration: 90, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -2, duration: 80, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: 0, damping: 16, stiffness: 220, useNativeDriver: true }),
      ]).start();
      return;
    }

    if (reaction === 'correct') {
      scale.setValue(0.9);
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.08, damping: 10, stiffness: 260, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 210, useNativeDriver: true }),
      ]).start();
      return;
    }

    scale.setValue(0.88);
    Animated.parallel([
      Animated.sequence([
        Animated.spring(translateY, { toValue: -16, damping: 8, stiffness: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 10, stiffness: 190, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.12, damping: 9, stiffness: 240, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, damping: 14, stiffness: 190, useNativeDriver: true }),
      ]),
    ]).start();
  }, [reaction, reduceMotion, rotate, scale, translateX, translateY]);

  const rotation = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg'],
  });

  return (
    <View
      accessibilityLabel={message ? `Kitabu learning companion says: ${message}` : 'Kitabu learning companion'}
      style={styles.container}>
      <View style={styles.mascotWrap}>
        {reaction === 'correct' || reaction === 'complete' ? (
          <Text aria-hidden style={styles.sparkle}>✦</Text>
        ) : null}
        <Animated.Image
          resizeMode="contain"
          source={LEARNING_MASCOT_SOURCES[mascotKey]}
          style={[
            { height: size, width: size },
            {
              transform: [
                { translateX },
                { translateY },
                { rotate: rotation },
                { scale },
              ],
            },
          ]}
        />
      </View>
      {message ? (
        <View style={styles.messageBubble}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  mascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  messageBubble: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  messageText: {
    color: '#7C2D12',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  sparkle: {
    color: '#F59E0B',
    fontSize: 24,
    position: 'absolute',
    right: 0,
    top: -4,
    zIndex: 2,
  },
});
