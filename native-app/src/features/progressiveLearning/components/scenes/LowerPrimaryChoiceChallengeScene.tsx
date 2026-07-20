import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';

import type { OnboardingMascotKey } from '../../../../types/app';
import { LearningMascotReaction } from '../LearningMascotReaction';
import { SquishPressable } from '../SquishPressable';

export type LowerPrimaryChoice = {
  label: string;
  value: string;
};

export type LowerPrimaryChoiceChallengeProps = {
  choices: LowerPrimaryChoice[];
  disabled: boolean;
  language?: 'en' | 'sw';
  mascotKey: OnboardingMascotKey;
  onSelect: (value: string) => void;
  prompt: string;
  reduceMotion: boolean;
  selectedAnswer: string | null;
  status: 'idle' | 'checking' | 'correct' | 'incorrect';
};

export function LowerPrimaryChoiceChallengeScene({
  choices,
  disabled,
  language = 'en',
  mascotKey,
  onSelect,
  prompt,
  reduceMotion,
  selectedAnswer,
  status,
}: LowerPrimaryChoiceChallengeProps) {
  const feedbackText =
    status === 'correct'
      ? 'Great work! Next question in 2 seconds.'
      : status === 'incorrect'
        ? 'Not quite — try another answer!'
        : status === 'checking'
          ? 'Checking your answer…'
          : null;

  const localizedFeedbackText =
    language === 'sw'
      ? status === 'correct'
        ? 'Hongera! Swali lingine baada ya sekunde 2.'
        : status === 'incorrect'
          ? 'Bado — jaribu jibu lingine!'
          : status === 'checking'
            ? 'Jibu linaangaliwa...'
            : null
      : feedbackText;

  return (
    <View
      accessibilityLabel={
        language === 'sw'
          ? `Zoezi la darasa la chini: ${prompt}`
          : `Lower-primary challenge: ${prompt}`
      }
      style={styles.challenge}
      testID="lower-primary-choice-challenge"
    >
      <View style={styles.mascotPerch}>
        <LearningMascotReaction
          mascotKey={mascotKey}
          reaction={
            status === 'correct'
              ? 'correct'
              : status === 'incorrect'
                ? 'encourage'
                : status === 'checking'
                  ? 'thinking'
                  : 'idle'
          }
          size={92}
        />
      </View>

      <Text accessibilityRole="header" style={styles.prompt}>
        {prompt}
      </Text>

      <View
        accessibilityLabel={
          language === 'sw' ? 'Chaguo za majibu' : 'Lower-primary answer choices'
        }
        accessibilityRole="radiogroup"
        style={styles.answerGrid}
      >
        {choices.map((choice, index) => {
          const selected = selectedAnswer === choice.value;
          const correct = selected && status === 'correct';
          const incorrect = selected && status === 'incorrect';
          return (
            <SquishPressable
              accessibilityLabel={
                language === 'sw'
                  ? `Chagua jibu ${choice.label}`
                  : `Choose answer ${choice.label}`
              }
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              containerStyle={styles.answerWrap}
              disabled={disabled}
              key={choice.value}
              onPress={() => onSelect(choice.value)}
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
                <Text numberOfLines={4} style={styles.answerText}>
                  {choice.label}
                </Text>
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

      {localizedFeedbackText ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.feedbackText,
            status === 'correct' && styles.feedbackCorrect,
            status === 'incorrect' && styles.feedbackIncorrect,
          ]}
        >
          {localizedFeedbackText}
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
    minHeight: 112,
    paddingHorizontal: 16,
    paddingVertical: 18,
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
  answerText: { color: '#082B4A', fontSize: 15, fontWeight: '900', lineHeight: 20, textAlign: 'center' },
  answerWrap: { flexBasis: '47%', flexGrow: 1, maxWidth: '49%' },
  challenge: {
    backgroundColor: '#FFFBEC',
    borderColor: '#E5D7B3',
    borderRadius: 28,
    borderWidth: 1.5,
    marginTop: 44,
    paddingBottom: 18,
    paddingHorizontal: 13,
    paddingTop: 58,
  },
  correctBadge: { backgroundColor: '#22A45D' },
  feedbackCorrect: { color: '#18864A' },
  feedbackIncorrect: { color: '#C34C3B' },
  feedbackText: { color: '#526963', fontSize: 13, fontWeight: '900', marginTop: 14, textAlign: 'center' },
  incorrectBadge: { backgroundColor: '#F17863' },
  mascotPerch: { alignItems: 'center', left: 0, position: 'absolute', right: 0, top: -48, zIndex: 2 },
  prompt: { color: '#082B4A', fontSize: 22, fontWeight: '900', lineHeight: 28, textAlign: 'center' },
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
});
