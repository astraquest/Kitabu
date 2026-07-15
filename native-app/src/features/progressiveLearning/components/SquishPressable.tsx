import React, { useEffect, useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface SquishPressableProps extends PressableProps {
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  reduceMotion?: boolean;
}

export function SquishPressable({
  children,
  containerStyle,
  disabled,
  onPressIn,
  onPressOut,
  reduceMotion = false,
  ...props
}: SquishPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      scale.stopAnimation();
      scale.setValue(1);
    }
    return () => scale.stopAnimation();
  }, [reduceMotion, scale]);

  function handlePressIn(event: GestureResponderEvent) {
    if (!reduceMotion) {
      Animated.timing(scale, {
        toValue: 0.97,
        duration: 70,
        useNativeDriver: true,
      }).start();
    }
    onPressIn?.(event);
  }

  function handlePressOut(event: GestureResponderEvent) {
    if (!reduceMotion) {
      Animated.spring(scale, {
        toValue: 1,
        damping: 13,
        stiffness: 240,
        mass: 0.7,
        useNativeDriver: true,
      }).start();
    }
    onPressOut?.(event);
  }

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
