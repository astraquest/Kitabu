import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';

const onboardingSky = require('../assets/onboarding/onboarding-sky-clean-v1.png');
const onboardingHills = require('../assets/onboarding/onboarding-hills.png');
const onboardingFlowersStatic = require('../assets/onboarding/onboarding-flowers-static-v2.png');
const onboardingFlowerRight = require('../assets/onboarding/onboarding-flower-right-v1.png');
const onboardingCloudLeft = require('../assets/onboarding/onboarding-cloud-left-v1.png');
const onboardingCloudRight = require('../assets/onboarding/onboarding-cloud-right-v1.png');
const onboardingFlyingStar = require('../assets/onboarding/onboarding-star-flying-v1.png');
const onboardingSmallStars = require('../assets/onboarding/onboarding-stars-small-v1.png');
const onboardingDots = require('../assets/onboarding/onboarding-dots-v1.png');
const onboardingBook = require('../assets/onboarding/onboarding-book.png');

type DecorativeImageProps = React.ComponentProps<typeof Image> & {
  pointerEvents?: 'none';
};
type LayerProps = Omit<DecorativeImageProps, 'style'> & { style?: unknown };

const DecorativeImage = Image as React.ComponentType<DecorativeImageProps>;
const AnimatedDecorativeImage = Animated.createAnimatedComponent(
  DecorativeImage,
) as React.ComponentType<LayerProps>;

export const HORIZONTAL_MOTION_DURATION = 10000;

export const ONBOARDING_MOTION = {
  cloudLeft: { delay: 0, duration: 10000, horizontalDirection: 1, horizontalDuration: HORIZONTAL_MOTION_DURATION },
  cloudRight: { delay: 1600, duration: 9000, horizontalDirection: -1, horizontalDuration: HORIZONTAL_MOTION_DURATION },
  flyingStar: { delay: 900, duration: 5000, distance: 3, horizontalDirection: -1, horizontalDuration: HORIZONTAL_MOTION_DURATION },
  smallStars: { delay: 2300, duration: 7000, distance: 1.5, horizontalDirections: { left: 1, right: -1 }, horizontalDuration: HORIZONTAL_MOTION_DURATION },
  dots: { delay: 3700, duration: 11000, distance: -1.5, horizontalDirections: { left: 1, right: -1 }, horizontalDuration: HORIZONTAL_MOTION_DURATION },
  book: { delay: 1300, duration: 6000, rotation: 5 },
  flowerRight: { delay: 2500, duration: 6500, rotation: 4 },
} as const;

export const LEFT_CLOUD_LAYOUT = {
  left: -0.01,
  width: 0.22,
} as const;

export function getLeftCloudCenterTranslation(viewportWidth: number) {
  return viewportWidth / 2;
}

type Props = {
  reduceMotion?: boolean;
};

type AnimationHandle = {
  stop: () => void;
};

function useSystemReduceMotion() {
  const [systemReduceMotion, setSystemReduceMotion] = React.useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setSystemReduceMotion(enabled);
        }
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return systemReduceMotion;
}

function runLoop(value: Animated.Value, distance: number, duration: number, delay: number): AnimationHandle {
  const repeating = Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: distance,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 0,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]),
  );
  const animation = delay > 0 ? Animated.sequence([Animated.delay(delay), repeating]) : repeating;
  animation.start();
  return animation;
}

