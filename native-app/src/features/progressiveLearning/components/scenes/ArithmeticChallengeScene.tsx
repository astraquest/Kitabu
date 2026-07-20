import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';

import type { OnboardingMascotKey } from '../../../../types/app';
import type { LearningVisualSpec } from '../../types';
import { LEARNING_MASCOT_SOURCES } from '../LearningMascotReaction';
import { SquishPressable } from '../SquishPressable';

type ArithmeticSpec = Extract<LearningVisualSpec, { kind: 'arithmetic' }>;

export type ArithmeticChallengeState = {
  disabled: boolean;
  mascotKey: OnboardingMascotKey;
  onSelect: (answer: string) => void;
  options: string[];
  questionIndex: number;
  reduceMotion: boolean;
  selectedAnswer: string | null;
  status: 'idle' | 'checking' | 'correct' | 'incorrect';
  totalQuestions: number;
};

export function ArithmeticChallengeScene({
  disabled,
  mascotKey,
  onSelect,
  options,
  questionIndex,
  reduceMotion,
  selectedAnswer,
  spec,
  status,
  totalQuestions,
}: ArithmeticChallengeState & { spec: ArithmeticSpec }) {
  const expression = `${spec.leftOperand} ${spec.operator} ${spec.rightOperand}`;
  const successReaction = questionIndex % 2 === 0 ? 'thumbs-up' : 'clapping';
  const mascotMotion = useRef(new Animated.Value(0)).current;
  const reactionMotion = useRef(new Animated.Value(0)).current;
  const coachingText =
    status === 'correct'
      ? `Great work! ${expression} = ${selectedAnswer}. ${
          questionIndex === totalQuestions - 1
            ? 'Lesson completes in 2 seconds.'
            : 'Next question in 2 seconds.'
        }`
      : status === 'incorrect'
        ? 'Not quite — try another answer!'
        : status === 'checking'
          ? 'Checking your answer…'
          : null;

  useEffect(() => {
    mascotMotion.stopAnimation();
    reactionMotion.stopAnimation();
    mascotMotion.setValue(0);
    reactionMotion.setValue(status === 'correct' && reduceMotion ? 1 : 0);

    if (reduceMotion || status === 'idle' || status === 'checking') {
      return undefined;
    }

    const nativeDriver = true;
    const animation =
      status === 'incorrect'
        ? Animated.sequence([
            Animated.timing(mascotMotion, { toValue: -1, duration: 65, useNativeDriver: nativeDriver }),
            Animated.timing(mascotMotion, { toValue: 1, duration: 85, useNativeDriver: nativeDriver }),
            Animated.timing(mascotMotion, { toValue: -0.7, duration: 75, useNativeDriver: nativeDriver }),
            Animated.timing(mascotMotion, { toValue: 0.55, duration: 70, useNativeDriver: nativeDriver }),
            Animated.spring(mascotMotion, {
              toValue: 0,
              damping: 15,
              stiffness: 230,
              useNativeDriver: nativeDriver,
            }),
          ])
        : Animated.parallel([
            successReaction === 'thumbs-up'
              ? Animated.sequence([
                  Animated.spring(mascotMotion, {
                    toValue: 1,
                    damping: 8,
                    stiffness: 210,
                    useNativeDriver: nativeDriver,
                  }),
                  Animated.spring(mascotMotion, {
                    toValue: 0,
                    damping: 12,
                    stiffness: 180,
                    useNativeDriver: nativeDriver,
                  }),
                ])
              : Animated.sequence([
                  Animated.timing(mascotMotion, { toValue: -1, duration: 100, useNativeDriver: nativeDriver }),
                  Animated.timing(mascotMotion, { toValue: 1, duration: 100, useNativeDriver: nativeDriver }),
                  Animated.timing(mascotMotion, { toValue: -0.7, duration: 90, useNativeDriver: nativeDriver }),
                  Animated.timing(mascotMotion, { toValue: 0.7, duration: 90, useNativeDriver: nativeDriver }),
                  Animated.spring(mascotMotion, {
                    toValue: 0,
                    damping: 14,
                    stiffness: 220,
                    useNativeDriver: nativeDriver,
                  }),
                ]),
            Animated.sequence([
              Animated.spring(reactionMotion, {
                toValue: 1.18,
                damping: 8,
                stiffness: 230,
                useNativeDriver: nativeDriver,
              }),
              Animated.spring(reactionMotion, {
                toValue: 1,
                damping: 12,
                stiffness: 190,
                useNativeDriver: nativeDriver,
              }),
            ]),
          ]);

    animation.start();
    return () => animation.stop();
  }, [mascotMotion, reactionMotion, reduceMotion, status, successReaction]);

  const mascotRotate = mascotMotion.interpolate({
    inputRange: [-1, 0, 1],
    outputRange:
      status === 'incorrect'
        ? ['-8deg', '0deg', '8deg']
        : successReaction === 'clapping'
          ? ['-4deg', '0deg', '4deg']
          : ['0deg', '0deg', '0deg'],
  });
  const mascotLift = mascotMotion.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, 0, status === 'correct' ? -6 : 0],
  });
  const mascotScale = mascotMotion.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [1, 1, status === 'correct' ? 1.06 : 1],
  });

  return (
    <View
      accessibilityLabel={`Arithmetic challenge: ${expression} equals what?`}
      style={styles.challenge}
      testID="lower-primary-arithmetic-challenge"
    >
      <View style={styles.mascotPerch}>
        <Animated.View
          style={{
            transform: [
              { translateY: mascotLift },
              { rotate: mascotRotate },
              { scale: mascotScale },
            ],
          }}
          testID="arithmetic-mascot-motion"
        >
          <Image
            accessibilityLabel={`${mascotKey} learning mascot`}
            resizeMode="contain"
            source={LEARNING_MASCOT_SOURCES[mascotKey]}
            style={styles.mascot}
          />
          {status === 'correct' ? (
            <Animated.View
              accessibilityLabel={
                successReaction === 'thumbs-up'
                  ? 'Mascot gives a thumbs up'
                  : 'Mascot claps'
              }
              style={[
                styles.mascotReaction,
                { transform: [{ scale: reactionMotion }] },
              ]}
            >
              <Text style={styles.mascotReactionText}>
                {successReaction === 'thumbs-up' ? '👍' : '👏'}
              </Text>
            </Animated.View>
          ) : null}
        </Animated.View>
      </View>

      <Text accessibilityRole="header" style={styles.equation}>
        <Text>{spec.leftOperand}</Text>
        <Text style={styles.operator}> {spec.operator} </Text>
        <Text>{spec.rightOperand}</Text>
        <Text style={styles.equals}> = </Text>
        <Text style={styles.unknown}>?</Text>
      </Text>

      <View accessibilityLabel="Arithmetic answer choices" accessibilityRole="radiogroup" style={styles.answerGrid}>
        {options.map((option, index) => {
          const selected = selectedAnswer === option;
          const correct = selected && status === 'correct';
          const incorrect = selected && status === 'incorrect';
          return (
            <SquishPressable
              accessibilityLabel={`Choose answer ${option}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              containerStyle={styles.answerWrap}
              disabled={disabled}
              key={option}
              onPress={() => onSelect(option)}
              reduceMotion={reduceMotion}
            >
              <View
                style={[
                  styles.answerCard,
                  selected && styles.answerSelected,
                  correct && styles.answerCorrect,
                  incorrect && styles.answerIncorrect,
                ]}
              >
                <View style={styles.answerNumberBadge}>
                  <Text style={styles.answerNumber}>{index + 1}</Text>
                </View>
                <Text style={styles.answerText}>{option}</Text>
                {correct ? (
                  <View style={[styles.resultBadge, styles.correctBadge]}>
                    <Check color="#FFFFFF" size={16} strokeWidth={3.2} />
                  </View>
                ) : null}
                {incorrect ? (
                  <View style={[styles.resultBadge, styles.incorrectBadge]}>
                    <X color="#FFFFFF" size={16} strokeWidth={3.2} />
                  </View>
                ) : null}
              </View>
            </SquishPressable>
          );
        })}
      </View>

      {coachingText ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.coachingText,
            status === 'correct' && styles.coachingCorrect,
            status === 'incorrect' && styles.coachingIncorrect,
          ]}
        >
          {coachingText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  answerCard: {
    alignItems: 'center',
    backgroundColor: '#FFFDF4',
    borderColor: '#D8C99D',
    borderRadius: 18,
    borderWidth: 1.5,
    elevation: 2,
    justifyContent: 'center',
    minHeight: 82,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#8A6C2E',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  answerCorrect: { backgroundColor: '#E4F8E7', borderColor: '#22A45D', borderWidth: 2.5 },
  answerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 18 },
  answerIncorrect: { backgroundColor: '#FFF0EB', borderColor: '#F17863', borderWidth: 2.5 },
  answerNumber: { color: '#315E54', fontSize: 11, fontWeight: '900' },
  answerNumberBadge: {
    alignItems: 'center',
    backgroundColor: '#F2EFD2',
    borderRadius: 999,
    height: 26,
    justifyContent: 'center',
    left: 8,
    position: 'absolute',
    top: 8,
    width: 26,
  },
  answerSelected: { backgroundColor: '#EDF3FF', borderColor: '#4F7CE8', borderWidth: 2.5 },
  answerText: { color: '#082B4A', fontSize: 28, fontWeight: '900' },
  answerWrap: { flexBasis: '47%', flexGrow: 1, maxWidth: '49%' },
  challenge: {
    backgroundColor: '#FFFBEC',
    borderColor: '#E5D7B3',
    borderRadius: 28,
    borderWidth: 1.5,
    marginTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 13,
    paddingTop: 50,
  },
  coachingCorrect: { color: '#18864A' },
  coachingIncorrect: { color: '#C34C3B' },
  coachingText: { color: '#526963', fontSize: 13, fontWeight: '900', marginTop: 14, textAlign: 'center' },
  correctBadge: { backgroundColor: '#22A45D' },
  equals: { color: '#082B4A' },
  equation: { color: '#082B4A', fontSize: 52, fontWeight: '900', letterSpacing: -2, marginTop: 8, textAlign: 'center' },
  incorrectBadge: { backgroundColor: '#F17863' },
  mascot: { height: 96, width: 96 },
  mascotPerch: { alignItems: 'center', left: 0, position: 'absolute', right: 0, top: -53, zIndex: 2 },
  mascotReaction: { position: 'absolute', right: -10, top: 4 },
  mascotReactionText: { fontSize: 30 },
  operator: { color: '#FF6A2A' },
  resultBadge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 28,
  },
  unknown: { color: '#FF6A2A' },
});
