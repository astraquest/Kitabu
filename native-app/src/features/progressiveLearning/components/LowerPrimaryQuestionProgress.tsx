import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Check, X } from 'lucide-react-native';

export type QuestionOutcome = 'correct' | 'incorrect' | 'pending';

export function LowerPrimaryQuestionProgress({
  outcomes,
  reduceMotion,
}: {
  outcomes: QuestionOutcome[];
  reduceMotion: boolean;
}) {
  const correctCount = outcomes.filter(outcome => outcome === 'correct').length;
  const incorrectCount = outcomes.filter(
    outcome => outcome === 'incorrect',
  ).length;

  return (
    <View
      accessibilityLabel={`${outcomes.length} questions: ${correctCount} correct, ${incorrectCount} incorrect`}
      style={styles.row}
      testID="lower-primary-question-progress"
    >
      {outcomes.map((outcome, index) => (
        <QuestionStatusDot
          index={index}
          key={index}
          outcome={outcome}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

function QuestionStatusDot({
  index,
  outcome,
  reduceMotion,
}: {
  index: number;
  outcome: QuestionOutcome;
  reduceMotion: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scale.stopAnimation();
    scale.setValue(1);
    if (reduceMotion || outcome === 'pending') {
      return undefined;
    }
    Animated.sequence([
      Animated.spring(scale, {
        damping: 9,
        mass: 0.7,
        stiffness: 250,
        toValue: 1.2,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        damping: 14,
        mass: 0.7,
        stiffness: 210,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
    return () => scale.stopAnimation();
  }, [outcome, reduceMotion, scale]);

  const statusLabel =
    outcome === 'correct'
      ? 'correct'
      : outcome === 'incorrect'
        ? 'incorrect'
        : 'not answered';

  return (
    <Animated.View
      accessibilityLabel={`Question ${index + 1}: ${statusLabel}`}
      accessible
      style={[
        styles.dot,
        outcome === 'correct' && styles.correct,
        outcome === 'incorrect' && styles.incorrect,
        { transform: [{ scale }] },
      ]}
    >
      {outcome === 'correct' ? (
        <Check color="#FFFFFF" size={12} strokeWidth={3.2} />
      ) : null}
      {outcome === 'incorrect' ? (
        <X color="#FFFFFF" size={12} strokeWidth={3.2} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  correct: { backgroundColor: '#22A45D', borderColor: '#168346' },
  dot: {
    alignItems: 'center',
    backgroundColor: '#D7DDE5',
    borderColor: '#C4CCD7',
    borderRadius: 999,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  incorrect: { backgroundColor: '#EF6A5B', borderColor: '#D94C3E' },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
});
