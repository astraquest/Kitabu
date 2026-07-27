import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import { SquishPressable } from '../SquishPressable';

/**
 * A deliberately small, tap-first manipulation surface for Grades 1–3.
 * The host grades the submitted numeric value. Correct targets remain private;
 * only the learner-visible prompt and allowed range reach this component.
 */
export type NumberManipulativesMode =
  | 'count'
  | 'represent'
  | 'combine'
  | 'take-away'
  | 'number-line'
  | 'measure';

export type NumberManipulativesSceneProps = {
  disabled: boolean;
  initialValue?: number;
  max: number;
  min?: number;
  mode: NumberManipulativesMode;
  onSubmit: (value: string) => void;
  prompt: string;
  status: 'idle' | 'checking' | 'correct' | 'incorrect';
  unitLabel?: string;
  feedbackMessage?: string;
  retryHint?: string;
};

const MODE_LABELS: Record<NumberManipulativesMode, string> = {
  count: 'Count the objects',
  represent: 'Make the number',
  combine: 'Put the groups together',
  'take-away': 'Take some away',
  'number-line': 'Move along the number line',
  measure: 'Count the equal units',
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function NumberManipulativesScene({
  disabled,
  initialValue = 0,
  max,
  min = 0,
  mode,
  onSubmit,
  prompt,
  status,
  unitLabel = 'counters',
  feedbackMessage,
  retryHint,
}: NumberManipulativesSceneProps) {
  const safeInitialValue = clamp(initialValue, min, max);
  const [value, setValue] = useState(safeInitialValue);

  useEffect(() => {
    setValue(safeInitialValue);
  }, [safeInitialValue, mode, prompt]);

  const visibleValues = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, index) => min + index),
    [max, min],
  );
  const counterCount = mode === 'measure' ? value : Math.min(value, 30);
  const feedback =
    status === 'correct'
      ? feedbackMessage ?? 'Great counting!'
      : status === 'incorrect'
        ? retryHint ?? 'Try again. Touch the plus or minus button to change your answer.'
        : status === 'checking'
          ? 'Checking…'
          : null;

  const changeValue = (amount: number) => {
    if (!disabled) {
      setValue(current => clamp(current + amount, min, max));
    }
  };

  return (
    <View
      accessibilityLabel={`Number activity. ${prompt}`}
      style={styles.scene}
      testID="lower-primary-number-manipulatives"
    >
      <Text accessibilityRole="header" style={styles.prompt}>{prompt}</Text>
      <Text style={styles.instruction}>{MODE_LABELS[mode]}</Text>

      {mode === 'number-line' ? (
        <View accessibilityLabel="Number line" style={styles.numberLine}>
          {visibleValues.map(number => (
            <SquishPressable
              accessibilityLabel={`Choose ${number}`}
              accessibilityRole="button"
              accessibilityState={{ selected: value === number, disabled }}
              containerStyle={styles.numberTickWrap}
              disabled={disabled}
              key={number}
              onPress={() => setValue(number)}
              reduceMotion
            >
              <View style={[styles.numberTick, value === number && styles.numberTickSelected]}>
                <Text style={[styles.numberTickText, value === number && styles.numberTickTextSelected]}>{number}</Text>
              </View>
            </SquishPressable>
          ))}
        </View>
      ) : (
        <View accessibilityLabel={`${value} ${unitLabel}`} style={styles.counterTray}>
          {Array.from({ length: counterCount }, (_, index) => (
            <View accessibilityElementsHidden accessible={false} key={index} style={styles.counter} />
          ))}
          {value > 30 ? <Text style={styles.moreCount}>+{value - 30}</Text> : null}
        </View>
      )}

      <View accessibilityLabel="Change the number" style={styles.controls}>
        <SquishPressable
          accessibilityLabel="One less"
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || value <= min }}
          disabled={disabled || value <= min}
          onPress={() => changeValue(-1)}
          reduceMotion
        >
          <View style={styles.controlButton}><Minus color="#082B4A" size={28} strokeWidth={3} /></View>
        </SquishPressable>
        <View accessibilityLiveRegion="polite" style={styles.valueBadge}>
          <Text style={styles.valueText}>{value}</Text>
          <Text style={styles.unitText}>{unitLabel}</Text>
        </View>
        <SquishPressable
          accessibilityLabel="One more"
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || value >= max }}
          disabled={disabled || value >= max}
          onPress={() => changeValue(1)}
          reduceMotion
        >
          <View style={styles.controlButton}><Plus color="#082B4A" size={28} strokeWidth={3} /></View>
        </SquishPressable>
      </View>

      <SquishPressable
        accessibilityLabel={`Check ${value}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onSubmit(String(value))}
        reduceMotion
      >
        <View style={styles.checkButton}><Text style={styles.checkText}>Check {value}</Text></View>
      </SquishPressable>
      {feedback ? <Text accessibilityLiveRegion="polite" style={status === 'correct' ? styles.correct : styles.feedback}>{feedback}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { backgroundColor: '#FFFBEC', borderColor: '#E5D7B3', borderRadius: 28, borderWidth: 1.5, marginTop: 20, padding: 18 },
  prompt: { color: '#082B4A', fontSize: 22, fontWeight: '900', lineHeight: 28, textAlign: 'center' },
  instruction: { color: '#526963', fontSize: 14, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  counterTray: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', minHeight: 96, paddingVertical: 18 },
  counter: { backgroundColor: '#FFBD36', borderColor: '#C57800', borderRadius: 999, borderWidth: 2, height: 28, width: 28 },
  moreCount: { color: '#082B4A', fontSize: 20, fontWeight: '900' },
  numberLine: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', paddingVertical: 20 },
  numberTickWrap: { minWidth: 40 },
  numberTick: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#9CB6C3', borderRadius: 12, borderWidth: 2, height: 44, justifyContent: 'center' },
  numberTickSelected: { backgroundColor: '#D8F2E4', borderColor: '#198754' },
  numberTickText: { color: '#082B4A', fontSize: 18, fontWeight: '900' },
  numberTickTextSelected: { color: '#106B40' },
  controls: { alignItems: 'center', flexDirection: 'row', gap: 16, justifyContent: 'center', marginBottom: 16 },
  controlButton: { alignItems: 'center', backgroundColor: '#E7F1FF', borderColor: '#4F7CE8', borderRadius: 18, borderWidth: 2, height: 56, justifyContent: 'center', width: 56 },
  valueBadge: { alignItems: 'center', minWidth: 88 },
  valueText: { color: '#082B4A', fontSize: 42, fontWeight: '900', lineHeight: 46 },
  unitText: { color: '#526963', fontSize: 11, fontWeight: '800' },
  checkButton: { alignItems: 'center', backgroundColor: '#198754', borderRadius: 18, minHeight: 54, justifyContent: 'center' },
  checkText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  feedback: { color: '#C34C3B', fontSize: 14, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  correct: { color: '#18864A', fontSize: 14, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  srOnly: { color: 'transparent', fontSize: 1, height: 1, marginTop: 1 },
});