function runOpacityLoop(value: Animated.Value, duration: number, delay: number): AnimationHandle {
  const repeating = Animated.loop(
    Animated.sequence([
      Animated.timing(value, { toValue: 0.88, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]),
  );
  const animation = delay > 0 ? Animated.sequence([Animated.delay(delay), repeating]) : repeating;
  animation.start();
  return animation;
}

function runSwingLoop(value: Animated.Value, amplitude: number, duration: number, delay: number): AnimationHandle {
  const repeating = Animated.loop(
    Animated.sequence([
      Animated.timing(value, { toValue: amplitude, duration: duration / 4, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(value, { toValue: -amplitude, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: duration / 4, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]),
  );
  const animation = delay > 0 ? Animated.sequence([Animated.delay(delay), repeating]) : repeating;
  animation.start();
  return animation;
}

function stopAnimations(animations: AnimationHandle[]) {
  animations.forEach((animation) => animation.stop());
}

function AnimatedLayer({
  animatedStyle,
  staticMode = false,
  resizeMode,
  source,
  style,
  testID,
}: {
  animatedStyle?: unknown;
  resizeMode: 'contain' | 'stretch';
  source: ImageSourcePropType;
  staticMode?: boolean;
  style: ImageStyle;
  testID: string;
}) {
  return React.createElement(staticMode ? DecorativeImage : AnimatedDecorativeImage, {
    accessibilityElementsHidden: true,
    accessible: false,
    importantForAccessibility: 'no-hide-descendants',
    pointerEvents: 'none',
    resizeMode,
    source,
    style: [styles.layer, style, animatedStyle],
    testID,
  });
}

function AnimatedSpriteSide({
  animatedStyle,
  resizeMode,
  side,
  source,
  staticMode,
  style,
  testID,
}: {
  animatedStyle?: unknown;
  resizeMode: 'contain' | 'stretch';
  side: 'left' | 'right';
  source: ImageSourcePropType;
  staticMode: boolean;
  style: ViewStyle;
  testID: string;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.spriteClip, style]}
      testID={`${testID}-clip`}
    >
      <AnimatedLayer
        animatedStyle={animatedStyle}
        resizeMode={resizeMode}
        source={source}
        staticMode={staticMode}
        style={side === 'left' ? styles.spriteImage : styles.spriteImageRight}
        testID={testID}
      />
    </View>
  );
}

export function AnimatedOnboardingBackground({ reduceMotion }: Props) {
  const { width: viewportWidth } = useWindowDimensions();
  const systemReduceMotion = useSystemReduceMotion();
  const motionDisabled = reduceMotion ?? systemReduceMotion;
  const cloudLeft = useRef(new Animated.Value(0)).current;
  const cloudRight = useRef(new Animated.Value(0)).current;
  const flyingStarX = useRef(new Animated.Value(0)).current;
  const flyingStarY = useRef(new Animated.Value(0)).current;
  const flyingStarRotation = useRef(new Animated.Value(0)).current;
  const smallStarsLeftX = useRef(new Animated.Value(0)).current;
  const smallStarsRightX = useRef(new Animated.Value(0)).current;
  const smallStarsY = useRef(new Animated.Value(0)).current;
  const dotsLeftX = useRef(new Animated.Value(0)).current;
  const dotsRightX = useRef(new Animated.Value(0)).current;
  const dotsY = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(1)).current;
  const bookRotation = useRef(new Animated.Value(0)).current;
  const flowerRightRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const values = [
      cloudLeft,
      cloudRight,
      flyingStarX,
      flyingStarY,
      flyingStarRotation,
      smallStarsLeftX,
      smallStarsRightX,
      smallStarsY,
      dotsLeftX,
      dotsRightX,
      dotsY,
      dotsOpacity,
      bookRotation,
      flowerRightRotation,
    ];
    const animations: AnimationHandle[] = [];

    const animationEnabled = !motionDisabled && process.env.NODE_ENV !== 'test';
    if (!animationEnabled) {
      values.forEach((value) => value.setValue(0));
      dotsOpacity.setValue(1);
      return undefined;
    }

    const horizontalTravel = viewportWidth / 2;
    animations.push(runLoop(cloudLeft, horizontalTravel, ONBOARDING_MOTION.cloudLeft.horizontalDuration, ONBOARDING_MOTION.cloudLeft.delay));
    animations.push(runLoop(cloudRight, -horizontalTravel, ONBOARDING_MOTION.cloudRight.horizontalDuration, ONBOARDING_MOTION.cloudRight.delay));
    animations.push(runLoop(flyingStarX, -horizontalTravel, ONBOARDING_MOTION.flyingStar.horizontalDuration, ONBOARDING_MOTION.flyingStar.delay));
    animations.push(runLoop(flyingStarY, ONBOARDING_MOTION.flyingStar.distance, ONBOARDING_MOTION.flyingStar.duration, ONBOARDING_MOTION.flyingStar.delay));
    animations.push(runLoop(flyingStarRotation, 2, ONBOARDING_MOTION.flyingStar.duration, ONBOARDING_MOTION.flyingStar.delay));
    animations.push(runLoop(smallStarsLeftX, horizontalTravel, ONBOARDING_MOTION.smallStars.horizontalDuration, ONBOARDING_MOTION.smallStars.delay));
    animations.push(runLoop(smallStarsRightX, -horizontalTravel, ONBOARDING_MOTION.smallStars.horizontalDuration, ONBOARDING_MOTION.smallStars.delay));
    animations.push(runLoop(smallStarsY, ONBOARDING_MOTION.smallStars.distance, ONBOARDING_MOTION.smallStars.duration, ONBOARDING_MOTION.smallStars.delay));
    animations.push(runLoop(dotsLeftX, horizontalTravel, ONBOARDING_MOTION.dots.horizontalDuration, ONBOARDING_MOTION.dots.delay));
    animations.push(runLoop(dotsRightX, -horizontalTravel, ONBOARDING_MOTION.dots.horizontalDuration, ONBOARDING_MOTION.dots.delay));
    animations.push(runLoop(dotsY, ONBOARDING_MOTION.dots.distance, ONBOARDING_MOTION.dots.duration, ONBOARDING_MOTION.dots.delay));
    animations.push(runOpacityLoop(dotsOpacity, ONBOARDING_MOTION.dots.duration, ONBOARDING_MOTION.dots.delay));
    animations.push(runSwingLoop(bookRotation, ONBOARDING_MOTION.book.rotation, ONBOARDING_MOTION.book.duration, ONBOARDING_MOTION.book.delay));
    animations.push(runSwingLoop(flowerRightRotation, ONBOARDING_MOTION.flowerRight.rotation, ONBOARDING_MOTION.flowerRight.duration, ONBOARDING_MOTION.flowerRight.delay));

    return () => stopAnimations(animations);
  }, [bookRotation, cloudLeft, cloudRight, dotsLeftX, dotsOpacity, dotsRightX, dotsY, flowerRightRotation, flyingStarRotation, flyingStarX, flyingStarY, motionDisabled, smallStarsLeftX, smallStarsRightX, smallStarsY, viewportWidth]);

  const flyingStarRotationStyle = flyingStarRotation.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });
  const bookRotationStyle = bookRotation.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });
  const flowerRightRotationStyle = flowerRightRotation.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });
  const cloudLeftStyle = motionDisabled ? undefined : { transform: [{ translateX: cloudLeft }] };
  const cloudRightStyle = motionDisabled ? undefined : { transform: [{ translateX: cloudRight }] };
  const flyingStarStyle = motionDisabled ? undefined : { transform: [{ translateX: flyingStarX }, { translateY: flyingStarY }, { rotate: flyingStarRotationStyle }] };
  const smallStarsLeftStyle = motionDisabled ? undefined : { transform: [{ translateX: smallStarsLeftX }, { translateY: smallStarsY }] };
  const smallStarsRightStyle = motionDisabled ? undefined : { transform: [{ translateX: smallStarsRightX }, { translateY: smallStarsY }] };
  const dotsLeftStyle = motionDisabled ? undefined : { opacity: dotsOpacity, transform: [{ translateX: dotsLeftX }, { translateY: dotsY }] };
  const dotsRightStyle = motionDisabled ? undefined : { opacity: dotsOpacity, transform: [{ translateX: dotsRightX }, { translateY: dotsY }] };
  const bookStyle = motionDisabled ? undefined : { transform: [{ rotate: bookRotationStyle }] };
  const flowerRightStyle = motionDisabled ? undefined : { transform: [{ rotate: flowerRightRotationStyle }] };

  return (
    <>
      <AnimatedLayer resizeMode="stretch" source={onboardingSky} staticMode={motionDisabled} style={styles.fullScreen} testID="onboarding-sky-layer" />
      <AnimatedLayer resizeMode="contain" source={onboardingCloudLeft} staticMode={motionDisabled} style={styles.leftCloud} animatedStyle={cloudLeftStyle} testID="onboarding-cloud-left-layer" />
      <AnimatedLayer resizeMode="contain" source={onboardingCloudRight} staticMode={motionDisabled} style={styles.rightCloud} animatedStyle={cloudRightStyle} testID="onboarding-cloud-right-layer" />
      <AnimatedLayer resizeMode="contain" source={onboardingFlyingStar} staticMode={motionDisabled} style={styles.flyingStar} animatedStyle={flyingStarStyle} testID="onboarding-flying-star-layer" />
      <AnimatedSpriteSide resizeMode="contain" source={onboardingSmallStars} side="left" staticMode={motionDisabled} style={styles.smallStarsLeftClip} animatedStyle={smallStarsLeftStyle} testID="onboarding-small-stars-left-layer" />
      <AnimatedSpriteSide resizeMode="contain" source={onboardingSmallStars} side="right" staticMode={motionDisabled} style={styles.smallStarsRightClip} animatedStyle={smallStarsRightStyle} testID="onboarding-small-stars-right-layer" />
      <AnimatedSpriteSide resizeMode="contain" source={onboardingDots} side="left" staticMode={motionDisabled} style={styles.dotsLeftClip} animatedStyle={dotsLeftStyle} testID="onboarding-dots-left-layer" />
      <AnimatedSpriteSide resizeMode="contain" source={onboardingDots} side="right" staticMode={motionDisabled} style={styles.dotsRightClip} animatedStyle={dotsRightStyle} testID="onboarding-dots-right-layer" />
      <AnimatedLayer resizeMode="stretch" source={onboardingHills} staticMode={motionDisabled} style={styles.fullScreen} testID="onboarding-hills-layer" />
      <AnimatedLayer resizeMode="stretch" source={onboardingFlowersStatic} staticMode={motionDisabled} style={styles.fullScreen} testID="onboarding-flowers-layer" />
      <AnimatedLayer resizeMode="contain" source={onboardingFlowerRight} staticMode={motionDisabled} style={styles.flowerRight} animatedStyle={flowerRightStyle} testID="onboarding-flower-right-layer" />
      <AnimatedLayer resizeMode="contain" source={onboardingBook} staticMode={motionDisabled} style={styles.book} animatedStyle={bookStyle} testID="onboarding-book-layer" />
    </>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
  },
  fullScreen: {
    bottom: 0,
    height: '100%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: '100%',
  },
  leftCloud: {
    height: '7.5%',
    left: '-1%',
    position: 'absolute',
    top: '10%',
    width: '22%',
  },
  rightCloud: {
    height: '6%',
    left: '77%',
    position: 'absolute',
    top: '44%',
    width: '19%',
  },
  flyingStar: {
    height: '3.3%',
    left: '72%',
    position: 'absolute',
    top: '14.5%',
    width: '7%',
  },
  spriteClip: {
    overflow: 'hidden',
    position: 'absolute',
  },
  spriteImage: {
    height: '100%',
    left: 0,
    position: 'absolute',
    width: '200%',
  },
  spriteImageRight: {
    height: '100%',
    left: '-100%',
    position: 'absolute',
    width: '200%',
  },
  smallStarsLeftClip: {
    height: '48%',
    left: '3.5%',
    top: '25%',
    width: '46.75%',
  },
  smallStarsRightClip: {
    height: '48%',
    left: '50.25%',
    top: '25%',
    width: '46.75%',
  },
  dotsLeftClip: {
    height: '50%',
    left: '10%',
    top: '15.5%',
    width: '41%',
  },
  dotsRightClip: {
    height: '50%',
    left: '51%',
    top: '15.5%',
    width: '41%',
  },
  book: {
    elevation: 4,
    height: '11%',
    left: 0,
    position: 'absolute',
    top: '63%',
    width: '28%',
    zIndex: 4,
  },
  flowerRight: {
    height: '13.83%',
    left: '82.16%',
    position: 'absolute',
    top: '70.4%',
    width: '17.84%',
    zIndex: 3,
  },
});
