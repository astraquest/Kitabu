import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const onboardingBackground = require('../assets/onboarding/onboarding-background.png');
const onboardingHills = require('../assets/onboarding/onboarding-hills.png');
const onboardingFlowers = require('../assets/onboarding/onboarding-flowers.png');
const onboardingBook = require('../assets/onboarding/onboarding-book.png');

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

type DecorativeLayerProps = {
  fill?: boolean;
  resizeMode: 'contain' | 'stretch';
  source: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  testID: string;
};

function DecorativeLayer({ fill = true, resizeMode, source, style, testID }: DecorativeLayerProps) {
  return (
    <View
      accessibilityElementsHidden
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.decorativeLayer, fill && styles.fullScreenLayer, style]}>
      <Image
        accessibilityElementsHidden
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        resizeMode={resizeMode}
        source={source}
        style={styles.layerImage}
        testID={testID}
      />
    </View>
  );
}

export function OnboardingVisualShell({ children, style }: Props) {
  return (
    <View style={[styles.root, style]} testID="onboarding-visual-shell">
      <DecorativeLayer
        resizeMode="stretch"
        source={onboardingBackground}
        style={styles.skyLayer}
        testID="onboarding-sky-layer"
      />
      <DecorativeLayer
        resizeMode="stretch"
        source={onboardingHills}
        style={styles.hillsLayer}
        testID="onboarding-hills-layer"
      />
      <DecorativeLayer
        resizeMode="stretch"
        source={onboardingFlowers}
        style={styles.flowersLayer}
        testID="onboarding-flowers-layer"
      />
      <DecorativeLayer
        fill={false}
        resizeMode="contain"
        source={onboardingBook}
        style={styles.bookLayer}
        testID="onboarding-book-layer"
      />
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
  decorativeLayer: {
    position: 'absolute',
  },
  fullScreenLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  skyLayer: {
    elevation: 0,
    zIndex: 0,
  },
  hillsLayer: {
    elevation: 1,
    zIndex: 1,
  },
  flowersLayer: {
    elevation: 2,
    zIndex: 2,
  },
  layerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  bookLayer: {
    aspectRatio: 1385 / 1136,
    left: '-2%',
    position: 'absolute',
    top: '68%',
    width: '21%',
    elevation: 3,
    zIndex: 3,
  },
});
